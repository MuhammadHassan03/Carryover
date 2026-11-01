import localFont from "next/font/local";

// All fonts are self-hosted woff2 files (from @fontsource), so nothing loads from a CDN.
export const display = localFont({
  src: [
    { path: "./fonts/big-shoulders-display-latin-800-normal.woff2", weight: "800" },
    { path: "./fonts/big-shoulders-display-latin-900-normal.woff2", weight: "900" },
  ],
  variable: "--font-display",
  display: "swap",
  fallback: ["Impact", "Arial Narrow", "sans-serif"],
});

export const stencil = localFont({
  src: "./fonts/big-shoulders-stencil-display-latin-900-normal.woff2",
  weight: "900",
  variable: "--font-stencil",
  display: "swap",
  preload: false,
});

export const body = localFont({
  src: [
    { path: "./fonts/public-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/public-sans-latin-400-italic.woff2", weight: "400", style: "italic" },
    { path: "./fonts/public-sans-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-body",
  display: "swap",
  fallback: ["Segoe UI", "system-ui", "sans-serif"],
});

export const mono = localFont({
  src: "./fonts/courier-prime-latin-400-normal.woff2",
  weight: "400",
  variable: "--font-mono",
  display: "swap",
  preload: false,
  fallback: ["Courier New", "monospace"],
});

export const hand = localFont({
  src: "./fonts/permanent-marker-latin-400-normal.woff2",
  weight: "400",
  variable: "--font-hand",
  display: "swap",
  preload: false,
  fallback: ["Comic Sans MS", "cursive"],
});
