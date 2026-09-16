//! Real OpenAI Chat Completions client.
//!
//! This provider previously ignored the API key and returned the literal string
//! "OpenAI response placeholder", so any request routed to it (all coding and
//! function-calling tasks) produced that string. This now calls the live API.

use async_trait::async_trait;
use serde_json::{json, Value};

use super::{http_error, truncate, AIMessage, AIProvider, CompletionResponse};

pub struct OpenAIProvider;

#[async_trait]
impl AIProvider for OpenAIProvider {
    fn id(&self) -> &str {
        "openai"
    }

    async fn complete(
        &self,
        api_key: &str,
        messages: Vec<AIMessage>,
        model_id: &str,
    ) -> Result<CompletionResponse, String> {
        let body = json!({
            "model": model_id,
            "messages": messages
                .iter()
                .map(|m| json!({ "role": m.role, "content": m.content }))
                .collect::<Vec<_>>(),
        });

        let response = reqwest::Client::new()
            .post("https://api.openai.com/v1/chat/completions")
            .bearer_auth(api_key)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("request to OpenAI failed: {e}"))?;

        if !response.status().is_success() {
            return Err(http_error(response).await);
        }

        let payload: Value = response
            .json()
            .await
            .map_err(|e| format!("could not parse OpenAI response: {e}"))?;

        let content = payload["choices"][0]["message"]["content"]
            .as_str()
            .ok_or_else(|| {
                format!(
                    "OpenAI returned no message content: {}",
                    truncate(&payload.to_string(), 300)
                )
            })?
            .to_string();

        Ok(CompletionResponse {
            content,
            model_id: payload["model"].as_str().unwrap_or(model_id).to_string(),
        })
    }
}
