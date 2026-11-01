import AppShot, { type Shot } from "./AppShot";

export default function ShotBand({ label, shots }: { label: string; shots: Shot[] }) {
  return (
    <aside className="shot-band" aria-label={label}>
      <div className="wrap shot-grid" data-count={shots.length}>
        <p className="shot-kicker"><span className="marker">The real app</span> {label}</p>
        {shots.map((s, i) => <AppShot key={s.file} shot={s} tilt={i % 2 ? 1.2 : -1} />)}
      </div>
    </aside>
  );
}
