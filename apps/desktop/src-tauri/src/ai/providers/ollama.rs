use super::openai::{list_openai_compatible, stream_openai_compatible};
use super::{
    http_client, AIProvider, AuthKind, CompletionRequest, ModelInfo, ProviderConfig, ProviderError,
    StreamSink,
};
use async_trait::async_trait;

const ID: &str = "ollama";
const DEFAULT_BASE: &str = "http://localhost:11434";

/// Local models served by Ollama.
///
/// `ModelRouter` already routed Offline/Private work here, but no such provider
/// was ever registered — so that branch was a guaranteed
/// "Provider ollama not found" at runtime.
pub struct OllamaProvider;

#[async_trait]
impl AIProvider for OllamaProvider {
    fn id(&self) -> &'static str {
        ID
    }

    fn display_name(&self) -> &'static str {
        "Ollama (local)"
    }

    fn auth_kind(&self) -> AuthKind {
        AuthKind::LocalEndpoint {
            default_endpoint: DEFAULT_BASE,
        }
    }

    fn default_models(&self) -> Vec<ModelInfo> {
        // Deliberately empty: what's available is whatever the user has pulled.
        // Listing models we can't know about would be a lie the UI then shows.
        Vec::new()
    }

    async fn list_models(&self, cfg: &ProviderConfig) -> Result<Vec<ModelInfo>, ProviderError> {
        let base = cfg.base_or(DEFAULT_BASE);
        let client = http_client(ID)?;

        // Ollama's native endpoint reports richer metadata than its
        // OpenAI-compatible shim, so prefer it and fall back.
        let resp = client
            .get(format!("{}/api/tags", base))
            .send()
            .await
            .map_err(|e| ProviderError::LocalUnavailable {
                provider: ID.to_string(),
                endpoint: base.to_string(),
                message: e.to_string(),
            })?;

        if !resp.status().is_success() {
            return list_openai_compatible(ID, base, None).await;
        }

        let body: serde_json::Value = resp
            .json()
            .await
            .map_err(|e| ProviderError::protocol(ID, e.to_string()))?;

        Ok(body["models"]
            .as_array()
            .map(|arr| {
                arr.iter()
                    .filter_map(|m| {
                        let name = m["name"].as_str()?;
                        Some(ModelInfo::new(name, name, None))
                    })
                    .collect()
            })
            .unwrap_or_default())
    }

    async fn stream(
        &self,
        cfg: &ProviderConfig,
        req: CompletionRequest,
        sink: StreamSink,
    ) -> Result<(), ProviderError> {
        // Ollama exposes an OpenAI-compatible surface at /v1, so the shared
        // transport handles it — no credential involved.
        stream_openai_compatible(ID, cfg.base_or(DEFAULT_BASE), None, req, sink).await
    }
}
