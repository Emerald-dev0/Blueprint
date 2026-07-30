use serde::{Deserialize, Serialize};
use std::collections::VecDeque;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Task {
    pub id: String,
    pub role_id: String,
    pub goal: String,
    pub status: TaskStatus,
    pub dependencies: Vec<String>,
    pub output: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum TaskStatus {
    Pending,
    Active,
    Completed,
    Failed,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TaskGraph {
    pub id: String,
    pub goal: String,
    pub tasks: Vec<Task>,
    pub status: String,
}

pub struct WorkflowEngine {
    pub active_graph: Option<TaskGraph>,
}

impl WorkflowEngine {
    pub fn new() -> Self {
        Self {
            active_graph: None,
        }
    }

    pub fn plan_workflow(&mut self, goal: &str) -> TaskGraph {
        // In a real system, this would use an LLM (Architect) to decompose the goal
        let graph = TaskGraph {
            id: "wf-001".to_string(),
            goal: goal.to_string(),
            tasks: vec![
                Task {
                    id: "t1".to_string(),
                    role_id: "pm".to_string(),
                    goal: format!("Analyze requirements for: {}", goal),
                    status: TaskStatus::Pending,
                    dependencies: vec![],
                    output: None,
                },
                Task {
                    id: "t2".to_string(),
                    role_id: "architect".to_string(),
                    goal: "Design system architecture and data models.".to_string(),
                    status: TaskStatus::Pending,
                    dependencies: vec!["t1".to_string()],
                    output: None,
                }
            ],
            status: "planning".to_string(),
        };
        self.active_graph = Some(graph.clone());
        graph
    }
}
