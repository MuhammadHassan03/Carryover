// Chapter 4: New device (the box hops over Wi-Fi to a new laptop) or Refresh this PC
// (the box waits on D: while C: is wiped, then comes back).
import { THREE, C, CSS, F, lights, makeLaptop, makeBox, canvasTex, redraw, texPlane, inkBox, blobShadow, fontsReady, ease, seg, lerp } from "./gl";
import type { Api, Chapter, ChapterMod } from "./types";

type Mode = "new" | "refresh";
const LABEL: Record<Mode, string> = {
  new: "New device mode: the PC Recipe box hops over Wi-Fi from the old laptop to the new one.",
  refresh: "Refresh this PC mode: the box moves to drive D: while drive C: is erased and Windows is installed fresh, then it comes back and the laptop is rebuilt.",
};

function qrTex() {
  return canvasTex(512, 320, (x, w, h) => {
    x.fillStyle = CSS.paper; x.fillRect(0, 0, w, h);
    x.fillStyle = CSS.ink;
    // a decorative QR-like grid (not a scannable code)
    const s = 14, ox = 40, oy = 50;
    for (let r = 0; r < 15; r++) for (let c = 0; c < 15; c++) {
      const corner = (r < 4 && c < 4) || (r < 4 && c > 10) || (r > 10 && c < 4);
      if (corner ? (r % 3 === 0 || c % 3 === 0 || (r % 3 === 1 && c % 3 === 1)) : ((r * 7 + c * 3 + r * c) % 5 < 2)) x.fillRect(ox + c * s, oy + r * s, s, s);
    }
    x.font = F.display(46); x.fillText("Pair this PC", 270, 120);
    x.font = F.mono(22); x.fillText("scan with the", 270, 170); x.fillText("new laptop", 270, 198);
  });
}
function newScreen(state: number) {
  return (x: CanvasRenderingContext2D, w: number, h: number) => {
    x.fillStyle = state > 1 ? CSS.kraft : "#2C4A47"; x.fillRect(0, 0, w, h);
    x.fillStyle = state > 1 ? CSS.ink : CSS.paper;
    x.font = F.display(52);
    x.fillText(state === 0 ? "Waiting to pair" : state === 1 ? "Paired. Receiving" : "Rebuilding", 30, 90);
    if (state >= 1) {
      x.strokeStyle = x.fillStyle as string; x.lineWidth = 4; x.strokeRect(30, 140, w - 60, 30);
      x.fillStyle = CSS.tape; x.fillRect(34, 144, (w - 68) * (state === 1 ? 0.45 : 0.9), 22);
    }
  };
}
function refreshScreen(state: number) {
  return (x: CanvasRenderingContext2D, w: number, h: number) => {
    x.fillStyle = state === 1 ? "#1d5fae" : state === 2 ? CSS.kraft : "#2C4A47";
    x.fillRect(0, 0, w, h);
    x.fillStyle = state === 2 ? CSS.ink : CSS.paper;
    x.font = F.display(52);
    x.fillText(state === 0 ? "Your old setup" : state === 1 ? "Installing Windows" : "Putting it back", 30, 90);
    x.font = F.mono(24);
    x.fillText(state === 1 ? "no USB stick needed" : state === 2 ? "apps, drivers, files" : "files copied to D: first", 30, 150);
  };
}

export async function init(api: Api, ch: Chapter): Promise<ChapterMod> {
  const sec = ch.sec;
  const el = ch.stage as HTMLElement;
  const radios = Array.from(sec.querySelectorAll<HTMLButtonElement>("[data-mode]"));
  const disk = sec.querySelector<HTMLElement>("[data-disk]");
  const cLabel = sec.querySelector<HTMLElement>("[data-c-label]");
  let mode: Mode = "new";
  let modeChanged = 0;
  let now = 0;
  const setMode = (m: Mode, focus = false) => {
    mode = m;
    modeChanged = now;
    sec.classList.toggle("is-refresh", m === "refresh");
    radios.forEach((r) => {
      const on = r.dataset.mode === m;
      r.setAttribute("aria-checked", String(on));
      r.tabIndex = on ? 0 : -1;
      if (on && focus) r.focus();
    });
    el.setAttribute("aria-label", LABEL[m]);
    api.kick();
  };
  radios.forEach((r, i) => {
    r.addEventListener("click", () => setMode(r.dataset.mode as Mode));
    r.addEventListener("keydown", (e) => {
      if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        const next = radios[(i + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : radios.length - 1)) % radios.length];
        setMode(next.dataset.mode as Mode, true);
      }
    });
  });
  const setDisk = (q: number) => {
    if (!disk || !cLabel) return;
    const wipe = seg(q, 0.3, 0.5);
    disk.style.setProperty("--wipe", wipe.toFixed(3));
    cLabel.textContent = q < 0.3 ? "Windows" : q < 0.62 ? "erased, fresh Windows going in" : "fresh Windows, rebuilt";
  };

  const gl = await api.getGL();
  if (!gl) return { update: (p) => { setDisk(p); } };
  await fontsReady();

  const scene = new THREE.Scene();
  lights(scene);
  const camera = new THREE.PerspectiveCamera(36, 4 / 3, 0.1, 100);
  const look = new THREE.Vector3(0, 1.2, 0);
  let dist = 11.5;
  const fit = (a: number) => { dist = a < 1.1 ? 11.5 / Math.max(a, 0.62) : 11.5; };

  // New device
  const gNew = new THREE.Group(); scene.add(gNew);
  const oldL = makeLaptop({ screenTex: qrTex() }); oldL.scale.setScalar(0.72); oldL.position.set(-3.2, 0, 0); oldL.rotation.y = 0.35; gNew.add(oldL);
  const nTex = canvasTex(512, 320, newScreen(0));
  const newL = makeLaptop({ color: C.kraft, screenTex: nTex }); newL.scale.setScalar(0.72); newL.position.set(3.2, 0, 0); newL.rotation.y = -0.35; gNew.add(newL);
  [-3.2, 3.2].forEach((x) => { const s = blobShadow(4.4, 3); s.position.set(x, 0.002, 0); gNew.add(s); });
  // dotted Wi-Fi path
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-2.6, 1.2, 0.4), new THREE.Vector3(0, 4.6, 0.8), new THREE.Vector3(2.6, 1.2, 0.4));
  const dots = new THREE.Group();
  const dotGeo = new THREE.SphereGeometry(0.06, 8, 6);
  const dotMat = new THREE.MeshBasicMaterial({ color: C.ink });
  for (let i = 0; i <= 24; i++) { const d = new THREE.Mesh(dotGeo, dotMat); d.position.copy(curve.getPoint(i / 24)); dots.add(d); }
  gNew.add(dots);
  const lockTex = canvasTex(256, 120, (x, w, h) => {
    x.fillStyle = CSS.ink; x.fillRect(0, 0, w, h);
    x.fillStyle = CSS.paper; x.font = F.mono(30); x.textBaseline = "middle"; x.fillText("encrypted", 22, h / 2);
  });
  const lock = texPlane(1.3, 0.6, lockTex);
  gNew.add(lock);
  const boxN = makeBox(); boxN.setOpen(0); boxN.setTape(1); boxN.group.scale.setScalar(0.42); gNew.add(boxN.group);

  // Refresh
  const gRef = new THREE.Group(); scene.add(gRef);
  const rTex = canvasTex(512, 320, refreshScreen(0));
  const same = makeLaptop({ screenTex: rTex }); same.scale.setScalar(0.8); same.position.set(-1.4, 0, 0); same.rotation.y = 0.3; gRef.add(same);
  const sh2 = blobShadow(4.6, 3.2); sh2.position.set(-1.4, 0.002, 0); gRef.add(sh2);
  const shelf = inkBox(2.4, 0.5, 1.8, C.tape); shelf.position.set(3.1, 0.25, 0.3); gRef.add(shelf);
  const shelfLabel = texPlane(1.6, 0.4, canvasTex(256, 64, (x, w, h) => { x.fillStyle = CSS.tape; x.fillRect(0, 0, w, h); x.fillStyle = CSS.ink; x.font = F.display(48); x.textBaseline = "middle"; x.fillText("D: drive", 20, h / 2); }));
  shelfLabel.position.set(3.1, 0.25, 1.22); gRef.add(shelfLabel);
  const boxR = makeBox(); boxR.setOpen(0); boxR.setTape(1); boxR.group.scale.setScalar(0.42); gRef.add(boxR.group);
  const inLaptop = new THREE.Vector3(-1.4, 0.25, 0.5), onShelf = new THREE.Vector3(3.1, 0.52, 0.3);

  let nState = -1, rState = -1;
  const view = { el, scene, camera, fit };
  return {
    view,
    update(p, _dt, t) {
      now = t;
      const still = api.reduced();
      // a mode switch replays that road over 2.5 seconds
      const since = t - modeChanged;
      const q = modeChanged > 0 && since < 2.5 && !still ? Math.min(p, since / 2.5) : p;
      camera.position.set(look.x, look.y + 3.4, look.z + dist);
      camera.lookAt(look);
      gNew.visible = mode === "new";
      gRef.visible = mode === "refresh";
      if (mode === "new") {
        const k = still ? 1 : ease.inOut(seg(q, 0.15, 0.75));
        const pos = curve.getPoint(k);
        boxN.group.position.set(pos.x, pos.y - 0.3, pos.z);
        boxN.group.rotation.set(0, -0.4 + k * 0.8 + (still ? 0 : Math.sin(t * 2) * 0.05), Math.sin(k * Math.PI) * -0.25);
        lock.position.set(pos.x, pos.y + 0.75, pos.z + 0.2);
        lock.visible = k > 0.02 && k < 0.98;
        dots.children.forEach((d, i) => { d.visible = i / 24 >= k - 0.02 || still; });
        const ns = q < 0.1 ? 0 : q < 0.78 ? 1 : 2;
        if (ns !== nState) { nState = ns; redraw(nTex, newScreen(ns)); }
      } else {
        setDisk(q);
        const out = still ? 1 : ease.inOut(seg(q, 0.08, 0.3));
        const back = still ? 1 : ease.inOut(seg(q, 0.62, 0.84));
        const a = out < 1 ? out : 1 - back;
        boxR.group.position.lerpVectors(inLaptop, onShelf, a);
        boxR.group.position.y += Math.sin(a * Math.PI) * 1.6;
        boxR.group.visible = !(still && false);
        boxR.group.rotation.y = lerp(0.2, -0.3, a);
        const rs = q < 0.3 ? 0 : q < 0.62 ? 1 : 2;
        if (rs !== rState) { rState = rs; redraw(rTex, refreshScreen(rs)); }
      }
      return true;
    },
  };
}
