pub mod persona;
pub mod compiler;
pub mod router;
pub mod workflow;
pub mod tools;

use persona::PersonaRegistry;
use compiler::PromptCompiler;
use router::{ModelRouter, ModelCapability};
use workflow::WorkflowEngine;
use tools::ToolRuntime;
use serde_json::Value;

pub struct AgentOS {
    pub persona_registry: PersonaRegistry,
    pub workflow_engine: WorkflowEngine,
}

impl AgentOS {
    pub fn new() -> Self {
        Self {
            persona_registry: PersonaRegistry::new(),
            workflow_engine: WorkflowEngine::new(),
        }
    }

    pub fn compile_prompt(&self, role_id: &str, goal: &str, context: &Value) -> Result<String, String> {
        let manual = self.persona_registry.get(role_id)
            .ok_or_else(|| format!("Persona {} not found in registry", role_id))?;

        Ok(PromptCompiler::compile(manual, goal, context))
    }
}
