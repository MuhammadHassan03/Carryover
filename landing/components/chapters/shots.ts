import type { Shot } from "./AppShot";

// Screens from the Carryover desktop app, shown with sample data.
export const SHOTS = {
  recipe: {
    file: "light-3-recipe",
    alt: "Carryover app, step 3 of 4, Your recipe: the PC's processor, memory, graphics and Windows version, a disk bar showing C: and D: with BitLocker on, and the app list split into automatic and needs-you.",
    caption: "Your recipe: hardware, disks and every app, in one file. (Sample data.)",
  },
  mode: {
    file: "light-1-mode",
    alt: "Carryover app, step 1 of 4: two choices, Set up a new device (pair once with a QR code on your Wi-Fi) and Refresh this PC (no USB stick needed, only the Windows drive is erased).",
    caption: "Step 1 in the app: New device or Refresh this PC.",
  },
  newDevice: {
    file: "light-6-newdevice-plan",
    alt: "Carryover app, plan for a new device: safety check passed, and notes on fitting the new machine, such as less memory, less disk room, a graphics change from NVIDIA to AMD, and a different maker.",
    caption: "The plan is fitted to the new machine: memory, disk room, graphics and maker. (Sample data.)",
  },
  organize: {
    file: "light-8-organize",
    alt: "Carryover app, Organize my files while moving: loose files in Downloads and Desktop mapped into folders such as Installers, Screenshots, Photos by month, PDFs, Word documents and Spreadsheets, with duplicates flagged only.",
    caption: "Organize my files: loose files go into folders, duplicates are only flagged. (Sample data.)",
  },
  plan: {
    file: "light-4-plan",
    alt: "Carryover app, Refresh this PC plan: safety check passed, the storage driver saved for Windows Setup, and a before and after disk bar where C: is erased and D: keeps the recipe.",
    caption: "A plan that passes: C: is erased, D: keeps the recipe. (Sample data.)",
  },
  risky: {
    file: "dark-5-risky",
    alt: "Carryover app in dark mode, a blocked AI draft: two problems found, it saves to C: which is the drive being erased, and PC Optimizer Pro was not on the source PC so it won't be installed.",
    caption: "A risky AI draft, blocked with the reasons. (Sample data, dark mode.)",
    dark: true,
  },
} satisfies Record<string, Shot>;
