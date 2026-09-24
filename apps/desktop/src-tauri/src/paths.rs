//! Environment-aware path resolution.
//!
//! The previous implementation derived every path from the process working
//! directory:
//!
//! ```ignore
//! MemoryManager::new("blueprint.db")                    // CWD-relative
//! PluginManager::new(PathBuf::from("."))                // CWD-relative
//! AgentOS::new(PathBuf::from("../../packages/personas")) // repo-relative
//! ```
//!
//! That is fine only while running `cargo run` from the repository root. A
//! packaged desktop app is launched by the OS (Start Menu, `.desktop` file,
//! AppImage, dock icon) with an arbitrary working directory, so the database
//! was created wherever the user happened to launch from, the plugin directory
//! polluted that directory, and the persona registry silently loaded *nothing*
//! because `../../packages/personas` does not exist next to an installed app.
//!
//! Every path is now resolved from Tauri's platform-correct base directories
//! (`%APPDATA%`-style on Windows, `~/.local/share`-style on Linux via XDG,
//! `~/Library/Application Support` on macOS), with the bundled persona
//! resources as the packaged source of truth.

use std::env;
use std::path::PathBuf;

use tauri::{AppHandle, Manager};

/// Resolved, pre-created directories for the running application.
#[derive(Debug, Clone)]
pub struct AppPaths {
    /// Writable per-user data directory (database, plugin installs).
    pub app_data_dir: PathBuf,
    /// Writable per-user log directory (audit trail, diagnostics).
    pub app_log_dir: PathBuf,
    /// Read-only directory holding the bundled persona operating manuals.
    pub personas_dir: PathBuf,
}

impl AppPaths {
    /// Resolve and create all application directories.
    pub fn resolve(app: &AppHandle) -> Result<Self, Box<dyn std::error::Error>> {
        let app_data_dir = app.path().app_data_dir()?;
        let app_log_dir = app.path().app_log_dir()?;

        std::fs::create_dir_all(&app_data_dir)?;
        std::fs::create_dir_all(&app_log_dir)?;

        let personas_dir = resolve_personas_dir(app);

        Ok(Self {
            app_data_dir,
            app_log_dir,
            personas_dir,
        })
    }

    /// The SQLite database file for the project brain.
    pub fn database_file(&self) -> PathBuf {
        self.app_data_dir.join("blueprint.db")
    }

    /// Directory scanned for installed plugin manifests.
    pub fn plugin_dir(&self) -> PathBuf {
        self.app_data_dir.join("plugins")
    }

    /// Append-only audit log of security-relevant events.
    pub fn audit_log_file(&self) -> PathBuf {
        self.app_log_dir.join("audit.jsonl")
    }
}

/// Locate the persona operating manuals.
///
/// Resolution order, first hit wins:
/// 1. `BLUEPRINT_PERSONAS_DIR` — explicit override for development and CI.
/// 2. `<resource_dir>/personas` — the bundle resource declared in
///    `tauri.conf.json`; this is what a packaged install uses.
/// 3. `<ancestor of the executable>/packages/personas` — a monorepo checkout,
///    so `cargo run` from `src-tauri/`, `target/`, or the repo root all work.
/// 4. `packages/personas` relative to the working directory — last resort.
///
/// The registry treats a missing directory as "no personas loaded" rather than
/// an error, so a wrong guess here degrades the AI feature instead of crashing
/// the window on startup.
fn resolve_personas_dir(app: &AppHandle) -> PathBuf {
    if let Ok(override_dir) = env::var("BLUEPRINT_PERSONAS_DIR") {
        let path = PathBuf::from(override_dir);
        if path.is_dir() {
            return path;
        }
        log::warn!(
            "BLUEPRINT_PERSONAS_DIR is set to '{}' but it is not a directory; falling back",
            path.display()
        );
    }

    if let Ok(resource_dir) = app.path().resource_dir() {
        let bundled = resource_dir.join("personas");
        if bundled.is_dir() {
            return bundled;
        }
    }

    if let Ok(exe) = env::current_exe() {
        let mut ancestor = exe.parent();
        while let Some(dir) = ancestor {
            let candidate = dir.join("packages").join("personas");
            if candidate.is_dir() {
                return candidate;
            }
            ancestor = dir.parent();
        }
    }

    PathBuf::from("packages").join("personas")
}
