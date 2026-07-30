// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ai;
mod intelligence;
mod memory;
mod git;
mod plugins;
mod events;

use ai::manager::AIManager;
use ai::aos::AgentOS;
use memory::MemoryManager;
use plugins::manager::PluginManager;
use std::sync::Arc;
use std::path::PathBuf;

fn main() {
    let memory_manager = Arc::new(MemoryManager::new("blueprint.db"));
    let app_data_dir = PathBuf::from(".");
    let plugin_manager = PluginManager::new(app_data_dir);
    let agent_os = AgentOS::new();

    tauri::Builder::default()
        .manage(AIManager::new())
        .manage(memory_manager)
        .manage(plugin_manager)
        .manage(agent_os)
        .invoke_handler(tauri::generate_handler![
            ai::set_ai_credential,
            ai::generate_ai_completion,
            ai::run_aos_completion,
            ai::get_personas,
            ai::get_operating_manuals,
            ai::plan_aos_workflow,
            ai::orchestration::assemble_team,
            intelligence::start_repo_analysis,
            intelligence::analyze_website,
            git::set_github_credential,
            git::list_github_repositories,
            git::get_git_status,
            git::create_git_branch,
            git::suggest_git_commit_message,
            git::generate_github_release_notes,
            plugins::list_installed_plugins,
            plugins::run_python_tool,
            events::publish_system_event
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
