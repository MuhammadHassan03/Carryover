// Chapter 1: the old way. Clutter piles up around an old laptop while the weekend clock runs.
import { THREE, C, CSS, F, lights, makeLaptop, canvasTex, texPlane, inkBox, blobShadow, fontsReady, ndc, ease, seg, clamp01 } from "./gl";
import type { Api, Chapter, ChapterMod } from "./types";

type Spec = { t: string; title?: string; lines?: string[]; progress?: number; buttons?: string[]; bar?: string };
type WinOpts = { bar?: string; warn?: boolean; big?: boolean; progress?: number; buttons?: string[] };

function windowTex(title: string, lines: string[], opts: WinOpts = {}) {
  return canvasTex(400, 270, (x, w, h) => {
    x.fillStyle = CSS.paper; x.fillRect(0, 0, w, h);
    x.fillStyle = opts.bar || CSS.ink; x.fillRect(0, 0, w, 46);
    x.fillStyle = opts.bar === CSS.tape ? CSS.ink : CSS.paper;
    x.font = F.body(24, 700); x.textBaseline = 'middle';
    x.fillText(title, 16, 24, w - 70);
    x.strokeStyle = x.fillStyle; x.lineWidth = 3;
    x.beginPath(); x.moveTo(w - 34, 14); x.lineTo(w - 14, 34); x.moveTo(w - 14, 14); x.lineTo(w - 34, 34); x.stroke();
    x.fillStyle = CSS.ink;
    let y = 86;
    if (opts.warn) {
      x.beginPath(); x.moveTo(40, 62); x.lineTo(70, 116); x.lineTo(10, 116); x.closePath();
      x.fillStyle = CSS.tape; x.fill(); x.lineWidth = 4; x.strokeStyle = CSS.ink; x.stroke();
      x.fillStyle = CSS.ink; x.font = F.display(36); x.textAlign = 'center'; x.fillText('!', 40, 100); x.textAlign = 'left';
    }
    x.font = opts.big ? F.display(38) : F.body(24);
    for (const l of lines) { x.fillText(l, opts.warn ? 88 : 18, y, w - (opts.warn ? 104 : 36)); y += opts.big ? 40 : 32; }
    if (opts.progress !== undefined) {
      x.strokeStyle = CSS.ink; x.lineWidth = 3; x.strokeRect(18, 170, w - 36, 22);
      x.fillStyle = CSS.tape; x.fillRect(21, 173, (w - 42) * opts.progress, 16);
    }
    // buttons
    x.font = F.body(20, 700); x.textBaseline = 'middle';
    const btns = opts.buttons || ['Back', 'Next'];
    let bx = w - 18;
    for (let i = btns.length - 1; i >= 0; i--) {
      const bw = x.measureText(btns[i]).width + 34;
      bx -= bw;
      x.fillStyle = i === btns.length - 1 ? CSS.ink : CSS.paper; x.fillRect(bx, h - 56, bw, 38);
      x.strokeStyle = CSS.ink; x.lineWidth = 3; x.strokeRect(bx, h - 56, bw, 38);
      x.fillStyle = i === btns.length - 1 ? CSS.paper : CSS.ink; x.fillText(btns[i], bx + 17, h - 37);
      bx -= 10;
    }
    x.lineWidth = 6; x.strokeStyle = CSS.ink; x.strokeRect(3, 3, w - 6, h - 6);
  });
}
function noteTex(lines: string[]) {
  return canvasTex(260, 260, (x, w, h) => {
    x.fillStyle = CSS.note; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(0,0,0,.08)'; x.fillRect(0, 0, w, 34);
    x.fillStyle = CSS.ink; x.font = F.hand(34); x.textBaseline = 'top';
    lines.forEach((l, i) => x.fillText(l, 18, 52 + i * 52, w - 30));
  });
}
function bitlockerTex() {
  return canvasTex(400, 270, (x, w, h) => {
    x.fillStyle = CSS.ink; x.fillRect(0, 0, w, h);
    x.fillStyle = CSS.paper; x.font = F.display(40); x.textBaseline = 'top';
    x.fillText('BitLocker recovery', 20, 18);
    x.font = F.body(21);
    x.fillText('Enter the recovery key for this drive', 20, 74, w - 40);
    x.strokeStyle = CSS.paper; x.lineWidth = 3;
    for (let i = 0; i < 4; i++) x.strokeRect(20 + i * 92, 120, 80, 42);
    x.fillStyle = CSS.tape; x.font = F.body(20, 700);
    x.fillText('Where is my key?', 20, 196);
    x.fillStyle = CSS.paper; x.fillRect(w - 120, h - 52, 100, 36);
    x.fillStyle = CSS.ink; x.fillText('Continue', w - 110, h - 44);
  });
}
function priceTex() {
  return canvasTex(300, 180, (x, w, h) => {
    x.fillStyle = CSS.tape;
    x.beginPath(); x.moveTo(50, 0); x.lineTo(w, 0); x.lineTo(w, h); x.lineTo(50, h); x.lineTo(0, h / 2); x.closePath(); x.fill();
    x.lineWidth = 6; x.strokeStyle = CSS.ink; x.stroke();
    x.fillStyle = CSS.kraft; x.beginPath(); x.arc(40, h / 2, 12, 0, 7); x.fill(); x.stroke();
    x.fillStyle = CSS.ink; x.textBaseline = 'middle';
    x.font = F.mono(22); x.fillText('migration tool', 70, 46);
    x.font = F.display(58); x.fillText('$35 to $80', 70, 112, w - 84);
  });
}
function screenTex() {
  return canvasTex(512, 320, (x, w, h) => {
    x.fillStyle = '#2C4A47'; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(255,255,255,.08)';
    for (let i = 0; i < 8; i++) x.fillRect(20, 20 + i * 36, 34, 28);
    x.fillStyle = CSS.paper; x.fillRect(110, 110, 300, 100);
    x.strokeStyle = CSS.ink; x.lineWidth = 4; x.strokeRect(110, 110, 300, 100);
    x.fillStyle = CSS.ink; x.font = F.body(22, 700);
    x.fillText('Installing...', 128, 146);
    x.strokeRect(128, 166, 264, 18);
    x.fillStyle = CSS.tape; x.fillRect(130, 168, 40, 14);
    x.fillStyle = CSS.ink; x.fillRect(0, h - 26, w, 26);
  });
}

const ITEMS: Spec[] = [
  { t: 'win', title: 'Steam Setup', lines: ['Step 3 of 7', 'Choose install location'], progress: 0.3 },
  { t: 'note', lines: ['wifi pw ??', 'ask Sam'] },
  { t: 'win', title: 'ChromeSetup.exe', lines: ['Downloading...'], progress: 0.62 },
  { t: 'err' },
  { t: 'win', title: 'VS Code Setup', lines: ['I accept the agreement'], buttons: ['Cancel', 'Next'] },
  { t: 'note', lines: ['Steam login?', 'old email??'] },
  { t: 'bit' },
  { t: 'win', title: 'OBS Studio Setup', lines: ['Restart required'], buttons: ['Later', 'Restart'] },
  { t: 'price' },
  { t: 'win', title: 'Windows Backup', lines: ['Restoring Store apps only'], bar: CSS.tape, progress: 0.9 },
  { t: 'note', lines: ['Office key:', '???-???'] },
  { t: 'win', title: 'Spotify Setup', lines: ['Sign in to continue'], buttons: ['Sign in'] },
  { t: 'err' },
  { t: 'win', title: '7-Zip Setup', lines: ['Install to C:\\Program Files'], buttons: ['Install'] },
];
// pile positions (x, y, z, rotZ) around the laptop
const HOME: number[][] = [
  [-2.6, 2.6, 0.4, 0.12], [2.7, 2.9, 0.5, -0.15], [-2.9, 0.9, 1.0, -0.08], [2.5, 1.1, 1.3, 0.1],
  [-0.9, 3.4, 0.2, -0.06], [1.2, 3.5, 0.9, 0.2], [0.6, 1.7, 1.9, -0.05], [-1.7, 1.6, 2.1, 0.14],
  [2.0, 0.2, 2.4, -0.12], [-0.3, 2.7, 1.5, 0.08], [-2.4, -0.2, 2.6, 0.22], [1.7, 2.2, 2.2, -0.18],
  [-1.2, 0.5, 2.9, -0.1], [0.4, 0.2, 3.1, 0.06],
];

export async function init(api: Api, ch: Chapter): Promise<ChapterMod> {
  const gl = await api.getGL();
  const el = ch.stage as HTMLElement;
  const sec = ch.sec;
  const clock = sec.querySelector<HTMLElement>('[data-clock]')!;
  const hours = sec.querySelector<HTMLElement>('[data-hours]')!;
  const beats = Array.from(sec.querySelectorAll<HTMLElement>('.beats li'));
  // only touch the DOM when a shown value actually changes
  let lastClock = '', lastHours = -1, lastBeats = -1;
  const setDom = (p: number) => {
    const mins = Math.round(p * 35 * 60 / 10) * 10; // Sat 10:00 to Sun 21:00
    const total = 10 * 60 + mins;
    const day = total >= 24 * 60 ? 'Sun' : 'Sat';
    const m = total % (24 * 60);
    const c = `${day} ${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    if (c !== lastClock) { clock.textContent = c; lastClock = c; }
    const h = Math.floor(p * 35);
    if (h !== lastHours) { hours.textContent = String(h); lastHours = h; }
    const on = beats.reduce((n, _b, i) => n + (p >= 0.02 + i * 0.17 ? 1 : 0), 0);
    if (on !== lastBeats) { beats.forEach((b, i) => b.classList.toggle('on', i < on)); lastBeats = on; }
  };
  if (!gl) { setDom(1); return { update: (p: number) => { setDom(p); } }; }
  await fontsReady();

  const scene = new THREE.Scene();
  lights(scene);
  const camera = new THREE.PerspectiveCamera(36, 4 / 3, 0.1, 100);
  const look = new THREE.Vector3(0, 1.5, 0.6);
  let baseDist = 10.5;
  const fit = (a: number) => { baseDist = a < 1 ? 10.5 / Math.max(a, 0.62) : 10.5; };

  const laptop = makeLaptop({ screenTex: screenTex() });
  scene.add(laptop);
  const sh = blobShadow(6, 4.2); sh.position.y = 0.002; laptop.add(sh);

  type Item = { g: THREE.Group; hit: THREE.Object3D[]; home: THREE.Vector3; rz: number; from: THREE.Vector3; spawn: number; drag: THREE.Vector3 | null; closedAt: number; phase: number };
  const items: Item[] = ITEMS.map((d, i) => {
    let tex: THREE.CanvasTexture, w = 1.9, h = 1.28;
    if (d.t === 'win') tex = windowTex(d.title || '', d.lines || [], d);
    else if (d.t === 'err') tex = windowTex('Windows Setup', ["We couldn't find", 'any drives.'], { warn: true, buttons: ['Load driver'] });
    else if (d.t === 'bit') tex = bitlockerTex();
    else if (d.t === 'note') { tex = noteTex(d.lines || []); w = 1.15; h = 1.15; }
    else { tex = priceTex(); w = 1.7; h = 1.02; }
    const g = new THREE.Group();
    const body = inkBox(w, h, 0.03, C.paper, 0.03);
    const face = texPlane(w, h, tex); face.position.z = 0.017;
    g.add(body, face);
    scene.add(g);
    const hm = HOME[i];
    const side = i % 3 === 0 ? -1 : i % 3 === 1 ? 1 : 0;
    const it: Item = {
      g, hit: [body.userData.body, face],
      home: new THREE.Vector3(hm[0], hm[1], hm[2]), rz: hm[3],
      from: new THREE.Vector3(side * 9, side === 0 ? 8 : 3 + (i % 4), 2 + (i % 3)),
      spawn: i < 3 ? -1 : 0.03 + (i - 3) * (0.76 / (ITEMS.length - 3)),
      drag: null, closedAt: -1, phase: i * 1.7,
    };
    return it;
  });

  // interaction: drag to move, click to close
  const ray = new THREE.Raycaster();
  const v2 = new THREE.Vector2();
  const plane = new THREE.Plane();
  const hitP = new THREE.Vector3();
  let drag: { it: Item; off: THREE.Vector3 } | null = null;
  let downAt: { x: number; y: number } | null = null;
  let now = 0;
  const pick = (ev: PointerEvent) => {
    ray.setFromCamera(ndc(el, ev, v2), camera);
    const meshes: THREE.Object3D[] = [];
    items.forEach((it) => { if (it.g.visible && it.closedAt < 0) meshes.push(...it.hit); });
    const hits = ray.intersectObjects(meshes, false);
    if (!hits.length) return null;
    const obj = hits[0].object;
    const it = items.find((x) => x.hit.includes(obj));
    return it ? { it, point: hits[0].point } : null;
  };
  el.addEventListener('pointerdown', (ev) => {
    const h = pick(ev);
    if (!h) return;
    ev.preventDefault();
    el.setPointerCapture(ev.pointerId);
    const n = new THREE.Vector3(); camera.getWorldDirection(n);
    plane.setFromNormalAndCoplanarPoint(n.negate(), h.point);
    drag = { it: h.it, off: h.it.g.position.clone().sub(h.point) };
    downAt = { x: ev.clientX, y: ev.clientY };
    el.style.cursor = 'grabbing';
    api.kick();
  });
  el.addEventListener('pointermove', (ev) => {
    if (!drag) return;
    ray.setFromCamera(ndc(el, ev, v2), camera);
    if (ray.ray.intersectPlane(plane, hitP)) {
      const d = hitP.clone().add(drag.off);
      d.z = Math.min(d.z, 4.2);
      drag.it.drag = d;
    }
  });
  const end = (ev: PointerEvent) => {
    if (!drag) return;
    const moved = downAt ? Math.hypot(ev.clientX - downAt.x, ev.clientY - downAt.y) : 99;
    if (moved < 6) close(drag.it);
    drag = null; el.style.cursor = '';
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  function close(it: Item) { it.closedAt = now; it.drag = null; }
  sec.querySelector('[data-act="close-one"]')?.addEventListener('click', () => {
    // close the frontmost window that is on screen
    const open = items.filter((it) => it.closedAt < 0 && it.g.visible && it.g.scale.x > 0.5).sort((a, b) => b.g.position.z - a.g.position.z);
    if (open[0]) close(open[0]);
    api.kick();
  });

  let mx = 0, my = 0;
  el.addEventListener('pointermove', (ev) => {
    const r = el.getBoundingClientRect();
    mx = ((ev.clientX - r.left) / r.width - 0.5); my = ((ev.clientY - r.top) / r.height - 0.5);
  });

  const view = { el, scene, camera, fit };
  void C;
  return {
    view,
    update(p: number, _dt: number, t: number) {
      now = t;
      setDom(p);
      const still = api.reduced();
      const cx = still ? 0 : mx * 1.2, cy = still ? 0 : my * 0.6;
      camera.position.set(look.x + cx + Math.sin(p * 2) * 0.4, look.y + 2.1 - cy, look.z + baseDist - p * 1.2);
      camera.lookAt(look);
      laptop.rotation.y = -0.35 + p * 0.3 + (still ? 0 : Math.sin(t * 0.4) * 0.03);
      items.forEach((it, i) => {
        const k = still ? (p >= it.spawn ? 1 : 0) : ease.back(seg(p, it.spawn, it.spawn + 0.09));
        const target = it.drag || it.home;
        const pos = it.g.position;
        // fly in from off-screen
        const flyX = it.from.x + (target.x - it.from.x) * k;
        const flyY = it.from.y + (target.y - it.from.y) * k;
        const flyZ = it.from.z + (target.z - it.from.z) * k;
        if (it.drag) pos.lerp(it.drag, still ? 1 : 0.35);
        else pos.set(flyX, flyY + (still ? 0 : Math.sin(t * 1.3 + it.phase) * 0.04 * k), flyZ);
        it.g.rotation.z = it.rz + (1 - k) * (i % 2 ? 2.4 : -2.4);
        it.g.rotation.y = -0.18 * Math.sign(pos.x) * k;
        // closed: shrink away, then another one opens a moment later
        let s = 1;
        if (it.closedAt >= 0) {
          const age = t - it.closedAt;
          s = still ? (age < 1.6 ? 0 : 1) : (age < 0.25 ? 1 - age / 0.25 : age < 1.6 ? 0 : clamp01((age - 1.6) / 0.35));
          if (age > 1.95) { it.closedAt = -1; it.drag = null; }
        }
        it.g.scale.setScalar(Math.max(0.0001, s * (0.6 + 0.4 * k)));
        it.g.visible = k > 0.001 && s > 0.001;
      });
      return true;
    },
  };
}
