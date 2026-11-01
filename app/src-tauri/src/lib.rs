//! Tauri commands. Thin wrappers over `carryover-core`.
//!
//! Security notes:
//! - The web layer gets no filesystem, shell or HTTP permissions. It may only
//!   open one external page: the Gaza relief donation link (capabilities/default.json).
//! - It never passes file paths to Rust: the save dialog runs here.
//! - Plans coming back from the UI are re-checked here, never trusted.

use carryover_core::{fit, organize, plan, recipe_file, safety, scan, DeviceSpecs, Mode, Plan, PlanOptions, Recipe};
use serde::Serialize;
use tauri_plugin_dialog::DialogExt;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Platform {
    can_scan: bool,
    os: &'static str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RuleInfo {
    id: &'static str,
    text: &'static str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Review {
    plan: Plan,
    verdict: safety::Verdict,
    advice: Vec<fit::Advice>,
    rules: Vec<RuleInfo>,
    organize: organize::OrganizePlan,
}

#[tauri::command]
fn platform() -> Platform {
    Platform { can_scan: cfg!(windows), os: std::env::consts::OS }
}

#[tauri::command]
async fn scan(demo: bool) -> Result<Recipe, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let now = carryover_core::now_rfc3339();
        if demo {
            // Tests can make the demo scan as slow as a real one (~16 s on a
            // laptop) to exercise cancel and race paths. Demo data only.
            if let Some(ms) = std::env::var("CARRYOVER_DEMO_DELAY_MS").ok().and_then(|v| v.parse::<u64>().ok()) {
                std::thread::sleep(std::time::Duration::from_millis(ms.min(30_000)));
            }
            scan::demo_recipe(&now)
        } else {
            scan::scan_this_pc(&now)
        }
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn demo_target() -> DeviceSpecs {
    scan::demo_target_specs()
}

/// Build a plan and check it. `target` is the other device in new-device mode.
#[tauri::command]
fn review(recipe: Recipe, mode: Mode, target: Option<DeviceSpecs>, options: Option<PlanOptions>) -> Review {
    let plan = plan::rule_plan(&recipe, mode, options.unwrap_or_default());
    // The checker always runs against the PC this app is running on, which is
    // the recipe's source in both modes during phase 1.
    let verdict = safety::check(&plan, &recipe.source, &recipe);
    let advice = match (mode, &target) {
        (Mode::NewDevice, Some(t)) => fit::advise(&recipe, t),
        _ => fit::advise(&recipe, &recipe.source),
    };
    let rules = safety::RULES.iter().map(|(id, text)| RuleInfo { id, text }).collect();
    let organize = organize::propose(&recipe.files);
    Review { plan, verdict, advice, rules, organize }
}

/// Re-check any plan the UI hands back (for example an AI draft). The UI's
/// copy of a plan is never trusted; this always runs the full rule set.
#[tauri::command]
fn check_plan(recipe: Recipe, plan: Plan) -> safety::Verdict {
    safety::check(&plan, &recipe.source, &recipe)
}

/// Restart Carryover with administrator rights. Windows shows its normal UAC
/// prompt; if the user says no, nothing changes and an explanation comes back.
#[tauri::command]
fn relaunch_as_admin(app: tauri::AppHandle) -> Result<(), String> {
    if cfg!(debug_assertions) {
        return Err("This is a development build. Close it, open PowerShell with \"Run as administrator\", and start it again with npm run tauri dev.".into());
    }
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        let exe = std::env::current_exe().map_err(|e| e.to_string())?;
        let system_root = std::env::var("SystemRoot").unwrap_or_else(|_| r"C:\Windows".into());
        let powershell = format!(r"{system_root}\System32\WindowsPowerShell\v1.0\powershell.exe");
        // Single quotes inside a PowerShell single-quoted string are doubled.
        let target = exe.display().to_string().replace('\'', "''");
        let status = std::process::Command::new(powershell)
            .args(["-NoProfile", "-NonInteractive", "-Command", &format!("Start-Process -FilePath '{target}' -Verb RunAs")])
            .creation_flags(CREATE_NO_WINDOW)
            .status()
            .map_err(|e| e.to_string())?;
        if status.success() {
            app.exit(0);
            return Ok(());
        }
        Err("Windows didn't restart Carryover as administrator. The permission prompt was probably cancelled.".into())
    }
    #[cfg(not(windows))]
    {
        let _ = app;
        Err("Administrator restart is only needed on Windows.".into())
    }
}

/// Ask where to save, then write the recipe file. Returns the saved path, or
/// None if the user cancelled.
#[tauri::command]
async fn save_recipe(app: tauri::AppHandle, recipe: Recipe) -> Result<Option<String>, String> {
    let json = recipe_file::to_json(&recipe).map_err(|e| e.to_string())?;
    let name = format!("{}.carryover.json", recipe.source.hostname.to_lowercase());
    let picked = app
        .dialog()
        .file()
        .set_title("Save PC Recipe")
        .set_file_name(&name)
        .add_filter("Carryover recipe", &["json"])
        .blocking_save_file();
    let Some(path) = picked else { return Ok(None) };
    let path = path.into_path().map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(Some(path.display().to_string()))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![platform, scan, demo_target, review, check_plan, save_recipe, relaunch_as_admin])
        .run(tauri::generate_context!())
        .expect("error while running Carryover");
}
