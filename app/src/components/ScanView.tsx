import { useEffect, useState } from "react";
import { Check, ScanLine } from "lucide-react";
import type { Mode } from "../types";

const STAGES = [
  "Reading hardware and Windows version",
  "Mapping disks, partitions and BitLocker",
  "Listing installed apps",
  "Finding drivers, including storage",
  "Writing your PC Recipe",
];

export function ScanView({ mode }: { mode: Mode }) {
  // The real scan is one call, so the list advances on a timer and the last
  // item stays active until the result arrives.
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive((a) => Math.min(a + 1, STAGES.length - 1)), 520);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="page">
      <p className="faint" style={{ fontWeight: 500, marginBottom: 6 }}>
        Step 2 of 4 · {mode === "newDevice" ? "New device" : "Refresh this PC"}
      </p>
      <h1 tabIndex={-1}>Scanning this PC</h1>
      <p className="muted" style={{ marginTop: 8 }}>
        Read-only. Nothing is changed, uploaded or installed.
      </p>

      <div className="scan-wrap">
        <div className="radar" aria-hidden="true">
          <div className="radar-core">
            <ScanLine size={40} strokeWidth={1.6} />
          </div>
        </div>
        <ol className="checklist" aria-live="polite">
          {STAGES.map((s, i) => {
            const state = i < active ? "done" : i === active ? "active" : "";
            return (
              <li key={s} className={state}>
                <span className="tick" aria-hidden="true">
                  {i < active ? <Check size={17} strokeWidth={2.6} /> : i === active ? <span className="spinner" /> : null}
                </span>
                {s}
                <span className="sr-only">{i < active ? " done" : i === active ? " in progress" : " waiting"}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
