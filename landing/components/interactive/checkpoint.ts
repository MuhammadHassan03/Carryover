// Chapter 6: the plan goes through the rule checkpoint. "Try a risky plan" gets stopped with reasons.
import type { Api, Chapter, ChapterMod } from "../three/types";

const STOPS = [
  'Stopped: the plan saves the PC Recipe to C:, the drive being erased.',
  'Stopped: "PC Optimizer Pro" was not on the old PC, so it won’t be installed.',
];

export function init(api: Api, ch: Chapter): ChapterMod {
  const sec = ch.sec;
  const stage = sec.querySelector<HTMLElement>(".gate-stage");
  const status = sec.querySelector<HTMLElement>("[data-gate-status]");
  const approve = sec.querySelector<HTMLButtonElement>('[data-act="approve"]');
  const label = sec.querySelector<HTMLElement>("[data-lights-label]");
  const planName = sec.querySelector<HTMLElement>("[data-plan-name]");
  if (!stage || !status || !approve || !label || !planName) return {};
  const lights = Array.from(stage.querySelectorAll<HTMLElement>(".lights span"));
  let timers: number[] = [];
  let state: "idle" | "checking" | "pass" | "stopped" | "approved" = "idle";

  const clear = () => { timers.forEach((t) => clearTimeout(t)); timers = []; };
  const setCls = (c: string) => {
    stage.classList.remove("checking", "pass", "stopped", "approved");
    if (c) stage.classList.add(c);
  };
  const run = (plan: "normal" | "risky") => {
    clear();
    stage.dataset.plan = plan;
    planName.textContent = plan === "risky" ? "(AI draft, risky)" : "(drafted)";
    state = "checking";
    setCls("checking");
    approve.disabled = true;
    status.textContent = "Checking the plan against 13 rules.";
    lights.forEach((l) => l.classList.remove("on", "no"));
    const fast = api.reduced();
    const bad = plan === "risky" ? new Set([0, 1]) : new Set<number>();
    lights.forEach((l, i) => {
      const go = () => {
        l.classList.add(bad.has(i) ? "no" : "on");
        label.textContent = `${i + 1} of 13 rules checked`;
      };
      if (fast) go(); else timers.push(window.setTimeout(go, 90 * (i + 1)));
    });
    const done = () => {
      if (plan === "risky") {
        state = "stopped";
        setCls("stopped");
        status.innerHTML = "";
        STOPS.forEach((s) => { const p = document.createElement("p"); p.className = "stop"; p.textContent = s; status.appendChild(p); });
      } else {
        state = "pass";
        setCls("pass");
        status.textContent = "All 13 rules pass. Nothing runs until you approve.";
        approve.disabled = false;
      }
    };
    if (fast) done(); else timers.push(window.setTimeout(done, 90 * 14 + 150));
  };
  sec.querySelector('[data-act="risky"]')?.addEventListener("click", () => run("risky"));
  sec.querySelector('[data-act="normal"]')?.addEventListener("click", () => run("normal"));
  approve.addEventListener("click", () => {
    if (state !== "pass") return;
    state = "approved";
    setCls("approved");
    approve.disabled = true;
    status.textContent = "Approved by you. Nothing ran before this click.";
  });

  return {
    update(p) {
      // the normal plan reaches the gate as you scroll, then gets checked once
      if (state === "idle" && p >= 0.42) run("normal");
      return false;
    },
  };
}
