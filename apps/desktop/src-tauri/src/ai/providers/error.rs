use serde::{Deserialize, Serialize};

/// Typed provider failures.
///
/// The previous layer used `Result<_, String>` everywhere, which meant the UI
/// could not tell an expired key from a rate limit from a dropped connection —
/// and therefore could not render the right recovery affordance. Each variant
/// here maps to a distinct thing the user can *do*.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum ProviderError {
    /// No credential is configured for this provider.
    MissingCredential { provider: String },
    /// The provider rejected our credential (401/403).
    Auth { provider: String, message: String },
    /// Rate limited (429). `retry_after_secs` comes from the response header
    /// when the provider sends one.
    RateLimit {
        provider: String,
        retry_after_secs: Option<u64>,
    },
    /// Provider-side failure (5xx).
    Upstream {
        provider: String,
        status: u16,
        message: String,
    },
    /// Request rejected as malformed (4xx that is not auth or rate limit).
    BadRequest {
        provider: String,
        status: u16,
        message: String,
    },
    /// Transport failure — DNS, TLS, connection reset, timeout.
    Network { provider: String, message: String },
    /// We reached the provider but could not understand the response.
    Protocol { provider: String, message: String },
    /// The provider id is not registered.
    UnknownProvider { provider: String },
    /// A local provider (OpenCode, Ollama) is not reachable at its endpoint.
    LocalUnavailable {
        provider: String,
        endpoint: String,
        message: String,
    },
    /// The caller cancelled the stream.
    Cancelled,
}

impl ProviderError {
    /// Whether retrying the identical request could plausibly succeed.
    /// The UI uses this to decide between a "Retry" button and a "Fix
    /// settings" link.
    pub fn is_retryable(&self) -> bool {
        matches!(
            self,
            ProviderError::RateLimit { .. }
                | ProviderError::Upstream { .. }
                | ProviderError::Network { .. }
        )
    }

    /// Maps an HTTP status onto the right variant. Bodies are deliberately not
    /// echoed — a provider error body can contain the prompt we just sent, and
    /// these strings surface in the UI and in logs.
    pub fn from_status(provider: &str, status: u16, retry_after_secs: Option<u64>) -> Self {
        match status {
            401 | 403 => ProviderError::Auth {
                provider: provider.to_string(),
                message: "Provider rejected the credential.".to_string(),
            },
            429 => ProviderError::RateLimit {
                provider: provider.to_string(),
                retry_after_secs,
            },
            500..=599 => ProviderError::Upstream {
                provider: provider.to_string(),
                status,
                message: "Provider is unavailable.".to_string(),
            },
            _ => ProviderError::BadRequest {
                provider: provider.to_string(),
                status,
                message: "Provider rejected the request.".to_string(),
            },
        }
    }

    pub fn network(provider: &str, e: impl std::fmt::Display) -> Self {
        ProviderError::Network {
            provider: provider.to_string(),
            message: e.to_string(),
        }
    }

    pub fn protocol(provider: &str, message: impl Into<String>) -> Self {
        ProviderError::Protocol {
            provider: provider.to_string(),
            message: message.into(),
        }
    }
}

impl std::fmt::Display for ProviderError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ProviderError::MissingCredential { provider } => {
                write!(f, "No credential configured for {}", provider)
            }
            ProviderError::Auth { provider, message } => {
                write!(f, "{} rejected the credential: {}", provider, message)
            }
            ProviderError::RateLimit {
                provider,
                retry_after_secs,
            } => match retry_after_secs {
                Some(s) => write!(f, "{} rate limited; retry in {}s", provider, s),
                None => write!(f, "{} rate limited", provider),
            },
            ProviderError::Upstream {
                provider, status, ..
            } => write!(f, "{} upstream error (HTTP {})", provider, status),
            ProviderError::BadRequest {
                provider, status, ..
            } => write!(f, "{} rejected the request (HTTP {})", provider, status),
            ProviderError::Network { provider, message } => {
                write!(f, "Network error talking to {}: {}", provider, message)
            }
            ProviderError::Protocol { provider, message } => {
                write!(f, "Unexpected response from {}: {}", provider, message)
            }
            ProviderError::UnknownProvider { provider } => {
                write!(f, "Unknown provider '{}'", provider)
            }
            ProviderError::LocalUnavailable {
                provider,
                endpoint,
                message,
            } => write!(
                f,
                "{} is not reachable at {} ({}). Is it running?",
                provider, endpoint, message
            ),
            ProviderError::Cancelled => write!(f, "Request cancelled"),
        }
    }
}

impl std::error::Error for ProviderError {}

/// Tauri commands must serialize their error type. Keeping the typed value
/// (rather than flattening to a string at the boundary) is what lets the
/// frontend switch on `kind`.
impl From<ProviderError> for String {
    fn from(e: ProviderError) -> String {
        e.to_string()
    }
}
