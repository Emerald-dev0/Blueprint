use keyring::Entry;

use super::providers::anthropic::AnthropicProvider;
use super::providers::gemini::GeminiProvider;
use super::providers::ollama::OllamaProvider;
use super::providers::openai::OpenAIProvider;
use super::providers::{AIProvider, AIMessage, CompletionResponse};

/// Which OS credential store backs a provider key, for honest error messages.
fn store_name() -> &'static str {
    if cfg!(target_os = "windows") {
        "Windows Credential Manager"
    } else if cfg!(target_os = "macos") {
        "macOS Keychain"
    } else {
        // keyring 2.x talks to the freedesktop Secret Service over D-Bus, so a
        // running provider (gnome-keyring, KeePassXC, KWallet-compat) is
        // required. Headless machines and minimal containers often have none.
        "the freedesktop Secret Service (e.g. gnome-keyring or KeePassXC)"
    }
}

pub struct AIManager {
    providers: Vec<Box<dyn AIProvider>>,
}

impl AIManager {
    pub fn new() -> Self {
        Self {
            providers: vec![
                Box::new(GeminiProvider),
                Box::new(AnthropicProvider),
                Box::new(OpenAIProvider),
                Box::new(OllamaProvider),
            ],
        }
    }

    pub fn set_key(&self, provider_id: &str, key: &str) -> Result<(), String> {
        let entry = Entry::new("blueprint-ai", provider_id).map_err(|e| {
            format!(
                "could not reach the system credential store ({}): {e}",
                store_name()
            )
        })?;
        entry.set_password(key).map_err(|e| {
            format!(
                "the system credential store ({}) rejected the write: {e}. \
                 On Linux, start a Secret Service provider such as gnome-keyring.",
                store_name()
            )
        })
    }

    pub fn get_key(&self, provider_id: &str) -> Result<String, String> {
        let entry = Entry::new("blueprint-ai", provider_id)
            .map_err(|e| format!("could not reach the system credential store: {e}"))?;
        entry.get_password().map_err(|_| {
            format!(
                "No API key is stored for '{provider_id}'. Add one in Settings → AI Providers; \
                 keys are kept in {}.",
                store_name()
            )
        })
    }

    pub async fn complete(
        &self,
        provider_id: &str,
        model_id: &str,
        messages: Vec<AIMessage>,
    ) -> Result<CompletionResponse, String> {
        let provider = self
            .providers
            .iter()
            .find(|p| p.id() == provider_id)
            .ok_or_else(|| {
                format!(
                    "Provider '{provider_id}' is not available. Configured providers: {}",
                    self.providers
                        .iter()
                        .map(|p| p.id())
                        .collect::<Vec<_>>()
                        .join(", ")
                )
            })?;

        let key = if provider.requires_credential() {
            self.get_key(provider_id)?
        } else {
            String::new()
        };
        provider.complete(&key, messages, model_id).await
    }

    /// Whether this provider can be used right now: it either needs no
    /// credential (a local server) or has one stored in the OS keyring.
    pub fn has_credential(&self, provider_id: &str) -> bool {
        match self.providers.iter().find(|p| p.id() == provider_id) {
            Some(provider) if !provider.requires_credential() => true,
            Some(_) => self.get_key(provider_id).is_ok(),
            None => false,
        }
    }

    /// Turn a routing preference into a route that will actually work.
    ///
    /// The router expresses an opinion ("reasoning tasks go to Claude"), but a
    /// user who has only configured Gemini should not be blocked by that
    /// opinion. Returns `(provider_id, model_id, substituted)`; `substituted`
    /// is `true` when the preference could not be honoured, which the caller
    /// records in the audit log and surfaces in the UI so the switch is never
    /// silent.
    pub fn resolve_route(
        &self,
        preferred_provider: &str,
        preferred_model: &str,
    ) -> Result<(String, String, bool), String> {
        if self.has_credential(preferred_provider) {
            return Ok((
                preferred_provider.to_string(),
                preferred_model.to_string(),
                false,
            ));
        }

        // Cloud providers first (a stored key means the user chose them), then
        // the local server, which needs no key but does need Ollama running.
        for &(provider_id, model_id) in FALLBACK_ROUTES {
            if provider_id == preferred_provider {
                continue;
            }
            if self.has_credential(provider_id) {
                log::info!(
                    "routed {} -> {} because no credential is stored for {}",
                    preferred_provider,
                    provider_id,
                    preferred_provider
                );
                return Ok((provider_id.to_string(), model_id.to_string(), true));
            }
        }

        Err(format!(
            "No AI provider is usable: '{preferred_provider}' has no stored credential and no \
             fallback is configured. Add an API key in Settings → AI Providers, or start a \
             local Ollama server ({}).",
            FALLBACK_ROUTES
                .last()
                .map(|(id, _)| *id)
                .unwrap_or("ollama")
        ))
    }
}

/// Provider/model pairs tried when the routed provider has no credential, in
/// preference order. The local server is last because it needs Ollama running.
const FALLBACK_ROUTES: &[(&str, &str)] = &[
    ("anthropic", "claude-3-5-sonnet-latest"),
    ("openai", "gpt-4o"),
    ("gemini", "gemini-1.5-pro"),
    ("ollama", "llama3"),
];
