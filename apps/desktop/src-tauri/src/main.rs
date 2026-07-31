// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ai;
mod intelligence;
mod memory;
mod git;
mod plugins;
mod events;

use ai::aos::AgentOS;
use ai::manager::AIManager;
use memory::MemoryManager;
use plugins::manager::PluginManager;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::Manager;

/// Locates the bundled persona directory.
///
/// Previously this was a bare `PathBuf::from("../../packages/personas")` —
/// relative to the process working directory. That resolves correctly only when
/// the binary happens to be launched from `apps/desktop/src-tauri`; in a
/// packaged `.app` it points at nothing, the registry loads zero personas, and
/// every AOS call fails with "Persona not found". Same story for the SQLite
/// file, which landed wherever the app happened to be started from.
fn personas_root(app: &tauri::App) -> PathBuf {
    if let Ok(resource_dir) = app.path().resource_dir() {
        let bundled = resource_dir.join("personas");
        if bundled.is_dir() {
            return bundled;
        }
    }
    // Development fallback, resolved against the crate rather than the CWD.
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../packages/personas")
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // App-specific data directory, created if absent — so the database
            // and plugin store live somewhere stable across launches.
            let data_dir = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| PathBuf::from("."));
            std::fs::create_dir_all(&data_dir).ok();

            let db_path = data_dir.join("blueprint.db");
            let memory_manager = Arc::new(MemoryManager::new(
                db_path.to_str().unwrap_or("blueprint.db"),
            ));

            app.manage(memory_manager);
            app.manage(PluginManager::new(data_dir));
            app.manage(AIManager::new());
            app.manage(AgentOS::new(personas_root(app)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ai::set_ai_credential,
            ai::delete_ai_credential,
            ai::list_ai_providers,
            ai::check_ai_provider,
            ai::list_provider_models,
            ai::set_provider_endpoint,
            ai::get_ai_routing,
            ai::set_ai_routing,
            ai::generate_ai_completion,
            ai::stream_ai_completion,
            ai::run_aos_completion,
            ai::get_personas,
            ai::get_operating_manuals,
            ai::reload_personas,
            ai::plan_aos_workflow,
            ai::orchestration::get_agent_roles,
            ai::orchestration::assemble_team,
            intelligence::start_repo_analysis,
            intelligence::analyze_website,
            memory::get_adrs,
            memory::search_memory,
            memory::add_adr,
            memory::save_memory_entry,
            git::set_github_credential,
            git::list_github_repositories,
            git::list_github_issues,
            git::create_github_pull_request,
            git::get_git_status,
            git::create_git_branch,
            git::create_git_commit,
            git::push_git_changes,
            git::suggest_git_commit_message,
            git::generate_github_release_notes,
            plugins::list_installed_plugins,
            plugins::run_python_tool,
            events::publish_system_event
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
