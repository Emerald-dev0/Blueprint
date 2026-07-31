pub mod persona;
pub mod compiler;
pub mod router;
pub mod workflow;
pub mod tools;
pub mod eval;

use persona::PersonaRegistry;
use compiler::PromptCompiler;
use workflow::WorkflowEngine;
use serde_json::Value;
use std::sync::Mutex;
use std::path::PathBuf;

pub struct AgentOS {
    pub persona_registry: Mutex<PersonaRegistry>,
    pub workflow_engine: Mutex<WorkflowEngine>,
}

impl AgentOS {
    pub fn new(personas_root: PathBuf) -> Self {
        Self {
            persona_registry: Mutex::new(PersonaRegistry::new(personas_root)),
            workflow_engine: Mutex::new(WorkflowEngine::new()),
        }
    }

    pub fn compile_prompt(&self, role_id: &str, goal: &str, context: &Value) -> Result<String, String> {
        let registry = self.persona_registry.lock().unwrap();
        let manual = registry.get(role_id)
            .ok_or_else(|| format!("Persona {} not found in registry", role_id))?;

        Ok(PromptCompiler::compile(manual, goal, context))
    }
}
