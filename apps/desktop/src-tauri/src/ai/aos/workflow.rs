use serde::{Deserialize, Serialize};

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
        // Heuristic decomposition. A future version lets the Architect persona
        // produce this graph; today the shape is fixed and each task names the
        // persona that should execute it.
        //
        // `role_id` MUST be a persona directory id from packages/personas
        // (e.g. "product-manager"), because dispatch goes through
        // `run_aos_completion`, which looks the id up in the persona registry.
        // The previous values ("pm", "architect") matched nothing, so any
        // attempt to execute a planned task failed with "Persona not found".
        let graph = TaskGraph {
            id: format!("wf-{}", uuid_like_suffix(goal)),
            goal: goal.to_string(),
            tasks: vec![
                Task {
                    id: "t1".to_string(),
                    role_id: "product-manager".to_string(),
                    goal: format!("Analyze requirements for: {}", goal),
                    status: TaskStatus::Pending,
                    dependencies: vec![],
                    output: None,
                },
                Task {
                    id: "t2".to_string(),
                    role_id: "software-architect".to_string(),
                    goal: "Design system architecture and data models.".to_string(),
                    status: TaskStatus::Pending,
                    dependencies: vec!["t1".to_string()],
                    output: None,
                },
                Task {
                    id: "t3".to_string(),
                    role_id: "principal-engineer".to_string(),
                    goal: "Review the design for production readiness and record the decision.".to_string(),
                    status: TaskStatus::Pending,
                    dependencies: vec!["t2".to_string()],
                    output: None,
                },
            ],
            status: "planning".to_string(),
        };
        self.active_graph = Some(graph.clone());
        graph
    }
}

/// Short, stable, dependency-free id suffix (no uuid crate in this binary).
fn uuid_like_suffix(goal: &str) -> String {
    let mut hash: u64 = 1469598103934665603;
    for byte in goal.as_bytes() {
        hash ^= *byte as u64;
        hash = hash.wrapping_mul(1099511628211);
    }
    format!("{:016x}", hash)
}
