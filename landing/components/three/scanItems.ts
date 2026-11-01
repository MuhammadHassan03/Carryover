import type { TileKind } from "./gl";

// The example scan: shared by the scan (ch2) and packing (ch3) scenes.
export const SCAN: { label: string; kind: TileKind }[] = [
  { label: "Firefox", kind: "app" },
  { label: "Wi-Fi", kind: "drv" },
  { label: "Dark mode", kind: "set" },
  { label: "Documents", kind: "file" },
  { label: "Steam", kind: "app" },
  { label: "Storage", kind: "drv" },
  { label: "Mouse speed", kind: "set" },
  { label: "VLC", kind: "app" },
  { label: "Photos", kind: "file" },
  { label: "7-Zip", kind: "app" },
];

// Where tiles float after the scan (an arc above the laptop).
export function arcPos(i: number, n: number): [number, number, number] {
  const t = n === 1 ? 0.5 : i / (n - 1);
  const a = Math.PI * (0.92 - t * 0.84);
  return [Math.cos(a) * 3.4, 1.7 + Math.sin(a) * 2.3 + (i % 2) * 0.35, 0.9 + (i % 3) * 0.25];
}
