pub mod roles;
pub mod tasks;
pub mod tools;

use roles::AgentRegistry;

#[tauri::command]
pub fn get_agent_roles() -> Vec<roles::AgentRole> {
    AgentRegistry::new().roles
}

/// Selects the engineering roles relevant to a goal.
///
/// `main.rs` registered `assemble_team` in `generate_handler!`, but no such
/// function existed. That is what made the macro fail to expand and took the
/// entire crate down with it.
#[tauri::command]
pub fn assemble_team(goal: String) -> Vec<roles::AgentRole> {
    let registry = AgentRegistry::new();
    let goal_lower = goal.to_lowercase();

    // Deterministic keyword routing. This is a placeholder for model-driven
    // selection, and is written to be obviously that rather than to imply
    // planning the system does not yet do.
    let matched: Vec<roles::AgentRole> = registry
        .roles
        .iter()
        .filter(|role| {
            role.name
                .to_lowercase()
                .split_whitespace()
                .any(|word| word.len() > 2 && goal_lower.contains(word))
        })
        .cloned()
        .collect();

    if !matched.is_empty() {
        return matched;
    }

    // Always hand back a usable default team rather than an empty list.
    registry
        .roles
        .into_iter()
        .filter(|r| {
            matches!(
                r.id,
                roles::AgentRoleId::Architect
                    | roles::AgentRoleId::Backend
                    | roles::AgentRoleId::Frontend
                    | roles::AgentRoleId::Principal
            )
        })
        .collect()
}
