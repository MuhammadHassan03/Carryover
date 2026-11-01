//! Runs the real scanner and checks the result makes sense.
//!
//! Windows: `cargo run -p carryover-core --example scan_check`
//! Elsewhere it checks the demo data instead. Exits non-zero on any problem.
use carryover_core::{fit, organize, plan, safety, scan, Encryption, Mode, PartitionKind, PlanOptions};
use std::time::Instant;

fn main() {
    let started = Instant::now();
    let now = carryover_core::now_rfc3339();
    let recipe = if cfg!(windows) { scan::scan_this_pc(&now) } else { scan::demo_recipe(&now) };
    let recipe = match recipe {
        Ok(r) => r,
        Err(e) => {
            eprintln!("FAIL scan: {e}");
            std::process::exit(1);
        }
    };
    let secs = started.elapsed().as_secs_f32();
    let s = &recipe.source;
    let mut problems = Vec::new();
    let mut check = |ok: bool, what: &str| {
        println!("{} {what}", if ok { "ok  " } else { "FAIL" });
        if !ok {
            problems.push(what.to_string());
        }
    };

    println!("Scanned {} ({} {}) in {secs:.1}s", s.hostname, s.manufacturer, s.model);
    println!("  {} | {} cores | {} GB RAM | firmware {:?} | secure boot {:?} | tpm {:?}", s.cpu, s.cpu_cores, s.ram_bytes >> 30, s.firmware, s.secure_boot, s.tpm_present);
    for d in &s.disks {
        println!("  disk {} {} {} GB {}", d.number, d.model, d.size_bytes >> 30, d.bus);
        for p in &d.partitions {
            println!("    #{} {:?} {} {} GB free {:?} {:?}", p.number, p.kind, p.letter_str(), p.size_bytes >> 30, p.free_bytes.map(|f| f >> 30), p.encryption);
        }
    }
    println!("  apps {} ({} automatic) | drivers {} ({} storage) | files {} ({} MB)",
        recipe.apps.len(), recipe.auto_app_count(), recipe.drivers.len(), recipe.boot_critical_drivers().count(),
        recipe.files.len(), recipe.user_file_bytes() >> 20);
    for w in &recipe.warnings {
        println!("  warning: {w}");
    }

    check(!s.hostname.is_empty(), "hostname read");
    check(!s.cpu.is_empty() && s.cpu_cores > 0, "processor read");
    check(s.ram_bytes > 1 << 30, "memory read");
    check(!s.os_build.is_empty(), "Windows build read");
    check(!s.disks.is_empty(), "at least one disk");
    let parts: Vec<_> = s.disks.iter().flat_map(|d| &d.partitions).collect();
    check(parts.iter().filter(|p| p.kind == PartitionKind::System).count() == 1, "exactly one Windows partition");
    check(parts.iter().any(|p| p.kind == PartitionKind::System && p.drive_letter.is_some()), "Windows partition has a letter");
    check(parts.iter().all(|p| p.kind != PartitionKind::Efi || p.drive_letter.is_none()), "EFI partition has no letter");
    check(!recipe.apps.is_empty(), "apps listed");
    check(recipe.apps.iter().all(|a| !a.name.is_empty()), "every app has a name");
    check(recipe.apps.iter().all(|a| a.winget_id.as_deref().is_none_or(|id| !id.starts_with("ARP\\"))), "no uninstallable ARP ids");
    check(recipe.files.iter().all(|f| !f.path.contains('\\') && !f.path.contains("..")), "file paths are clean");
    check(scan::extract_json("x{}").is_some(), "json extraction");
    if parts.iter().any(|p| p.encryption == Encryption::Unknown && p.drive_letter.is_some()) {
        println!("note BitLocker state unknown on a lettered volume (normal on Windows Server or without the shell)");
    }

    let org = organize::propose(&recipe.files);
    check(organize::check_moves(&org.moves, &recipe.files).is_empty(), "organizer moves pass their own checks");
    for mode in [Mode::NewDevice, Mode::RefreshThisPc] {
        let p = plan::rule_plan(&recipe, mode, PlanOptions { organize_files: true });
        let v = safety::check(&p, s, &recipe);
        println!("  {mode:?}: {} steps, safety {}", p.steps.len(), if v.ok { "passed" } else { "BLOCKED" });
        for x in &v.violations {
            println!("    {:?} {}: {}", x.severity, x.rule, x.message);
        }
        // A blocked Refresh plan is a correct answer on a single-volume PC
        // (nowhere safe to put the backup), so only New device must pass.
        if mode == Mode::NewDevice {
            check(v.ok, "new-device plan passes the safety check");
        }
    }
    let _ = fit::advise(&recipe, s);

    let json = carryover_core::recipe_file::to_json(&recipe).expect("serialize");
    check(carryover_core::recipe_file::from_json(&json).is_ok(), "recipe file round-trips");
    if let Some(path) = std::env::args().nth(1) {
        std::fs::write(&path, &json).expect("write recipe");
        println!("recipe written to {path}");
    }

    if problems.is_empty() {
        println!("\nALL CHECKS PASSED");
    } else {
        println!("\n{} CHECK(S) FAILED: {}", problems.len(), problems.join("; "));
        std::process::exit(1);
    }
}
