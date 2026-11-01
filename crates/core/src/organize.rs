//! "Organize my files": propose tidy-up moves for loose files.
//!
//! Hard guarantees, enforced by `check_moves` and covered by tests:
//! - Nothing is ever deleted. Duplicates are only flagged.
//! - Only loose files on the Desktop and in Downloads are moved. Folders the
//!   user already organized (Documents, Pictures, Videos) are left alone.
//! - Moves stay inside the user's own folders, never into or out of AppData,
//!   never with `..`, never onto an existing file or another move's target.
//! - Hidden files, shortcuts and desktop.ini are never touched.

use std::collections::{BTreeMap, HashMap, HashSet};

use serde::{Deserialize, Serialize};

use crate::model::FileEntry;

/// Top-level folders (relative to the user profile) Carryover may write into.
pub const ALLOWED_ROOTS: &[&str] = &["Desktop", "Downloads", "Documents", "Pictures", "Videos", "Music"];
/// Folders whose loose files get tidied.
const SOURCE_ROOTS: &[&str] = &["Desktop", "Downloads"];

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Rule {
    Installers,
    Archives,
    Screenshots,
    Photos,
    Videos,
    Music,
    Pdfs,
    WordDocs,
    Spreadsheets,
    Slides,
    TextFiles,
}

impl Rule {
    pub fn label(self) -> &'static str {
        match self {
            Rule::Installers => "Installers",
            Rule::Archives => "Archives",
            Rule::Screenshots => "Screenshots",
            Rule::Photos => "Photos by month",
            Rule::Videos => "Videos by year",
            Rule::Music => "Music",
            Rule::Pdfs => "PDFs",
            Rule::WordDocs => "Word documents",
            Rule::Spreadsheets => "Spreadsheets",
            Rule::Slides => "Presentations",
            Rule::TextFiles => "Text and notes",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Move {
    pub from: String,
    pub to: String,
    pub rule: Rule,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Group {
    pub rule: Rule,
    pub label: &'static str,
    pub folder: String,
    pub count: usize,
    pub bytes: u64,
    pub examples: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DuplicateSet {
    pub size_bytes: u64,
    pub paths: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrganizePlan {
    pub moves: Vec<Move>,
    pub groups: Vec<Group>,
    pub duplicates: Vec<DuplicateSet>,
    /// Files scanned but deliberately left where they are.
    pub left_alone: usize,
    pub scanned: usize,
}

fn ext(name: &str) -> String {
    name.rsplit_once('.').map(|(_, e)| e.to_ascii_lowercase()).unwrap_or_default()
}

fn file_name(path: &str) -> &str {
    path.rsplit('/').next().unwrap_or(path)
}

fn is_protected(path: &str) -> bool {
    let name = file_name(path).to_ascii_lowercase();
    path.split('/').any(|seg| seg.starts_with('.'))
        || name == "desktop.ini"
        || name == "thumbs.db"
        || matches!(ext(&name).as_str(), "lnk" | "url" | "tmp" | "crdownload" | "part" | "partial")
}

/// Year and month from a unix timestamp (UTC).
fn year_month(secs: i64) -> (i64, u32) {
    let days = secs.div_euclid(86_400);
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let m = if mp < 10 { mp + 3 } else { mp - 9 } as u32;
    (yoe + era * 400 + i64::from(m <= 2), m)
}

fn classify(f: &FileEntry) -> Option<(Rule, String)> {
    let name = file_name(&f.path);
    let lower = name.to_ascii_lowercase();
    let (y, m) = year_month(f.modified);
    let rule_and_folder = match ext(name).as_str() {
        "exe" | "msi" | "msix" | "msixbundle" | "appx" => (Rule::Installers, "Downloads/Installers".to_string()),
        "zip" | "rar" | "7z" | "tar" | "gz" | "iso" => (Rule::Archives, "Downloads/Archives".to_string()),
        "png" | "jpg" | "jpeg" | "heic" | "webp" | "gif" | "bmp"
            if lower.starts_with("screenshot") || lower.starts_with("screen shot") =>
        {
            (Rule::Screenshots, "Pictures/Screenshots".to_string())
        }
        "png" | "jpg" | "jpeg" | "heic" | "webp" | "gif" | "bmp" | "raw" | "cr2" | "nef" => {
            (Rule::Photos, format!("Pictures/{y:04}-{m:02}"))
        }
        "mp4" | "mov" | "mkv" | "avi" | "wmv" | "webm" => (Rule::Videos, format!("Videos/{y:04}")),
        "mp3" | "wav" | "flac" | "m4a" | "ogg" => (Rule::Music, "Music/Unsorted".to_string()),
        "pdf" => (Rule::Pdfs, "Documents/PDFs".to_string()),
        "doc" | "docx" | "odt" | "rtf" => (Rule::WordDocs, "Documents/Word".to_string()),
        "xls" | "xlsx" | "csv" | "ods" => (Rule::Spreadsheets, "Documents/Spreadsheets".to_string()),
        "ppt" | "pptx" | "odp" | "key" => (Rule::Slides, "Documents/Presentations".to_string()),
        "txt" | "md" => (Rule::TextFiles, "Documents/Notes".to_string()),
        _ => return None,
    };
    Some(rule_and_folder)
}

/// Is this a loose file directly inside Desktop or Downloads?
fn is_loose(path: &str) -> bool {
    let mut parts = path.split('/');
    matches!((parts.next(), parts.next(), parts.next()), (Some(root), Some(_), None) if SOURCE_ROOTS.contains(&root))
}

fn unique_target(folder: &str, name: &str, taken: &mut HashSet<String>) -> String {
    let (stem, dot_ext) = match name.rsplit_once('.') {
        Some((s, e)) => (s.to_string(), format!(".{e}")),
        None => (name.to_string(), String::new()),
    };
    let mut candidate = format!("{folder}/{name}");
    let mut n = 2;
    while taken.contains(&candidate.to_ascii_lowercase()) {
        candidate = format!("{folder}/{stem} ({n}){dot_ext}");
        n += 1;
    }
    taken.insert(candidate.to_ascii_lowercase());
    candidate
}

/// Propose moves for `files` (paths relative to the user profile, `/`-separated).
pub fn propose(files: &[FileEntry]) -> OrganizePlan {
    // Everything that already exists counts as taken, so no move overwrites.
    let mut taken: HashSet<String> = files.iter().map(|f| f.path.to_ascii_lowercase()).collect();
    let mut moves = Vec::new();
    let mut left_alone = 0;

    for f in files {
        if is_protected(&f.path) || !is_loose(&f.path) {
            left_alone += 1;
            continue;
        }
        match classify(f) {
            Some((rule, folder)) => {
                let to = unique_target(&folder, file_name(&f.path), &mut taken);
                moves.push(Move { from: f.path.clone(), to, rule });
            }
            None => left_alone += 1,
        }
    }

    // Group for the UI.
    let sizes: HashMap<&str, u64> = files.iter().map(|f| (f.path.as_str(), f.size_bytes)).collect();
    let mut by_rule: BTreeMap<Rule, Vec<&Move>> = BTreeMap::new();
    for m in &moves {
        by_rule.entry(m.rule).or_default().push(m);
    }
    let groups = by_rule
        .into_iter()
        .map(|(rule, ms)| {
            let mut folders: Vec<&str> = ms.iter().map(|m| m.to.rsplit_once('/').map(|x| x.0).unwrap_or("")).collect();
            folders.sort_unstable();
            folders.dedup();
            let folder = if folders.len() == 1 {
                folders[0].to_string()
            } else {
                format!("{} ({} folders)", folders[0].rsplit_once('/').map(|x| x.0).unwrap_or(folders[0]), folders.len())
            };
            Group {
                rule,
                label: rule.label(),
                folder,
                count: ms.len(),
                bytes: ms.iter().map(|m| sizes.get(m.from.as_str()).copied().unwrap_or(0)).sum(),
                examples: ms.iter().take(3).map(|m| file_name(&m.from).to_string()).collect(),
            }
        })
        .collect();

    // Likely duplicates: same size and same name stem (ignoring " (1)", "copy").
    let normalize = |p: &str| {
        let n = file_name(p).to_ascii_lowercase();
        let (stem, e) = n.rsplit_once('.').map(|(s, e)| (s.to_string(), e.to_string())).unwrap_or((n.clone(), String::new()));
        let stem = stem
            .trim_end_matches(" - copy")
            .trim_end_matches(" copy")
            .trim_end_matches(|c: char| c == ')' || c.is_ascii_digit() || c == '(' || c == ' ')
            .to_string();
        format!("{stem}.{e}")
    };
    let mut dupes: BTreeMap<(u64, String), Vec<String>> = BTreeMap::new();
    for f in files.iter().filter(|f| f.size_bytes > 0 && !is_protected(&f.path)) {
        dupes.entry((f.size_bytes, normalize(&f.path))).or_default().push(f.path.clone());
    }
    let duplicates = dupes
        .into_iter()
        .filter(|(_, v)| v.len() > 1)
        .map(|((size_bytes, _), paths)| DuplicateSet { size_bytes, paths })
        .collect();

    OrganizePlan { scanned: files.len(), moves, groups, duplicates, left_alone }
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MoveProblem {
    pub index: usize,
    pub message: String,
}

fn root_ok(path: &str) -> bool {
    let first = path.split('/').next().unwrap_or("");
    ALLOWED_ROOTS.contains(&first)
        && !path.contains("..")
        && !path.contains('\\')
        && !path.contains(':')
        && !path.starts_with('/')
        && !path.to_ascii_lowercase().contains("appdata")
}

/// Validate a list of moves (from the organizer or anywhere else) against the
/// scanned files. Returns every problem found; an empty list means safe.
pub fn check_moves(moves: &[Move], files: &[FileEntry]) -> Vec<MoveProblem> {
    let existing: HashSet<String> = files.iter().map(|f| f.path.to_ascii_lowercase()).collect();
    let mut targets = HashSet::new();
    let mut sources = HashSet::new();
    let mut out = Vec::new();
    for (index, m) in moves.iter().enumerate() {
        let mut bad = |message: String| out.push(MoveProblem { index, message });
        if !root_ok(&m.from) || !root_ok(&m.to) {
            bad(format!("\"{}\" → \"{}\" leaves your own folders.", m.from, m.to));
        }
        if !existing.contains(&m.from.to_ascii_lowercase()) {
            bad(format!("\"{}\" wasn't found in the scan.", m.from));
        }
        if is_protected(&m.from) {
            bad(format!("\"{}\" is a protected file.", m.from));
        }
        if existing.contains(&m.to.to_ascii_lowercase()) {
            bad(format!("\"{}\" already exists and would be overwritten.", m.to));
        }
        if !targets.insert(m.to.to_ascii_lowercase()) {
            bad(format!("Two files would land on \"{}\".", m.to));
        }
        if !sources.insert(m.from.to_ascii_lowercase()) {
            bad(format!("\"{}\" is moved twice.", m.from));
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn f(path: &str, size: u64) -> FileEntry {
        // 2025-03-14
        FileEntry { path: path.into(), size_bytes: size, modified: 1_741_910_400 }
    }

    #[test]
    fn sorts_loose_files_and_leaves_the_rest() {
        let files = vec![
            f("Downloads/ChromeSetup.exe", 1_400_000),
            f("Downloads/IMG_2041.jpg", 3_000_000),
            f("Desktop/Screenshot 2025-03-14 101500.png", 400_000),
            f("Downloads/invoice-march.pdf", 90_000),
            f("Desktop/Notes.lnk", 1_000),
            f("Documents/Taxes/2024.pdf", 50_000),
            f("Downloads/project/build.zip", 5_000),
            f("Downloads/.hidden.txt", 10),
        ];
        let p = propose(&files);
        let to: Vec<_> = p.moves.iter().map(|m| m.to.as_str()).collect();
        assert!(to.contains(&"Downloads/Installers/ChromeSetup.exe"));
        assert!(to.contains(&"Pictures/2025-03/IMG_2041.jpg"));
        assert!(to.contains(&"Pictures/Screenshots/Screenshot 2025-03-14 101500.png"));
        assert!(to.contains(&"Documents/PDFs/invoice-march.pdf"));
        assert_eq!(p.moves.len(), 4, "shortcut, nested, hidden and organized files stay put");
        assert!(check_moves(&p.moves, &files).is_empty());
    }

    #[test]
    fn never_overwrites_existing_or_colliding_files() {
        let files = vec![
            f("Documents/PDFs/report.pdf", 1),
            f("Downloads/report.pdf", 2),
            f("Desktop/report.pdf", 3),
        ];
        let p = propose(&files);
        let to: HashSet<_> = p.moves.iter().map(|m| m.to.clone()).collect();
        assert!(!to.contains("Documents/PDFs/report.pdf"));
        assert!(to.contains("Documents/PDFs/report (2).pdf"));
        assert!(to.contains("Documents/PDFs/report (3).pdf"));
        assert!(check_moves(&p.moves, &files).is_empty());
    }

    #[test]
    fn flags_duplicates_without_moving_them_away() {
        let files = vec![f("Downloads/setup.exe", 500), f("Downloads/setup (1).exe", 500), f("Desktop/other.exe", 500)];
        let p = propose(&files);
        assert_eq!(p.duplicates.len(), 1);
        assert_eq!(p.duplicates[0].paths.len(), 2);
    }

    #[test]
    fn checker_rejects_escapes_and_appdata() {
        let files = vec![f("Downloads/a.pdf", 1)];
        for to in ["../Windows/a.pdf", "AppData/Roaming/a.pdf", "C:/a.pdf", "Documents\\a.pdf", "Windows/a.pdf"] {
            let m = vec![Move { from: "Downloads/a.pdf".into(), to: to.into(), rule: Rule::Pdfs }];
            assert!(!check_moves(&m, &files).is_empty(), "{to} must be rejected");
        }
    }

    #[test]
    fn checker_rejects_overwrite_double_target_and_unknown_source() {
        let files = vec![f("Downloads/a.pdf", 1), f("Downloads/b.pdf", 1), f("Documents/PDFs/a.pdf", 1)];
        let m = vec![
            Move { from: "Downloads/a.pdf".into(), to: "Documents/PDFs/a.pdf".into(), rule: Rule::Pdfs },
            Move { from: "Downloads/b.pdf".into(), to: "Documents/PDFs/x.pdf".into(), rule: Rule::Pdfs },
            Move { from: "Downloads/zzz.pdf".into(), to: "Documents/PDFs/x.pdf".into(), rule: Rule::Pdfs },
        ];
        let problems = check_moves(&m, &files);
        assert!(problems.iter().any(|p| p.index == 0 && p.message.contains("overwritten")));
        assert!(problems.iter().any(|p| p.index == 2 && p.message.contains("Two files")));
        assert!(problems.iter().any(|p| p.index == 2 && p.message.contains("wasn't found")));
    }

    #[test]
    fn year_month_is_right() {
        assert_eq!(year_month(1_741_910_400), (2025, 3));
        assert_eq!(year_month(0), (1970, 1));
    }
}
