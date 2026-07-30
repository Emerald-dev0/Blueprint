use keyring::Entry;
use super::providers::{AIProvider, CompletionResponse};
use super::providers::gemini::GeminiProvider;
use super::providers::anthropic::AnthropicProvider;
use super::providers::openai::OpenAIProvider;
use super::orchestration::roles::AIMessage;

pub struct AIManager {
    providers: Vec<Box<dyn AIProvider>>,
}

impl AIManager {
    pub fn new() -> Self {
        Self {
            providers: vec![
                Box::new(GeminiProvider),
                Box::new(AnthropicProvider),
                Box::new(OpenAIProvider),
            ],
        }
    }

    pub fn set_key(&self, provider_id: &str, key: &str) -> Result<(), String> {
        let entry = Entry::new("blueprint-ai", provider_id).map_err(|e| e.to_string())?;
        entry.set_password(key).map_err(|e| e.to_string())
    }

    pub fn get_key(&self, provider_id: &str) -> Result<String, String> {
        let entry = Entry::new("blueprint-ai", provider_id).map_err(|e| e.to_string())?;
        entry.get_password().map_err(|e| e.to_string())
    }

    pub async fn complete(&self, provider_id: &str, model_id: &str, messages: Vec<AIMessage>) -> Result<CompletionResponse, String> {
        let provider = self.providers.iter().find(|p| p.id() == provider_id)
            .ok_or_else(|| format!("Provider {} not found", provider_id))?;

        let key = self.get_key(provider_id)?;

        // Translate orchestration AIMessage to provider AIMessage if needed
        // Currently they are structurally identical
        let provider_messages: Vec<super::providers::AIMessage> = messages.into_iter().map(|m| {
            super::providers::AIMessage {
                role: m.role,
                content: m.content,
            }
        }).collect();

        provider.complete(&key, provider_messages, model_id).await
    }
}
