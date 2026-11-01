//! Read-only scanning of the current PC.
//!
//! The Windows scanner runs `scan.ps1` and parses its JSON. The parsing is
//! plain Rust, so it is unit-tested on any OS with a recorded payload.

use serde::{Deserialize, Deserializer};

use crate::model::*;
use crate::{Error, Result};

/// The PowerShell script, embedded at compile time so the app is one file.
pub const SCAN_SCRIPT: &str = include_str!("scan.ps1");

/// A payload recorded from a Windows 11 laptop, used for demo mode and tests.
pub const DEMO_PAYLOAD: &str = include_str!("demo_payload.json");

const GPT_EFI: &str = "{c12a7328-f81f-11d2-ba4b-00a0c93ec93b}";
const GPT_MSR: &str = "{e3c9e316-0b5c-4db8-817d-f92df00215ae}";
const GPT_RECOVERY: &str = "{de94bba4-06d1-4d40-a16a-bfd50179d6ac}";

/// Accept either a JSON array or a single object. PowerShell sometimes
/// collapses one-element arrays, so every list goes through this.
fn one_or_many<'de, D, T>(d: D) -> std::result::Result<Vec<T>, D::Error>
where
    D: Deserializer<'de>,
    T: Deserialize<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum OneOrMany<T> {
        Many(Vec<T>),
        One(T),
        Null(()),
    }
    Ok(match Option::<OneOrMany<T>>::deserialize(d)? {
        Some(OneOrMany::Many(v)) => v,
        Some(OneOrMany::One(t)) => vec![t],
        Some(OneOrMany::Null(())) | None => Vec::new(),
    })
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawScan {
    #[serde(default)]
    hostname: String,
    #[serde(default)]
    manufacturer: String,
    #[serde(default)]
    model: String,
    #[serde(default)]
    os_name: String,
    #[serde(default)]
    os_version: String,
    #[serde(default)]
    os_build: String,
    #[serde(default)]
    cpu: String,
    #[serde(default)]
    cores: u32,
    #[serde(default)]
    ram: u64,
    #[serde(default, deserialize_with = "one_or_many")]
    gpus: Vec<String>,
    #[serde(default)]
    firmware: String,
    secure_boot: Option<bool>,
    tpm: Option<bool>,
    #[serde(default, deserialize_with = "one_or_many")]
    disks: Vec<RawDisk>,
    #[serde(default, deserialize_with = "one_or_many")]
    apps: Vec<RawApp>,
    #[serde(default, deserialize_with = "one_or_many")]
    drivers: Vec<RawDriver>,
    #[serde(default, deserialize_with = "one_or_many")]
    files: Vec<RawFile>,
    #[serde(default, deserialize_with = "one_or_many")]
    warnings: Vec<String>,
}

#[derive(Deserialize)]
struct RawFile {
    #[serde(default)]
    path: String,
    #[serde(default)]
    size: u64,
    #[serde(default)]
    modified: i64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawDisk {
    number: u32,
    #[serde(default)]
    model: String,
    #[serde(default)]
    size: u64,
    #[serde(default)]
    bus: String,
    #[serde(default)]
    is_boot: bool,
    #[serde(default, deserialize_with = "one_or_many")]
    partitions: Vec<RawPartition>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawPartition {
    number: u32,
    letter: Option<String>,
    #[serde(default, rename = "type")]
    kind: String,
    #[serde(default)]
    gpt_type: String,
    #[serde(default)]
    is_boot: bool,
    #[serde(default)]
    is_system: bool,
    #[serde(default)]
    size: u64,
    #[serde(default)]
    label: String,
    #[serde(default)]
    fs: String,
    free: Option<u64>,
    #[serde(default)]
    enc: String,
}

#[derive(Deserialize)]
struct RawApp {
    #[serde(default)]
    name: String,
    version: Option<String>,
    publisher: Option<String>,
    id: Option<String>,
    #[serde(default)]
    source: String,
}

#[derive(Deserialize)]
struct RawDriver {
    #[serde(default)]
    inf: String,
    #[serde(default)]
    device: String,
    #[serde(default)]
    provider: String,
    #[serde(default)]
    version: String,
    #[serde(default)]
    class: String,
}

fn non_empty(s: Option<String>) -> Option<String> {
    s.map(|v| v.trim().to_string()).filter(|v| !v.is_empty())
}

fn partition_kind(p: &RawPartition) -> PartitionKind {
    let gpt = p.gpt_type.to_ascii_lowercase();
    // In Windows storage terms "IsSystem" is the EFI partition and "IsBoot"
    // is the partition Windows boots from. Easy to mix up, so be explicit.
    if gpt == GPT_EFI || p.is_system || p.kind.eq_ignore_ascii_case("System") {
        PartitionKind::Efi
    } else if gpt == GPT_MSR || p.kind.eq_ignore_ascii_case("Reserved") {
        PartitionKind::Reserved
    } else if gpt == GPT_RECOVERY || p.kind.eq_ignore_ascii_case("Recovery") {
        PartitionKind::Recovery
    } else if p.is_boot {
        PartitionKind::System
    } else {
        PartitionKind::Data
    }
}

fn encryption(s: &str) -> Encryption {
    match s {
        "bitLocker" => Encryption::BitLocker,
        "none" => Encryption::None,
        _ => Encryption::Unknown,
    }
}

/// Storage controller drivers that Windows Setup may need to see the disk.
pub fn is_boot_critical(class: &str, device: &str, provider: &str) -> bool {
    let class = class.to_ascii_uppercase();
    let device = device.to_ascii_lowercase();
    if provider.eq_ignore_ascii_case("Microsoft") {
        return false;
    }
    class == "SCSIADAPTER"
        || class == "HDC"
        || device.contains("rapid storage")
        || device.contains("vmd")
        || device.contains("rst ")
        || device.contains("raid")
}

fn app_from_raw(a: RawApp) -> Option<App> {
    let name = a.name.trim().to_string();
    if name.is_empty() {
        return None;
    }
    let source = match a.source.to_ascii_lowercase().as_str() {
        "winget" => AppSource::Winget,
        "msstore" => AppSource::MsStore,
        _ => AppSource::Registry,
    };
    // Get-WinGetPackage also lists apps it only knows from Add/Remove Programs
    // (ids like "ARP\Machine\X64\..."). Those are not installable, so only keep
    // the id when the package came from a real source.
    let winget_id = match source {
        AppSource::Winget | AppSource::MsStore => non_empty(a.id),
        AppSource::Registry => None,
    };
    Some(App {
        name,
        version: non_empty(a.version),
        publisher: non_empty(a.publisher),
        winget_id,
        source,
    })
}

/// Turn the scanner's JSON into specs, apps, drivers and warnings.
pub fn parse_scan(json: &str, created_at: &str) -> Result<Recipe> {
    let raw: RawScan = serde_json::from_str(json.trim_start_matches('\u{feff}'))
        .map_err(|e| Error::ScanParse(e.to_string()))?;

    let disks = raw
        .disks
        .into_iter()
        .map(|d| Disk {
            number: d.number,
            model: d.model.trim().to_string(),
            size_bytes: d.size,
            bus: d.bus,
            is_boot: d.is_boot,
            partitions: d
                .partitions
                .into_iter()
                .map(|p| Partition {
                    number: p.number,
                    drive_letter: p
                        .letter
                        .as_deref()
                        .and_then(|s| s.chars().next())
                        .filter(|c| c.is_ascii_alphabetic())
                        .map(|c| c.to_ascii_uppercase()),
                    kind: partition_kind(&p),
                    label: p.label,
                    file_system: p.fs,
                    size_bytes: p.size,
                    free_bytes: p.free,
                    encryption: encryption(&p.enc),
                })
                .collect(),
        })
        .collect();

    let firmware = match raw.firmware.to_ascii_lowercase().as_str() {
        "uefi" => Firmware::Uefi,
        "legacy" | "bios" => Firmware::Bios,
        _ => Firmware::Unknown,
    };

    let mut apps: Vec<App> = raw.apps.into_iter().filter_map(app_from_raw).collect();
    apps.sort_by_key(|a| a.name.to_lowercase());
    apps.dedup_by(|a, b| a.name.eq_ignore_ascii_case(&b.name));

    let drivers = raw
        .drivers
        .into_iter()
        .filter(|d| !d.inf.is_empty())
        .map(|d| Driver {
            boot_critical: is_boot_critical(&d.class, &d.device, &d.provider),
            inf_name: d.inf,
            device_name: d.device,
            provider: d.provider,
            version: d.version,
            class: d.class,
        })
        .collect();

    let files = raw
        .files
        .into_iter()
        .map(|f| FileEntry { path: f.path.replace('\\', "/"), size_bytes: f.size, modified: f.modified })
        .filter(|f| !f.path.is_empty() && !f.path.contains(".."))
        .collect();

    Ok(Recipe {
        schema_version: Recipe::SCHEMA_VERSION,
        created_at: created_at.to_string(),
        tool_version: env!("CARGO_PKG_VERSION").to_string(),
        source: DeviceSpecs {
            hostname: raw.hostname,
            manufacturer: raw.manufacturer.trim().to_string(),
            model: raw.model.trim().to_string(),
            os_name: raw.os_name,
            os_version: raw.os_version,
            os_build: raw.os_build,
            cpu: raw.cpu,
            cpu_cores: raw.cores,
            ram_bytes: raw.ram,
            gpus: raw.gpus,
            firmware,
            tpm_present: raw.tpm,
            secure_boot: raw.secure_boot,
            disks,
        },
        apps,
        drivers,
        files,
        warnings: raw.warnings,
    })
}

/// How long a scan may take before it is stopped. A big Documents folder on a
/// slow disk takes well under a minute; anything near this limit is stuck.
pub const SCAN_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(180);

/// PowerShell arguments. The script arrives on stdin and is run as one block:
/// `-Command -` would execute it line by line like an interactive console.
pub const POWERSHELL_ARGS: &[&str] = &[
    "-NoLogo",
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    "& ([scriptblock]::Create([Console]::In.ReadToEnd()))",
];

/// Run `program` with the scan script on stdin and return its stdout, killing
/// it after `timeout`. Pipes are drained on threads so a large result can't
/// deadlock. Platform-independent so it can be tested anywhere.
pub fn run_script(
    mut cmd: std::process::Command,
    script: &str,
    timeout: std::time::Duration,
) -> Result<String> {
    use std::io::{Read, Write};
    use std::process::Stdio;
    use std::time::Instant;

    let mut child = cmd
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| Error::ScanFailed(format!("could not start PowerShell: {e}")))?;

    let mut stdout = child.stdout.take().ok_or_else(|| Error::ScanFailed("no stdout".into()))?;
    let mut stderr = child.stderr.take().ok_or_else(|| Error::ScanFailed("no stderr".into()))?;
    let out_thread = std::thread::spawn(move || {
        let mut buf = Vec::new();
        let _ = stdout.read_to_end(&mut buf);
        buf
    });
    let err_thread = std::thread::spawn(move || {
        let mut buf = Vec::new();
        let _ = stderr.read_to_end(&mut buf);
        buf
    });

    {
        let mut stdin = child.stdin.take().ok_or_else(|| Error::ScanFailed("no stdin".into()))?;
        stdin.write_all(script.as_bytes()).map_err(|e| Error::ScanFailed(e.to_string()))?;
        // Dropping stdin closes it, so ReadToEnd() returns.
    }

    let started = Instant::now();
    let status = loop {
        match child.try_wait().map_err(|e| Error::ScanFailed(e.to_string()))? {
            Some(status) => break status,
            None if started.elapsed() > timeout => {
                let _ = child.kill();
                let _ = child.wait();
                return Err(Error::ScanFailed(format!(
                    "the scan took longer than {} seconds and was stopped",
                    timeout.as_secs()
                )));
            }
            None => std::thread::sleep(std::time::Duration::from_millis(50)),
        }
    };

    let out = out_thread.join().unwrap_or_default();
    let err = err_thread.join().unwrap_or_default();
    let stdout = String::from_utf8_lossy(&out).into_owned();
    if !stdout.contains('{') {
        let err = String::from_utf8_lossy(&err);
        let reason = if err.trim().is_empty() { format!("PowerShell exited with {status}") } else { err.trim().to_string() };
        return Err(Error::ScanFailed(reason));
    }
    Ok(stdout)
}

/// Pull the JSON object out of the script output (PowerShell may print a BOM
/// or stray lines first).
pub fn extract_json(stdout: &str) -> Option<&str> {
    let start = stdout.find('{')?;
    let end = stdout.rfind('}')?;
    (end > start).then(|| &stdout[start..=end])
}

/// Run the real scanner. Only available on Windows.
#[cfg(windows)]
pub fn scan_this_pc(created_at: &str) -> Result<Recipe> {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;

    // Absolute path, so a planted powershell.exe on PATH or in the working
    // directory can't be picked up instead.
    let system_root = std::env::var("SystemRoot").unwrap_or_else(|_| r"C:\Windows".into());
    let exe = format!(r"{system_root}\System32\WindowsPowerShell\v1.0\powershell.exe");
    let mut cmd = std::process::Command::new(exe);
    cmd.args(POWERSHELL_ARGS).creation_flags(CREATE_NO_WINDOW);

    let stdout = run_script(cmd, SCAN_SCRIPT, SCAN_TIMEOUT)?;
    let json = extract_json(&stdout).ok_or_else(|| Error::ScanFailed("the scanner printed no result".into()))?;
    parse_scan(json, created_at)
}

#[cfg(not(windows))]
pub fn scan_this_pc(_created_at: &str) -> Result<Recipe> {
    Err(Error::Unsupported("Scanning is only available on Windows for now."))
}

/// Demo data so the UI can be explored on any OS.
pub fn demo_recipe(created_at: &str) -> Result<Recipe> {
    parse_scan(DEMO_PAYLOAD, created_at)
}

/// The demo target: a smaller, newer laptop (used for "New device" previews).
pub fn demo_target_specs() -> DeviceSpecs {
    DeviceSpecs {
        hostname: "NEW-LAPTOP".into(),
        manufacturer: "Lenovo".into(),
        model: "IdeaPad Slim 5".into(),
        os_name: "Microsoft Windows 11 Home".into(),
        os_version: "10.0.26100".into(),
        os_build: "26100".into(),
        cpu: "AMD Ryzen 7 8845HS".into(),
        cpu_cores: 8,
        ram_bytes: 8 * 1024 * 1024 * 1024,
        gpus: vec!["AMD Radeon 780M".into()],
        firmware: Firmware::Uefi,
        tpm_present: Some(true),
        secure_boot: Some(true),
        disks: vec![Disk {
            number: 0,
            model: "SK hynix 256GB NVMe".into(),
            size_bytes: 256_060_514_304,
            bus: "NVMe".into(),
            is_boot: true,
            partitions: vec![
                Partition {
                    number: 1,
                    drive_letter: None,
                    label: String::new(),
                    file_system: "FAT32".into(),
                    size_bytes: 268_435_456,
                    free_bytes: None,
                    kind: PartitionKind::Efi,
                    encryption: Encryption::None,
                },
                Partition {
                    number: 3,
                    drive_letter: Some('C'),
                    label: "Windows".into(),
                    file_system: "NTFS".into(),
                    size_bytes: 254_000_000_000,
                    free_bytes: Some(221_000_000_000),
                    kind: PartitionKind::System,
                    encryption: Encryption::BitLocker,
                },
            ],
        }],
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_demo_payload() {
        let r = demo_recipe("2026-11-02T00:00:00Z").unwrap();
        assert_eq!(r.source.firmware, Firmware::Uefi);
        assert!(r.apps.len() > 10);
        assert!(r.auto_app_count() > 0);
        assert!(r.boot_critical_drivers().count() >= 1);
        let c = r.source.disks[0]
            .partitions
            .iter()
            .find(|p| p.drive_letter == Some('C'))
            .unwrap();
        assert_eq!(c.kind, PartitionKind::System);
        assert_eq!(c.encryption, Encryption::BitLocker);
        assert!(r.source.disks[0].partitions.iter().any(|p| p.kind == PartitionKind::Efi));
    }

    #[test]
    fn arp_ids_are_not_installable() {
        let json = r#"{"apps":{"name":"Old Tool","id":"ARP\\Machine\\X64\\OldTool","source":""}}"#;
        let r = parse_scan(json, "t").unwrap();
        assert_eq!(r.apps.len(), 1, "single object must parse as a list");
        assert!(r.apps[0].winget_id.is_none());
    }

    #[test]
    fn tolerates_bom_nulls_and_missing_fields() {
        let json = "\u{feff}{\"disks\":null,\"apps\":[],\"drivers\":null,\"gpus\":\"Intel UHD\"}";
        let r = parse_scan(json, "t").unwrap();
        assert!(r.source.disks.is_empty());
        assert_eq!(r.source.gpus, vec!["Intel UHD".to_string()]);
    }

    #[test]
    fn script_is_ascii() {
        // Windows PowerShell reads stdin in the console code page.
        assert!(SCAN_SCRIPT.is_ascii());
    }

    #[test]
    fn extracts_json_after_bom_and_noise() {
        let out = "\u{feff}WARNING: something\r\n{\"a\":1}\r\n";
        assert_eq!(extract_json(out), Some("{\"a\":1}"));
        assert_eq!(extract_json("no json here"), None);
    }

    #[cfg(unix)]
    #[test]
    fn run_script_reads_stdin_and_returns_stdout() {
        let mut cmd = std::process::Command::new("sh");
        cmd.args(["-c", "cat"]);
        let big = format!("{{\"x\":\"{}\"}}", "a".repeat(2_000_000));
        let out = run_script(cmd, &big, std::time::Duration::from_secs(20)).unwrap();
        assert_eq!(out.len(), big.len(), "large output must not deadlock or truncate");
    }

    #[cfg(unix)]
    #[test]
    fn run_script_times_out() {
        let mut cmd = std::process::Command::new("sh");
        cmd.args(["-c", "sleep 30"]);
        let t = std::time::Instant::now();
        let err = run_script(cmd, "", std::time::Duration::from_millis(300)).unwrap_err();
        assert!(err.to_string().contains("stopped"));
        assert!(t.elapsed().as_secs() < 5);
    }

    #[cfg(unix)]
    #[test]
    fn run_script_reports_stderr_on_failure() {
        let mut cmd = std::process::Command::new("sh");
        cmd.args(["-c", "echo 'Access is denied' >&2; exit 1"]);
        let err = run_script(cmd, "", std::time::Duration::from_secs(5)).unwrap_err();
        assert!(err.to_string().contains("Access is denied"));
    }

    #[test]
    fn rejects_garbage() {
        assert!(parse_scan("not json", "t").is_err());
    }

    #[test]
    fn microsoft_inbox_storage_driver_is_not_critical() {
        assert!(!is_boot_critical("SCSIAdapter", "Standard NVM Express Controller", "Microsoft"));
        assert!(is_boot_critical("SCSIAdapter", "Intel RST VMD Controller 9A0B", "Intel"));
    }
}
