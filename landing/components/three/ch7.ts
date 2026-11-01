// Chapter 7: the box opens beside the new laptop and its tiles fly into the screen as apps.
import { THREE, C, CSS, F, lights, makeLaptop, makeBox, makeTile, canvasTex, redraw, blobShadow, fontsReady, dragSpin, ease, seg } from "./gl";
import { SCAN } from "./scanItems";
import type { Api, Chapter, ChapterMod } from "./types";

const APP_COLORS = [CSS.tape, CSS.paper, CSS.kraft2, CSS.note, CSS.paper, CSS.tape, CSS.kraft2, CSS.paper, CSS.note, CSS.tape, CSS.paper, CSS.kraft2];
function screen(n: number) {
  return (x: CanvasRenderingContext2D, w: number, h: number) => {
    x.fillStyle = "#2C4A47"; x.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) {
      const cx = 28 + (i % 6) * 78, cy = 26 + Math.floor(i / 6) * 84;
      x.fillStyle = APP_COLORS[i % APP_COLORS.length]; x.fillRect(cx, cy, 56, 46);
      x.strokeStyle = CSS.ink; x.lineWidth = 4; x.strokeRect(cx, cy, 56, 46);
    }
    if (n >= 12) {
      x.fillStyle = CSS.paper; x.fillRect(28, 210, 300, 56);
      x.strokeStyle = CSS.ink; x.strokeRect(28, 210, 300, 56);
      x.fillStyle = CSS.ink; x.font = F.display(36); x.textBaseline = "middle"; x.fillText("All set. 3 things left", 42, 239);
    }
    x.fillStyle = CSS.ink; x.fillRect(0, h - 26, w, 26);
  };
}

export async function init(api: Api, ch: Chapter): Promise<ChapterMod> {
  const gl = await api.getGL();
  if (!gl) return {};
  await fontsReady();
  const el = ch.stage as HTMLElement;
  const scene = new THREE.Scene();
  lights(scene);
  const camera = new THREE.PerspectiveCamera(36, 4 / 3, 0.1, 100);
  const look = new THREE.Vector3(0.6, 1.3, 0);
  let dist = 11;
  const fit = (a: number) => { dist = a < 1.1 ? 11 / Math.max(a, 0.62) : 11; };

  const rig = new THREE.Group(); scene.add(rig);
  const sTex = canvasTex(512, 320, screen(0));
  const laptop = makeLaptop({ color: C.kraft, screenTex: sTex });
  rig.add(laptop);
  const box = makeBox(); box.setTape(0); box.group.scale.setScalar(0.55); box.group.position.set(3.1, 0, 0.6); box.group.rotation.y = -0.5; rig.add(box.group);
  const sh = blobShadow(8, 4.6); sh.position.set(1, 0.002, 0.2); rig.add(sh);
  const start = new THREE.Vector3(3.1, 0.9, 0.6), end = new THREE.Vector3(0, 1.3, -0.7);
  const tiles = SCAN.map((s, i) => {
    const g = makeTile(s.label, s.kind, 0.55);
    rig.add(g);
    return { g, at: 0.25 + i * 0.05 };
  });
  const spin = dragSpin(el, () => api.kick());
  let shownN = -1;
  const view = { el, scene, camera, fit };
  return {
    view,
    update(p, _dt, t) {
      const still = api.reduced();
      camera.position.set(look.x, look.y + 2.6, look.z + dist);
      camera.lookAt(look);
      if (!spin.dragging) spin.yaw *= 0.97;
      rig.rotation.y = -0.25 + spin.yaw + (still ? 0 : Math.sin(t * 0.4) * 0.04);
      rig.rotation.x = spin.pitch;
      box.setOpen(seg(p, 0.02, 0.22));
      let landed = 0;
      tiles.forEach((tl, i) => {
        const k = still ? 1 : ease.inOut(seg(p, tl.at, tl.at + 0.2));
        tl.g.visible = k > 0.001 && k < 0.999;
        tl.g.position.lerpVectors(start, end, k);
        tl.g.position.y += Math.sin(k * Math.PI) * 1.8;
        tl.g.position.x += Math.sin(k * Math.PI) * (i % 2 ? 0.4 : -0.4);
        tl.g.rotation.set(0, k * 0.5, (1 - k) * (i % 2 ? 0.8 : -0.8));
        tl.g.scale.setScalar(Math.max(0.0001, 1 - k * 0.7));
        if (k >= 0.999) landed++;
      });
      const n = Math.min(12, Math.round((landed / tiles.length) * 12));
      if (n !== shownN) { shownN = n; redraw(sTex, screen(n)); }
      return true;
    },
  };
}
