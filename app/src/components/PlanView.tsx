import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Ban,
  Bot,
  CircleCheck,
  CircleX,
  FlaskConical,
  Info,
  Lightbulb,
  Play,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  Undo2,
} from "lucide-react";
import { api } from "../api";
import type { DeviceSpecs, Mode, Plan, Recipe, Review, Step, Verdict } from "../types";
import { describe, PHASES } from "../format";
import { DiskLegend, DiskMap } from "./DiskMap";
import { OrganizeCard } from "./OrganizeCard";

/** A plan an over-eager AI could plausibly write, built from the real plan. */
function riskyVariant(plan: Plan, recipe: Recipe): Plan {
  const sys = recipe.source.disks.flatMap((d) => d.partitions).find((p) => p.kind === "system");
  const letter = sys?.driveLetter ?? "C";
  const steps: Step[] = plan.steps.map((s) =>
    s.action === "saveRecipe" && plan.mode === "refreshThisPc" ? { action: "saveRecipe", to: { kind: "volume", letter } } : s,
  );
  const at = Math.max(steps.findIndex((s) => s.action === "installApp"), 1);
  steps.splice(at, 0, { action: "installApp", wingetId: "Unknown.Optimizer", name: "PC Optimizer Pro" });
  return { ...plan, steps, planner: "ai" };
}

function VerdictCard({ verdict, ai }: { verdict: Verdict; ai: boolean }) {
  const blocks = verdict.violations.filter((v) => v.severity === "block");
  const warns = verdict.violations.filter((v) => v.severity === "warn");
  return (
    <section className="card" aria-live="polite">
      <div className={`verdict ${verdict.ok ? "ok" : "bad"}`}>
        <span className="verdict-icon" aria-hidden="true">
          {verdict.ok ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
        </span>
        <div>
          <h2>{verdict.ok ? "Safety check passed" : `Blocked: ${blocks.length} problem${blocks.length === 1 ? "" : "s"} found`}</h2>
          <p className="muted">
            {verdict.ok
              ? `All ${verdict.rulesChecked} rules hold${warns.length ? `, with ${warns.length} note${warns.length === 1 ? "" : "s"}` : ""}.`
              : ai
                ? "This is what happens when an AI draft breaks a rule: the plan can't run, and here's why."
                : "Carryover won't run this plan until these are fixed."}
          </p>
        </div>
        <span className={`chip ${verdict.ok ? "ok" : "danger"}`} style={{ marginLeft: "auto" }}>
          {ai ? <Bot size={13} aria-hidden="true" /> : null}
          {ai ? "AI draft" : "Rule planner"}
        </span>
      </div>
      {verdict.violations.length > 0 && (
        <ul className="violations">
          {verdict.violations.map((v, i) => (
            <li key={i} className={v.severity}>
              {v.severity === "block" ? <CircleX size={16} aria-hidden="true" /> : <TriangleAlert size={16} aria-hidden="true" />}
              <span>
                <span className="sr-only">{v.severity === "block" ? "Blocked: " : "Note: "}</span>
                {v.message}
                {v.step != null && <span className="faint"> · step {v.step + 1}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function PlanView({
  review,
  recipe,
  mode,
  target,
  organize,
  onOrganize,
  onBack,
}: {
  review: Review;
  recipe: Recipe;
  mode: Mode;
  target: DeviceSpecs | null;
  organize: boolean;
  onOrganize: (on: boolean) => Promise<void>;
  onBack: () => void;
}) {
  const [plan, setPlan] = useState<Plan>(review.plan);
  const [verdict, setVerdict] = useState<Verdict>(review.verdict);
  const [orgBusy, setOrgBusy] = useState(false);
  // A new review (for example after toggling organize) replaces any AI draft.
  useEffect(() => {
    setPlan(review.plan);
    setVerdict(review.verdict);
  }, [review]);

  async function toggleOrganize(on: boolean) {
    setOrgBusy(true);
    try {
      await onOrganize(on);
    } finally {
      setOrgBusy(false);
    }
  }
  // While a new plan is on its way, the old one must not look current.
  const stale =
    orgBusy ||
    (review.organize.moves.length > 0 && plan.steps.some((s) => s.action === "organizeFiles") !== organize);
  const [checking, setChecking] = useState(false);
  const isAi = plan.planner === "ai";

  async function tryRisky() {
    setChecking(true);
    // In the browser preview the checker isn't available, so use the
    // engine-generated example whose verdict was computed by the real rules.
    const risky = api.inTauri || mode !== "refreshThisPc" ? riskyVariant(review.plan, recipe) : await api.badPlanExample();
    setPlan(risky);
    setVerdict(await api.checkPlan(recipe, risky));
    setChecking(false);
  }
  function reset() {
    setPlan(review.plan);
    setVerdict(review.verdict);
  }

  const flagged = useMemo(() => new Set(verdict.violations.map((v) => v.step).filter((s): s is number => s != null)), [verdict]);
  const numbered = plan.steps.map((s, i) => ({ step: s, i, text: describe(s) }));

  const wipe = plan.steps.find((s) => s.action === "wipeAndInstallWindows");
  const save = plan.steps.find((s) => s.action === "saveRecipe");
  const keepLetter = save && save.action === "saveRecipe" && save.to.kind === "volume" ? save.to.letter : null;
  const bootDisk = recipe.source.disks.find((d) => wipe && wipe.action === "wipeAndInstallWindows" && d.number === wipe.disk);
  const keepPart = bootDisk?.partitions.find((p) => p.driveLetter === keepLetter)?.number;
  const autoCount = plan.steps.filter((s) => s.action === "installApp").length;
  const manualCount = plan.steps.filter((s) => s.action === "manualApp").length;

  return (
    <div className="page">
      <p className="faint" style={{ fontWeight: 500, marginBottom: 6 }}>
        Step 4 of 4 · {mode === "newDevice" ? `New device${target ? `: ${target.model}` : ""}` : "Refresh this PC"}
      </p>
      <h1 tabIndex={-1}>The plan, checked before it runs</h1>
      <p className="muted" style={{ marginTop: 8, maxWidth: 680 }}>
        {plan.steps.length} steps. {autoCount} apps install by themselves and {manualCount} need a moment from you. Every
        step is checked against fixed safety rules, whoever wrote the plan.
      </p>

      <div className="section">
        <VerdictCard verdict={verdict} ai={isAi} />
      </div>

      <div className="section">
        <OrganizeCard preview={review.organize} files={recipe.files} on={organize} busy={false} onToggle={toggleOrganize} />
        {stale && (
          <p className="faint" role="status" style={{ marginTop: 10, fontSize: 13.5 }}>
            Updating the plan…
          </p>
        )}
      </div>

      {review.advice.length > 0 && (
        <section className="section" aria-labelledby="fit-h">
          <div className="section-head">
            <h2 id="fit-h">
              <Lightbulb size={17} aria-hidden="true" style={{ verticalAlign: -2, marginRight: 8 }} />
              {mode === "newDevice" ? "Fitted to the new machine" : "Good to know"}
            </h2>
          </div>
          <div className="advice">
            {review.advice.map((a) => (
              <div key={a.id} className={`advice-item ${a.level}`}>
                {a.level === "heads" ? <TriangleAlert size={17} aria-hidden="true" /> : <Info size={17} aria-hidden="true" />}
                <div>
                  <h3>{a.title}</h3>
                  <p className="muted" style={{ fontSize: 14 }}>
                    {a.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {bootDisk && wipe && wipe.action === "wipeAndInstallWindows" && (
        <section className="section" aria-labelledby="ba-h">
          <div className="section-head">
            <h2 id="ba-h">What happens to your disk</h2>
          </div>
          <div className="card card-pad" style={{ display: "grid", gap: 16 }}>
            <div>
              <p className="faint" style={{ fontSize: 12.5, marginBottom: 6 }}>
                Before
              </p>
              <DiskMap disk={bootDisk} />
            </div>
            <div>
              <p className="faint" style={{ fontSize: 12.5, marginBottom: 6 }}>
                After
              </p>
              <DiskMap disk={bootDisk} erase={wipe.partition} keep={keepPart} />
            </div>
            <DiskLegend withErase />
          </div>
        </section>
      )}

      <section className={`section ${stale ? "is-stale" : ""}`} aria-labelledby="steps-h" aria-busy={stale}>
        <div className="section-head">
          <h2 id="steps-h">Steps</h2>
          {isAi ? (
            <button className="btn" onClick={reset}>
              <Undo2 size={16} aria-hidden="true" /> Back to the safe plan
            </button>
          ) : (
            <button className="btn" onClick={tryRisky} disabled={checking || stale}>
              <FlaskConical size={16} aria-hidden="true" /> {checking ? "Checking…" : "Try a risky AI plan"}
            </button>
          )}
        </div>
        <div style={{ display: "grid", gap: 14 }}>
          {PHASES.map((ph) => {
            const items = numbered.filter((n) => n.text.phase === ph.id);
            if (items.length === 0) return null;
            return (
              <div key={ph.id} className="card phase">
                <div className="phase-head">
                  {ph.label}
                  <span className="faint count" style={{ fontWeight: 400 }}>
                    {items.length} step{items.length === 1 ? "" : "s"}
                  </span>
                </div>
                <ol className="steps">
                  {items.map(({ step, i, text }) => {
                    const bad = flagged.has(i) && !verdict.ok;
                    return (
                      <li key={i} className={bad ? "flagged" : text.destructive ? "destructive" : undefined}>
                        <span className="step-num" aria-hidden="true">
                          {i + 1}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 500 }}>
                            {text.title}
                            {bad && <span className="sr-only"> (blocked by the safety check)</span>}
                          </div>
                          {text.detail && (
                            <div className="muted" style={{ fontSize: 13.5 }}>
                              {text.detail}
                            </div>
                          )}
                          {text.mono && <div className="mono faint">{text.mono}</div>}
                        </div>
                        <span>
                          {bad ? (
                            <span className="chip danger">
                              <Ban size={12} aria-hidden="true" /> Blocked
                            </span>
                          ) : text.destructive ? (
                            <span className="chip accent">Erases</span>
                          ) : text.manual ? (
                            <span className="chip warn">You</span>
                          ) : step.action === "installApp" ? (
                            <span className="chip ok">Auto</span>
                          ) : null}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            );
          })}
        </div>
      </section>

      <section className="section card card-pad" aria-labelledby="rules-h">
        <div className="section-head">
          <h2 id="rules-h">The rules every plan must pass</h2>
          <span className="faint">Plain code, not AI</span>
        </div>
        <ul className="rules">
          {review.rules.map((r) => {
            const broken = verdict.violations.some((v) => v.rule === r.id && v.severity === "block");
            return (
              <li key={r.id}>
                {broken ? (
                  <CircleX size={15} aria-hidden="true" style={{ color: "var(--danger)" }} />
                ) : (
                  <CircleCheck size={15} aria-hidden="true" />
                )}
                <span>
                  {r.text}
                  {broken && <span className="sr-only"> Broken by this plan.</span>}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="sticky-bar">
        <button className="btn ghost" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden="true" /> Back to recipe
        </button>
        <div className="actions">
          <span className="faint" style={{ fontSize: 13 }}>
            Running plans arrives in the next build.
          </span>
          <button className="btn accent" disabled aria-describedby="run-note">
            <Play size={16} aria-hidden="true" /> {mode === "newDevice" ? "Start setup" : "Start refresh"}
          </button>
          <span id="run-note" className="sr-only">
            Disabled in this preview. Nothing will change on your PC.
          </span>
        </div>
      </div>
    </div>
  );
}
