use super::providers::{
    anthropic::AnthropicProvider, gemini::GeminiProvider, ollama::OllamaProvider,
    openai::OpenAIProvider, opencode::OpenCodeProvider, AIMessage, AIProvider, AuthKind,
    CompletionRequest, CompletionResponse, ModelInfo, ProviderConfig, ProviderError, StreamSink,
};
use keyring::Entry;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::RwLock;

const KEYRING_SERVICE: &str = "blueprint-ai";

/// What a capability needs from a model. The router maps these onto whichever
/// provider the *user* chose, rather than onto a vendor fixed at compile time.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ModelCapability {
    Reasoning,
    Architecture,
    Coding,
    FunctionCalling,
    LargeContext,
    Multimodal,
    Offline,
    Private,
}

/// A concrete provider + model pair.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RouteTarget {
    pub provider_id: String,
    pub model_id: String,
}

/// User-owned routing table.
///
/// This replaces `ModelRouter::route`, which was a hardcoded `match` returning
/// compile-time vendor constants. That function could not express "use Claude
/// as my intelligence provider" or "use my local OpenCode" — the two things the
/// product exists for — and it routed Offline/Private to an `ollama` provider
/// that was never registered, so that branch was a guaranteed runtime failure.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoutingConfig {
    /// Used for any capability without a specific override.
    pub default: RouteTarget,
    pub overrides: HashMap<ModelCapability, RouteTarget>,
}

impl Default for RoutingConfig {
    fn default() -> Self {
        Self {
            default: RouteTarget {
                provider_id: "anthropic".to_string(),
                model_id: "claude-opus-5".to_string(),
            },
            overrides: HashMap::new(),
        }
    }
}

impl RoutingConfig {
    pub fn resolve(&self, capability: ModelCapability) -> RouteTarget {
        self.overrides
            .get(&capability)
            .cloned()
            .unwrap_or_else(|| self.default.clone())
    }
}

/// Provider metadata for the Settings UI. Serialize-only — see `AuthKind`.
#[derive(Debug, Clone, Serialize)]
pub struct ProviderDescriptor {
    pub id: String,
    pub display_name: String,
    pub auth: AuthKind,
    /// Whether a credential is present — never the credential itself.
    pub configured: bool,
    pub default_models: Vec<ModelInfo>,
}

pub struct AIManager {
    providers: Vec<Box<dyn AIProvider>>,
    routing: RwLock<RoutingConfig>,
    /// Per-provider base URL overrides, for local endpoints on non-default
    /// ports or self-hosted gateways.
    endpoints: RwLock<HashMap<String, String>>,
}

impl Default for AIManager {
    fn default() -> Self {
        Self::new()
    }
}

impl AIManager {
    pub fn new() -> Self {
        Self {
            providers: vec![
                Box::new(AnthropicProvider),
                Box::new(OpenAIProvider),
                Box::new(GeminiProvider),
                Box::new(OllamaProvider),
                Box::new(OpenCodeProvider),
            ],
            routing: RwLock::new(RoutingConfig::default()),
            endpoints: RwLock::new(HashMap::new()),
        }
    }

    fn provider(&self, id: &str) -> Result<&dyn AIProvider, ProviderError> {
        self.providers
            .iter()
            .find(|p| p.id() == id)
            .map(|b| b.as_ref())
            .ok_or_else(|| ProviderError::UnknownProvider {
                provider: id.to_string(),
            })
    }

    // -- credentials ------------------------------------------------------

    pub fn set_key(&self, provider_id: &str, key: &str) -> Result<(), ProviderError> {
        // Reject an unknown id rather than writing an orphan keychain entry.
        self.provider(provider_id)?;
        let entry = Entry::new(KEYRING_SERVICE, provider_id)
            .map_err(|e| ProviderError::protocol(provider_id, e.to_string()))?;
        entry
            .set_password(key)
            .map_err(|e| ProviderError::protocol(provider_id, e.to_string()))
    }

    pub fn delete_key(&self, provider_id: &str) -> Result<(), ProviderError> {
        let entry = Entry::new(KEYRING_SERVICE, provider_id)
            .map_err(|e| ProviderError::protocol(provider_id, e.to_string()))?;
        match entry.delete_password() {
            Ok(()) => Ok(()),
            // Deleting an absent credential is not a failure.
            Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(ProviderError::protocol(provider_id, e.to_string())),
        }
    }

    fn get_key(&self, provider_id: &str) -> Option<String> {
        Entry::new(KEYRING_SERVICE, provider_id)
            .ok()
            .and_then(|e| e.get_password().ok())
    }

    pub fn set_endpoint(&self, provider_id: &str, endpoint: Option<String>) {
        let mut map = self.endpoints.write().unwrap_or_else(|e| e.into_inner());
        match endpoint {
            Some(url) if !url.trim().is_empty() => {
                map.insert(provider_id.to_string(), url.trim().to_string());
            }
            _ => {
                map.remove(provider_id);
            }
        }
    }

    /// Assembles the per-request config: credential from the keychain for
    /// key-based providers, endpoint override for local ones.
    fn config_for(&self, provider: &dyn AIProvider) -> ProviderConfig {
        let base_url = self
            .endpoints
            .read()
            .unwrap_or_else(|e| e.into_inner())
            .get(provider.id())
            .cloned();

        let api_key = match provider.auth_kind() {
            AuthKind::ApiKey { .. } => self.get_key(provider.id()),
            // Local providers get no credential — precisely the case the old
            // `complete(api_key: &str, ..)` signature could not express.
            AuthKind::LocalEndpoint { .. } => None,
        };

        ProviderConfig { api_key, base_url }
    }

    // -- discovery --------------------------------------------------------

    pub fn describe_providers(&self) -> Vec<ProviderDescriptor> {
        self.providers
            .iter()
            .map(|p| ProviderDescriptor {
                id: p.id().to_string(),
                display_name: p.display_name().to_string(),
                auth: p.auth_kind(),
                configured: match p.auth_kind() {
                    AuthKind::ApiKey { .. } => self.get_key(p.id()).is_some(),
                    // A local provider is "configured" once it answers a probe.
                    AuthKind::LocalEndpoint { .. } => true,
                },
                default_models: p.default_models(),
            })
            .collect()
    }

    pub async fn health_check(&self, provider_id: &str) -> Result<(), ProviderError> {
        let provider = self.provider(provider_id)?;
        provider.health_check(&self.config_for(provider)).await
    }

    pub async fn list_models(&self, provider_id: &str) -> Result<Vec<ModelInfo>, ProviderError> {
        let provider = self.provider(provider_id)?;
        provider.list_models(&self.config_for(provider)).await
    }

    // -- routing ----------------------------------------------------------

    pub fn routing(&self) -> RoutingConfig {
        self.routing
            .read()
            .unwrap_or_else(|e| e.into_inner())
            .clone()
    }

    pub fn set_routing(&self, config: RoutingConfig) -> Result<(), ProviderError> {
        // Validate before storing, so a bad route fails at configuration time
        // rather than mid-workflow.
        self.provider(&config.default.provider_id)?;
        for target in config.overrides.values() {
            self.provider(&target.provider_id)?;
        }
        *self.routing.write().unwrap_or_else(|e| e.into_inner()) = config;
        Ok(())
    }

    pub fn resolve(&self, capability: ModelCapability) -> RouteTarget {
        self.routing().resolve(capability)
    }

    // -- inference --------------------------------------------------------

    pub async fn complete(
        &self,
        provider_id: &str,
        model_id: &str,
        messages: Vec<AIMessage>,
        system: Option<String>,
    ) -> Result<CompletionResponse, ProviderError> {
        let provider = self.provider(provider_id)?;
        let mut req = CompletionRequest::new(model_id, messages);
        req.system = system;
        provider.complete(&self.config_for(provider), req).await
    }

    pub async fn stream(
        &self,
        provider_id: &str,
        model_id: &str,
        messages: Vec<AIMessage>,
        system: Option<String>,
        sink: StreamSink,
    ) -> Result<(), ProviderError> {
        let provider = self.provider(provider_id)?;
        let mut req = CompletionRequest::new(model_id, messages);
        req.system = system;
        provider.stream(&self.config_for(provider), req, sink).await
    }

    /// Routes by capability using the user's configuration.
    pub async fn complete_for(
        &self,
        capability: ModelCapability,
        messages: Vec<AIMessage>,
        system: Option<String>,
    ) -> Result<CompletionResponse, ProviderError> {
        let target = self.resolve(capability);
        self.complete(&target.provider_id, &target.model_id, messages, system)
            .await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn target(provider: &str, model: &str) -> RouteTarget {
        RouteTarget {
            provider_id: provider.to_string(),
            model_id: model.to_string(),
        }
    }

    #[test]
    fn every_registered_provider_is_addressable() {
        // The old router emitted "ollama" as a route target while no such
        // provider was registered, so that branch was a guaranteed runtime
        // failure. Anything the router can name must resolve.
        let manager = AIManager::new();
        for id in ["anthropic", "openai", "gemini", "ollama", "opencode"] {
            assert!(
                manager.provider(id).is_ok(),
                "provider '{id}' is not registered"
            );
        }
    }

    #[test]
    fn local_providers_declare_no_api_key() {
        // This is the property the old `complete(api_key: &str, ..)` signature
        // could not express, and the reason OpenCode support was impossible.
        let manager = AIManager::new();
        for id in ["ollama", "opencode"] {
            let provider = manager.provider(id).unwrap();
            assert!(
                matches!(provider.auth_kind(), AuthKind::LocalEndpoint { .. }),
                "{id} should be a local endpoint"
            );
            let cfg = manager.config_for(provider);
            assert!(cfg.api_key.is_none(), "{id} must not be handed a credential");
        }
    }

    #[test]
    fn hosted_providers_declare_an_api_key() {
        let manager = AIManager::new();
        for id in ["anthropic", "openai", "gemini"] {
            let provider = manager.provider(id).unwrap();
            assert!(
                matches!(provider.auth_kind(), AuthKind::ApiKey { .. }),
                "{id} should require an API key"
            );
        }
    }

    #[test]
    fn unknown_provider_is_rejected_not_silently_defaulted() {
        let manager = AIManager::new();
        assert!(matches!(
            manager.provider("does-not-exist"),
            Err(ProviderError::UnknownProvider { .. })
        ));
    }

    #[test]
    fn overrides_take_precedence_over_the_default() {
        let mut config = RoutingConfig::default();
        config
            .overrides
            .insert(ModelCapability::Private, target("opencode", "local-model"));

        assert_eq!(config.resolve(ModelCapability::Private).provider_id, "opencode");
        // Untouched capabilities still fall through to the default.
        assert_eq!(
            config.resolve(ModelCapability::Reasoning).provider_id,
            config.default.provider_id
        );
    }

    #[test]
    fn routing_is_validated_before_it_is_stored() {
        let manager = AIManager::new();
        let before = manager.routing();

        let mut bad = RoutingConfig::default();
        bad.overrides
            .insert(ModelCapability::Coding, target("not-a-provider", "x"));

        assert!(
            manager.set_routing(bad).is_err(),
            "a route to an unregistered provider should be rejected at config time"
        );
        assert_eq!(
            manager.routing().default.provider_id,
            before.default.provider_id,
            "rejected config must not be partially applied"
        );
    }

    #[test]
    fn valid_routing_round_trips() {
        let manager = AIManager::new();
        let mut config = RoutingConfig::default();
        config.default = target("ollama", "llama3");
        config
            .overrides
            .insert(ModelCapability::Architecture, target("anthropic", "claude-opus-5"));

        manager.set_routing(config).expect("valid routing rejected");

        assert_eq!(manager.resolve(ModelCapability::Coding).provider_id, "ollama");
        assert_eq!(
            manager.resolve(ModelCapability::Architecture).model_id,
            "claude-opus-5"
        );
    }

    #[test]
    fn endpoint_override_is_applied_and_clearable() {
        let manager = AIManager::new();
        let provider = manager.provider("ollama").unwrap();

        assert!(manager.config_for(provider).base_url.is_none());

        manager.set_endpoint("ollama", Some("http://localhost:9999".into()));
        assert_eq!(
            manager.config_for(provider).base_url.as_deref(),
            Some("http://localhost:9999")
        );

        manager.set_endpoint("ollama", None);
        assert!(manager.config_for(provider).base_url.is_none());
    }
}
