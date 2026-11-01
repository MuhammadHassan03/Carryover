//! Rule-based planner. Turns a recipe into ordered steps.
//!
//! An AI planner can replace this later, but its output goes through exactly
//! the same `safety::check`, so the rules below are a baseline, not the gate.

use crate::model::*;

/// Paid suites that need a sign-out or deactivation on the old PC.
const LICENSED: &[&str] = &["adobe", "microsoft 365", "office", "autodesk", "coreldraw", "camtasia"];

/// Vendor utilities tied to the old hardware. Skipped on a different device.
const HARDWARE_TOOLS: &[&str] = &[
    "armoury crate",
    "myasus",
    "lenovo vantage",
    "dell supportassist",
    "hp support assistant",
    "intel(r) graphics command center",
    "nvidia app",
    "geforce experience",
    "msi center",
];

fn matches_any(name: &str, list: &[&str]) -> bool {
    let n = name.to_ascii_lowercase();
    list.iter().any(|k| n.contains(k))
}

pub fn system_partition(specs: &DeviceSpecs) -> Option<(&Disk, &Partition)> {
    specs.disks.iter().find_map(|d| {
        d.partitions
            .iter()
            .find(|p| p.kind == PartitionKind::System)
            .map(|p| (d, p))
    })
}

/// A lettered data volume, not the Windows one, with the most free space.
pub fn safe_volume(specs: &DeviceSpecs) -> Option<(&Disk, &Partition)> {
    specs
        .disks
        .iter()
        .flat_map(|d| d.partitions.iter().map(move |p| (d, p)))
        .filter(|(_, p)| p.kind == PartitionKind::Data && p.drive_letter.is_some())
        .max_by_key(|(_, p)| p.free_bytes.unwrap_or(0))
}

fn app_steps(recipe: &Recipe, mode: Mode, out: &mut Vec<Step>) {
    for app in &recipe.apps {
        if mode == Mode::NewDevice && matches_any(&app.name, HARDWARE_TOOLS) {
            out.push(Step::ManualApp {
                name: app.name.clone(),
                reason: "Made for the old PC's hardware. Skipped; install your new device's own tool if you want one.".into(),
            });
            continue;
        }
        if matches_any(&app.name, LICENSED) {
            out.push(Step::ManualApp {
                name: app.name.clone(),
                reason: "Paid license. Sign out or deactivate it on the old PC first, then sign in after setup.".into(),
            });
            continue;
        }
        match &app.winget_id {
            Some(id) => out.push(Step::InstallApp { winget_id: id.clone(), name: app.name.clone() }),
            None => out.push(Step::ManualApp {
                name: app.name.clone(),
                reason: "No installable package found. Carryover will link you to the vendor's download page.".into(),
            }),
        }
    }
}

/// Build a plan for this recipe. Never fails: problems are left for the
/// safety checker to report, so the user sees one consistent list.
pub fn rule_plan(recipe: &Recipe, mode: Mode, opts: PlanOptions) -> Plan {
    let organize = |out: &mut Vec<Step>| {
        if opts.organize_files {
            let p = crate::organize::propose(&recipe.files);
            if !p.moves.is_empty() {
                out.push(Step::OrganizeFiles { moves: p.moves });
            }
        }
    };
    let mut steps = Vec::new();
    match mode {
        Mode::NewDevice => {
            steps.push(Step::SaveRecipe { to: Location::PairedDevice });
            steps.push(Step::TransferToPairedDevice);
            organize(&mut steps);
            app_steps(recipe, mode, &mut steps);
            steps.push(Step::Verify);
        }
        Mode::RefreshThisPc => {
            let sys = system_partition(&recipe.source);
            let safe = safe_volume(&recipe.source);
            // If there is no second volume we still emit a plan pointing at
            // the system drive; the checker blocks it with a clear fix.
            let store_letter = safe
                .and_then(|(_, p)| p.drive_letter)
                .or_else(|| sys.and_then(|(_, p)| p.drive_letter))
                .unwrap_or('C');
            let store = Location::Volume { letter: store_letter };

            steps.push(Step::SaveRecipe { to: store.clone() });
            if let Some((_, p)) = sys {
                if let Some(letter) = p.drive_letter {
                    if p.encryption != Encryption::None {
                        steps.push(Step::SaveBitLockerKey { letter, to: store.clone() });
                    }
                }
            }
            steps.push(Step::BackupUserFiles { to: store.clone(), bytes: recipe.user_file_bytes() });
            steps.push(Step::ExportDrivers { boot_critical_only: false, to: store.clone() });
            if let Some((_, p)) = sys {
                if let (Some(letter), Encryption::BitLocker) = (p.drive_letter, p.encryption) {
                    steps.push(Step::SuspendBitLocker { letter });
                }
            }
            if let Some((disk, part)) = sys {
                let (stage_disk, stage_part) = safe
                    .map(|(d, p)| (d.number, p.number))
                    .unwrap_or((disk.number, part.number));
                steps.push(Step::StageRecoveryEnvironment { disk: stage_disk, partition: stage_part });
                steps.push(Step::WipeAndInstallWindows { disk: disk.number, partition: part.number });
                steps.push(Step::InjectDrivers);
            }
            steps.push(Step::RestoreUserFiles);
            organize(&mut steps);
            app_steps(recipe, mode, &mut steps);
            steps.push(Step::Verify);
        }
    }
    Plan { mode, steps, planner: "rules".into() }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::scan::demo_recipe;

    #[test]
    fn refresh_plan_saves_before_wiping() {
        let r = demo_recipe("t").unwrap();
        let p = rule_plan(&r, Mode::RefreshThisPc, PlanOptions::default());
        let wipe = p.steps.iter().position(Step::is_destructive).unwrap();
        let save = p.steps.iter().position(|s| matches!(s, Step::SaveRecipe { .. })).unwrap();
        assert!(save < wipe);
        assert!(p.steps.contains(&Step::SaveRecipe { to: Location::Volume { letter: 'D' } }));
    }

    #[test]
    fn new_device_plan_skips_hardware_tools_and_flags_licenses() {
        let r = demo_recipe("t").unwrap();
        let p = rule_plan(&r, Mode::NewDevice, PlanOptions::default());
        assert!(!p.steps.iter().any(Step::is_destructive));
        let manual: Vec<_> = p
            .steps
            .iter()
            .filter_map(|s| match s {
                Step::ManualApp { name, reason } => Some((name.as_str(), reason.as_str())),
                _ => None,
            })
            .collect();
        assert!(manual.iter().any(|(n, r)| n.contains("Armoury") && r.contains("hardware")));
        assert!(manual.iter().any(|(n, r)| n.contains("Photoshop") && r.contains("license")));
    }
}
