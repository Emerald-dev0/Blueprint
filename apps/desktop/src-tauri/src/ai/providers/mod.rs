use async_trait::async_trait;
use serde::{Deserialize, Serialize};

pub mod anthropic;
pub mod gemini;
pub mod ollama;
pub mod openai;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AIMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CompletionResponse {
    pub content: String,
    pub model_id: String,
}

#[async_trait]
pub trait AIProvider: Send + Sync {
    fn id(&self) -> &str;

    /// Whether this provider needs a secret from the OS credential store.
    ///
    /// A local server (Ollama) does not: demanding a key for it made the
    /// offline path — the only route that honours "your source never leaves
    /// this machine" — fail with "No API key is stored for 'ollama'".
    fn requires_credential(&self) -> bool {
        true
    }

    async fn complete(
        &self,
        api_key: &str,
        messages: Vec<AIMessage>,
        model_id: &str,
    ) -> Result<CompletionResponse, String>;
}

/// Render a non-2xx provider response as a single actionable error.
///
/// Without this, a 401 or 429 surfaced either as an opaque transport error or —
/// worse — as a parse failure on an HTML error page, giving the user nothing to
/// act on. The body is truncated so a huge error document cannot flood the UI
/// or the audit log.
pub async fn http_error(response: reqwest::Response) -> String {
    let status = response.status();
    let provider = response.url().host_str().unwrap_or("provider").to_string();
    let body = response.text().await.unwrap_or_else(|_| "<unreadable body>".into());
    format!("HTTP {status} from {provider}: {}", truncate(&body, 400))
}

/// Bound untrusted provider text before it reaches the renderer.
pub fn truncate(text: &str, max_chars: usize) -> String {
    if text.chars().count() <= max_chars {
        text.to_string()
    } else {
        let head: String = text.chars().take(max_chars).collect();
        format!("{head}… (truncated)")
    }
}
