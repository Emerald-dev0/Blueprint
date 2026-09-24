//! Local Ollama client.
//!
//! The model router already sent `Offline` and `Private` capabilities to an
//! `ollama` provider that was never registered, so those requests failed with
//! "Provider ollama not found". Ollama is also the only route by which the
//! product's central promise — analyse a private repository without the source
//! ever leaving the machine — can actually be honoured, so it is now a real
//! provider talking to a local server.

use async_trait::async_trait;
use serde_json::{json, Value};
use std::env;

use super::{truncate, AIMessage, AIProvider, CompletionResponse};

const DEFAULT_HOST: &str = "http://127.0.0.1:11434";

pub struct OllamaProvider;

fn base_url() -> String {
    env::var("OLLAMA_HOST").unwrap_or_else(|_| DEFAULT_HOST.to_string())
}

#[async_trait]
impl AIProvider for OllamaProvider {
    fn id(&self) -> &str {
        "ollama"
    }

    /// A local Ollama server needs no API key; the credential store is not
    /// consulted for this provider.
    fn requires_credential(&self) -> bool {
        false
    }

    async fn complete(
        &self,
        _api_key: &str,
        messages: Vec<AIMessage>,
        model_id: &str,
    ) -> Result<CompletionResponse, String> {
        let url = format!("{}/api/chat", base_url().trim_end_matches('/'));

        let body = json!({
            "model": model_id,
            "stream": false,
            "messages": messages
                .iter()
                .map(|m| json!({ "role": m.role, "content": m.content }))
                .collect::<Vec<_>>(),
        });

        let response = reqwest::Client::new()
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| {
                format!(
                    "could not reach a local Ollama server at {}: {e}. \
                     Start one with `ollama serve` and pull a model, e.g. `ollama pull {model_id}`.",
                    base_url()
                )
            })?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(format!(
                "Ollama returned HTTP {status}: {}",
                truncate(&text, 300)
            ));
        }

        let payload: Value = response
            .json()
            .await
            .map_err(|e| format!("could not parse Ollama response: {e}"))?;

        let content = payload["message"]["content"]
            .as_str()
            .ok_or_else(|| {
                format!(
                    "Ollama returned no message content: {}",
                    truncate(&payload.to_string(), 300)
                )
            })?
            .to_string();

        Ok(CompletionResponse {
            content,
            model_id: model_id.to_string(),
        })
    }
}
