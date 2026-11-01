import { useState } from "react";
import { ArrowRight, Check, Info, TriangleAlert } from "lucide-react";
import type { Mode } from "../types";

function NewDeviceArt() {
  return (
    <svg width="220" height="110" viewBox="0 0 220 110" fill="none" aria-hidden="true">
      <rect x="8" y="22" width="78" height="52" rx="6" stroke="currentColor" strokeWidth="2" />
      <path d="M2 82h90" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="134" y="22" width="78" height="52" rx="6" stroke="currentColor" strokeWidth="2" />
      <path d="M128 82h90" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M92 48c12-18 24-18 36 0" stroke="var(--accent)" strokeWidth="2" strokeDasharray="4 4" />
      <path d="m123 43 5 5-6 3" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={20 + i * 20} y={36} width="14" height="14" rx="3" fill="var(--accent)" opacity={0.35 + i * 0.2} />
      ))}
      {[0, 1, 2].map((i) => (
        <rect key={i} x={146 + i * 20} y={36} width="14" height="14" rx="3" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="3 2" />
      ))}
    </svg>
  );
}

function RefreshArt() {
  return (
    <svg width="220" height="110" viewBox="0 0 220 110" fill="none" aria-hidden="true">
      <rect x="71" y="16" width="78" height="52" rx="6" stroke="currentColor" strokeWidth="2" />
      <path d="M65 76h90" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M96 42a14 14 0 1 1 4 10" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" />
      <path d="m94 34 2 8 8-2" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="40" y="90" width="80" height="10" rx="3" fill="var(--disk-sys)" />
      <rect x="123" y="90" width="57" height="10" rx="3" fill="var(--disk-data)" />
    </svg>
  );
}

const MODES: { id: Mode; title: string; blurb: string; points: string[]; Art: () => JSX.Element }[] = [
  {
    id: "newDevice",
    title: "Set up a new device",
    blurb: "Copy this PC's apps, settings and drivers onto another machine.",
    points: ["Pair once with a QR code on your Wi-Fi", "Fits apps to the new machine's specs", "Old PC stays exactly as it is"],
    Art: NewDeviceArt,
  },
  {
    id: "refreshThisPc",
    title: "Refresh this PC",
    blurb: "Reinstall Windows here, then put everything back.",
    points: ["No USB stick needed", "Recipe and BitLocker key saved first", "Only the Windows drive is erased"],
    Art: RefreshArt,
  },
];

export function ModeSelect({ demo, error, onPick }: { demo: boolean; error: string | null; onPick: (m: Mode) => void }) {
  const [picked, setPicked] = useState<Mode | null>(null);
  return (
    <div className="page">
      <p className="faint" style={{ fontWeight: 500, marginBottom: 6 }}>
        Step 1 of 4
      </p>
      <h1 tabIndex={-1}>What would you like to do?</h1>
      <p className="muted" style={{ marginTop: 8, maxWidth: 620 }}>
        Carryover reads this PC into a small recipe file, plans the rebuild, and checks the plan against safety rules
        before anything runs.
      </p>

      {error && (
        <div className="banner danger section" role="alert">
          <TriangleAlert size={18} />
          <div>
            <strong>The scan didn't finish.</strong> {error}
          </div>
        </div>
      )}

      <div className="modes" role="group" aria-label="Choose a mode">
        {MODES.map(({ id, title, blurb, points, Art }) => (
          <button key={id} className="card mode" aria-pressed={picked === id} onClick={() => setPicked(id)}>
            <div className="mode-art">
              <Art />
            </div>
            <div className="mode-body">
              <h2>{title}</h2>
              <p className="muted">{blurb}</p>
              <ul className="mode-list">
                {points.map((p) => (
                  <li key={p}>
                    <Check size={15} strokeWidth={2.5} aria-hidden="true" /> {p}
                  </li>
                ))}
              </ul>
            </div>
          </button>
        ))}
      </div>

      <div className="actions section" style={{ justifyContent: "space-between" }}>
        {demo ? (
          <div className="banner" style={{ flex: 1, marginRight: 16 }}>
            <Info size={18} />
            <span>
              You're not on Windows, so Carryover will use a sample laptop's data. Everything else works the same.
            </span>
          </div>
        ) : (
          <span className="faint">The scan takes about 20 seconds and only reads.</span>
        )}
        <button className="btn primary" disabled={!picked} onClick={() => picked && onPick(picked)}>
          Scan this PC <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
