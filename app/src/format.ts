import type { Location, Step } from "./types";

const GB = 1024 ** 3;

export function bytes(n: number | null | undefined): string {
  if (n == null) return "–";
  if (n >= 1000 * GB) return `${(n / 1024 / GB).toFixed(1)} TB`;
  if (n >= GB) return `${Math.round(n / GB)} GB`;
  return `${Math.round(n / 1024 ** 2)} MB`;
}

export function where(loc: Location): string {
  return loc.kind === "volume" ? `drive ${loc.letter}:` : "your new device";
}

export type Phase = "prepare" | "reinstall" | "rebuild" | "finish";

export interface StepText {
  phase: Phase;
  title: string;
  detail?: string;
  mono?: string;
  manual?: boolean;
  destructive?: boolean;
}

export function describe(step: Step): StepText {
  switch (step.action) {
    case "saveRecipe":
      return { phase: "prepare", title: `Save your PC Recipe to ${where(step.to)}` };
    case "saveBitLockerKey":
      return {
        phase: "prepare",
        title: `Save the BitLocker recovery key for ${step.letter}:`,
        detail: `Stored on ${where(step.to)} so a locked drive can always be opened.`,
      };
    case "suspendBitLocker":
      return { phase: "prepare", title: `Pause BitLocker on ${step.letter}: for one restart` };
    case "exportDrivers":
      return {
        phase: "prepare",
        title: step.bootCriticalOnly ? "Export storage drivers" : "Export drivers",
        detail: `Copied to ${where(step.to)}, including the one Setup needs to see your disk.`,
      };
    case "backupUserFiles":
      return {
        phase: "prepare",
        title: `Copy your files to ${where(step.to)}`,
        detail: `Desktop, Documents, Downloads, Pictures, Videos and Music, about ${bytes(step.bytes)}.`,
      };
    case "restoreUserFiles":
      return { phase: "rebuild", title: "Put your files back where they were" };
    case "organizeFiles":
      return {
        phase: "rebuild",
        title: `Organize ${step.moves.length} loose files`,
        detail: "Moved into tidy folders. Nothing is deleted, and every move can be undone.",
      };
    case "stageRecoveryEnvironment":
      return {
        phase: "reinstall",
        title: "Put Windows Setup on this PC",
        detail: "No USB stick. Setup is copied to a drive that stays untouched, then the PC restarts into it.",
        mono: `disk ${step.disk} · partition ${step.partition}`,
      };
    case "wipeAndInstallWindows":
      return {
        phase: "reinstall",
        title: "Erase the Windows drive and install a fresh copy",
        detail: "Only this volume is erased. Other drives and partitions are left alone.",
        mono: `disk ${step.disk} · partition ${step.partition}`,
        destructive: true,
      };
    case "injectDrivers":
      return { phase: "reinstall", title: "Add your saved drivers to the new Windows" };
    case "installApp":
      return { phase: "rebuild", title: step.name, mono: step.wingetId };
    case "manualApp":
      return { phase: "rebuild", title: step.name, detail: step.reason, manual: true };
    case "transferToPairedDevice":
      return {
        phase: "prepare",
        title: "Send the recipe and your files over the encrypted link",
        detail: "Direct device-to-device on your Wi-Fi. Nothing goes through a server.",
      };
    case "verify":
      return { phase: "finish", title: "Check everything and write your done report" };
  }
}

export const PHASES: { id: Phase; label: string }[] = [
  { id: "prepare", label: "Prepare" },
  { id: "reinstall", label: "Fresh Windows" },
  { id: "rebuild", label: "Rebuild" },
  { id: "finish", label: "Finish" },
];
