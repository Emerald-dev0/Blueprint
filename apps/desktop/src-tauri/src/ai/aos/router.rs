use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum ModelCapability {
    Reasoning,
    Speed,
    Vision,
    Tools,
    LongContext,
}

pub struct ModelRouter;

impl ModelRouter {
    pub fn route(capability: ModelCapability) -> (&'static str, &'static str) {
        match capability {
            ModelCapability::Reasoning => ("anthropic", "claude-3-5-sonnet-latest"),
            ModelCapability::Speed => ("gemini", "gemini-1.5-flash"),
            ModelCapability::Vision => ("openai", "gpt-4o"),
            ModelCapability::Tools => ("openai", "gpt-4o"),
            ModelCapability::LongContext => ("gemini", "gemini-1.5-pro"),
        }
    }
}
