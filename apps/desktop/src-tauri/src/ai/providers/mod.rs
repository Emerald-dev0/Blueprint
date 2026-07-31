use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;

#[cfg(test)]
mod tests;

pub mod anthropic;
pub mod error;
pub mod gemini;
pub mod ollama;
pub mod openai;
pub mod opencode;

pub use error::ProviderError;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AIMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CompletionResponse {
    pub content: String,
    pub model_id: String,
}

/// How a provider proves who it is.
///
/// The previous trait took `api_key: &str` on every call, which silently
/// asserted that every intelligence provider is a hosted HTTP service behind a
/// bearer token. That assumption is exactly what made "bring your own OpenCode
/// / Ollama / local model" impossible without rewriting the layer, so auth is
/// now something each provider declares rather than something the trait imposes.
/// Serialize-only: this travels Rust → webview to render Settings, never back.
/// Borrowed `&'static str` fields cannot implement `Deserialize`.
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum AuthKind {
    /// Hosted provider requiring a secret held in the OS keychain.
    ApiKey {
        /// Where the user obtains a key — surfaced in Settings.
        signup_url: &'static str,
    },
    /// Local daemon reachable over HTTP with no credential (Ollama, OpenCode).
    LocalEndpoint { default_endpoint: &'static str },
}

/// Resolved, per-request provider configuration.
#[derive(Debug, Clone, Default)]
pub struct ProviderConfig {
    /// Present only for `AuthKind::ApiKey` providers.
    pub api_key: Option<String>,
    /// Overrides the provider's default base URL — a self-hosted gateway, a
    /// proxy, or a non-default local port.
    pub base_url: Option<String>,
}

impl ProviderConfig {
    /// Returns the API key or the typed missing-credential error, so providers
    /// don't each hand-roll that check.
    pub fn require_key(&self, provider: &str) -> Result<&str, ProviderError> {
        self.api_key
            .as_deref()
            .map(str::trim)
            .filter(|k| !k.is_empty())
            .ok_or_else(|| ProviderError::MissingCredential {
                provider: provider.to_string(),
            })
    }

    pub fn base_or<'a>(&'a self, default: &'a str) -> &'a str {
        self.base_url
            .as_deref()
            .map(str::trim_end_matches_slash)
            .unwrap_or(default)
    }
}

/// Small helper so `base_or` reads cleanly.
trait TrimSlash {
    fn trim_end_matches_slash(&self) -> &str;
}
impl TrimSlash for str {
    fn trim_end_matches_slash(&self) -> &str {
        self.trim_end_matches('/')
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    pub id: String,
    pub display_name: String,
    /// Advertised context window, where the provider publishes one.
    pub context_window: Option<u32>,
}

impl ModelInfo {
    pub fn new(id: &str, display_name: &str, context_window: Option<u32>) -> Self {
        Self {
            id: id.to_string(),
            display_name: display_name.to_string(),
            context_window,
        }
    }
}

/// A single request to a provider.
#[derive(Debug, Clone)]
pub struct CompletionRequest {
    pub model_id: String,
    /// Provider-neutral system prompt. Each provider maps this onto its own
    /// wire shape — a top-level `system` field on Anthropic, a `system` role
    /// message on OpenAI, `system_instruction` on Gemini.
    pub system: Option<String>,
    pub messages: Vec<AIMessage>,
    pub max_tokens: u32,
}

impl CompletionRequest {
    pub fn new(model_id: impl Into<String>, messages: Vec<AIMessage>) -> Self {
        Self {
            model_id: model_id.into(),
            system: None,
            messages,
            max_tokens: 8192,
        }
    }

    /// Lifts any `system`-role entries out of `messages` onto the dedicated
    /// `system` field, so callers can keep building a flat message list without
    /// knowing each provider's convention.
    pub fn normalized(mut self) -> Self {
        let mut system_parts: Vec<String> = Vec::new();
        self.messages.retain(|m| {
            if m.role == "system" {
                system_parts.push(m.content.clone());
                false
            } else {
                true
            }
        });
        if !system_parts.is_empty() {
            let joined = system_parts.join("\n\n");
            self.system = match self.system.take() {
                Some(existing) => Some(format!("{}\n\n{}", existing, joined)),
                None => Some(joined),
            };
        }
        self
    }
}

/// Incremental output from a streaming completion.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum StreamEvent {
    /// A chunk of assistant text.
    Delta { text: String },
    /// The turn finished cleanly.
    Done { model_id: String },
    /// The turn failed. Terminal — no further events follow.
    Failed { error: ProviderError },
}

pub type StreamSink = mpsc::UnboundedSender<StreamEvent>;

/// An interchangeable intelligence provider.
///
/// Everything Blueprint needs from a provider is here, and nothing about
/// *which* provider is baked into the orchestration layer. Adding OpenCode or a
/// new hosted vendor means implementing this trait and registering it — no
/// changes to the AOS, the workflow engine, or the UI.
#[async_trait]
pub trait AIProvider: Send + Sync {
    fn id(&self) -> &'static str;
    fn display_name(&self) -> &'static str;
    fn auth_kind(&self) -> AuthKind;

    /// Models we know about without querying.
    fn default_models(&self) -> Vec<ModelInfo>;

    /// Live model discovery. Defaults to the static list; local providers
    /// override it to report what is actually installed.
    async fn list_models(&self, _cfg: &ProviderConfig) -> Result<Vec<ModelInfo>, ProviderError> {
        Ok(self.default_models())
    }

    /// Cheap reachability / credential check for the Settings screen.
    async fn health_check(&self, cfg: &ProviderConfig) -> Result<(), ProviderError> {
        self.list_models(cfg).await.map(|_| ())
    }

    /// Streams a completion, emitting events on `sink` as they arrive.
    ///
    /// This is the primitive; `complete` is derived from it. Making streaming
    /// the base case is deliberate — a non-streaming primitive cannot be
    /// retrofitted into a streaming one without touching every call site, and
    /// an engineering agent that runs for a minute with no visible output and
    /// no stop button is not a usable developer tool.
    async fn stream(
        &self,
        cfg: &ProviderConfig,
        req: CompletionRequest,
        sink: StreamSink,
    ) -> Result<(), ProviderError>;

    /// Buffered convenience wrapper over `stream`.
    async fn complete(
        &self,
        cfg: &ProviderConfig,
        req: CompletionRequest,
    ) -> Result<CompletionResponse, ProviderError> {
        let model_id = req.model_id.clone();
        let (tx, mut rx) = mpsc::unbounded_channel();
        let stream_result = self.stream(cfg, req, tx).await;

        let mut buffer = String::new();
        while let Some(event) = rx.recv().await {
            match event {
                StreamEvent::Delta { text } => buffer.push_str(&text),
                StreamEvent::Failed { error } => return Err(error),
                StreamEvent::Done { .. } => break,
            }
        }
        stream_result?;

        Ok(CompletionResponse {
            content: buffer,
            model_id,
        })
    }
}

/// Shared HTTP client factory, so every provider gets the same timeout and
/// user-agent policy. The old code built a bare `reqwest::Client::new()` per
/// call with no timeout at all, so a hung provider hung Blueprint.
pub(crate) fn http_client(provider: &str) -> Result<reqwest::Client, ProviderError> {
    reqwest::Client::builder()
        .connect_timeout(std::time::Duration::from_secs(10))
        .timeout(std::time::Duration::from_secs(600))
        .user_agent(concat!("Blueprint/", env!("CARGO_PKG_VERSION")))
        .build()
        .map_err(|e| ProviderError::network(provider, e))
}

/// Reads `Retry-After` as whole seconds, when present.
pub(crate) fn retry_after_secs(resp: &reqwest::Response) -> Option<u64> {
    resp.headers()
        .get(reqwest::header::RETRY_AFTER)?
        .to_str()
        .ok()?
        .trim()
        .parse()
        .ok()
}

/// Drives a byte stream, splitting it into SSE `data:` payloads and handing
/// each to `on_data`. Shared by the Anthropic, OpenAI, and Gemini providers,
/// which all speak SSE with different payload shapes.
pub(crate) async fn pump_sse<F>(
    provider: &str,
    resp: reqwest::Response,
    mut on_data: F,
) -> Result<(), ProviderError>
where
    F: FnMut(&str) -> Result<bool, ProviderError>,
{
    use futures_util::StreamExt;

    let mut stream = resp.bytes_stream();
    let mut buf = String::new();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| ProviderError::network(provider, e))?;
        buf.push_str(&String::from_utf8_lossy(&chunk));

        // SSE events are separated by a blank line; process every complete one
        // and keep the remainder buffered.
        while let Some(idx) = buf.find("\n\n") {
            let raw_event: String = buf.drain(..idx + 2).collect();
            for line in raw_event.lines() {
                let Some(payload) = line.strip_prefix("data:") else {
                    continue;
                };
                let payload = payload.trim();
                if payload.is_empty() {
                    continue;
                }
                if on_data(payload)? {
                    return Ok(());
                }
            }
        }
    }
    Ok(())
}
