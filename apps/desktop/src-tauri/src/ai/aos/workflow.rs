use serde::{Deserialize, Serialize};
use std::collections::VecDeque;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Task {
    pub id: String,
    pub role_id: String,
    pub goal: String,
    pub status: TaskStatus,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum TaskStatus {
    Pending,
    Active,
    Completed,
    Failed,
}

pub struct WorkflowEngine {
    queue: VecDeque<Task>,
    history: Vec<Task>,
}

impl WorkflowEngine {
    pub fn new() -> Self {
        Self {
            queue: VecDeque::new(),
            history: Vec::new(),
        }
    }

    pub fn plan(&mut self, tasks: Vec<Task>) {
        self.queue.extend(tasks);
    }

    pub fn next(&mut self) -> Option<Task> {
        self.queue.pop_front().map(|mut t| {
            t.status = TaskStatus::Active;
            t
        })
    }

    pub fn complete(&mut self, mut task: Task) {
        task.status = TaskStatus::Completed;
        self.history.push(task);
    }
}
