pub mod roles;
pub mod tasks;
pub mod tools;

use roles::{AgentRegistry, AgentRoleId};
use tasks::{Task, TaskGraph, TaskStatus};
use tauri::{State, Manager};

#[tauri::command]
pub fn get_agent_roles() -> Vec<roles::AgentRole> {
    AgentRegistry::new().roles
}
