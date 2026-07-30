// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ai;

use ai::manager::AIManager;

fn main() {
    tauri::Builder::default()
        .manage(AIManager::new())
        .invoke_handler(tauri::generate_handler![
            ai::set_ai_credential,
            ai::generate_ai_completion,
            ai::get_agent_roles,
            ai::plan_goal_execution
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
