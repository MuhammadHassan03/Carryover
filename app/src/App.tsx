import { useEffect, useRef, useState } from "react";
import { api } from "./api";
import type { DeviceSpecs, Mode, Platform, Recipe, Review } from "./types";
import { Sidebar, type Stage } from "./components/Sidebar";
import { ModeSelect } from "./components/ModeSelect";
import { ScanView } from "./components/ScanView";
import { RecipeView } from "./components/RecipeView";
import { PlanView } from "./components/PlanView";

export default function App() {
  const [stage, setStage] = useState<Stage>("mode");
  const [mode, setMode] = useState<Mode | null>(null);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [target, setTarget] = useState<DeviceSpecs | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [organize, setOrganize] = useState(false);
  // Ticket counters: only the newest request's answer is applied. Without
  // them a slow scan could land after "Start over", or quick switch clicks
  // could finish out of order and leave the switch and the plan disagreeing.
  const scanTicket = useRef(0);
  const reviewTicket = useRef(0);

  useEffect(() => {
    api.platform().then(setPlatform);
  }, []);

  // Move focus to the new page heading so screen readers announce it.
  useEffect(() => {
    document.querySelector<HTMLElement>("main h1")?.focus();
  }, [stage]);

  const demo = platform ? !platform.canScan : true;

  async function startScan(m: Mode) {
    const ticket = ++scanTicket.current;
    setMode(m);
    setError(null);
    setStage("scan");
    try {
      const [r, t] = await Promise.all([api.scan(demo), m === "newDevice" ? api.demoTarget() : Promise.resolve(null)]);
      if (ticket !== scanTicket.current) return; // started over meanwhile
      setRecipe(r);
      setTarget(t);
      setStage("recipe");
    } catch (e) {
      if (ticket !== scanTicket.current) return;
      setError(String(e));
      setStage("mode");
    }
  }

  async function buildPlan() {
    if (!recipe || !mode) return;
    const ticket = ++reviewTicket.current;
    const r = await api.review(recipe, mode, target, organize);
    if (ticket !== reviewTicket.current) return;
    setReview(r);
    setStage("plan");
  }

  async function toggleOrganize(on: boolean) {
    if (!recipe || !mode) return;
    const ticket = ++reviewTicket.current;
    setOrganize(on); // the switch answers at once; the plan follows
    const r = await api.review(recipe, mode, target, on);
    if (ticket !== reviewTicket.current) return; // a newer click won
    setReview(r);
  }

  function restart() {
    scanTicket.current++;
    reviewTicket.current++;
    setStage("mode");
    setRecipe(null);
    setReview(null);
    setTarget(null);
  }

  return (
    <div className="shell">
      <Sidebar stage={stage} demo={demo} onRestart={restart} />
      <main className="main" id="main">
        {stage === "mode" && <ModeSelect demo={demo} error={error} onPick={startScan} />}
        {stage === "scan" && mode && <ScanView mode={mode} />}
        {stage === "recipe" && recipe && mode && (
          <RecipeView recipe={recipe} mode={mode} target={target} demo={demo} onBack={restart} onNext={buildPlan} />
        )}
        {stage === "plan" && review && recipe && mode && (
          <PlanView
            review={review}
            recipe={recipe}
            mode={mode}
            target={target}
            organize={organize}
            onOrganize={toggleOrganize}
            onBack={() => setStage("recipe")}
          />
        )}
      </main>
    </div>
  );
}
