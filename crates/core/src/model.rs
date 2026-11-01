//! Data model shared by the scanner, planner, safety checker and UI.
//!
//! Everything here is plain data with serde derives so it can cross the
//! Tauri bridge as JSON and be written to disk as a recipe file.

use serde::{Deserialize, Serialize};

/// What the hardware and OS of one machine look like.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceSpecs {
    pub hostname: String,
    pub manufacturer: String,
    pub model: String,
    pub os_name: String,
    pub os_version: String,
    pub os_build: String,
    pub cpu: String,
    pub cpu_cores: u32,
    pub ram_bytes: u64,
    pub gpus: Vec<String>,
    pub firmware: Firmware,
    pub tpm_present: Option<bool>,
    pub secure_boot: Option<bool>,
    pub disks: Vec<Disk>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Firmware {
    Uefi,
    Bios,
    Unknown,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Disk {
    /// Windows disk number (`Get-Disk`), stable for one boot.
    pub number: u32,
    pub model: String,
    pub size_bytes: u64,
    pub bus: String,
    pub is_boot: bool,
    pub partitions: Vec<Partition>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Partition {
    pub number: u32,
    pub drive_letter: Option<char>,
    pub label: String,
    pub file_system: String,
    pub size_bytes: u64,
    pub free_bytes: Option<u64>,
    pub kind: PartitionKind,
    pub encryption: Encryption,
}

impl Partition {
    pub fn letter_str(&self) -> String {
        self.drive_letter
            .map(|c| format!("{c}:"))
            .unwrap_or_else(|| format!("partition {}", self.number))
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum PartitionKind {
    /// EFI System Partition. Never touched.
    Efi,
    /// Microsoft Reserved.
    Reserved,
    /// Recovery tools (WinRE).
    Recovery,
    /// The volume Windows is running from (usually C:).
    System,
    /// Any other data volume.
    Data,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Encryption {
    None,
    BitLocker,
    /// Scan ran without admin rights or the API was unavailable.
    Unknown,
}

/// One installed program.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct App {
    pub name: String,
    pub version: Option<String>,
    pub publisher: Option<String>,
    /// winget package id when we can reinstall it automatically.
    pub winget_id: Option<String>,
    pub source: AppSource,
}

impl App {
    pub fn auto_installable(&self) -> bool {
        self.winget_id.is_some()
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum AppSource {
    Winget,
    MsStore,
    Registry,
}

/// One third-party driver package (`oemNN.inf`).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Driver {
    pub inf_name: String,
    pub device_name: String,
    pub provider: String,
    pub version: String,
    pub class: String,
    /// Storage controller drivers (Intel RST / VMD and similar). Without these
    /// Windows Setup can fail with "We couldn't find any drives".
    pub boot_critical: bool,
}

/// The portable description of one PC: what is installed and how it is set up.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Recipe {
    pub schema_version: u32,
    pub created_at: String,
    pub tool_version: String,
    pub source: DeviceSpecs,
    pub apps: Vec<App>,
    pub drivers: Vec<Driver>,
    /// Loose and organized files in the user's own folders (names and sizes
    /// only, never contents). Older recipes without it still load.
    #[serde(default)]
    pub files: Vec<FileEntry>,
    /// Whether the scan ran with administrator rights (None for old recipes).
    #[serde(default)]
    pub elevated: Option<bool>,
    /// Things the scanner could not read, shown to the user instead of hidden.
    pub warnings: Vec<String>,
}

/// One file in the user's folders, relative to the profile, `/`-separated,
/// e.g. `Downloads/ChromeSetup.exe`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    pub path: String,
    pub size_bytes: u64,
    /// Last write time, unix seconds.
    pub modified: i64,
}

impl Recipe {
    pub const SCHEMA_VERSION: u32 = 1;

    pub fn auto_app_count(&self) -> usize {
        self.apps.iter().filter(|a| a.auto_installable()).count()
    }

    pub fn boot_critical_drivers(&self) -> impl Iterator<Item = &Driver> {
        self.drivers.iter().filter(|d| d.boot_critical)
    }

    pub fn user_file_bytes(&self) -> u64 {
        self.files.iter().map(|f| f.size_bytes).sum()
    }
}

/// Which flow the user picked on the first screen.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Mode {
    /// Set up a different device from this one.
    NewDevice,
    /// Reinstall Windows on this PC, then rebuild it.
    RefreshThisPc,
}

/// Where a file the plan writes will live.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", tag = "kind")]
pub enum Location {
    /// A volume on this PC, by drive letter.
    Volume { letter: char },
    /// Sent to the paired device over the encrypted link.
    PairedDevice,
}

/// One action in a plan. The planner (rules today, AI later) can only emit
/// these variants; anything else fails to deserialize.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", rename_all_fields = "camelCase", tag = "action")]
pub enum Step {
    SaveRecipe { to: Location },
    SaveBitLockerKey { letter: char, to: Location },
    SuspendBitLocker { letter: char },
    ExportDrivers { boot_critical_only: bool, to: Location },
    /// Copy Desktop, Documents, Downloads, Pictures, Videos and Music.
    BackupUserFiles { to: Location, bytes: u64 },
    RestoreUserFiles,
    /// Tidy loose files. Every move is checked by `organize::check_moves`.
    OrganizeFiles { moves: Vec<crate::organize::Move> },
    StageRecoveryEnvironment { disk: u32, partition: u32 },
    WipeAndInstallWindows { disk: u32, partition: u32 },
    InjectDrivers,
    InstallApp { winget_id: String, name: String },
    ManualApp { name: String, reason: String },
    TransferToPairedDevice,
    Verify,
}

impl Step {
    pub fn is_destructive(&self) -> bool {
        matches!(self, Step::WipeAndInstallWindows { .. })
    }
}

/// Choices the user makes on the plan screen.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlanOptions {
    pub organize_files: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Plan {
    pub mode: Mode,
    pub steps: Vec<Step>,
    /// Who produced the plan, e.g. "rules" or "ai".
    pub planner: String,
}
