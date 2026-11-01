// Chapter 3: the tiles drop into a moving box, the flaps shut and tape seals it.
// The recipe text beside it types itself; the full text stays in the HTML for readers and crawlers.
import { THREE, lights, makeBox, makeTile, blobShadow, fontsReady, dragSpin, ease, seg } from "./gl";
import { SCAN, arcPos } from "./scanItems";
import type { Api, Chapter, ChapterMod } from "./types";

export async function init(api: Api, ch: Chapter): Promise<ChapterMod> {
  const sec = ch.sec;
  // typing effect: a visual copy types over the real <pre>, which keeps its text
  const pre = sec.querySelector<HTMLElement>("[data-recipe]");
  const full = pre?.textContent || "";
  let typed: HTMLElement | null = null;
  if (pre && !api.reduced()) {
    typed = document.createElement("pre");
    typed.className = "recipe-typed";
    typed.setAttribute("aria-hidden", "true");
    pre.after(typed);
    pre.classList.add("is-typing");
  }
  let lastN = -1;
  const setType = (q: number) => {
    if (!typed || !pre) return;
    const n = Math.round(full.length * seg(q, 0.05, 0.9));
    if (n === lastN) return;
    lastN = n;
    if (n >= full.length) { typed.textContent = ""; pre.classList.remove("is-typing"); typed.hidden = true; return; }
    typed.hidden = false; pre.classList.add("is-typing");
    typed.style.top = pre.offsetTop + "px";
    typed.textContent = full.slice(0, n);
    const caret = document.createElement("span"); caret.className = "caret"; caret.textContent = "█";
    typed.appendChild(caret);
  };

  const sealBtn = sec.querySelector<HTMLButtonElement>('[data-act="seal"]');
  let override: number | null = null; // 1 = sealed, 0.5 = open with everything inside
  sealBtn?.addEventListener("click", () => {
    const sealed = sealBtn.getAttribute("aria-pressed") === "true";
    override = sealed ? 0.5 : 1;
    sealBtn.setAttribute("aria-pressed", String(!sealed));
    sealBtn.textContent = sealed ? "Seal the box" : "Open it again";
    api.kick();
  });

  const gl = await api.getGL();
  if (!gl) { setType(1); return { update: (p) => { setType(p); } }; }
  await fontsReady();
  const el = ch.stage as HTMLElement;
  const scene = new THREE.Scene();
  lights(scene);
  const camera = new THREE.PerspectiveCamera(34, 4 / 3, 0.1, 100);
  const look = new THREE.Vector3(0, 1.2, 0);
  let dist = 9.5;
  const fit = (a: number) => { dist = a < 1.1 ? 9.5 / Math.max(a, 0.62) : 9.5; };

  const box = makeBox();
  const holder = new THREE.Group();
  holder.add(box.group);
  scene.add(holder);
  const sh = blobShadow(4, 3.2, 0.25); sh.position.y = 0.002; holder.add(sh);

  const tiles = SCAN.map((s, i) => {
    const g = makeTile(s.label, s.kind, 0.62);
    holder.add(g);
    const [ax, ay, az] = arcPos(i, SCAN.length);
    const from = new THREE.Vector3(ax * 0.7, ay + 0.6, az - 0.6);
    const inside = new THREE.Vector3(((i % 5) - 2) * 0.32, 0.45 + Math.floor(i / 5) * 0.25, ((i % 2) - 0.5) * 0.4);
    return { g, from, inside, at: 0.04 + i * 0.04 };
  });

  const spin = dragSpin(el, () => api.kick());
  let shown = 0;
  const view = { el, scene, camera, fit };
  return {
    view,
    update(p, dt, t) {
      const still = api.reduced();
      const target = override ?? p;
      shown = still ? target : shown + (target - shown) * Math.min(1, dt * (override !== null ? 3 : 8));
      const q = shown;
      setType(override !== null ? 1 : p);
      camera.position.set(look.x, look.y + 3.2, look.z + dist);
      camera.lookAt(look);
      if (!spin.dragging) spin.yaw *= 0.97;
      holder.rotation.y = -0.55 + spin.yaw + (still ? 0 : Math.sin(t * 0.5) * 0.06);
      holder.rotation.x = spin.pitch;
      tiles.forEach((tl) => {
        const k = still ? (q >= tl.at + 0.2 ? 1 : 0) : ease.inOut(seg(q, tl.at, tl.at + 0.2));
        tl.g.position.lerpVectors(tl.from, tl.inside, k);
        tl.g.position.y += Math.sin(k * Math.PI) * 0.9;
        tl.g.rotation.set(-Math.PI / 2 * k * 0.85, k * 0.3, (1 - k) * 0.4);
        tl.g.visible = q < 0.74 || k < 1;
      });
      box.setOpen(1 - seg(q, 0.55, 0.76));
      box.setTape(seg(q, 0.78, 0.97));
      return true;
    },
  };
}
