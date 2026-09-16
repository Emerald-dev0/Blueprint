//! Google Gemini generateContent client.
//!
//! Two fixes over the original: the API key is sent in the `x-goog-api-key`
//! header instead of a `?key=` query parameter (query strings are logged by
//! proxies, CDNs and crash reporters), and `system` messages are routed to
//! `systemInstruction` instead of being flattened into a `user` turn, which
//! changes how the model weights the operating-manual preamble.

use async_trait::async_trait;
use serde_json::{json, Value};

use super::{http_error, truncate, AIProvider, AIMessage, CompletionResponse};

pub struct GeminiProvider;

#[async_trait]
impl AIProvider for GeminiProvider {
    fn id(&self) -> &str {
        "gemini"
    }

    async fn complete(
        &self,
        api_key: &str,
        messages: Vec<AIMessage>,
        model_id: &str,
    ) -> Result<CompletionResponse, String> {
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{model_id}:generateContent"
        );

        let mut system_parts: Vec<Value> = Vec::new();
        let mut contents: Vec<Value> = Vec::new();

        for message in messages {
            match message.role.as_str() {
                "system" => system_parts.push(json!({ "text": message.content })),
                role => contents.push(json!({
                    "role": if role == "assistant" { "model" } else { "user" },
                    "parts": [{ "text": message.content }],
                })),
            }
        }

        let mut body = json!({ "contents": contents });
        if !system_parts.is_empty() {
            body["systemInstruction"] = json!({ "parts": system_parts });
        }

        let response = reqwest::Client::new()
            .post(&url)
            .header("x-goog-api-key", api_key)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("request to Gemini failed: {e}"))?;

        if !response.status().is_success() {
            return Err(http_error(response).await);
        }

        let payload: Value = response
            .json()
            .await
            .map_err(|e| format!("could not parse Gemini response: {e}"))?;

        let text = payload["candidates"][0]["content"]["parts"]
            .as_array()
            .map(|parts| {
                parts
                    .iter()
                    .filter_map(|p| p["text"].as_str())
                    .collect::<Vec<_>>()
                    .join("")
            })
            .unwrap_or_default();

        if text.is_empty() {
            return Err(format!(
                "Gemini returned no text: {}",
                truncate(&payload.to_string(), 300)
            ));
        }

        Ok(CompletionResponse {
            content: text,
            model_id: model_id.to_string(),
        })
    }
}
