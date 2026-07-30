pub mod roles;
pub mod tasks;
pub mod tools;

use roles::{AgentRegistry, AgentRoleId, Persona};
use tasks::{Task, TaskGraph, TaskStatus};
use tauri::{State, Manager};

#[tauri::command]
pub fn get_personas() -> Vec<Persona> {
    AgentRegistry::new().personas
}

#[tauri::command]
pub fn assemble_team(goal: String) -> Vec<AgentRoleId> {
    let mut team = vec![AgentRoleId::Principal];

    let goal_lower = goal.to_lowercase();
    if goal_lower.contains("ui") || goal_lower.contains("design") {
        team.push(AgentRoleId::Designer);
    }
    if goal_lower.contains("website") || goal_lower.contains("url") {
        team.push(AgentRoleId::ReferenceSpecialist);
    }
    if goal_lower.contains("architecture") || goal_lower.contains("system") {
        team.push(AgentRoleId::Architect);
    }

    team
}
