# Carryover read-only scanner.
# Prints one JSON document to stdout. Never writes to disk or the registry.
# Works on Windows PowerShell 5.1 and PowerShell 7. Must stay plain ASCII:
# Windows PowerShell reads stdin in the console code page.

$ErrorActionPreference = 'SilentlyContinue'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [Text.Encoding]::UTF8

$warnings = New-Object System.Collections.ArrayList
$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { [void]$warnings.Add('Scan ran without admin rights, so the TPM state is missing.') }

# ---------- device ----------
$cs  = Get-CimInstance Win32_ComputerSystem
$os  = Get-CimInstance Win32_OperatingSystem
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
$gpus = @(Get-CimInstance Win32_VideoController | ForEach-Object { [string]$_.Name })

# Firmware type straight from Windows (1 = legacy BIOS, 2 = UEFI). No admin needed.
# Note: %firmware_type% only exists inside cmd.exe, not as a real variable.
$firmware = 'unknown'
try {
  Add-Type -Namespace Carryover -Name Firmware -MemberDefinition '[System.Runtime.InteropServices.DllImport("kernel32.dll")] public static extern bool GetFirmwareType(ref uint firmwareType);' -ErrorAction Stop
  [uint32]$ft = 0
  if ([Carryover.Firmware]::GetFirmwareType([ref]$ft)) {
    if ($ft -eq 1) { $firmware = 'bios' } elseif ($ft -eq 2) { $firmware = 'uefi' }
  }
} catch { }

# Secure Boot: the registry value is readable without admin on UEFI machines.
$secureBoot = $null
$sbState = Get-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\SecureBoot\State' -Name UEFISecureBootEnabled -ErrorAction SilentlyContinue
if ($sbState) { $secureBoot = [bool]$sbState.UEFISecureBootEnabled }
elseif ($firmware -eq 'bios') { $secureBoot = $false }

$tpm = $null
if ($isAdmin) {
  $t = Get-CimInstance -Namespace 'root/cimv2/Security/MicrosoftTpm' -ClassName Win32_Tpm
  $tpm = [bool]($t -ne $null)
}

# ---------- BitLocker (works without admin through the shell property) ----------
$shell = New-Object -ComObject Shell.Application
function Get-BitLockerState([string]$letter) {
  $v = $null
  try { $v = $shell.NameSpace("$($letter):").Self.ExtendedProperty('System.Volume.BitLockerProtection') } catch { }
  # 1 = on, 3 = encrypting, 5 = encrypted but suspended, 2 = off, other/null = unknown
  if ($v -eq 1 -or $v -eq 3 -or $v -eq 5) { return 'bitLocker' }
  if ($v -eq 2) { return 'none' }
  return 'unknown'
}

# ---------- disks ----------
$disks = @(Get-Disk | Sort-Object Number | ForEach-Object {
  $d = $_
  $parts = @(Get-Partition -DiskNumber $d.Number | Sort-Object PartitionNumber | ForEach-Object {
    $p = $_
    $letter = $null; $vol = $null; $enc = 'unknown'
    if ($p.DriveLetter -and [int][char]$p.DriveLetter -ne 0) {
      $letter = [string]$p.DriveLetter
      $vol = Get-Volume -DriveLetter $p.DriveLetter
      $enc = Get-BitLockerState $letter
    }
    [pscustomobject]@{
      number   = [uint32]$p.PartitionNumber
      letter   = $letter
      type     = [string]$p.Type
      gptType  = [string]$p.GptType
      isBoot   = [bool]$p.IsBoot
      isSystem = [bool]$p.IsSystem
      size     = [uint64]$p.Size
      label    = if ($vol) { [string]$vol.FileSystemLabel } else { '' }
      fs       = if ($vol) { [string]$vol.FileSystem } else { '' }
      free     = if ($vol) { [uint64]$vol.SizeRemaining } else { $null }
      enc      = $enc
    }
  })
  [pscustomobject]@{
    number     = [uint32]$d.Number
    model      = [string]$d.FriendlyName
    size       = [uint64]$d.Size
    bus        = [string]$d.BusType
    isBoot     = [bool]$d.IsBoot
    partitions = $parts
  }
})

# ---------- apps ----------
$apps = @()
$winget = @()
if (Get-Command Get-WinGetPackage -ErrorAction SilentlyContinue) {
  $apps = @(Get-WinGetPackage | ForEach-Object {
    [pscustomobject]@{ name = [string]$_.Name; version = [string]$_.InstalledVersion; publisher = $null; id = [string]$_.Id; source = [string]$_.Source }
  })
} else {
  # No winget PowerShell module: read installed programs from the registry,
  # then ask winget.exe (part of Windows 11) which of them it can reinstall.
  $wingetExe = Get-Command winget.exe -ErrorAction SilentlyContinue
  if ($wingetExe) {
    $exportFile = Join-Path ([IO.Path]::GetTempPath()) ("carryover-winget-" + [guid]::NewGuid().ToString('N') + ".json")
    try {
      & $wingetExe.Source export --output $exportFile --include-versions --accept-source-agreements --disable-interactivity *> $null
      if (Test-Path -LiteralPath $exportFile) {
        $export = Get-Content -LiteralPath $exportFile -Raw | ConvertFrom-Json
        $winget = @($export.Sources | ForEach-Object {
          $src = [string]$_.SourceDetails.Name
          $_.Packages | ForEach-Object { [pscustomobject]@{ id = [string]$_.PackageIdentifier; version = [string]$_.Version; source = $src } }
        })
      }
    } catch { }
    finally { Remove-Item -LiteralPath $exportFile -Force -ErrorAction SilentlyContinue }
  }
  if (-not $winget -or $winget.Count -eq 0) {
    [void]$warnings.Add('winget is not available, so apps were read from the registry and most will need a manual reinstall.')
  }
  $keys = @(
    'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*',
    'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*',
    'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*'
  )
  $apps = @(Get-ItemProperty $keys |
    Where-Object { $_.DisplayName -and -not $_.SystemComponent -and -not $_.ParentKeyName -and -not $_.ReleaseType } |
    Sort-Object DisplayName -Unique |
    ForEach-Object {
      [pscustomobject]@{ name = [string]$_.DisplayName; version = [string]$_.DisplayVersion; publisher = [string]$_.Publisher; id = $null; source = 'registry' }
    })
}

# ---------- third-party drivers ----------
$drivers = @(Get-CimInstance Win32_PnPSignedDriver |
  Where-Object { $_.InfName -like 'oem*.inf' } |
  Sort-Object InfName -Unique |
  ForEach-Object {
    [pscustomobject]@{ inf = [string]$_.InfName; device = [string]$_.DeviceName; provider = [string]$_.DriverProviderName; version = [string]$_.DriverVersion; class = [string]$_.DeviceClass }
  })

# ---------- user files: names, sizes and dates only, never contents ----------
$files = New-Object System.Collections.ArrayList
$limit = 20000
$roots = [ordered]@{
  'Desktop'   = [Environment]::GetFolderPath('Desktop')
  'Downloads' = (Join-Path $env:USERPROFILE 'Downloads')
  'Documents' = [Environment]::GetFolderPath('MyDocuments')
  'Pictures'  = [Environment]::GetFolderPath('MyPictures')
  'Videos'    = [Environment]::GetFolderPath('MyVideos')
  'Music'     = [Environment]::GetFolderPath('MyMusic')
}
# Hidden, System, ReparsePoint, Offline, RecallOnOpen (0x40000) and
# RecallOnDataAccess (0x400000). Cloud-only OneDrive files are skipped: they are
# already safe in the cloud and touching them would start a download.
$skip = 0x2 -bor 0x4 -bor 0x400 -bor 0x1000 -bor 0x40000 -bor 0x400000
$seen = @{}
foreach ($name in $roots.Keys) {
  $base = $roots[$name]
  if (-not $base -or -not (Test-Path -LiteralPath $base)) { continue }
  $base = (Resolve-Path -LiteralPath $base).ProviderPath.TrimEnd('\')
  # Two known folders can point at the same place (e.g. redirected Documents).
  if ($seen.ContainsKey($base.ToLowerInvariant())) { continue }
  $seen[$base.ToLowerInvariant()] = $true
  $room = $limit - $files.Count
  if ($room -le 0) { break }
  # Streamed, so huge folders stop early instead of loading into memory first.
  Get-ChildItem -LiteralPath $base -File -Recurse -Depth 4 -Force |
    Where-Object { -not ([int]$_.Attributes -band $skip) } |
    Select-Object -First $room |
    ForEach-Object {
      $rel = $_.FullName.Substring($base.Length).TrimStart('\').Replace('\', '/')
      [void]$files.Add([pscustomobject]@{
        path     = "$name/$rel"
        size     = [uint64]$_.Length
        modified = [int64]([DateTimeOffset]$_.LastWriteTimeUtc).ToUnixTimeSeconds()
      })
    }
}
if ($files.Count -ge $limit) { [void]$warnings.Add('More than 20,000 files in your folders. Only the first 20,000 were listed; all of them still get backed up.') }

[pscustomobject]@{
  hostname     = [string]$env:COMPUTERNAME
  manufacturer = [string]$cs.Manufacturer
  model        = [string]$cs.Model
  osName       = [string]$os.Caption
  osVersion    = [string]$os.Version
  osBuild      = [string]$os.BuildNumber
  cpu          = ([string]$cpu.Name).Trim()
  cores        = [uint32]$cpu.NumberOfCores
  ram          = [uint64]$cs.TotalPhysicalMemory
  gpus         = $gpus
  firmware     = $firmware
  secureBoot   = $secureBoot
  tpm          = $tpm
  disks        = $disks
  apps         = $apps
  winget       = @($winget)
  isAdmin      = [bool]$isAdmin
  drivers      = $drivers
  files        = @($files)
  warnings     = @($warnings)
} | ConvertTo-Json -Depth 8 -Compress
