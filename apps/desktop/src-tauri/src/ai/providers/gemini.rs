use super::{
    http_client, pump_sse, retry_after_secs, AIProvider, AuthKind, CompletionRequest, ModelInfo,
    ProviderConfig, ProviderError, StreamEvent, StreamSink,
};
use async_trait::async_trait;
use serde_json::json;

const ID: &str = "gemini";
const DEFAULT_BASE: &str = "https://generativelanguage.googleapis.com";

pub struct GeminiProvider;

#[async_trait]
impl AIProvider for GeminiProvider {
    fn id(&self) -> &'static str {
        ID
    }

    fn display_name(&self) -> &'static str {
        "Gemini (Google)"
    }

    fn auth_kind(&self) -> AuthKind {
        AuthKind::ApiKey {
            signup_url: "https://aistudio.google.com/apikey",
        }
    }

    fn default_models(&self) -> Vec<ModelInfo> {
        vec![
            ModelInfo::new("gemini-1.5-pro", "Gemini 1.5 Pro", Some(2_000_000)),
            ModelInfo::new("gemini-1.5-flash", "Gemini 1.5 Flash", Some(1_000_000)),
        ]
    }

    async fn list_models(&self, cfg: &ProviderConfig) -> Result<Vec<ModelInfo>, ProviderError> {
        let key = cfg.require_key(ID)?;
        let base = cfg.base_or(DEFAULT_BASE);
        let client = http_client(ID)?;

        let resp = client
            .get(format!("{}/v1beta/models", base))
            // Header, not `?key=` — a key in the query string leaks into proxy
            // logs, crash reports, and any error surface that echoes the URL.
            .header("x-goog-api-key", key)
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

        let models: Vec<ModelInfo> = body["models"]
            .as_array()
            .map(|arr| {
                arr.iter()
                    .filter_map(|m| {
                        // Gemini returns fully-qualified names like
                        // "models/gemini-1.5-pro"; the generate endpoint wants
                        // the bare id.
                        let full = m["name"].as_str()?;
                        let id = full.strip_prefix("models/").unwrap_or(full);
                        Some(ModelInfo {
                            id: id.to_string(),
                            display_name: m["displayName"].as_str().unwrap_or(id).to_string(),
                            context_window: m["inputTokenLimit"].as_u64().map(|v| v as u32),
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

        let contents: Vec<serde_json::Value> = req
            .messages
            .iter()
            .map(|m| {
                json!({
                    "role": if m.role == "assistant" { "model" } else { "user" },
                    "parts": [{ "text": m.content }],
                })
            })
            .collect();

        let mut body = json!({ "contents": contents });
        if let Some(system) = &req.system {
            body["system_instruction"] = json!({ "parts": [{ "text": system }] });
        }

        let resp = client
            .post(format!(
                "{}/v1beta/models/{}:streamGenerateContent?alt=sse",
                base, req.model_id
            ))
            .header("x-goog-api-key", key)
            .header("content-type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| ProviderError::network(ID, e))?;

        if !resp.status().is_success() {
            let retry = retry_after_secs(&resp);
            let err = ProviderError::from_status(ID, resp.status().as_u16(), retry);
            let _ = sink.send(StreamEvent::Failed { error: err.clone() });
            return Err(err);
        }

        let model_id = req.model_id.clone();
        let sink_for_pump = sink.clone();
        let result = pump_sse(ID, resp, move |payload| {
            let event: serde_json::Value = match serde_json::from_str(payload) {
                Ok(v) => v,
                Err(_) => return Ok(false),
            };
            if let Some(message) = event["error"]["message"].as_str() {
                return Err(ProviderError::protocol(ID, message.to_string()));
            }
            if let Some(parts) = event["candidates"][0]["content"]["parts"].as_array() {
                for part in parts {
                    if let Some(text) = part["text"].as_str() {
                        let _ = sink_for_pump.send(StreamEvent::Delta {
                            text: text.to_string(),
                        });
                    }
                }
            }
            Ok(false)
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
