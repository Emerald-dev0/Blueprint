use super::{AIProvider, AIMessage, CompletionResponse};
use async_trait::async_trait;

pub struct OpenAIProvider;

#[async_trait]
impl AIProvider for OpenAIProvider {
    fn id(&self) -> &str {
        "openai"
    }

    async fn complete(&self, _api_key: &str, _messages: Vec<AIMessage>, model_id: &str) -> Result<CompletionResponse, String> {
        // Implementation coming in next PR
        Ok(CompletionResponse {
            content: "OpenAI response placeholder".to_string(),
            model_id: model_id.to_string(),
        })
    }
}
