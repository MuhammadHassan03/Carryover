// Mirrors crates/core/src/model.rs (serde camelCase).

export type Mode = "newDevice" | "refreshThisPc";
export type Firmware = "uefi" | "bios" | "unknown";
export type PartitionKind = "efi" | "reserved" | "recovery" | "system" | "data";
export type Encryption = "none" | "bitLocker" | "unknown";
export type AppSource = "winget" | "msStore" | "registry";

export interface Partition {
  number: number;
  driveLetter: string | null;
  label: string;
  fileSystem: string;
  sizeBytes: number;
  freeBytes: number | null;
  kind: PartitionKind;
  encryption: Encryption;
}

export interface Disk {
  number: number;
  model: string;
  sizeBytes: number;
  bus: string;
  isBoot: boolean;
  partitions: Partition[];
}

export interface DeviceSpecs {
  hostname: string;
  manufacturer: string;
  model: string;
  osName: string;
  osVersion: string;
  osBuild: string;
  cpu: string;
  cpuCores: number;
  ramBytes: number;
  gpus: string[];
  firmware: Firmware;
  tpmPresent: boolean | null;
  secureBoot: boolean | null;
  disks: Disk[];
}

export interface App {
  name: string;
  version: string | null;
  publisher: string | null;
  wingetId: string | null;
  source: AppSource;
}

export interface Driver {
  infName: string;
  deviceName: string;
  provider: string;
  version: string;
  class: string;
  bootCritical: boolean;
}

export interface Recipe {
  schemaVersion: number;
  createdAt: string;
  toolVersion: string;
  source: DeviceSpecs;
  apps: App[];
  drivers: Driver[];
  files: FileEntry[];
  warnings: string[];
}

export interface FileEntry {
  path: string;
  sizeBytes: number;
  modified: number;
}

export interface FileMove {
  from: string;
  to: string;
  rule: string;
}

export interface OrganizeGroup {
  rule: string;
  label: string;
  folder: string;
  count: number;
  bytes: number;
  examples: string[];
}

export interface OrganizePlan {
  moves: FileMove[];
  groups: OrganizeGroup[];
  duplicates: { sizeBytes: number; paths: string[] }[];
  leftAlone: number;
  scanned: number;
}

export type Location = { kind: "volume"; letter: string } | { kind: "pairedDevice" };

export type Step =
  | { action: "saveRecipe"; to: Location }
  | { action: "saveBitLockerKey"; letter: string; to: Location }
  | { action: "suspendBitLocker"; letter: string }
  | { action: "exportDrivers"; bootCriticalOnly: boolean; to: Location }
  | { action: "backupUserFiles"; to: Location; bytes: number }
  | { action: "restoreUserFiles" }
  | { action: "organizeFiles"; moves: FileMove[] }
  | { action: "stageRecoveryEnvironment"; disk: number; partition: number }
  | { action: "wipeAndInstallWindows"; disk: number; partition: number }
  | { action: "injectDrivers" }
  | { action: "installApp"; wingetId: string; name: string }
  | { action: "manualApp"; name: string; reason: string }
  | { action: "transferToPairedDevice" }
  | { action: "verify" };

export interface Plan {
  mode: Mode;
  steps: Step[];
  planner: string;
}

export interface Violation {
  rule: string;
  severity: "block" | "warn";
  step: number | null;
  message: string;
}

export interface Verdict {
  ok: boolean;
  rulesChecked: number;
  violations: Violation[];
}

export interface Advice {
  id: string;
  level: "info" | "heads";
  title: string;
  detail: string;
}

export interface RuleInfo {
  id: string;
  text: string;
}

export interface Review {
  plan: Plan;
  verdict: Verdict;
  advice: Advice[];
  rules: RuleInfo[];
  organize: OrganizePlan;
}

export interface Platform {
  canScan: boolean;
  os: string;
}
