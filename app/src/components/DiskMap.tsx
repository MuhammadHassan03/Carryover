import { Lock } from "lucide-react";
import type { Disk, Partition } from "../types";
import { bytes } from "../format";

const KIND_LABEL: Record<Partition["kind"], string> = {
  efi: "EFI",
  reserved: "Reserved",
  recovery: "Recovery",
  system: "Windows",
  data: "Data",
};

/**
 * One bar per disk, segments sized by partition size (with a floor so tiny
 * system partitions stay visible). `erase` marks the partition a plan erases;
 * `keep` marks the one that holds the saved recipe.
 */
export function DiskMap({ disk, erase, keep, caption }: { disk: Disk; erase?: number; keep?: number; caption?: string }) {
  const total = disk.partitions.reduce((s, p) => s + p.sizeBytes, 0) || 1;
  const summary = disk.partitions
    .map((p) => `${p.driveLetter ? p.driveLetter + ": " : ""}${KIND_LABEL[p.kind]} ${bytes(p.sizeBytes)}${p.number === erase ? ", erased" : ""}${p.number === keep ? ", keeps your recipe" : ""}`)
    .join("; ");

  return (
    <figure className="disk" style={{ margin: 0 }}>
      <div className="disk-bar" role="img" aria-label={`Disk ${disk.number}, ${disk.model}: ${summary}`}>
        {disk.partitions.map((p) => {
          const grow = Math.max(p.sizeBytes / total, 0.035);
          const used = p.freeBytes != null && p.sizeBytes ? 1 - p.freeBytes / p.sizeBytes : 0;
          const cls = p.number === erase ? "seg erase" : `seg ${p.kind}`;
          const big = grow > 0.12;
          return (
            <div key={p.number} className={cls} style={{ flexGrow: grow, flexBasis: 0 }} title={`${KIND_LABEL[p.kind]} · ${bytes(p.sizeBytes)}`}>
              {p.number !== erase && used > 0 && <div className="used" style={{ width: `${used * 100}%` }} />}
              {big && (
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {p.driveLetter ? `${p.driveLetter}:` : ""} {p.label || KIND_LABEL[p.kind]}
                  {p.encryption === "bitLocker" && <Lock size={12} aria-hidden="true" />}
                  <span style={{ fontWeight: 400, opacity: 0.9 }}>{bytes(p.sizeBytes)}</span>
                  {p.number === erase && <span style={{ fontWeight: 600 }}>· erased</span>}
                  {p.number === keep && <span style={{ fontWeight: 600 }}>· recipe saved here</span>}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {caption && <figcaption className="faint" style={{ fontSize: 12.5 }}>{caption}</figcaption>}
    </figure>
  );
}

export function DiskLegend({ withErase }: { withErase?: boolean }) {
  return (
    <div className="legend" aria-hidden="true">
      <span><i style={{ background: "var(--disk-sys)" }} />Windows</span>
      <span><i style={{ background: "var(--disk-data)" }} />Data</span>
      <span><i style={{ background: "var(--disk-efi)" }} />Boot (never touched)</span>
      <span><i style={{ background: "var(--disk-rec)" }} />Recovery (never touched)</span>
      <span><i style={{ background: "rgb(0 0 0 / .25)" }} />Used space</span>
      {withErase && (
        <span>
          <i style={{ background: "repeating-linear-gradient(-45deg,var(--disk-sys),var(--disk-sys) 3px,#7c2d12 3px,#7c2d12 6px)" }} />
          Erased and reinstalled
        </span>
      )}
    </div>
  );
}
