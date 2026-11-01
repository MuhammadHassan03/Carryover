// Story engine: per-chapter scroll progress, lazy chapter modules, one shared WebGL renderer.
import type { Api, Chapter, ChapterInit, GLHandle, View } from "./types";

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

const MODULES: Record<string, () => Promise<{ init: ChapterInit }>> = {
  "1": () => import("./ch1"),
  "2": () => import("./ch2"),
  "3": () => import("./ch3"),
  "4": () => import("./ch4"),
  "5": () => import("../interactive/organize"),
  "6": () => import("../interactive/checkpoint"),
  "7": () => import("./ch7"),
  foot: () => import("./foot"),
};

let running: (() => void) | null = null;

export function startEngine(): () => void {
  if (running) return running;
  const RM = matchMedia("(prefers-reduced-motion: reduce)");
  const WIDE = matchMedia("(min-width: 900px)");
  const root = document.documentElement;
  root.classList.add("js", "engine");

  const chapters: Chapter[] = [];
  document.querySelectorAll<HTMLElement>("[data-chapter]").forEach((sec) => {
    const free = sec.dataset.chapter === "foot";
    chapters.push({
      key: sec.dataset.chapter || "",
      sec,
      stage: sec.querySelector<HTMLElement>(".stage"),
      p: free ? 1 : 0,
      target: free ? 1 : 0,
      near: false,
      mod: null,
      loading: false,
      free,
    });
  });

  let gl: GLHandle | null | false = null;
  let dirty = true;
  let glPromise: Promise<GLHandle | null> | null = null;
  const hasWebGL = () => {
    try {
      const c = document.createElement("canvas");
      return !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      return false;
    }
  };
  // One shared renderer, requested once. Without WebGL the static SVG scenes simply stay.
  const getGL = (): Promise<GLHandle | null> => {
    if (!glPromise) {
      glPromise = (async () => {
        if (!hasWebGL()) { gl = false; root.classList.add("no-webgl"); return null; }
        try {
          const m = await import("./gl");
          gl = m.createGL();
          return gl;
        } catch {
          gl = false;
          root.classList.add("no-webgl");
          return null;
        }
      })();
    }
    return glPromise;
  };

  const api: Api = {
    reduced: () => RM.matches,
    wide: () => WIDE.matches,
    getGL,
    kick: () => { dirty = true; },
  };

  const load = async (ch: Chapter) => {
    if (ch.loading || ch.mod) return;
    const loader = MODULES[ch.key];
    if (!loader) return;
    ch.loading = true;
    try {
      const m = await loader();
      ch.mod = (await m.init(api, ch)) || {};
    } catch (e) {
      // A chapter failing must not break the page; its text is already in the HTML.
      ch.mod = {};
      console.info("[carryover] chapter", ch.key, "runs without motion:", (e as Error).message);
    }
    ch.loading = false;
    dirty = true;
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        const ch = chapters.find((c) => c.sec === en.target);
        if (!ch) continue;
        ch.near = en.isIntersecting;
        if (en.isIntersecting) void load(ch);
      }
    },
    { rootMargin: "60% 0px 60% 0px" },
  );
  chapters.forEach((c) => io.observe(c.sec));

  const navH = () => parseFloat(getComputedStyle(root).getPropertyValue("--nav")) || 64;
  const targetFor = (ch: Chapter, vh: number) => {
    if (ch.free || RM.matches) return 1;
    if (WIDE.matches) {
      const r = ch.sec.getBoundingClientRect();
      const total = r.height - (vh - navH());
      return total > 0 ? clamp01(-r.top / total) : 1;
    }
    const el = ch.stage || ch.sec;
    const r = el.getBoundingClientRect();
    const raw = (vh * 0.92 - r.top) / (vh * 0.75);
    // a stage already on screen at load (the hero) starts at 0, not mid-story
    const p0 = clamp01((vh * 0.92 - (r.top + window.scrollY)) / (vh * 0.75));
    return p0 >= 0.95 ? 1 : clamp01((raw - p0) / (1 - p0));
  };

  const tape = document.querySelector<HTMLElement>(".nav-tape");
  let last = performance.now();
  let lastScroll = -1;
  let raf = 0;
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const vh = window.innerHeight;
    const sy = window.scrollY;
    if (sy !== lastScroll) { dirty = true; lastScroll = sy; }
    if (tape) {
      const max = root.scrollHeight - vh;
      tape.style.setProperty("--read", max > 0 ? (sy / max).toFixed(4) : "0");
    }
    const k = RM.matches ? 1 : 1 - Math.exp(-dt * 7);
    let busy = false;
    for (const ch of chapters) {
      if (!ch.near) continue;
      ch.target = targetFor(ch, vh);
      const prev = ch.p;
      ch.p += (ch.target - ch.p) * k;
      if (Math.abs(ch.target - ch.p) < 0.0005) ch.p = ch.target;
      if (ch.p !== prev) { ch.sec.style.setProperty("--p", ch.p.toFixed(4)); dirty = true; }
      if (ch.mod?.update && ch.mod.update(ch.p, dt, now / 1000)) busy = true;
    }
    if (gl && (dirty || busy)) {
      const views: View[] = [];
      for (const c of chapters) if (c.near && c.mod?.view) views.push(c.mod.view);
      gl.render(views);
    }
    dirty = false;
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  const onResize = () => { dirty = true; if (gl) gl.resize(); };
  window.addEventListener("resize", onResize);

  running = () => {
    cancelAnimationFrame(raf);
    io.disconnect();
    window.removeEventListener("resize", onResize);
    if (gl) gl.dispose();
    root.classList.remove("engine");
    running = null;
  };
  return running;
}
