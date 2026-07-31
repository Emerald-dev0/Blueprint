pub mod roles;
pub mod tasks;
pub mod tools;

use roles::AgentRegistry;

#[tauri::command]
pub fn get_agent_roles() -> Vec<roles::AgentRole> {
    AgentRegistry::new().roles
}
