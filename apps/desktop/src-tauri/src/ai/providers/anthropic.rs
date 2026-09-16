//! Real Anthropic Messages API client.
//!
//! This provider previously ignored the API key entirely and returned the
//! literal string "Anthropic response placeholder", while the model router sent
//! every reasoning and architecture request to it. The product's flagship flow
//! therefore always displayed that placeholder. This now calls the live API.

use async_trait::async_trait;
use serde_json::{json, Value};

use super::{http_error, truncate, AIProvider, AIMessage, CompletionResponse};

const API_VERSION: &str = "2023-06-01";
const DEFAULT_MAX_TOKENS: u32 = 4096;

pub struct AnthropicProvider;

#[async_trait]
impl AIProvider for AnthropicProvider {
    fn id(&self) -> &str {
        "anthropic"
    }

    async fn complete(
        &self,
        api_key: &str,
        messages: Vec<AIMessage>,
        model_id: &str,
    ) -> Result<CompletionResponse, String> {
        // The Messages API rejects a `system` role inside `messages`; system
        // instructions are a top-level string.
        let mut system_parts: Vec<String> = Vec::new();
        let mut transcript: Vec<Value> = Vec::new();

        for message in messages {
            match message.role.as_str() {
                "system" => system_parts.push(message.content),
                role => transcript.push(json!({ "role": role, "content": message.content })),
            }
        }

        let mut body = json!({
            "model": model_id,
            "max_tokens": DEFAULT_MAX_TOKENS,
            "messages": transcript,
        });
        if !system_parts.is_empty() {
            body["system"] = Value::String(system_parts.join("\n\n"));
        }

        let response = reqwest::Client::new()
            .post("https://api.anthropic.com/v1/messages")
            // The key travels in a header, never in the URL: URLs end up in
            // proxy logs, browser history and crash reports.
            .header("x-api-key", api_key)
            .header("anthropic-version", API_VERSION)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("request to Anthropic failed: {e}"))?;

        if !response.status().is_success() {
            return Err(http_error(response).await);
        }

        let payload: Value = response
            .json()
            .await
            .map_err(|e| format!("could not parse Anthropic response: {e}"))?;

        let content = payload["content"]
            .as_array()
            .map(|blocks| {
                blocks
                    .iter()
                    .filter_map(|block| block["text"].as_str())
                    .collect::<Vec<_>>()
                    .join("")
            })
            .unwrap_or_default();

        if content.is_empty() {
            return Err(format!(
                "Anthropic returned no text content: {}",
                truncate(&payload.to_string(), 300)
            ));
        }

        Ok(CompletionResponse {
            content,
            model_id: payload["model"]
                .as_str()
                .unwrap_or(model_id)
                .to_string(),
        })
    }
}
