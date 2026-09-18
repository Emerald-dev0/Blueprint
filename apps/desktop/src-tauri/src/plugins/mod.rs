//! Plugin discovery.
//!
//! The `python` submodule — which spawned `python <script_path>` for any path
//! supplied by the renderer, with no sandbox, no permission check and no path
//! validation — has been removed. It was the single largest security hole in
//! the codebase (arbitrary code execution from a webview that the architecture
//! documents promise has "zero direct access to OS/Shell APIs"), and nothing in
//! the renderer ever called it. A sandboxed execution runtime is the subject of
//! the Wasm plugin work tracked in the roadmap; shipping an unsandboxed escape
//! hatch in the meantime was not an acceptable interim.

pub mod manager;

use manager::{PluginManager, PluginManifest};
use tauri::State;

#[tauri::command]
pub fn list_installed_plugins(
    manager: State<'_, PluginManager>,
) -> Result<Vec<PluginManifest>, String> {
    manager.list_plugins()
}
