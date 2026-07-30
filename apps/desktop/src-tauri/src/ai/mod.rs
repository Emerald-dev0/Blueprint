pub mod aos;
pub mod manager;
pub mod orchestration;
pub mod providers;
pub mod redaction;

use aos::persona::OperatingManual;
use aos::AgentOS;
use manager::{AIManager, ModelCapability, ProviderDescriptor, RoutingConfig};
use providers::{AIMessage, ModelInfo, StreamEvent};
use redaction::RedactionEngine;
use tauri::{Emitter, State, Window};

/// Everything leaving the machine goes through here.
///
/// Redaction used to be applied only in `generate_ai_completion`, which left
/// `run_aos_completion` — the primary path, the one that injects git state,
/// file contents, and memory — shipping unredacted project context to the
/// provider. Centralising it means a new command can't silently miss it.
fn redact_outbound(messages: Vec<AIMessage>) -> Vec<AIMessage> {
    messages
        .into_iter()
        .map(|mut m| {
            m.content = RedactionEngine::redact(&m.content);
            m
        })
        .collect()
}

// ---------------------------------------------------------------------------
// Provider configuration
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn set_ai_credential(
    manager: State<'_, AIManager>,
    provider_id: String,
    key: String,
) -> Result<(), String> {
    manager.set_key(&provider_id, &key).map_err(Into::into)
}

#[tauri::command]
pub async fn delete_ai_credential(
    manager: State<'_, AIManager>,
    provider_id: String,
) -> Result<(), String> {
    manager.delete_key(&provider_id).map_err(Into::into)
}

#[tauri::command]
pub async fn list_ai_providers(
    manager: State<'_, AIManager>,
) -> Result<Vec<ProviderDescriptor>, String> {
    Ok(manager.describe_providers())
}

/// Reachability / credential probe for the Settings screen, so a
/// misconfiguration surfaces there rather than mid-workflow.
#[tauri::command]
pub async fn check_ai_provider(
    manager: State<'_, AIManager>,
    provider_id: String,
) -> Result<(), String> {
    manager.health_check(&provider_id).await.map_err(Into::into)
}

#[tauri::command]
pub async fn list_provider_models(
    manager: State<'_, AIManager>,
    provider_id: String,
) -> Result<Vec<ModelInfo>, String> {
    manager
        .list_models(&provider_id)
        .await
        .map_err(Into::into)
}

/// Points a provider at a non-default base URL — a local daemon on another
/// port, or a self-hosted gateway. Pass `None` to clear the override.
#[tauri::command]
pub async fn set_provider_endpoint(
    manager: State<'_, AIManager>,
    provider_id: String,
    endpoint: Option<String>,
) -> Result<(), String> {
    manager.set_endpoint(&provider_id, endpoint);
    Ok(())
}

#[tauri::command]
pub async fn get_ai_routing(manager: State<'_, AIManager>) -> Result<RoutingConfig, String> {
    Ok(manager.routing())
}

#[tauri::command]
pub async fn set_ai_routing(
    manager: State<'_, AIManager>,
    config: RoutingConfig,
) -> Result<(), String> {
    manager.set_routing(config).map_err(Into::into)
}

// ---------------------------------------------------------------------------
// Inference
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn generate_ai_completion(
    manager: State<'_, AIManager>,
    provider_id: String,
    model_id: String,
    messages: Vec<AIMessage>,
) -> Result<String, String> {
    let res = manager
        .complete(&provider_id, &model_id, redact_outbound(messages), None)
        .await?;
    Ok(res.content)
}

/// Streams a completion to the frontend as Tauri events.
///
/// Every chunk is emitted on `ai-stream://{stream_id}`, so the caller can
/// render tokens as they arrive and correlate concurrent turns. The previous
/// layer returned a single `String` after the whole turn completed, which meant
/// a multi-minute engineering task showed nothing until it finished.
#[tauri::command]
pub async fn stream_ai_completion(
    window: Window,
    manager: State<'_, AIManager>,
    stream_id: String,
    provider_id: String,
    model_id: String,
    messages: Vec<AIMessage>,
    system: Option<String>,
) -> Result<(), String> {
    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<StreamEvent>();
    let channel = format!("ai-stream://{}", stream_id);

    // Forward events to the webview as they arrive, rather than after the turn.
    let forwarder = tokio::spawn(async move {
        while let Some(event) = rx.recv().await {
            let terminal = matches!(
                event,
                StreamEvent::Done { .. } | StreamEvent::Failed { .. }
            );
            if window.emit(&channel, &event).is_err() {
                // The window is gone — stop pumping.
                break;
            }
            if terminal {
                break;
            }
        }
    });

    let system = system.map(|s| RedactionEngine::redact(&s));
    let result = manager
        .stream(
            &provider_id,
            &model_id,
            redact_outbound(messages),
            system,
            tx,
        )
        .await;

    let _ = forwarder.await;
    result.map_err(Into::into)
}

#[tauri::command]
pub async fn run_aos_completion(
    aos: State<'_, AgentOS>,
    manager: State<'_, AIManager>,
    role_id: String,
    goal: String,
    capability: Option<ModelCapability>,
    mut context: serde_json::Value,
) -> Result<String, String> {
    // 1. Inject real repository state.
    if let Ok(git_summary) = crate::git::get_git_state_summary() {
        context["git_context"] = git_summary;
    }

    // 2. Compile the persona's operating manual into a system prompt.
    let compiled_prompt = aos.compile_prompt(&role_id, &goal, &context)?;

    // 3. Route through the user's configuration. This previously requested
    //    `Reasoning`, which a hardcoded match pinned to Anthropic — whose
    //    provider was a stub returning "Anthropic response placeholder". The
    //    primary AOS path could therefore never produce a real completion.
    let capability = capability.unwrap_or(ModelCapability::Reasoning);

    let res = manager
        .complete_for(
            capability,
            redact_outbound(vec![AIMessage {
                role: "user".to_string(),
                content: goal,
            }]),
            // The compiled prompt embeds git state, file contents, and memory,
            // so it is redacted like any other outbound content.
            Some(RedactionEngine::redact(&compiled_prompt)),
        )
        .await?;

    Ok(res.content)
}

// ---------------------------------------------------------------------------
// Personas
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn get_personas() -> Vec<orchestration::roles::AgentRole> {
    orchestration::roles::AgentRegistry::new().roles
}

#[tauri::command]
pub fn get_operating_manuals(aos: State<'_, AgentOS>) -> Vec<OperatingManual> {
    let registry = aos
        .persona_registry
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    registry.manuals.values().cloned().collect()
}

#[tauri::command]
pub fn reload_personas(aos: State<'_, AgentOS>) -> Result<(), String> {
    let mut registry = aos
        .persona_registry
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    registry.reload()
}

#[tauri::command]
pub fn plan_aos_workflow(aos: State<'_, AgentOS>, goal: String) -> aos::workflow::TaskGraph {
    let mut engine = aos
        .workflow_engine
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    engine.plan_workflow(&goal)
}
