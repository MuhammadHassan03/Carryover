//! Writes demo JSON for the UI's browser preview mode:
//! `cargo run -p carryover-core --example fixtures -- app/src/mock`
use carryover_core::{fit, organize, plan, safety, scan, Location, Mode, PlanOptions, Step};
use serde_json::json;

fn main() {
    let dir = std::env::args().nth(1).unwrap_or_else(|| "app/src/mock".into());
    let recipe = scan::demo_recipe("2026-11-02T03:10:00Z").unwrap();
    let target = scan::demo_target_specs();
    let rules: Vec<_> = safety::RULES.iter().map(|(id, text)| json!({"id": id, "text": text})).collect();
    let org = organize::propose(&recipe.files);
    let review = |mode: Mode, organize_files: bool| {
        let p = plan::rule_plan(&recipe, mode, PlanOptions { organize_files });
        let v = safety::check(&p, &recipe.source, &recipe);
        let a = if mode == Mode::NewDevice { fit::advise(&recipe, &target) } else { fit::advise(&recipe, &recipe.source) };
        json!({"plan": p, "verdict": v, "advice": a, "rules": rules, "organize": org})
    };
    // A plan an over-eager AI might write: recipe saved to the drive being erased,
    // plus an app that was never on the PC.
    let mut bad = plan::rule_plan(&recipe, Mode::RefreshThisPc, PlanOptions::default());
    bad.planner = "ai".into();
    bad.steps[0] = Step::SaveRecipe { to: Location::Volume { letter: 'C' } };
    bad.steps.insert(6, Step::InstallApp { winget_id: "Unknown.Optimizer".into(), name: "PC Optimizer Pro".into() });
    let bad_verdict = safety::check(&bad, &recipe.source, &recipe);
    let write = |name: &str, v: serde_json::Value| std::fs::write(format!("{dir}/{name}.json"), serde_json::to_string_pretty(&v).unwrap()).unwrap();
    write("recipe", serde_json::to_value(&recipe).unwrap());
    write("target", serde_json::to_value(&target).unwrap());
    for (mode, name) in [(Mode::NewDevice, "newDevice"), (Mode::RefreshThisPc, "refreshThisPc")] {
        write(&format!("review-{name}"), review(mode, false));
        write(&format!("review-{name}-organized"), review(mode, true));
    }
    write("bad-plan", json!({"plan": bad, "verdict": bad_verdict}));
    println!("fixtures written to {dir}");
}
