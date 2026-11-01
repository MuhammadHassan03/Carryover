// Static SVG version of each 3D scene. It is visible until the 3D scene draws its first frame,
// and stays if WebGL is missing or slow, so a stage is never an empty box.
type Kind = "pain" | "scan" | "box" | "roads" | "unpacked" | "stack";

const ink = "#16120E", paper = "#F7EEDD", tape = "#FF4D17", card = "#C78E52", cardDark = "#A8723D", note = "#FFE27A";

function Laptop({ x, y, s = 1, screen = "#2C4A47" }: { x: number; y: number; s?: number; screen?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={ink} strokeWidth={4} strokeLinejoin="round">
      <path d="M-120 0h240l30 34h-300Z" fill={paper} />
      <rect x={-110} y={-150} width={220} height={146} rx={6} fill={paper} />
      <rect x={-98} y={-138} width={196} height={122} fill={screen} />
    </g>
  );
}
function Win({ x, y, r, title }: { x: number; y: number; r: number; title: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`} stroke={ink} strokeWidth={3}>
      <rect width={130} height={86} fill={paper} />
      <rect width={130} height={18} fill={ink} />
      <text x={6} y={13} fontSize={11} fill={paper} stroke="none" fontFamily="system-ui" fontWeight={700}>{title}</text>
      <rect x={10} y={56} width={110} height={10} fill="none" />
      <rect x={12} y={58} width={40} height={6} fill={tape} stroke="none" />
    </g>
  );
}
function Note({ x, y, r, t }: { x: number; y: number; r: number; t: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <rect width={78} height={78} fill={note} stroke={ink} strokeWidth={3} />
      <text x={8} y={30} fontSize={14} fill={ink} fontFamily="cursive">{t}</text>
    </g>
  );
}
function Box({ x, y, s = 1, sealed = true }: { x: number; y: number; s?: number; sealed?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={ink} strokeWidth={4} strokeLinejoin="round">
      <path d="M-90 -40 0 -80 90 -40 0 0Z" fill={sealed ? card : "#7A5230"} />
      <path d="M-90 -40 0 0v100l-90-40Z" fill={card} />
      <path d="M0 0 90 -40v100L0 100Z" fill={cardDark} />
      {sealed ? <path d="M-55 -56 35 -96 55 -86 -35 -46Z" fill={tape} /> : null}
      {sealed ? <path d="M-55 -56-35 -46v60l-20-9Z" fill={tape} /> : null}
      <text x={-74} y={44} fontSize={17} fill={ink} stroke="none" fontFamily="Impact, sans-serif" transform="skewY(24)">PC RECIPE</text>
    </g>
  );
}
function Tile({ x, y, r, c, t }: { x: number; y: number; r: number; c: string; t: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`} stroke={ink} strokeWidth={3}>
      <rect width={92} height={60} fill={paper} />
      <rect width={92} height={16} fill={c} />
      <text x={8} y={44} fontSize={16} fill={ink} stroke="none" fontFamily="Impact, sans-serif">{t}</text>
    </g>
  );
}

export default function StageArt({ kind }: { kind: Kind }) {
  return (
    <svg className="stage-art" viewBox="0 0 640 480" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">
      <ellipse cx={320} cy={410} rx={210} ry={26} fill={ink} opacity={0.12} />
      {kind === "pain" && (
        <>
          <Laptop x={320} y={380} />
          <Win x={70} y={90} r={-8} title="Steam Setup" />
          <Win x={430} y={70} r={7} title="Windows Setup" />
          <Win x={60} y={250} r={5} title="ChromeSetup.exe" />
          <Win x={455} y={250} r={-6} title="VS Code Setup" />
          <Note x={250} y={60} r={-5} t="wifi pw ??" />
          <Note x={360} y={160} r={8} t="Office key?" />
          <g transform="translate(230 170) rotate(4)" stroke={ink} strokeWidth={3}>
            <rect width={150} height={70} fill={ink} />
            <text x={10} y={28} fontSize={16} fill={paper} stroke="none" fontFamily="Impact, sans-serif">BitLocker recovery</text>
          </g>
        </>
      )}
      {kind === "scan" && (
        <>
          <Laptop x={320} y={400} />
          <rect x={222} y={300} width={196} height={8} fill={tape} opacity={0.85} />
          <Tile x={90} y={80} r={-6} c={tape} t="Firefox" />
          <Tile x={210} y={40} r={4} c={ink} t="Wi-Fi driver" />
          <Tile x={340} y={50} r={-3} c={paper} t="Dark mode" />
          <Tile x={460} y={90} r={6} c="#D3AE76" t="Documents" />
          <Tile x={150} y={170} r={3} c={tape} t="Steam" />
          <Tile x={400} y={180} r={-5} c={ink} t="Storage" />
        </>
      )}
      {kind === "box" && <Box x={320} y={300} s={1.6} />}
      {kind === "roads" && (
        <>
          <Laptop x={150} y={380} s={0.7} />
          <Laptop x={490} y={380} s={0.7} screen="#E2C496" />
          <path d="M190 250 Q320 80 450 250" fill="none" stroke={ink} strokeWidth={4} strokeDasharray="10 10" />
          <Box x={320} y={170} s={0.55} />
        </>
      )}
      {kind === "unpacked" && (
        <>
          <Laptop x={320} y={380} screen="#E2C496" />
          <Box x={520} y={360} s={0.55} sealed={false} />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={i} x={232 + (i % 3) * 60} y={256 + Math.floor(i / 3) * 44} width={48} height={34} fill={i % 2 ? tape : paper} stroke={ink} strokeWidth={3} />
          ))}
        </>
      )}
      {kind === "stack" && (
        <>
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={170 + (i % 2) * 18} y={360 - i * 34} width={300} height={28} fill={i % 2 ? card : cardDark} stroke={paper} strokeWidth={3} transform={`rotate(${(i % 3) - 1} 320 ${370 - i * 34})`} />
          ))}
          <rect x={300} y={222} width={40} height={162} fill={tape} opacity={0.9} />
        </>
      )}
    </svg>
  );
}
