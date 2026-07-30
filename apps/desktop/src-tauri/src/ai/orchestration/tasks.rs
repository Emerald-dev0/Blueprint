use serde::{Deserialize, Serialize};
use super::roles::AgentRoleId;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum TaskStatus {
    Pending,
    Active,
    WaitingApproval,
    Completed,
    Failed,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub description: String,
    pub role_id: AgentRoleId,
    pub status: TaskStatus,
    pub dependencies: Vec<String>,
    pub output: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TaskGraph {
    pub id: String,
    pub goal: String,
    pub tasks: Vec<Task>,
    pub status: String,
}
