//! The safety checker: plain, deterministic rules that every plan must pass,
//! whoever wrote it. The AI proposes, this module disposes.

use serde::{Deserialize, Serialize};

use crate::model::*;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Severity {
    /// The plan must not run.
    Block,
    /// Allowed, but the user should read it.
    Warn,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Violation {
    pub rule: &'static str,
    pub severity: Severity,
    pub step: Option<usize>,
    pub message: String,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Verdict {
    pub ok: bool,
    pub rules_checked: usize,
    pub violations: Vec<Violation>,
}

/// Minimum free space we want on the volume that holds the recipe, the
/// exported drivers and the staged recovery environment.
pub const MIN_STAGING_FREE: u64 = 6 * 1024 * 1024 * 1024;

pub const RULES: &[(&str, &str)] = &[
    ("known-targets", "Every disk and partition a step names exists on this PC."),
    ("protected-partitions", "EFI, reserved and recovery partitions are never staged on or erased."),
    ("only-windows-volume", "Only the Windows volume may be erased, and only once."),
    ("keep-off-erased-volume", "Recipe, keys and drivers are never saved to the volume being erased."),
    ("save-before-erase", "Recipe, BitLocker key and drivers are saved before anything is erased."),
    ("bitlocker-suspended", "BitLocker is suspended before Windows is reinstalled."),
    ("storage-drivers", "Storage drivers are exported and injected so Setup can see the disk."),
    ("known-apps-only", "Only apps found on the source PC can be installed."),
    ("mode-matches", "New-device plans never erase anything on this PC."),
    ("volume-exists", "Every drive letter a step writes to exists."),
    ("staging-space", "The staging volume has enough free space."),
    ("files-backed-up", "Your files are copied off the Windows drive before it's erased, and restored after."),
    ("organize-safe", "Organizing only moves files inside your own folders, never deletes or overwrites."),
];

struct Ctx<'a> {
    specs: &'a DeviceSpecs,
    recipe: &'a Recipe,
    out: Vec<Violation>,
}

impl Ctx<'_> {
    fn push(&mut self, rule: &'static str, severity: Severity, step: Option<usize>, message: impl Into<String>) {
        self.out.push(Violation { rule, severity, step, message: message.into() });
    }

    fn partition(&self, disk: u32, part: u32) -> Option<&Partition> {
        self.specs
            .disks
            .iter()
            .find(|d| d.number == disk)?
            .partitions
            .iter()
            .find(|p| p.number == part)
    }

    fn by_letter(&self, letter: char) -> Option<&Partition> {
        self.specs
            .disks
            .iter()
            .flat_map(|d| d.partitions.iter())
            .find(|p| p.drive_letter == Some(letter.to_ascii_uppercase()))
    }
}

fn location_letter(loc: &Location) -> Option<char> {
    match loc {
        Location::Volume { letter } => Some(letter.to_ascii_uppercase()),
        Location::PairedDevice => None,
    }
}

/// Check a plan against the PC it would run on (`specs`) and the recipe it
/// claims to rebuild.
pub fn check(plan: &Plan, specs: &DeviceSpecs, recipe: &Recipe) -> Verdict {
    let mut cx = Ctx { specs, recipe, out: Vec::new() };
    let steps = &plan.steps;

    // Indexes of interesting steps.
    let wipes: Vec<(usize, u32, u32)> = steps
        .iter()
        .enumerate()
        .filter_map(|(i, s)| match s {
            Step::WipeAndInstallWindows { disk, partition } => Some((i, *disk, *partition)),
            _ => None,
        })
        .collect();
    let first_wipe = wipes.first().map(|w| w.0);
    let erased_letter: Option<char> = wipes
        .first()
        .and_then(|&(_, d, p)| cx.partition(d, p))
        .and_then(|p| p.drive_letter);

    // mode-matches
    if plan.mode == Mode::NewDevice {
        for (i, ..) in &wipes {
            cx.push("mode-matches", Severity::Block, Some(*i), "A new-device plan tried to erase a volume on this PC.");
        }
    }

    // only-windows-volume
    if wipes.len() > 1 {
        cx.push("only-windows-volume", Severity::Block, Some(wipes[1].0), "The plan erases more than one volume.");
    }

    for (i, step) in steps.iter().enumerate() {
        match step {
            Step::WipeAndInstallWindows { disk, partition } | Step::StageRecoveryEnvironment { disk, partition } => {
                let destructive = step.is_destructive();
                match cx.partition(*disk, *partition).cloned() {
                    None => cx.push(
                        "known-targets",
                        Severity::Block,
                        Some(i),
                        format!("Disk {disk}, partition {partition} does not exist on this PC."),
                    ),
                    Some(p) => {
                        if matches!(p.kind, PartitionKind::Efi | PartitionKind::Reserved | PartitionKind::Recovery) {
                            cx.push(
                                "protected-partitions",
                                Severity::Block,
                                Some(i),
                                format!("Partition {partition} is a {:?} partition and is never touched.", p.kind),
                            );
                        } else if destructive && p.kind != PartitionKind::System {
                            cx.push(
                                "only-windows-volume",
                                Severity::Block,
                                Some(i),
                                format!("{} is not the Windows volume, so it can't be erased.", p.letter_str()),
                            );
                        }
                        if !destructive {
                            if let Some((_, wd, wp)) = wipes.first() {
                                if (*wd, *wp) == (*disk, *partition) {
                                    cx.push(
                                        "keep-off-erased-volume",
                                        Severity::Block,
                                        Some(i),
                                        "The recovery environment is staged on the volume that gets erased.",
                                    );
                                }
                            }
                            if p.free_bytes.is_some_and(|f| f < MIN_STAGING_FREE) {
                                cx.push(
                                    "staging-space",
                                    Severity::Block,
                                    Some(i),
                                    format!("{} needs at least 6 GB free for staging.", p.letter_str()),
                                );
                            }
                        }
                    }
                }
            }
            Step::BackupUserFiles { to, bytes } => {
                if let Some(letter) = location_letter(to) {
                    match cx.by_letter(letter).cloned() {
                        None => cx.push("volume-exists", Severity::Block, Some(i), format!("Drive {letter}: does not exist.")),
                        Some(_) if Some(letter) == erased_letter => cx.push(
                            "keep-off-erased-volume",
                            Severity::Block,
                            Some(i),
                            format!("Your files would be backed up to {letter}:, the drive being erased."),
                        ),
                        Some(p) => {
                            let need = bytes.saturating_add(MIN_STAGING_FREE);
                            if p.free_bytes.is_some_and(|free| free < need) {
                                cx.push(
                                    "staging-space",
                                    Severity::Block,
                                    Some(i),
                                    format!(
                                        "{letter}: has {} GB free but your files and Setup need {} GB. Free up space or plug in a drive.",
                                        p.free_bytes.unwrap_or(0) / (1 << 30),
                                        need.div_ceil(1 << 30)
                                    ),
                                );
                            }
                        }
                    }
                }
            }
            Step::OrganizeFiles { moves } => {
                for problem in crate::organize::check_moves(moves, &cx.recipe.files) {
                    cx.push(
                        "organize-safe",
                        Severity::Block,
                        Some(i),
                        format!("File move {}: {}", problem.index + 1, problem.message),
                    );
                }
                if first_wipe.is_some() && !steps[..i].iter().any(|s| matches!(s, Step::RestoreUserFiles)) {
                    cx.push("organize-safe", Severity::Block, Some(i), "Files are organized before they've been restored.");
                }
            }
            Step::SaveRecipe { to } | Step::SaveBitLockerKey { to, .. } | Step::ExportDrivers { to, .. } => {
                if let Some(letter) = location_letter(to) {
                    if cx.by_letter(letter).is_none() {
                        cx.push("volume-exists", Severity::Block, Some(i), format!("Drive {letter}: does not exist."));
                    } else if Some(letter) == erased_letter {
                        cx.push(
                            "keep-off-erased-volume",
                            Severity::Block,
                            Some(i),
                            format!(
                                "This saves to {letter}:, which is the drive being erased. Add a second drive or a USB stick and save there."
                            ),
                        );
                    }
                }
            }
            Step::InstallApp { winget_id, name } => {
                let known = cx.recipe.apps.iter().any(|a| a.winget_id.as_deref() == Some(winget_id.as_str()));
                if !known {
                    cx.push(
                        "known-apps-only",
                        Severity::Block,
                        Some(i),
                        format!("\"{name}\" ({winget_id}) was not on the source PC, so it won't be installed."),
                    );
                }
            }
            _ => {}
        }
    }

    // save-before-erase, bitlocker-suspended, storage-drivers
    if let Some(w) = first_wipe {
        let before = |pred: &dyn Fn(&Step) -> bool| steps[..w].iter().any(pred);
        if !before(&|s| matches!(s, Step::SaveRecipe { .. })) {
            cx.push("save-before-erase", Severity::Block, Some(w), "The recipe isn't saved before Windows is erased.");
        }
        let erased = wipes.first().and_then(|&(_, d, p)| cx.partition(d, p)).cloned();
        if let Some(p) = &erased {
            if p.encryption != Encryption::None && !before(&|s| matches!(s, Step::SaveBitLockerKey { .. })) {
                cx.push(
                    "save-before-erase",
                    Severity::Block,
                    Some(w),
                    "The BitLocker recovery key isn't saved before erasing. Without it, a locked drive can't be opened.",
                );
            }
            if p.encryption == Encryption::BitLocker && !before(&|s| matches!(s, Step::SuspendBitLocker { .. })) {
                cx.push("bitlocker-suspended", Severity::Block, Some(w), "BitLocker isn't suspended before the reinstall.");
            }
            if p.encryption == Encryption::Unknown {
                cx.push(
                    "bitlocker-suspended",
                    Severity::Warn,
                    Some(w),
                    "BitLocker state is unknown. Run Carryover as administrator to confirm it.",
                );
            }
        }
        if !cx.recipe.files.is_empty() {
            if !before(&|s| matches!(s, Step::BackupUserFiles { .. })) {
                cx.push(
                    "files-backed-up",
                    Severity::Block,
                    Some(w),
                    "Your Desktop, Documents and Downloads live on the Windows drive and aren't backed up first.",
                );
            }
            if !steps[w..].iter().any(|s| matches!(s, Step::RestoreUserFiles)) {
                cx.push("files-backed-up", Severity::Block, Some(w), "Backed-up files are never restored.");
            }
        }
        if cx.recipe.boot_critical_drivers().next().is_some() {
            if !before(&|s| matches!(s, Step::ExportDrivers { .. })) {
                cx.push(
                    "storage-drivers",
                    Severity::Block,
                    Some(w),
                    "Storage drivers aren't exported first, so Setup may not see the disk.",
                );
            }
            if !steps[w..].iter().any(|s| matches!(s, Step::InjectDrivers)) {
                cx.push("storage-drivers", Severity::Block, Some(w), "Exported storage drivers are never injected into Setup.");
            }
        }
    }

    let ok = !cx.out.iter().any(|v| v.severity == Severity::Block);
    Verdict { ok, rules_checked: RULES.len(), violations: cx.out }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::plan::rule_plan;
    use crate::organize::{Move, Rule};

    const ORG: PlanOptions = PlanOptions { organize_files: true };
    use crate::scan::demo_recipe;

    fn blocks(v: &Verdict, rule: &str) -> bool {
        v.violations.iter().any(|x| x.rule == rule && x.severity == Severity::Block)
    }

    #[test]
    fn rule_plans_pass() {
        let r = demo_recipe("t").unwrap();
        for mode in [Mode::NewDevice, Mode::RefreshThisPc] {
            let v = check(&rule_plan(&r, mode, ORG), &r.source, &r);
            assert!(v.ok, "{mode:?}: {:?}", v.violations);
        }
    }

    #[test]
    fn blocks_saving_recipe_to_the_erased_drive() {
        let r = demo_recipe("t").unwrap();
        let mut p = rule_plan(&r, Mode::RefreshThisPc, ORG);
        p.steps[0] = Step::SaveRecipe { to: Location::Volume { letter: 'C' } };
        let v = check(&p, &r.source, &r);
        assert!(!v.ok);
        assert!(blocks(&v, "keep-off-erased-volume"));
    }

    #[test]
    fn blocks_single_drive_pc_without_a_safe_place() {
        let mut r = demo_recipe("t").unwrap();
        r.source.disks[0].partitions.retain(|p| p.drive_letter != Some('D'));
        let v = check(&rule_plan(&r, Mode::RefreshThisPc, ORG), &r.source, &r);
        assert!(!v.ok);
        assert!(blocks(&v, "keep-off-erased-volume"));
    }

    #[test]
    fn blocks_erasing_efi_or_data() {
        let r = demo_recipe("t").unwrap();
        let mut p = rule_plan(&r, Mode::RefreshThisPc, ORG);
        let w = p.steps.iter().position(Step::is_destructive).unwrap();
        p.steps[w] = Step::WipeAndInstallWindows { disk: 0, partition: 1 };
        assert!(blocks(&check(&p, &r.source, &r), "protected-partitions"));
        p.steps[w] = Step::WipeAndInstallWindows { disk: 0, partition: 4 };
        assert!(blocks(&check(&p, &r.source, &r), "only-windows-volume"));
    }

    #[test]
    fn blocks_hallucinated_disk() {
        let r = demo_recipe("t").unwrap();
        let mut p = rule_plan(&r, Mode::RefreshThisPc, ORG);
        let w = p.steps.iter().position(Step::is_destructive).unwrap();
        p.steps[w] = Step::WipeAndInstallWindows { disk: 3, partition: 2 };
        assert!(blocks(&check(&p, &r.source, &r), "known-targets"));
    }

    #[test]
    fn blocks_injected_software() {
        let r = demo_recipe("t").unwrap();
        let mut p = rule_plan(&r, Mode::NewDevice, ORG);
        p.steps.insert(1, Step::InstallApp { winget_id: "Evil.Miner".into(), name: "Totally Safe".into() });
        assert!(blocks(&check(&p, &r.source, &r), "known-apps-only"));
    }

    #[test]
    fn blocks_missing_key_and_suspend() {
        let r = demo_recipe("t").unwrap();
        let mut p = rule_plan(&r, Mode::RefreshThisPc, ORG);
        p.steps.retain(|s| !matches!(s, Step::SaveBitLockerKey { .. } | Step::SuspendBitLocker { .. }));
        let v = check(&p, &r.source, &r);
        assert!(blocks(&v, "save-before-erase"));
        assert!(blocks(&v, "bitlocker-suspended"));
    }

    #[test]
    fn blocks_missing_storage_driver_injection() {
        let r = demo_recipe("t").unwrap();
        let mut p = rule_plan(&r, Mode::RefreshThisPc, ORG);
        p.steps.retain(|s| !matches!(s, Step::InjectDrivers));
        assert!(blocks(&check(&p, &r.source, &r), "storage-drivers"));
    }

    #[test]
    fn blocks_erase_in_new_device_mode() {
        let r = demo_recipe("t").unwrap();
        let mut p = rule_plan(&r, Mode::NewDevice, ORG);
        p.steps.push(Step::WipeAndInstallWindows { disk: 0, partition: 3 });
        assert!(blocks(&check(&p, &r.source, &r), "mode-matches"));
    }

    #[test]
    fn plans_from_json_cannot_invent_actions() {
        let bad = r#"{"mode":"refreshThisPc","planner":"ai","steps":[{"action":"formatEverything"}]}"#;
        assert!(serde_json::from_str::<Plan>(bad).is_err());
    }

    #[test]
    fn blocks_erase_without_file_backup() {
        let r = demo_recipe("t").unwrap();
        let mut p = rule_plan(&r, Mode::RefreshThisPc, ORG);
        p.steps.retain(|s| !matches!(s, Step::BackupUserFiles { .. }));
        assert!(blocks(&check(&p, &r.source, &r), "files-backed-up"));
    }

    #[test]
    fn blocks_backup_that_does_not_fit() {
        let mut r = demo_recipe("t").unwrap();
        for p in r.source.disks[0].partitions.iter_mut().filter(|p| p.drive_letter == Some('D')) {
            p.free_bytes = Some(2 << 30);
        }
        let v = check(&rule_plan(&r, Mode::RefreshThisPc, ORG), &r.source, &r);
        assert!(blocks(&v, "staging-space"), "{:?}", v.violations);
    }

    #[test]
    fn blocks_unsafe_organize_moves() {
        let r = demo_recipe("t").unwrap();
        let mut p = rule_plan(&r, Mode::NewDevice, ORG);
        let evil = Move { from: r.files[0].path.clone(), to: "AppData/Roaming/x".into(), rule: Rule::Pdfs };
        p.steps.insert(2, Step::OrganizeFiles { moves: vec![evil] });
        assert!(blocks(&check(&p, &r.source, &r), "organize-safe"));
    }

    #[test]
    fn rule_plan_includes_organize_when_asked() {
        let r = demo_recipe("t").unwrap();
        let with = rule_plan(&r, Mode::RefreshThisPc, ORG);
        let without = rule_plan(&r, Mode::RefreshThisPc, PlanOptions::default());
        assert!(with.steps.iter().any(|s| matches!(s, Step::OrganizeFiles { .. })));
        assert!(!without.steps.iter().any(|s| matches!(s, Step::OrganizeFiles { .. })));
    }
}
