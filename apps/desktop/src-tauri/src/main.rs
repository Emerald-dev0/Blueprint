// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ai;
mod intelligence;
mod memory;

use ai::manager::AIManager;
use memory::{MemoryManager, MemoryEntry, ADR};
use std::sync::Arc;
use tauri::State;

#[tauri::command]
async fn get_adrs(manager: State<'_, Arc<MemoryManager>>, project_id: String) -> Result<Vec<ADR>, String> {
    manager.list_adrs(&project_id)
}

#[tauri::command]
async fn save_memory_entry(
    manager: State<'_, Arc<MemoryManager>>,
    project_id: String,
    entry: MemoryEntry
) -> Result<i32, String> {
    manager.save_entry(&project_id, entry)
}

#[tauri::command]
async fn search_memory(
    manager: State<'_, Arc<MemoryManager>>,
    project_id: String,
    query: String
) -> Result<Vec<MemoryEntry>, String> {
    manager.search_memory(&project_id, &query)
}

#[tauri::command]
async fn set_user_preference(
    manager: State<'_, Arc<MemoryManager>>,
    key: String,
    value: String
) -> Result<(), String> {
    manager.set_preference(&key, &value)
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
            get_adrs,
            save_memory_entry,
            search_memory,
            set_user_preference
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
