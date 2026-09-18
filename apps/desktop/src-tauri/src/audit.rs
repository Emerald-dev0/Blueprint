//! Local, append-only audit trail.
//!
//! The production-readiness checklist claimed "Security-critical actions
//! (credential change, file write) are logged locally", but no logging existed
//! anywhere in the codebase — the `log` and `env_logger` crates were declared
//! and never called. This module provides the trail that claim described:
//! one JSON object per line, written to the per-user log directory.
//!
//! Deliberately minimal and dependency-free:
//! - Secrets are **never** written; callers pass redacted descriptors only.
//! - The file is opened, appended and closed per event so a crash cannot lose
//!   or corrupt more than the in-flight line.
//! - Failures to write are logged to stderr and swallowed: auditing must never
//!   take down the operation it is observing.

use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use serde_json::{json, Value};

pub struct AuditLog {
    path: PathBuf,
    lock: Mutex<()>,
}

impl AuditLog {
    pub fn new(path: PathBuf) -> Self {
        Self {
            path,
            lock: Mutex::new(()),
        }
    }

    /// Append one audit record.
    ///
    /// `detail` must contain no secret material; the type system cannot enforce
    /// that, so the convention is documented here and followed at every call
    /// site (provider names, counts and paths only — never key contents).
    pub fn record(&self, event: &str, detail: Value) {
        let _guard = match self.lock.lock() {
            Ok(g) => g,
            Err(_) => return,
        };

        let ts = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);

        let line = json!({
            "ts": ts,
            "event": event,
            "detail": detail,
        });

        let mut serialized = match serde_json::to_string(&line) {
            Ok(s) => s,
            Err(e) => {
                log::warn!("audit: could not serialize record for {event}: {e}");
                return;
            }
        };
        serialized.push('\n');

        let result = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.path)
            .and_then(|mut f| f.write_all(serialized.as_bytes()));

        if let Err(e) = result {
            log::warn!("audit: could not write to {}: {e}", self.path.display());
        } else {
            log::info!("audit: {event}");
        }
    }
}
