// Shared Three.js renderer and the hand-inked object kit (laptop, moving box, tiles).
import * as THREE from "three";
import type { GLHandle, View } from "./types";

export { THREE };

export const C = {
  ink: 0x16120e, paper: 0xf4e9d4, kraft: 0xe2c496, card: 0xc78e52, cardDark: 0xa8723d,
  tape: 0xff4d17, note: 0xffe27a,
};
export const CSS = { ink: "#16120E", paper: "#F7EEDD", kraft: "#E2C496", kraft2: "#D3AE76", tape: "#FF4D17", ok: "#17542F", note: "#FFE27A" };

// next/font hashes family names, so canvas text reads the real family from the CSS variables.
function family(v: string, fallback: string) {
  const f = getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  return f ? `${f}, ${fallback}` : fallback;
}
export const F = {
  display: (px: number) => `900 ${px}px ${family("--font-display", "Impact, sans-serif")}`,
  stencil: (px: number) => `900 ${px}px ${family("--font-stencil", "Impact, sans-serif")}`,
  body: (px: number, w = 400) => `${w} ${px}px ${family("--font-body", "system-ui, sans-serif")}`,
  mono: (px: number) => `400 ${px}px ${family("--font-mono", "Courier New, monospace")}`,
  hand: (px: number) => `400 ${px}px ${family("--font-hand", "cursive")}`,
};

let shared: GLHandle | null = null;

export function createGL(): GLHandle {
  if (shared) return shared;
  const canvas = document.createElement("canvas");
  canvas.id = "gl";
  canvas.setAttribute("aria-hidden", "true");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setClearColor(0x000000, 0);
  renderer.autoClear = false;
  document.body.appendChild(canvas);
  const resize = () => {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  };
  resize();
  const render = (views: View[]) => {
    const H = window.innerHeight;
    const W = window.innerWidth;
    renderer.setScissorTest(false);
    renderer.clear();
    renderer.setScissorTest(true);
    for (const v of views) {
      const r = v.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > H || r.right < 0 || r.left > W || r.width < 4) continue;
      const b = 2; // stay inside the stage's ink border
      const x = r.left + b, y = H - r.bottom + b, w = r.width - b * 2, h = r.height - b * 2;
      renderer.setViewport(x, y, w, h);
      renderer.setScissor(x, y, w, h);
      const aspect = w / h;
      if (v.camera.aspect !== aspect) {
        v.camera.aspect = aspect;
        v.fit?.(aspect);
        v.camera.updateProjectionMatrix();
      }
      renderer.render(v.scene, v.camera);
      // the 3D scene has really drawn: hide the static SVG version underneath
      if (!v.el.classList.contains("gl-live")) v.el.classList.add("gl-live");
    }
  };
  const dispose = () => {
    renderer.dispose();
    canvas.remove();
    shared = null;
  };
  shared = { renderer, canvas, render, resize, dispose };
  return shared;
}

// Ink look: flat toon shading plus a back-face hull for a thick printed outline.
let grad: THREE.DataTexture | null = null;
function gradientMap() {
  if (grad) return grad;
  grad = new THREE.DataTexture(new Uint8Array([110, 190, 255]), 3, 1, THREE.RedFormat);
  grad.minFilter = grad.magFilter = THREE.NearestFilter;
  grad.needsUpdate = true;
  return grad;
}
const matCache = new Map<number, THREE.MeshToonMaterial>();
export function toon(color: number) {
  let m = matCache.get(color);
  if (!m) { m = new THREE.MeshToonMaterial({ color, gradientMap: gradientMap() }); matCache.set(color, m); }
  return m;
}
const hullMat = new THREE.MeshBasicMaterial({ color: C.ink, side: THREE.BackSide });
const geoCache = new Map<string, THREE.BoxGeometry>();
function boxGeo(w: number, h: number, d: number) {
  const k = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}`;
  let g = geoCache.get(k);
  if (!g) { g = new THREE.BoxGeometry(w, h, d); geoCache.set(k, g); }
  return g;
}
export type InkBox = THREE.Group & { userData: { body: THREE.Mesh } };
export function inkBox(w: number, h: number, d: number, color: number, t = 0.035): InkBox {
  const g = new THREE.Group() as InkBox;
  const m = new THREE.Mesh(boxGeo(w, h, d), toon(color));
  const hull = new THREE.Mesh(boxGeo(w + t * 2, h + t * 2, d + t * 2), hullMat);
  g.add(hull, m);
  g.userData.body = m;
  return g;
}

export function lights(scene: THREE.Scene) {
  scene.add(new THREE.AmbientLight(0xffffff, 1.35));
  const d = new THREE.DirectionalLight(0xffffff, 2.1);
  d.position.set(3, 6, 5);
  scene.add(d);
}

// Flat blob shadow: cheaper than shadow maps and fits the print look.
let shadowTex: THREE.CanvasTexture | null = null;
export function blobShadow(w: number, d: number, opacity = 0.22) {
  if (!shadowTex) {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const x = c.getContext("2d")!;
    const gr = x.createRadialGradient(64, 64, 8, 64, 64, 64);
    gr.addColorStop(0, "rgba(22,18,14,1)");
    gr.addColorStop(1, "rgba(22,18,14,0)");
    x.fillStyle = gr;
    x.fillRect(0, 0, 128, 128);
    shadowTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

export type Draw = (x: CanvasRenderingContext2D, w: number, h: number) => void;
export function canvasTex(w: number, h: number, draw: Draw) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const x = c.getContext("2d")!;
  draw(x, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
/** Redraw an existing canvas texture in place. */
export function redraw(t: THREE.CanvasTexture, draw: Draw) {
  const c = t.image as HTMLCanvasElement;
  draw(c.getContext("2d")!, c.width, c.height);
  t.needsUpdate = true;
}
export function texPlane(w: number, h: number, tex: THREE.Texture, transparent = false) {
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent, toneMapped: false }));
}

export async function fontsReady() {
  try {
    await Promise.all([F.display(40), F.stencil(40), F.mono(30), F.hand(30), F.body(30, 700), F.body(30)].map((f) => document.fonts.load(f)));
  } catch {
    /* fall back to system fonts */
  }
}

export type Laptop = THREE.Group & { userData: { hinge: THREE.Group; screen: THREE.Mesh; screenTex: THREE.CanvasTexture } };
export function makeLaptop(opts: { color?: number; screenTex?: THREE.CanvasTexture } = {}): Laptop {
  const color = opts.color ?? C.paper;
  const g = new THREE.Group() as Laptop;
  const base = inkBox(3.4, 0.16, 2.3, color);
  base.position.y = 0.08;
  g.add(base);
  const deck = texPlane(3.1, 1.15, keyboardTex());
  deck.rotation.x = -Math.PI / 2;
  deck.position.set(0, 0.165, -0.38);
  g.add(deck);
  const pad = inkBox(1.0, 0.01, 0.6, color, 0.02);
  pad.position.set(0, 0.165, 0.68);
  g.add(pad);
  const hinge = new THREE.Group();
  hinge.position.set(0, 0.16, -1.12);
  g.add(hinge);
  const lid = inkBox(3.4, 2.2, 0.1, color);
  lid.position.y = 1.1;
  hinge.add(lid);
  const screenTex = opts.screenTex || canvasTex(512, 320, (x, w, h) => { x.fillStyle = "#26332F"; x.fillRect(0, 0, w, h); });
  const screen = texPlane(3.1, 1.94, screenTex);
  screen.position.set(0, 1.1, 0.056);
  hinge.add(screen);
  hinge.rotation.x = -0.22;
  g.userData = { hinge, screen, screenTex };
  return g;
}

let kbTex: THREE.CanvasTexture | null = null;
function keyboardTex() {
  if (kbTex) return kbTex;
  kbTex = canvasTex(512, 190, (x, w, h) => {
    x.fillStyle = CSS.paper; x.fillRect(0, 0, w, h);
    x.strokeStyle = CSS.ink; x.lineWidth = 3;
    const rows = 5, cols = 14, kw = (w - 24) / cols, kh = (h - 20) / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (r === 4 && c > 3 && c < 10) { if (c === 4) x.strokeRect(12 + c * kw + 2, 10 + r * kh + 2, kw * 6 - 4, kh - 4); continue; }
      x.strokeRect(12 + c * kw + 2, 10 + r * kh + 2, kw - 4, kh - 4);
    }
  });
  return kbTex;
}

export type MovingBox = {
  group: THREE.Group; W: number; H: number; D: number;
  setOpen: (o: number) => void;
  setTape: (t: number) => void;
};
// Moving box with four flaps that open (1) or shut (0), tape and a stenciled label.
export function makeBox(opts: { w?: number; h?: number; d?: number; label?: string } = {}): MovingBox {
  const W = opts.w ?? 2.2, H = opts.h ?? 1.5, D = opts.d ?? 1.6, T = 0.06;
  const g = new THREE.Group();
  const col = C.card;
  const add = (b: THREE.Object3D, x: number, y: number, z: number) => { b.position.set(x, y, z); g.add(b); };
  add(inkBox(W, T, D, col), 0, T / 2, 0);
  add(inkBox(W, H, T, col), 0, H / 2, D / 2 - T / 2);
  add(inkBox(W, H, T, C.cardDark), 0, H / 2, -D / 2 + T / 2);
  add(inkBox(T, H, D - T * 2, C.cardDark), -W / 2 + T / 2, H / 2, 0);
  add(inkBox(T, H, D - T * 2, col), W / 2 - T / 2, H / 2, 0);
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(W - T * 2, D - T * 2), toon(0x7a5230));
  inner.rotation.x = -Math.PI / 2; inner.position.y = T + 0.002; g.add(inner);

  const label = texPlane(W * 0.82, H * 0.62, labelTex(opts.label || "PC RECIPE"), true);
  label.position.set(0, H * 0.48, D / 2 + 0.04);
  g.add(label);
  const side = texPlane((D - 0.2) * 0.9, H * 0.6, sideTex(), true);
  side.rotation.y = Math.PI / 2; side.position.set(W / 2 + 0.04, H * 0.5, 0);
  g.add(side);

  const flaps: { pivot: THREE.Group; axis: "x" | "z"; sign: number }[] = [];
  const mk = (w: number, d: number, px: number, pz: number, ox: number, oz: number, axis: "x" | "z", sign: number, y: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(px, y, pz);
    const f = inkBox(w, T * 0.8, d, col, 0.03);
    f.position.set(ox, 0, oz);
    pivot.add(f);
    g.add(pivot);
    flaps.push({ pivot, axis, sign });
  };
  mk(W - 0.04, D / 2 - 0.02, 0, D / 2, 0, -D / 4, "x", 1, H + 0.06);
  mk(W - 0.04, D / 2 - 0.02, 0, -D / 2, 0, D / 4, "x", -1, H + 0.06);
  mk(W / 2 - 0.02, D - 0.04, -W / 2, 0, W / 4, 0, "z", 1, H);
  mk(W / 2 - 0.02, D - 0.04, W / 2, 0, -W / 4, 0, "z", -1, H);

  const tapeTopPivot = new THREE.Group();
  tapeTopPivot.position.set(0, H + 0.12, D / 2 + 0.02);
  const tapeTop = inkBox(0.42, 0.02, D + 0.04, C.tape, 0.02);
  tapeTop.position.z = -(D + 0.04) / 2;
  tapeTopPivot.add(tapeTop);
  g.add(tapeTopPivot);
  const tapeFrontPivot = new THREE.Group();
  tapeFrontPivot.position.set(0, H + 0.12, D / 2 + 0.06);
  const tapeFront = inkBox(0.42, H * 0.42, 0.02, C.tape, 0.02);
  tapeFront.position.y = -H * 0.21;
  tapeFrontPivot.add(tapeFront);
  g.add(tapeFrontPivot);

  const box: MovingBox = {
    group: g, W, H, D,
    setOpen(o) {
      // shutting: side flaps fold down first, then front and back go over them
      const sideA = 2.25 * clamp01(o * 2 - 1);
      const fb = 2.25 * clamp01(o * 2);
      flaps.forEach((f, i) => { f.pivot.rotation[f.axis] = (i < 2 ? fb : sideA) * f.sign; });
    },
    setTape(t) {
      const a = Math.min(1, t * 1.6);
      const b = Math.max(0, t * 1.6 - 0.6);
      tapeTopPivot.scale.z = Math.max(0.0001, a);
      tapeTopPivot.visible = a > 0.001;
      tapeFrontPivot.scale.y = Math.max(0.0001, Math.min(1, b));
      tapeFrontPivot.visible = b > 0.001;
    },
  };
  box.setOpen(1);
  box.setTape(0);
  return box;
}

function labelTex(text: string) {
  return canvasTex(512, 300, (x, w, h) => {
    x.clearRect(0, 0, w, h);
    x.strokeStyle = CSS.ink; x.lineWidth = 8;
    x.strokeRect(10, 10, w - 20, h - 20);
    x.fillStyle = CSS.ink;
    x.font = F.stencil(104);
    x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText(text, w / 2, h * 0.42);
    x.font = F.mono(34);
    x.fillText("apps, drivers, settings", w / 2, h * 0.78);
  });
}
function sideTex() {
  return canvasTex(400, 260, (x, w, h) => {
    x.clearRect(0, 0, w, h);
    x.fillStyle = CSS.ink; x.strokeStyle = CSS.ink; x.lineWidth = 10; x.lineCap = "round";
    for (const cx of [w * 0.32, w * 0.68]) {
      x.beginPath(); x.moveTo(cx, h * 0.62); x.lineTo(cx, h * 0.2); x.stroke();
      x.beginPath(); x.moveTo(cx - 32, h * 0.34); x.lineTo(cx, h * 0.14); x.lineTo(cx + 32, h * 0.34); x.stroke();
    }
    x.font = F.stencil(46);
    x.textAlign = "center";
    x.fillText("THIS WAY UP", w / 2, h * 0.88);
  });
}

export type TileKind = "app" | "drv" | "set" | "file";
const KIND_COLOR: Record<TileKind, string> = { app: CSS.tape, drv: CSS.ink, set: CSS.paper, file: CSS.kraft2 };
const KIND_LABEL: Record<TileKind, string> = { app: "APP", drv: "DRIVER", set: "SETTING", file: "FILES" };
export function tileTex(label: string, kind: TileKind) {
  return canvasTex(300, 200, (x, w, h) => {
    x.fillStyle = CSS.paper; x.fillRect(0, 0, w, h);
    x.fillStyle = KIND_COLOR[kind]; x.fillRect(0, 0, w, 54);
    x.fillStyle = kind === "drv" ? CSS.paper : CSS.ink;
    x.font = F.mono(30);
    x.textBaseline = "middle";
    x.fillText(KIND_LABEL[kind], 16, 29);
    x.fillStyle = CSS.ink;
    x.font = F.display(54);
    x.fillText(label, 16, 128, w - 32);
    x.lineWidth = 6; x.strokeStyle = CSS.ink; x.strokeRect(3, 3, w - 6, h - 6);
  });
}
export function makeTile(label: string, kind: TileKind, s = 1) {
  const g = new THREE.Group();
  const body = inkBox(1.2 * s, 0.8 * s, 0.06, C.paper, 0.03);
  g.add(body);
  const face = texPlane(1.2 * s, 0.8 * s, tileTex(label, kind));
  face.position.z = 0.032;
  g.add(face);
  const back = face.clone(); back.rotation.y = Math.PI; back.position.z = -0.032;
  g.add(back);
  g.userData.kind = kind;
  return g;
}

/** Map a pointer event on a stage element to normalized device coordinates. */
export function ndc(el: HTMLElement, ev: PointerEvent, out = new THREE.Vector2()) {
  const r = el.getBoundingClientRect();
  out.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  return out;
}

/** Drag-to-turn helper for a group inside a stage. Returns the current extra yaw. */
export function dragSpin(el: HTMLElement, onMove?: () => void) {
  const s = { yaw: 0, pitch: 0, vy: 0, dragging: false };
  let lx = 0, ly = 0;
  el.addEventListener("pointerdown", (e) => { s.dragging = true; lx = e.clientX; ly = e.clientY; el.setPointerCapture(e.pointerId); });
  el.addEventListener("pointermove", (e) => {
    if (!s.dragging) return;
    const dx = e.clientX - lx, dy = e.clientY - ly;
    lx = e.clientX; ly = e.clientY;
    s.vy = dx * 0.01;
    s.yaw += dx * 0.01;
    s.pitch = Math.max(-0.3, Math.min(0.35, s.pitch + dy * 0.004));
    onMove?.();
  });
  const end = () => { s.dragging = false; };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
  return s;
}

export const ease = {
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  back: (t: number) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
};
export function clamp01(v: number) { return v < 0 ? 0 : v > 1 ? 1 : v; }
export const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
