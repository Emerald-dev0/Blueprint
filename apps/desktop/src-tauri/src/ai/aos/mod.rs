pub mod compiler;
pub mod persona;
pub mod router;
pub mod workflow;

use compiler::PromptCompiler;
use persona::PersonaRegistry;
use serde_json::Value;
use std::path::PathBuf;
use std::sync::Mutex;
use workflow::WorkflowEngine;

pub struct AgentOS {
    pub persona_registry: Mutex<PersonaRegistry>,
    pub workflow_engine: Mutex<WorkflowEngine>,
}

impl AgentOS {
    pub fn new(personas_root: PathBuf) -> Self {
        let registry = PersonaRegistry::new(personas_root);
        if registry.manuals.is_empty() {
            log::warn!(
                "Agent OS started with an empty persona registry (looked in {}). \
                 The AI teammate will have no operating manuals until personas are found.",
                registry.personas_root.display()
            );
        } else {
            log::info!(
                "Agent OS loaded {} persona operating manuals from {}",
                registry.manuals.len(),
                registry.personas_root.display()
            );
        }

        Self {
            persona_registry: Mutex::new(registry),
            workflow_engine: Mutex::new(WorkflowEngine::new()),
        }
    }

    pub fn compile_prompt(
        &self,
        role_id: &str,
        goal: &str,
        context: &Value,
    ) -> Result<String, String> {
        let registry = self.persona_registry.lock().map_err(|e| e.to_string())?;
        let manual = registry
            .get(role_id)
            .ok_or_else(|| format!("Persona {} not found in registry", role_id))?;

        Ok(PromptCompiler::compile(manual, goal, context))
    }
}
