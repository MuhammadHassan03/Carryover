// Chapter 5: the Organize my files switch. Files fly into their folders; duplicates get a flag.
import type { Api, Chapter, ChapterMod } from "../three/types";

export function init(api: Api, ch: Chapter): ChapterMod {
  const sec = ch.sec;
  const stage = sec.querySelector<HTMLElement>(".desk");
  const sw = sec.querySelector<HTMLInputElement>("[data-organize]");
  const undo = sec.querySelector<HTMLButtonElement>('[data-act="undo"]');
  const status = sec.querySelector<HTMLElement>("[data-organize-status]");
  if (!stage || !sw || !undo || !status) return {};
  const files = Array.from(stage.querySelectorAll<HTMLElement>(".file"));
  const folders = Array.from(stage.querySelectorAll<HTMLElement>(".folder"));
  const counts = Array.from(stage.querySelectorAll<HTMLElement>("[data-count]"));

  const place = () => {
    const sorted = sw.checked;
    stage.classList.toggle("is-sorted", sorted);
    const perFolder: number[] = folders.map(() => 0);
    files.forEach((f) => {
      if (!sorted) { f.style.transform = ""; return; }
      const fi = Number(f.dataset.folder);
      const n = perFolder[fi]++;
      const fr = folders[fi].getBoundingClientRect();
      const r = f.getBoundingClientRect();
      // undo the current transform to get the resting position
      const cur = new DOMMatrixReadOnly(getComputedStyle(f).transform === "none" ? undefined : getComputedStyle(f).transform);
      const restX = r.left - cur.m41, restY = r.top - cur.m42;
      const s = 0.5;
      const tx = fr.left + fr.width / 2 - (restX + (r.width * s) / 2) + (n - 1) * 10;
      const ty = fr.top + 6 - restY + n * 4;
      f.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${s})`;
      f.style.transformOrigin = "0 0";
    });
    counts.forEach((c, i) => { c.textContent = sorted ? `${perFolder[i]} file${perFolder[i] === 1 ? "" : "s"}` : ""; });
    undo.disabled = !sorted;
    const dups = files.filter((f) => f.dataset.dup).length;
    status.textContent = sorted
      ? `${files.length} files moved into ${folders.length} folders. ${dups} duplicate flagged and kept. Nothing deleted.`
      : "";
    api.kick();
  };
  sw.addEventListener("change", place);
  undo.addEventListener("click", () => {
    sw.checked = false;
    place();
    status.textContent = "Every move undone. The files are back where they were.";
    sw.focus();
  });
  let raf = 0;
  window.addEventListener("resize", () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { if (sw.checked) { files.forEach((f) => (f.style.transform = "")); place(); } }); });
  return {};
}
