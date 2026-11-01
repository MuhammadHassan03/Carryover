import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Cpu,
  FolderOpen,
  HardDrive,
  Laptop,
  Lock,
  MemoryStick,
  MonitorCog,
  Package,
  Save,
  Search,
  ShieldCheck,
  ShieldEllipsis,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import { api } from "../api";
import type { App, DeviceSpecs, Mode, Recipe } from "../types";
import { bytes } from "../format";
import { DiskLegend, DiskMap } from "./DiskMap";

function initials(name: string) {
  const w = name.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  return ((w[0]?.[0] ?? "?") + (w[1]?.[0] ?? "")).toUpperCase();
}

function Stat({ icon, label, value }: { icon: JSX.Element; label: string; value: string }) {
  return (
    <div className="stat">
      <span className="label">
        {icon}
        {label}
      </span>
      <span className="value" title={value}>
        {value}
      </span>
    </div>
  );
}

function DeviceCard({ specs, title, tag }: { specs: DeviceSpecs; title: string; tag?: JSX.Element }) {
  const yesNo = (v: boolean | null) => (v == null ? "Unknown" : v ? "On" : "Off");
  return (
    <section className="card card-pad" aria-label={title}>
      <div className="device-head">
        <span className="device-icon" aria-hidden="true">
          <Laptop size={22} />
        </span>
        <div style={{ minWidth: 0 }}>
          <p className="faint" style={{ fontSize: 12.5 }}>
            {title}
          </p>
          <h2 style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{specs.model || specs.hostname}</h2>
        </div>
        <div style={{ marginLeft: "auto" }}>{tag}</div>
      </div>
      <div className="grid-4">
        <Stat icon={<Cpu size={13} aria-hidden="true" />} label="Processor" value={specs.cpu.replace(/\(R\)|\(TM\)/g, "")} />
        <Stat icon={<MemoryStick size={13} aria-hidden="true" />} label="Memory" value={bytes(specs.ramBytes)} />
        <Stat icon={<MonitorCog size={13} aria-hidden="true" />} label="Graphics" value={specs.gpus[0] ?? "Unknown"} />
        <Stat
          icon={<ShieldCheck size={13} aria-hidden="true" />}
          label="Windows"
          value={`${specs.osName.replace("Microsoft ", "")} · ${specs.osBuild}`}
        />
      </div>
      <div className="actions" style={{ marginTop: 12 }}>
        <span className="chip">{specs.firmware === "uefi" ? "UEFI" : specs.firmware === "bios" ? "Legacy BIOS" : "Firmware unknown"}</span>
        <span className="chip">TPM {yesNo(specs.tpmPresent)}</span>
        <span className="chip">Secure Boot {yesNo(specs.secureBoot)}</span>
      </div>
    </section>
  );
}

type Filter = "all" | "auto" | "manual";

function AppsPanel({ apps }: { apps: App[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const auto = apps.filter((a) => a.wingetId).length;
  const shown = useMemo(
    () =>
      apps.filter(
        (a) =>
          (filter === "all" || (filter === "auto") === Boolean(a.wingetId)) &&
          (q === "" || a.name.toLowerCase().includes(q.toLowerCase())),
      ),
    [apps, filter, q],
  );
  const tabs: [Filter, string][] = [
    ["all", `All ${apps.length}`],
    ["auto", `Automatic ${auto}`],
    ["manual", `Needs you ${apps.length - auto}`],
  ];

  return (
    <section className="section" aria-labelledby="apps-h">
      <div className="section-head">
        <h2 id="apps-h">
          <Package size={17} aria-hidden="true" style={{ verticalAlign: -2, marginRight: 8 }} />
          Apps
        </h2>
        <span className="faint">
          {auto} of {apps.length} reinstall automatically
        </span>
      </div>
      <div className="toolbar">
        <div className="tabs" role="tablist" aria-label="Filter apps">
          {tabs.map(([id, label]) => (
            <button key={id} role="tab" aria-selected={filter === id} onClick={() => setFilter(id)}>
              {label}
            </button>
          ))}
        </div>
        <label className="search">
          <Search size={15} aria-hidden="true" className="faint" />
          <span className="sr-only">Search apps</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search apps" />
        </label>
      </div>
      <div className="card">
        <ul className="rows scroll-list" aria-live="polite">
          {shown.map((a) => (
            <li key={a.name}>
              <span className="app-icon" aria-hidden="true">
                {initials(a.name)}
              </span>
              <div style={{ minWidth: 0 }}>
                <div className="row-title">{a.name}</div>
                <div className="row-sub">
                  {a.wingetId ? <span className="mono">{a.wingetId}</span> : "Not in a package source"}
                  {a.version ? ` · ${a.version}` : ""}
                </div>
              </div>
              {a.wingetId ? (
                <span className="chip ok">Automatic</span>
              ) : (
                <span className="chip warn">Needs you</span>
              )}
            </li>
          ))}
          {shown.length === 0 && <li className="empty">No apps match "{q}".</li>}
        </ul>
      </div>
    </section>
  );
}

function DriversPanel({ recipe }: { recipe: Recipe }) {
  return (
    <section className="section" aria-labelledby="drv-h">
      <div className="section-head">
        <h2 id="drv-h">
          <Wrench size={17} aria-hidden="true" style={{ verticalAlign: -2, marginRight: 8 }} />
          Drivers
        </h2>
        <span className="faint">{recipe.drivers.length} from hardware makers</span>
      </div>
      <div className="card">
        <ul className="rows">
          {recipe.drivers.map((d) => (
            <li key={d.infName}>
              <span className="app-icon" aria-hidden="true">
                <HardDrive size={15} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div className="row-title">{d.deviceName}</div>
                <div className="row-sub">
                  {d.provider} · <span className="mono">{d.infName}</span> · {d.version}
                </div>
              </div>
              {d.bootCritical ? <span className="chip accent">Setup needs this</span> : <span className="chip">{d.class}</span>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const FOLDERS = ["Desktop", "Downloads", "Documents", "Pictures", "Videos", "Music"];

function FilesPanel({ recipe }: { recipe: Recipe }) {
  if (recipe.files.length === 0) return null;
  const by = (root: string) => recipe.files.filter((f) => f.path.startsWith(root + "/"));
  return (
    <section className="section" aria-labelledby="files-h">
      <div className="section-head">
        <h2 id="files-h">
          <FolderOpen size={17} aria-hidden="true" style={{ verticalAlign: -2, marginRight: 8 }} />
          Your files
        </h2>
        <span className="faint">
          {recipe.files.length} files · {bytes(recipe.files.reduce((s, f) => s + f.sizeBytes, 0))} · names and sizes only
        </span>
      </div>
      <div className="folders">
        {FOLDERS.map((root) => {
          const fs = by(root);
          return (
            <div key={root} className="stat">
              <span className="label">{root}</span>
              <span className="value">{fs.length} files</span>
              <span className="faint" style={{ fontSize: 12.5 }}>
                {bytes(fs.reduce((s, f) => s + f.sizeBytes, 0))}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function RecipeView({
  recipe,
  mode,
  target,
  demo,
  onBack,
  onNext,
}: {
  recipe: Recipe;
  mode: Mode;
  target: DeviceSpecs | null;
  demo: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  const [saved, setSaved] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminBusy, setAdminBusy] = useState(false);
  const needsAdmin = recipe.elevated === false && !demo;

  async function restartAsAdmin() {
    setAdminBusy(true);
    setAdminError(null);
    try {
      await api.relaunchAsAdmin();
    } catch (e) {
      setAdminError(String(e).replace(/^Error: /, ""));
    } finally {
      setAdminBusy(false);
    }
  }
  const [busy, setBusy] = useState(false);
  const s = recipe.source;
  const encrypted = s.disks.some((d) => d.partitions.some((p) => p.encryption === "bitLocker"));

  async function save() {
    setBusy(true);
    try {
      setSaved(await api.saveRecipe(recipe));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <p className="faint" style={{ fontWeight: 500, marginBottom: 6 }}>
        Step 3 of 4
      </p>
      <h1 tabIndex={-1}>Here's what makes this PC yours</h1>
      <p className="muted" style={{ marginTop: 8 }}>
        {recipe.apps.length} apps, {recipe.drivers.length} drivers, {recipe.files.length} files and {s.disks.length} disk
        {s.disks.length === 1 ? "" : "s"}, written into one recipe file.
      </p>

      {recipe.warnings.length > 0 && (
        <div className="banner warn section">
          <TriangleAlert size={18} />
          <div style={{ display: "grid", gap: 10, flex: 1 }}>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {recipe.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            {needsAdmin && (
              <div className="actions">
                <button className="btn" onClick={restartAsAdmin} disabled={adminBusy}>
                  <ShieldEllipsis size={16} aria-hidden="true" />
                  {adminBusy ? "Waiting for Windows…" : "Restart as administrator"}
                </button>
                <span className="faint" style={{ fontSize: 13 }}>
                  Windows will ask for permission. Carryover still only reads.
                </span>
              </div>
            )}
            {adminError && (
              <p role="alert" style={{ fontSize: 13.5 }}>
                {adminError}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="section" style={{ display: "grid", gap: 16 }}>
        <DeviceCard specs={s} title="This PC" tag={demo ? <span className="chip warn">Sample data</span> : undefined} />
        {mode === "newDevice" && target && (
          <DeviceCard
            specs={target}
            title="New device"
            tag={<span className="chip">Sample until pairing ships</span>}
          />
        )}
      </div>

      <section className="section" aria-labelledby="disk-h">
        <div className="section-head">
          <h2 id="disk-h">
            <HardDrive size={17} aria-hidden="true" style={{ verticalAlign: -2, marginRight: 8 }} />
            Disks
          </h2>
          {encrypted && (
            <span className="chip accent">
              <Lock size={12} aria-hidden="true" /> BitLocker is on
            </span>
          )}
        </div>
        <div className="card card-pad" style={{ display: "grid", gap: 14 }}>
          {s.disks.map((d) => (
            <div key={d.number} style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 500 }}>
                  Disk {d.number} · {d.model}
                </span>
                <span className="faint">
                  {d.bus} · {bytes(d.sizeBytes)}
                </span>
              </div>
              <DiskMap disk={d} />
            </div>
          ))}
          <DiskLegend />
        </div>
      </section>

      <FilesPanel recipe={recipe} />
      <AppsPanel apps={recipe.apps} />
      <DriversPanel recipe={recipe} />

      <div className="sticky-bar">
        <div className="actions">
          <button className="btn ghost" onClick={onBack}>
            <ArrowLeft size={16} aria-hidden="true" /> Back
          </button>
          <button className="btn" onClick={save} disabled={busy || !api.inTauri} title={api.inTauri ? undefined : "Available in the desktop app"}>
            <Save size={16} aria-hidden="true" /> {busy ? "Saving…" : "Save recipe"}
          </button>
          {saved && (
            <span className="chip ok" role="status">
              Saved to {saved}
            </span>
          )}
        </div>
        <button className="btn primary" onClick={onNext}>
          Plan the rebuild <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
