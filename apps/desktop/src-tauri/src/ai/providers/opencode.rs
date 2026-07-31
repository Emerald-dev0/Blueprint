use super::openai::{list_openai_compatible, stream_openai_compatible};
use super::{
    AIProvider, AuthKind, CompletionRequest, ModelInfo, ProviderConfig, ProviderError, StreamSink,
};
use async_trait::async_trait;

const ID: &str = "opencode";
const DEFAULT_BASE: &str = "http://localhost:4096";

/// OpenCode running on the user's machine.
///
/// This provider exists to prove the abstraction holds: it is a local process
/// with no API key, which the previous `complete(api_key: &str, ..)` trait
/// could not express at all. It speaks the OpenAI-compatible protocol that
/// OpenCode's server mode exposes, so the transport is shared.
pub struct OpenCodeProvider;

#[async_trait]
impl AIProvider for OpenCodeProvider {
    fn id(&self) -> &'static str {
        ID
    }

    fn display_name(&self) -> &'static str {
        "OpenCode (local)"
    }

    fn auth_kind(&self) -> AuthKind {
        AuthKind::LocalEndpoint {
            default_endpoint: DEFAULT_BASE,
        }
    }

    fn default_models(&self) -> Vec<ModelInfo> {
        // Whatever OpenCode is configured against is the source of truth;
        // discovered at runtime via `list_models`.
        Vec::new()
    }

    async fn list_models(&self, cfg: &ProviderConfig) -> Result<Vec<ModelInfo>, ProviderError> {
        list_openai_compatible(ID, cfg.base_or(DEFAULT_BASE), None).await
    }

    async fn stream(
        &self,
        cfg: &ProviderConfig,
        req: CompletionRequest,
        sink: StreamSink,
    ) -> Result<(), ProviderError> {
        stream_openai_compatible(ID, cfg.base_or(DEFAULT_BASE), None, req, sink).await
    }
}
