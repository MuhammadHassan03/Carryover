"use client";

import { useEffect } from "react";

export default function StoryEngine() {
  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    // Start after first paint so 3D never delays the hero text (LCP).
    const start = () => {
      import("./three/engine").then((m) => {
        if (!cancelled) stop = m.startEngine();
      });
    };
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(start, { timeout: 1200 });
    else setTimeout(start, 200);
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);
  return null;
}
