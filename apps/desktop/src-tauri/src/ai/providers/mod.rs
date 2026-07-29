use serde::{Deserialize, Serialize};
use async_trait::async_trait;

pub mod gemini;
pub mod anthropic;
pub mod openai;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AIMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CompletionResponse {
    pub content: String,
    pub model_id: String,
}

#[async_trait]
pub trait AIProvider: Send + Sync {
    fn id(&self) -> &str;
    async fn complete(&self, api_key: &str, messages: Vec<AIMessage>, model_id: &str) -> Result<CompletionResponse, String>;
}
