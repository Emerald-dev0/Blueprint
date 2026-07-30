use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum ModelCapability {
    Reasoning,
    Architecture,
    Coding,
    FunctionCalling,
    LargeContext,
    Multimodal,
    Offline,
    Private,
}

pub struct ModelRouter;

impl ModelRouter {
    pub fn route(capability: ModelCapability) -> (&'static str, &'static str) {
        match capability {
            // Claude: Architecture, Reasoning, Large Reviews
            ModelCapability::Reasoning | ModelCapability::Architecture =>
                ("anthropic", "claude-3-5-sonnet-latest"),

            // OpenAI: Coding, Function Calling, Editing
            ModelCapability::Coding | ModelCapability::FunctionCalling =>
                ("openai", "gpt-4o"),

            // Gemini: Large Context, Multimodal, Documents
            ModelCapability::LargeContext | ModelCapability::Multimodal =>
                ("gemini", "gemini-1.5-pro"),

            // Ollama: Offline Tasks, Private Repos, Fast Local Analysis
            ModelCapability::Offline | ModelCapability::Private =>
                ("ollama", "llama3"),
        }
    }
}
