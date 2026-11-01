// Chapter 2: a scan line passes over the old laptop and the scan results lift out as tiles.
import { THREE, CSS, F, lights, makeLaptop, canvasTex, makeTile, blobShadow, fontsReady, ndc, ease, seg } from "./gl";
import { SCAN, arcPos } from "./scanItems";
import type { Api, Chapter, ChapterMod } from "./types";

function desktopTex() {
  return canvasTex(512, 320, (x, w, h) => {
    x.fillStyle = "#2C4A47"; x.fillRect(0, 0, w, h);
    const icons = [CSS.tape, CSS.paper, CSS.kraft2, CSS.note, CSS.paper, CSS.tape, CSS.kraft2, CSS.paper];
    icons.forEach((c, i) => {
      const cx = 24 + (i % 2) * 64, cy = 22 + Math.floor(i / 2) * 64;
      x.fillStyle = c; x.fillRect(cx, cy, 40, 32);
      x.strokeStyle = CSS.ink; x.lineWidth = 3; x.strokeRect(cx, cy, 40, 32);
    });
    x.fillStyle = CSS.paper; x.font = F.mono(22);
    x.fillText("scanning this PC", 220, 160);
    x.fillStyle = CSS.ink; x.fillRect(0, h - 26, w, 26);
  });
}

export async function init(api: Api, ch: Chapter): Promise<ChapterMod> {
  const gl = await api.getGL();
  if (!gl) return {};
  await fontsReady();
  const el = ch.stage as HTMLElement;
  const scene = new THREE.Scene();
  lights(scene);
  const camera = new THREE.PerspectiveCamera(36, 4 / 3, 0.1, 100);
  const look = new THREE.Vector3(0, 1.9, 0.4);
  let dist = 11;
  const fit = (a: number) => { dist = a < 1.1 ? 11 / Math.max(a, 0.62) * 1.05 : 11; };

  const laptop = makeLaptop({ screenTex: desktopTex() });
  scene.add(laptop);
  const sh = blobShadow(6, 4.2); sh.position.y = 0.002; scene.add(sh);

  // scan beam: a thin tape-colored band that sweeps down the screen and over the keyboard
  const beam = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.09, 0.09), new THREE.MeshBasicMaterial({ color: 0xff4d17 }));
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 0.7), new THREE.MeshBasicMaterial({ color: 0xff4d17, transparent: true, opacity: 0.18, depthWrite: false }));
  glow.position.y = 0.3;
  const beamG = new THREE.Group(); beamG.add(beam, glow);
  scene.add(beamG);

  const screenWorld = new THREE.Vector3(0, 1.3, -0.9);
  const tiles = SCAN.map((s, i) => {
    const g = makeTile(s.label, s.kind, 0.9);
    scene.add(g);
    const to = new THREE.Vector3(...arcPos(i, SCAN.length));
    return { g, to, at: 0.22 + i * 0.055, hover: 0, phase: i * 0.9 };
  });

  const ray = new THREE.Raycaster();
  const v2 = new THREE.Vector2();
  let hovered = -1;
  let mx = 0, my = 0;
  el.addEventListener("pointermove", (ev) => {
    const r = el.getBoundingClientRect();
    mx = (ev.clientX - r.left) / r.width - 0.5; my = (ev.clientY - r.top) / r.height - 0.5;
    ray.setFromCamera(ndc(el, ev, v2), camera);
    const hits = ray.intersectObjects(tiles.map((t) => t.g), true);
    hovered = hits.length ? tiles.findIndex((t) => { let o: THREE.Object3D | null = hits[0].object; while (o) { if (o === t.g) return true; o = o.parent; } return false; }) : -1;
    el.style.cursor = hovered >= 0 ? "pointer" : "";
  });
  el.addEventListener("pointerleave", () => { hovered = -1; });

  // "Run the scan again" replays the scan over 3 seconds, whatever the scroll position.
  let replayStart = -1;
  let now = 0;
  ch.sec.querySelector('[data-act="rescan"]')?.addEventListener("click", () => { replayStart = now; api.kick(); });

  const view = { el, scene, camera, fit };
  return {
    view,
    update(p, dt, t) {
      now = t;
      const still = api.reduced();
      let q = p;
      if (replayStart >= 0) {
        const r = (t - replayStart) / (still ? 0.001 : 3);
        if (r >= 1) replayStart = -1; else q = Math.min(p, ease.inOut(r));
      }
      camera.position.set(look.x + (still ? 0 : mx * 1.4), look.y + 1.6 - (still ? 0 : my * 0.8), look.z + dist);
      camera.lookAt(look);
      laptop.rotation.y = 0.25 - q * 0.25;
      // beam: top of the screen (y 2.4) down to the keyboard (y 0.2), then off
      const b = seg(q, 0.02, 0.6);
      beamG.visible = b > 0 && b < 1;
      beamG.position.set(0, 2.45 - b * 2.3, -0.75 + b * 1.6);
      beamG.rotation.y = laptop.rotation.y;
      tiles.forEach((tl, i) => {
        const k = still ? (q >= tl.at ? 1 : 0) : ease.out(seg(q, tl.at, tl.at + 0.22));
        tl.g.visible = k > 0.001;
        tl.hover += ((hovered === i ? 1 : 0) - tl.hover) * Math.min(1, dt * 10);
        tl.g.position.lerpVectors(screenWorld, tl.to, k);
        tl.g.position.y += (still ? 0 : Math.sin(t * 1.4 + tl.phase) * 0.05 * k) + tl.hover * 0.35;
        tl.g.position.z += tl.hover * 0.6;
        tl.g.rotation.set(0, (1 - k) * 1.6 - tl.to.x * 0.06, (1 - k) * (i % 2 ? 0.6 : -0.6));
        tl.g.scale.setScalar(Math.max(0.0001, (0.3 + 0.7 * k) * (1 + tl.hover * 0.2)));
      });
      return true;
    },
  };
}
