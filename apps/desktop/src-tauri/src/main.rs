// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ai;
mod intelligence;
mod memory;
mod git;

use ai::manager::AIManager;
use memory::MemoryManager;
use std::sync::Arc;

fn main() {
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
            git::set_github_credential,
            git::list_github_repositories,
            git::get_git_status,
            git::create_git_branch,
            git::suggest_git_commit_message,
            git::generate_github_release_notes
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
