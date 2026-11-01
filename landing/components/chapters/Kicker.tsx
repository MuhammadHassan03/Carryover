export default function Kicker({ tag, children }: { tag: string; children: React.ReactNode }) {
  return (
    <p className="kicker">
      <span>{tag}</span> {children}
    </p>
  );
}
