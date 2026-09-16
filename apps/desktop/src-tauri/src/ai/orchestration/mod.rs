//! Static agent role catalogue.
//!
//! `tasks` and `tools` submodules previously duplicated the task-graph and
//! tool-runtime types already defined in `ai::aos` (with incompatible field
//! sets), and neither duplicate was referenced. They are removed; `aos` owns
//! those models.

pub mod roles;

use roles::AgentRegistry;

#[tauri::command]
pub fn get_agent_roles() -> Vec<roles::AgentRole> {
    AgentRegistry::new().roles
}
