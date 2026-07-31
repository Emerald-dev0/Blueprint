use super::{
    http_client, pump_sse, retry_after_secs, AIProvider, AuthKind, CompletionRequest, ModelInfo,
    ProviderConfig, ProviderError, StreamEvent, StreamSink,
};
use async_trait::async_trait;
use serde_json::json;

const ID: &str = "anthropic";
const DEFAULT_BASE: &str = "https://api.anthropic.com";
const API_VERSION: &str = "2023-06-01";

pub struct AnthropicProvider;

#[async_trait]
impl AIProvider for AnthropicProvider {
    fn id(&self) -> &'static str {
        ID
    }

    fn display_name(&self) -> &'static str {
        "Claude (Anthropic)"
    }

    fn auth_kind(&self) -> AuthKind {
        AuthKind::ApiKey {
            signup_url: "https://console.anthropic.com/settings/keys",
        }
    }

    fn default_models(&self) -> Vec<ModelInfo> {
        vec![
            ModelInfo::new("claude-opus-5", "Claude Opus 5", Some(1_000_000)),
            ModelInfo::new("claude-sonnet-5", "Claude Sonnet 5", Some(1_000_000)),
            ModelInfo::new("claude-haiku-4-5", "Claude Haiku 4.5", Some(200_000)),
        ]
    }

    async fn list_models(&self, cfg: &ProviderConfig) -> Result<Vec<ModelInfo>, ProviderError> {
        let key = cfg.require_key(ID)?;
        let base = cfg.base_or(DEFAULT_BASE);
        let client = http_client(ID)?;

        let resp = client
            .get(format!("{}/v1/models", base))
            .header("x-api-key", key)
            .header("anthropic-version", API_VERSION)
            .send()
            .await
            .map_err(|e| ProviderError::network(ID, e))?;

        if !resp.status().is_success() {
            let retry = retry_after_secs(&resp);
            return Err(ProviderError::from_status(ID, resp.status().as_u16(), retry));
        }

        let body: serde_json::Value = resp
            .json()
            .await
            .map_err(|e| ProviderError::protocol(ID, e.to_string()))?;

        let models: Vec<ModelInfo> = body["data"]
            .as_array()
            .map(|arr| {
                arr.iter()
                    .filter_map(|m| {
                        let id = m["id"].as_str()?;
                        Some(ModelInfo {
                            id: id.to_string(),
                            display_name: m["display_name"].as_str().unwrap_or(id).to_string(),
                            context_window: m["max_input_tokens"].as_u64().map(|v| v as u32),
                        })
                    })
                    .collect()
            })
            .unwrap_or_default();

        Ok(if models.is_empty() {
            self.default_models()
        } else {
            models
        })
    }

    async fn stream(
        &self,
        cfg: &ProviderConfig,
        req: CompletionRequest,
        sink: StreamSink,
    ) -> Result<(), ProviderError> {
        let key = cfg.require_key(ID)?;
        let base = cfg.base_or(DEFAULT_BASE);
        let req = req.normalized();
        let client = http_client(ID)?;

        let messages: Vec<serde_json::Value> = req
            .messages
            .iter()
            .map(|m| {
                json!({
                    // Anthropic accepts only "user" and "assistant" here;
                    // system content was lifted out by `normalized()`.
                    "role": if m.role == "assistant" { "assistant" } else { "user" },
                    "content": m.content,
                })
            })
            .collect();

        let mut body = json!({
            "model": req.model_id,
            "max_tokens": req.max_tokens,
            "messages": messages,
            "stream": true,
        });
        if let Some(system) = &req.system {
            // System is a top-level field on Anthropic, not a message role.
            body["system"] = json!(system);
        }

        let resp = client
            .post(format!("{}/v1/messages", base))
            .header("x-api-key", key)
            .header("anthropic-version", API_VERSION)
            .header("content-type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| ProviderError::network(ID, e))?;

        if !resp.status().is_success() {
            let retry = retry_after_secs(&resp);
            let err = ProviderError::from_status(ID, resp.status().as_u16(), retry);
            let _ = sink.send(StreamEvent::Failed {
                error: err.clone(),
            });
            return Err(err);
        }

        let model_id = req.model_id.clone();
        let sink_for_pump = sink.clone();
        let result = pump_sse(ID, resp, move |payload| {
            let event: serde_json::Value = match serde_json::from_str(payload) {
                Ok(v) => v,
                // A malformed frame is not worth killing the turn over.
                Err(_) => return Ok(false),
            };

            match event["type"].as_str() {
                Some("content_block_delta") => {
                    if let Some(text) = event["delta"]["text"].as_str() {
                        let _ = sink_for_pump.send(StreamEvent::Delta {
                            text: text.to_string(),
                        });
                    }
                    Ok(false)
                }
                Some("message_stop") => Ok(true),
                // Anthropic reports mid-stream failures as an SSE `error` event
                // on an otherwise-200 response.
                Some("error") => Err(ProviderError::protocol(
                    ID,
                    event["error"]["type"]
                        .as_str()
                        .unwrap_or("stream error")
                        .to_string(),
                )),
                _ => Ok(false),
            }
        })
        .await;

        match result {
            Ok(()) => {
                let _ = sink.send(StreamEvent::Done { model_id });
                Ok(())
            }
            Err(e) => {
                let _ = sink.send(StreamEvent::Failed { error: e.clone() });
                Err(e)
            }
        }
    }
}
