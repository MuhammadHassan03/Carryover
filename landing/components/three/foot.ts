// Footer: a stack of flattened moving boxes you can poke.
import { THREE, C, lights, inkBox, fontsReady, ndc } from "./gl";
import type { Api, Chapter, ChapterMod } from "./types";

export async function init(api: Api, ch: Chapter): Promise<ChapterMod> {
  const gl = await api.getGL();
  if (!gl) return {};
  await fontsReady();
  const el = ch.stage as HTMLElement;
  const scene = new THREE.Scene();
  lights(scene);
  const camera = new THREE.PerspectiveCamera(34, 16 / 10, 0.1, 100);
  camera.position.set(0, 4.2, 9.5);
  camera.lookAt(0, 1.1, 0);
  const fit = (a: number) => { camera.position.z = a < 1.2 ? 9.5 / Math.max(a, 0.62) * 1.15 : 9.5; camera.lookAt(0, 1.1, 0); };

  const boxes = Array.from({ length: 6 }, (_, i) => {
    const g = new THREE.Group();
    const flat = inkBox(3.6, 0.14, 2.4, i % 2 ? C.card : C.cardDark);
    const tape = inkBox(0.4, 0.02, 2.42, C.tape, 0.015); tape.position.y = 0.08;
    g.add(flat, tape);
    const base = new THREE.Vector3(((i % 3) - 1) * 0.18, 0.1 + i * 0.22, ((i % 2) - 0.5) * 0.2);
    g.position.copy(base);
    g.rotation.y = ((i * 37) % 11 - 5) * 0.04;
    scene.add(g);
    return { g, base, rotY: g.rotation.y, vy: 0, y: 0, spin: 0, vs: 0 };
  });

  const poke = (i: number) => { const b = boxes[i]; b.vy = 4 + Math.random() * 2; b.vs = (Math.random() > 0.5 ? 1 : -1) * (5 + Math.random() * 4); api.kick(); };
  const ray = new THREE.Raycaster();
  const v2 = new THREE.Vector2();
  el.addEventListener("pointerdown", (ev) => {
    ray.setFromCamera(ndc(el, ev, v2), camera);
    const hits = ray.intersectObjects(boxes.map((b) => b.g), true);
    if (!hits.length) return;
    const i = boxes.findIndex((b) => { let o: THREE.Object3D | null = hits[0].object; while (o) { if (o === b.g) return true; o = o.parent; } return false; });
    if (i >= 0) poke(i);
  });
  ch.sec.querySelector('[data-act="poke"]')?.addEventListener("click", () => poke(Math.floor(Math.random() * boxes.length)));

  const view = { el, scene, camera, fit };
  return {
    view,
    update(_p, dt, t) {
      const still = api.reduced();
      let moving = false;
      boxes.forEach((b, i) => {
        if (b.y > 0 || b.vy > 0) {
          b.vy -= 18 * dt; b.y = Math.max(0, b.y + b.vy * dt);
          if (b.y === 0) b.vy = 0;
          moving = true;
        }
        b.spin += b.vs * dt; b.vs *= Math.pow(0.04, dt);
        // settle back to the nearest rest angle
        if (Math.abs(b.vs) < 0.5) { b.spin += (Math.round(b.spin / Math.PI) * Math.PI - b.spin) * Math.min(1, dt * 6); }
        if (Math.abs(b.vs) > 0.05) moving = true;
        b.g.position.set(b.base.x, b.base.y + b.y + (still ? 0 : Math.sin(t * 1.2 + i) * 0.015), b.base.z);
        b.g.rotation.y = b.rotY + b.spin;
      });
      return moving || !still;
    },
  };
}
