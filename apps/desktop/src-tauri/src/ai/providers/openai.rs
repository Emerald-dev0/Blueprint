use super::{
    http_client, pump_sse, retry_after_secs, AIProvider, AuthKind, CompletionRequest, ModelInfo,
    ProviderConfig, ProviderError, StreamEvent, StreamSink,
};
use async_trait::async_trait;
use serde_json::json;

const ID: &str = "openai";
const DEFAULT_BASE: &str = "https://api.openai.com";

pub struct OpenAIProvider;

/// Shared implementation of the OpenAI `/v1/chat/completions` wire format.
///
/// OpenAI, OpenCode, and most local gateways all speak this shape, so the
/// transport lives here once and each provider supplies its own id, base URL,
/// and auth. `api_key` is `None` for local endpoints that need no credential —
/// which is the whole reason auth is not a trait-level parameter.
pub(crate) async fn stream_openai_compatible(
    provider_id: &str,
    base: &str,
    api_key: Option<&str>,
    req: CompletionRequest,
    sink: StreamSink,
) -> Result<(), ProviderError> {
    let req = req.normalized();
    let client = http_client(provider_id)?;

    let mut messages: Vec<serde_json::Value> = Vec::with_capacity(req.messages.len() + 1);
    if let Some(system) = &req.system {
        messages.push(json!({ "role": "system", "content": system }));
    }
    for m in &req.messages {
        messages.push(json!({ "role": m.role, "content": m.content }));
    }

    let body = json!({
        "model": req.model_id,
        "max_tokens": req.max_tokens,
        "messages": messages,
        "stream": true,
    });

    let mut request = client
        .post(format!("{}/v1/chat/completions", base))
        .header("content-type", "application/json")
        .json(&body);
    if let Some(key) = api_key {
        request = request.bearer_auth(key);
    }

    let resp = match request.send().await {
        Ok(r) => r,
        Err(e) => {
            // A local provider that isn't running is the single most common
            // failure here, and it deserves a message that says so rather than
            // a raw connection-refused.
            let err = if api_key.is_none() {
                ProviderError::LocalUnavailable {
                    provider: provider_id.to_string(),
                    endpoint: base.to_string(),
                    message: e.to_string(),
                }
            } else {
                ProviderError::network(provider_id, e)
            };
            let _ = sink.send(StreamEvent::Failed { error: err.clone() });
            return Err(err);
        }
    };

    if !resp.status().is_success() {
        let retry = retry_after_secs(&resp);
        let err = ProviderError::from_status(provider_id, resp.status().as_u16(), retry);
        let _ = sink.send(StreamEvent::Failed { error: err.clone() });
        return Err(err);
    }

    let model_id = req.model_id.clone();
    let pump_id: String = provider_id.to_string();
    let sink_for_pump = sink.clone();
    let result = pump_sse(provider_id, resp, move |payload| {
        if payload == "[DONE]" {
            return Ok(true);
        }
        let event: serde_json::Value = match serde_json::from_str(payload) {
            Ok(v) => v,
            Err(_) => return Ok(false),
        };
        if let Some(message) = event["error"]["message"].as_str() {
            return Err(ProviderError::protocol(&pump_id, message.to_string()));
        }
        if let Some(text) = event["choices"][0]["delta"]["content"].as_str() {
            let _ = sink_for_pump.send(StreamEvent::Delta {
                text: text.to_string(),
            });
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

/// Shared `/v1/models` listing for OpenAI-compatible endpoints.
pub(crate) async fn list_openai_compatible(
    provider_id: &str,
    base: &str,
    api_key: Option<&str>,
) -> Result<Vec<ModelInfo>, ProviderError> {
    let client = http_client(provider_id)?;
    let mut request = client.get(format!("{}/v1/models", base));
    if let Some(key) = api_key {
        request = request.bearer_auth(key);
    }

    let resp = request.send().await.map_err(|e| {
        if api_key.is_none() {
            ProviderError::LocalUnavailable {
                provider: provider_id.to_string(),
                endpoint: base.to_string(),
                message: e.to_string(),
            }
        } else {
            ProviderError::network(provider_id, e)
        }
    })?;

    if !resp.status().is_success() {
        let retry = retry_after_secs(&resp);
        return Err(ProviderError::from_status(
            provider_id,
            resp.status().as_u16(),
            retry,
        ));
    }

    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| ProviderError::protocol(provider_id, e.to_string()))?;

    Ok(body["data"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|m| {
                    let id = m["id"].as_str()?;
                    Some(ModelInfo::new(id, id, None))
                })
                .collect()
        })
        .unwrap_or_default())
}

#[async_trait]
impl AIProvider for OpenAIProvider {
    fn id(&self) -> &'static str {
        ID
    }

    fn display_name(&self) -> &'static str {
        "OpenAI"
    }

    fn auth_kind(&self) -> AuthKind {
        AuthKind::ApiKey {
            signup_url: "https://platform.openai.com/api-keys",
        }
    }

    fn default_models(&self) -> Vec<ModelInfo> {
        vec![
            ModelInfo::new("gpt-4o", "GPT-4o", Some(128_000)),
            ModelInfo::new("gpt-4o-mini", "GPT-4o mini", Some(128_000)),
        ]
    }

    async fn list_models(&self, cfg: &ProviderConfig) -> Result<Vec<ModelInfo>, ProviderError> {
        let key = cfg.require_key(ID)?;
        let models = list_openai_compatible(ID, cfg.base_or(DEFAULT_BASE), Some(key)).await?;
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
        stream_openai_compatible(ID, cfg.base_or(DEFAULT_BASE), Some(key), req, sink).await
    }
}
