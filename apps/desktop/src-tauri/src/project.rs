//! The "currently open project" context.
//!
//! Every intelligence and git command needs to know which directory the user
//! is working in. Previously the commands either took a raw string from the
//! renderer (`start_repo_analysis(path)`, never wired to any UI) or ignored the
//! question entirely and returned hard-coded data (`get_git_state_summary()`
//! reported branch "develop", status "clean", for every repository).
//!
//! A single piece of managed state now holds the project root. The renderer
//! sets it through a native directory picker (`@tauri-apps/plugin-dialog`), so
//! the path the OS hands us is never typed or pasted by hand, and every
//! downstream command operates on the same, real directory.

use std::path::PathBuf;
use std::sync::Mutex;

use tauri::State;

/// The directory of the repository the user has opened, if any.
#[derive(Debug, Default)]
pub struct ProjectContext {
    path: Mutex<Option<PathBuf>>,
}

impl ProjectContext {
    pub fn current(&self) -> Result<PathBuf, String> {
        self.path
            .lock()
            .map_err(|e| format!("project context lock poisoned: {e}"))?
            .clone()
            .ok_or_else(|| {
                "No project is open. Use the directory picker to import a repository first."
                    .to_string()
            })
    }

    pub fn set(&self, path: PathBuf) {
        if let Ok(mut guard) = self.path.lock() {
            *guard = Some(path);
        }
    }
}

#[tauri::command]
pub fn set_project_path(project: State<'_, ProjectContext>, path: String) -> Result<(), String> {
    let candidate = PathBuf::from(&path);
    if !candidate.is_dir() {
        return Err(format!("'{}' is not a directory", candidate.display()));
    }

    // Reject path-traversal shaped input from the renderer. The picker already
    // constrains this, but commands must not trust the renderer.
    let canonical = std::fs::canonicalize(&candidate)
        .map_err(|e| format!("cannot resolve '{}': {e}", candidate.display()))?;

    project.set(canonical.clone());
    log::info!("project root set to {}", canonical.display());
    Ok(())
}

#[tauri::command]
pub fn get_project_path(project: State<'_, ProjectContext>) -> Option<String> {
    project
        .current()
        .ok()
        .map(|p| p.to_string_lossy().into_owned())
}
