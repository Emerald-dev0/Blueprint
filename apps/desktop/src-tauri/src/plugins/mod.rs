pub mod manager;
pub mod python;

use manager::{PluginManager, PluginManifest};
use python::PythonRunner;
use tauri::{State, Manager};

#[tauri::command]
pub fn list_installed_plugins(manager: State<'_, PluginManager>) -> Result<Vec<PluginManifest>, String> {
    manager.list_plugins()
}

#[tauri::command]
pub async fn run_python_tool(script_path: String, args: Vec<String>) -> Result<String, String> {
    PythonRunner::execute(&script_path, args).await
}
