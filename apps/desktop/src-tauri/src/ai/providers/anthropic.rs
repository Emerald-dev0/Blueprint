use super::{AIProvider, AIMessage, CompletionResponse};
use async_trait::async_trait;

pub struct AnthropicProvider;

#[async_trait]
impl AIProvider for AnthropicProvider {
    fn id(&self) -> &str {
        "anthropic"
    }

    async fn complete(&self, _api_key: &str, _messages: Vec<AIMessage>, model_id: &str) -> Result<CompletionResponse, String> {
        Ok(CompletionResponse {
            content: "Anthropic response placeholder".to_string(),
            model_id: model_id.to_string(),
        })
    }
}
