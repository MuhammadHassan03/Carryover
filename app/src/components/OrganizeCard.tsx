import { useMemo, useState } from "react";
import { ArrowRight, Copy, Folder, FolderOpen, Sparkles } from "lucide-react";
import type { FileEntry, OrganizePlan } from "../types";
import { bytes } from "../format";

function rootOf(path: string) {
  return path.split("/")[0];
}

function name(path: string) {
  return path.split("/").pop() ?? path;
}

export function OrganizeCard({
  preview,
  files,
  on,
  busy,
  onToggle,
}: {
  preview: OrganizePlan;
  files: FileEntry[];
  on: boolean;
  busy: boolean;
  onToggle: (next: boolean) => void;
}) {
  const [showDupes, setShowDupes] = useState(false);
  const loose = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of preview.moves) counts.set(rootOf(m.from), (counts.get(rootOf(m.from)) ?? 0) + 1);
    return [...counts.entries()];
  }, [preview]);
  const folders = new Set(preview.moves.map((m) => m.to.slice(0, m.to.lastIndexOf("/")))).size;
  const total = files.length;

  if (preview.moves.length === 0) return null;

  return (
    <section className={`card organize ${on ? "is-on" : ""}`} aria-labelledby="org-h">
      <div className="organize-head">
        <span className="organize-icon" aria-hidden="true">
          <Sparkles size={20} />
        </span>
        <div style={{ minWidth: 0 }}>
          <h2 id="org-h">Organize my files while moving</h2>
          <p className="muted" style={{ fontSize: 14 }}>
            {preview.moves.length} loose files into {folders} tidy folders. Nothing is deleted, and every move can be undone.
          </p>
        </div>
        <button
          className="switch"
          role="switch"
          aria-checked={on}
          aria-labelledby="org-h"
          disabled={busy}
          onClick={() => onToggle(!on)}
        >
          <span className="switch-knob" aria-hidden="true" />
        </button>
      </div>

      <div className="organize-body">
        <div className="org-col">
          <p className="faint org-label">Now</p>
          {loose.map(([root, n]) => (
            <div key={root} className="org-folder messy">
              <FolderOpen size={16} aria-hidden="true" />
              <span>{root}</span>
              <span className="faint">{n} loose files</span>
            </div>
          ))}
          <p className="faint" style={{ fontSize: 12.5, marginTop: 8 }}>
            {preview.leftAlone} of {total} files are already in place and stay where they are.
          </p>
        </div>
        <ArrowRight className="org-arrow" size={20} aria-hidden="true" />
        <div className="org-col">
          <p className="faint org-label">After</p>
          <ul className="org-groups">
            {preview.groups.map((g) => (
              <li key={g.rule} title={g.examples.join(", ")}>
                <Folder size={15} aria-hidden="true" />
                <span className="org-name">{g.label}</span>
                <span className="mono faint org-path">{g.folder}</span>
                <span className="chip">{g.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {preview.duplicates.length > 0 && (
        <div className="org-dupes">
          <button className="btn ghost" aria-expanded={showDupes} onClick={() => setShowDupes((v) => !v)}>
            <Copy size={15} aria-hidden="true" />
            {preview.duplicates.length} sets of likely duplicates, {bytes(preview.duplicates.reduce((s, d) => s + d.sizeBytes * (d.paths.length - 1), 0))}{" "}
            you could free. Flagged only, never removed.
          </button>
          {showDupes && (
            <ul className="rows">
              {preview.duplicates.map((d) => (
                <li key={d.paths.join("|")} style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                  <div style={{ minWidth: 0 }}>
                    {d.paths.map((p) => (
                      <div key={p} className="row-title" style={{ fontWeight: 400 }}>
                        <span className="faint">{p.slice(0, p.length - name(p).length)}</span>
                        {name(p)}
                      </div>
                    ))}
                  </div>
                  <span className="chip warn">{bytes(d.sizeBytes)} each</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
