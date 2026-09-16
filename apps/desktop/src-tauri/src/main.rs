// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ai;
mod audit;
mod events;
mod git;
mod intelligence;
mod interop;
mod memory;
mod paths;
mod plugins;
mod project;

use std::sync::Arc;

use tauri::Manager;

use ai::aos::AgentOS;
use ai::manager::AIManager;
use audit::AuditLog;
use memory::MemoryManager;
use paths::AppPaths;
use plugins::manager::PluginManager;
use project::ProjectContext;

fn main() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(AIManager::new())
        .setup(|app| {
            let handle = app.handle().clone();

            // Resolve real per-user directories (see `paths`): the previous
            // build derived the database, plugin dir and persona registry from
            // the process working directory, which is undefined for a packaged
            // app launched from a Start Menu shortcut or .desktop file.
            let app_paths = AppPaths::resolve(&handle)?;
            log::info!(
                "blueprint v{} starting; data dir: {}",
                env!("CARGO_PKG_VERSION"),
                app_paths.app_data_dir.display()
            );

            let audit = AuditLog::new(app_paths.audit_log_file());
            audit.record(
                "app.started",
                serde_json::json!({ "version": env!("CARGO_PKG_VERSION") }),
            );

            let memory = Arc::new(MemoryManager::new(&app_paths.database_file()));
            let plugin_manager = PluginManager::new(app_paths.plugin_dir());
            let agent_os = AgentOS::new(app_paths.personas_dir.clone());

            app.manage(app_paths);
            app.manage(audit);
            app.manage(memory);
            app.manage(plugin_manager);
            app.manage(agent_os);
            app.manage(ProjectContext::default());

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ai::set_ai_credential,
            ai::generate_ai_completion,
            ai::run_aos_completion,
            ai::get_personas,
            ai::get_operating_manuals,
            ai::reload_personas,
            ai::plan_aos_workflow,
            ai::orchestration::get_agent_roles,
            intelligence::start_repo_analysis,
            intelligence::analyze_website,
            git::set_github_credential,
            git::list_github_repositories,
            git::get_git_status,
            git::create_git_branch,
            git::suggest_git_commit_message,
            git::generate_github_release_notes,
            memory::get_adrs,
            memory::search_memory,
            memory::create_adr,
            memory::save_memory_entry,
            plugins::list_installed_plugins,
            events::publish_system_event,
            project::set_project_path,
            project::get_project_path,
            interop::export_agent_context
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
