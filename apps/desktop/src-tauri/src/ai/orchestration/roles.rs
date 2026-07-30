use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum AgentRoleId {
    Architect,
    Frontend,
    Backend,
    Designer,
    Security,
    Database,
    DevOps,
    QA,
    PM,
    Writer,
    Principal,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AgentRole {
    pub id: AgentRoleId,
    pub name: String,
    pub description: String,
    pub system_prompt: String,
    pub tools: Vec<String>,
}

pub struct AgentRegistry {
    pub roles: Vec<AgentRole>,
}

impl AgentRegistry {
    pub fn new() -> Self {
        Self {
            roles: vec![
                AgentRole {
                    id: AgentRoleId::Principal,
                    name: "Principal Engineer".to_string(),
                    description: "Responsible for goal decomposition and task planning.".to_string(),
                    system_prompt: "You are a Principal Engineer. Your job is to break down large engineering goals into smaller, executable tasks for a team of experts.".to_string(),
                    tools: vec!["task_planner".to_string()],
                },
                AgentRole {
                    id: AgentRoleId::Architect,
                    name: "Software Architect".to_string(),
                    description: "Designs system structure and ensures technical alignment.".to_string(),
                    system_prompt: "You are a Software Architect. You design high-level systems, data models, and API interfaces.".to_string(),
                    tools: vec!["code_analyzer".to_string()],
                },
                // Add more roles as needed
            ],
        }
    }
}
