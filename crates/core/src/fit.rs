//! Fit a recipe to the device it will land on.
//!
//! Plain comparisons of the two spec sheets. Each piece of advice says what
//! changed and what Carryover will do about it.

use serde::{Deserialize, Serialize};

use crate::model::*;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum AdviceLevel {
    Info,
    Heads,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Advice {
    pub id: &'static str,
    pub level: AdviceLevel,
    pub title: String,
    pub detail: String,
}

/// Apps that need lots of memory to be pleasant.
const HEAVY_APPS: &[&str] = &["docker desktop", "photoshop", "premiere", "android studio", "visual studio 20", "unreal", "davinci"];

const GIB: u64 = 1024 * 1024 * 1024;

pub fn used_bytes(specs: &DeviceSpecs) -> u64 {
    specs
        .disks
        .iter()
        .flat_map(|d| &d.partitions)
        .filter(|p| matches!(p.kind, PartitionKind::System | PartitionKind::Data))
        .map(|p| p.size_bytes.saturating_sub(p.free_bytes.unwrap_or(0)))
        .sum()
}

pub fn free_bytes(specs: &DeviceSpecs) -> u64 {
    specs
        .disks
        .iter()
        .flat_map(|d| &d.partitions)
        .filter(|p| matches!(p.kind, PartitionKind::System | PartitionKind::Data))
        .filter_map(|p| p.free_bytes)
        .sum()
}

fn gpu_vendor(gpus: &[String]) -> Option<&'static str> {
    let all = gpus.join(" ").to_ascii_lowercase();
    if all.contains("nvidia") {
        Some("NVIDIA")
    } else if all.contains("amd") || all.contains("radeon") {
        Some("AMD")
    } else if all.contains("intel") {
        Some("Intel")
    } else {
        None
    }
}

fn gb(b: u64) -> String {
    format!("{:.0} GB", b as f64 / GIB as f64)
}

/// Advice for moving `recipe` onto `target`.
pub fn advise(recipe: &Recipe, target: &DeviceSpecs) -> Vec<Advice> {
    let src = &recipe.source;
    let mut out = Vec::new();
    // Refreshing the same PC: hardware comparisons don't apply.
    let same = target == src;

    if !same && target.ram_bytes + GIB < src.ram_bytes {
        let heavy: Vec<&str> = recipe
            .apps
            .iter()
            .filter(|a| {
                let n = a.name.to_ascii_lowercase();
                HEAVY_APPS.iter().any(|h| n.contains(h))
            })
            .map(|a| a.name.as_str())
            .collect();
        let detail = if heavy.is_empty() {
            "Startup apps will be kept to the ones you use daily.".to_string()
        } else {
            format!(
                "{} will run slower here. They stay in the plan but won't start with Windows.",
                heavy.join(", ")
            )
        };
        out.push(Advice {
            id: "less-ram",
            level: AdviceLevel::Heads,
            title: format!("Less memory: {} → {}", gb(src.ram_bytes), gb(target.ram_bytes)),
            detail,
        });
    }

    let used = used_bytes(src);
    let room = free_bytes(target);
    if !same && room > 0 && used > room {
        out.push(Advice {
            id: "less-space",
            level: AdviceLevel::Heads,
            title: format!("{} of files, {} of room", gb(used), gb(room)),
            detail: "You'll pick which folders come along. The rest can stay on the old PC or go to an external drive.".into(),
        });
    }

    match (gpu_vendor(&src.gpus), gpu_vendor(&target.gpus)) {
        (Some(a), Some(b)) if !same && a != b => out.push(Advice {
            id: "gpu-change",
            level: AdviceLevel::Info,
            title: format!("Graphics change: {a} → {b}"),
            detail: format!("Old {a} drivers stay behind. Windows Update and the {b} driver package are used instead."),
        }),
        _ => {}
    }

    if !same && !src.manufacturer.is_empty() && !target.manufacturer.is_empty() && !target.manufacturer.eq_ignore_ascii_case(&src.manufacturer) {
        out.push(Advice {
            id: "vendor-change",
            level: AdviceLevel::Info,
            title: "Different maker".into(),
            detail: "Hardware tools from the old PC (fan control, vendor update apps) are skipped.".into(),
        });
    }

    if recipe.boot_critical_drivers().next().is_some() {
        out.push(Advice {
            id: "storage-driver",
            level: AdviceLevel::Info,
            title: "Storage driver saved".into(),
            detail: "This PC needs an Intel RST/VMD driver for Windows Setup to see the disk. Carryover exports it and adds it to Setup for you.".into(),
        });
    }

    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::scan::{demo_recipe, demo_target_specs};

    #[test]
    fn demo_target_gets_ram_gpu_and_vendor_advice() {
        let r = demo_recipe("t").unwrap();
        let a = advise(&r, &demo_target_specs());
        let ids: Vec<_> = a.iter().map(|x| x.id).collect();
        assert!(ids.contains(&"less-ram"), "{ids:?}");
        assert!(ids.contains(&"gpu-change"));
        assert!(ids.contains(&"vendor-change"));
        let ram = a.iter().find(|x| x.id == "less-ram").unwrap();
        assert!(ram.detail.contains("Docker Desktop"));
    }

    #[test]
    fn same_machine_gets_no_hardware_advice() {
        let r = demo_recipe("t").unwrap();
        let a = advise(&r, &r.source);
        assert!(a.iter().all(|x| x.id == "storage-driver"));
    }
}
