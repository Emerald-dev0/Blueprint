// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ai;
mod intelligence;
mod memory;

use ai::manager::AIManager;
use memory::MemoryManager;
use std::sync::Arc;

#[tauri::command]
async fn get_adrs(manager: tauri::State<'_, Arc<MemoryManager>>, project_id: String) -> Result<Vec<memory::ADR>, String> {
    manager.list_adrs(&project_id)
}

fn main() {
    // In production, path should be in AppData/Local
    let memory_manager = Arc::new(MemoryManager::new("blueprint.db"));

    tauri::Builder::default()
        .manage(AIManager::new())
        .manage(memory_manager)
        .invoke_handler(tauri::generate_handler![
            ai::set_ai_credential,
            ai::generate_ai_completion,
            ai::get_personas,
            ai::plan_goal_execution,
            ai::orchestration::assemble_team,
            intelligence::start_repo_analysis,
            intelligence::analyze_website,
            get_adrs
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
