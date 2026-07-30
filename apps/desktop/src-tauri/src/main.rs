// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ai;
mod intelligence;

use ai::manager::AIManager;

fn main() {
    tauri::Builder::default()
        .manage(AIManager::new())
        .invoke_handler(tauri::generate_handler![
            ai::set_ai_credential,
            ai::generate_ai_completion,
            ai::get_personas,
            ai::plan_goal_execution,
            ai::orchestration::assemble_team,
            intelligence::start_repo_analysis,
            intelligence::analyze_website
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
