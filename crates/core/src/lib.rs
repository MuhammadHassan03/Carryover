//! Carryover core: scan a PC into a recipe, plan how to rebuild it, and check
//! that plan against hard safety rules before anything can run.
//!
//! Phase 1 is read-only. Nothing in this crate writes to disks, partitions,
//! the registry or boot configuration.

pub mod fit;
pub mod model;
pub mod organize;
pub mod plan;
pub mod recipe_file;
pub mod safety;
pub mod scan;

pub use model::*;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("scan failed: {0}")]
    ScanFailed(String),
    #[error("could not read scan output: {0}")]
    ScanParse(String),
    #[error("{0}")]
    Unsupported(&'static str),
    #[error("recipe file problem: {0}")]
    BadRecipe(String),
    #[error("file error: {0}")]
    Io(String),
}

pub type Result<T> = std::result::Result<T, Error>;

/// Current UTC time as RFC 3339, without pulling in a date crate.
pub fn now_rfc3339() -> String {
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    rfc3339(secs)
}

fn rfc3339(secs: i64) -> String {
    let (days, rem) = (secs.div_euclid(86_400), secs.rem_euclid(86_400));
    // Civil-from-days (Howard Hinnant).
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = yoe + era * 400 + i64::from(m <= 2);
    format!("{y:04}-{m:02}-{d:02}T{:02}:{:02}:{:02}Z", rem / 3600, rem % 3600 / 60, rem % 60)
}

#[cfg(test)]
mod tests {
    #[test]
    fn formats_dates() {
        assert_eq!(super::rfc3339(0), "1970-01-01T00:00:00Z");
        assert_eq!(super::rfc3339(1_793_577_600), "2026-11-02T00:00:00Z");
    }
}
