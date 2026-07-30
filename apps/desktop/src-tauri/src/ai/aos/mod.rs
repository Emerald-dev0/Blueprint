pub mod persona;
pub mod compiler;
pub mod workflow;
pub mod tools;
pub mod eval;

// `router` is gone: capability routing now lives on `AIManager`, where the user
// configures it. The old `ModelRouter::route` was a hardcoded vendor match that
// could not express provider choice at all.
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
        // `lock().unwrap()` panics the whole app if any holder ever panicked;
        // recover the guard instead so one bad turn can't take Blueprint down.
        let registry = self
            .persona_registry
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let manual = registry.get(role_id)
            .ok_or_else(|| format!("Persona {} not found in registry", role_id))?;

        Ok(PromptCompiler::compile(manual, goal, context))
    }
}
