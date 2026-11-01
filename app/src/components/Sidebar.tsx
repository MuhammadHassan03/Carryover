import { Check, ExternalLink, Eye, HeartHandshake, RotateCcw } from "lucide-react";
import { api } from "../api";
import { Logo } from "./Logo";

export type Stage = "mode" | "scan" | "recipe" | "plan";

const STEPS: { id: Stage; label: string }[] = [
  { id: "mode", label: "Choose" },
  { id: "scan", label: "Scan" },
  { id: "recipe", label: "Your recipe" },
  { id: "plan", label: "Plan & safety" },
];

export function Sidebar({ stage, demo, onRestart }: { stage: Stage; demo: boolean; onRestart: () => void }) {
  const current = STEPS.findIndex((s) => s.id === stage);
  return (
    <aside className="sidebar" aria-label="Progress">
      <div className="brand">
        <Logo size={30} />
        Carryover
      </div>

      <ol className="stepper">
        {STEPS.map((s, i) => {
          const done = i < current;
          return (
            <li key={s.id} className={done ? "done" : undefined} aria-current={i === current ? "step" : undefined}>
              <span className="dot" aria-hidden="true">
                {done ? <Check size={13} strokeWidth={3} /> : i + 1}
              </span>
              {s.label}
              {done && <span className="sr-only">(done)</span>}
            </li>
          );
        })}
      </ol>

      <div className="side-foot">
        <div className="give">
          <p style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
            <HeartHandshake size={15} aria-hidden="true" /> Free, all of it
          </p>
          <p className="faint" style={{ fontSize: 12.5 }}>
            If Carryover saved you an evening, consider giving to children in Gaza.
          </p>
          <a
            className="give-link"
            href={api.donateUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault();
              void api.openDonate();
            }}
          >
            Donate via PCRF <ExternalLink size={12} aria-hidden="true" />
            <span className="sr-only"> (opens the Palestine Children's Relief Fund website)</span>
          </a>
        </div>
        {demo && <span className="chip warn">Demo data</span>}
        <span className="chip">
          <Eye size={13} aria-hidden="true" /> Read-only preview
        </span>
        <p className="faint" style={{ fontSize: 12.5 }}>
          Nothing on this PC changes in this version. You can look at everything safely.
        </p>
        {stage !== "mode" && (
          <button className="btn ghost" onClick={onRestart} style={{ justifyContent: "flex-start" }}>
            <RotateCcw size={15} aria-hidden="true" /> Start over
          </button>
        )}
      </div>
    </aside>
  );
}
