pub mod aos;
pub mod manager;
pub mod providers;
pub mod redaction;

use aos::persona::OperatingManual;
use aos::AgentOS;
use manager::AIManager;
use providers::AIMessage;
use redaction::RedactionEngine;
use serde::Serialize;
use tauri::State;

use crate::audit::AuditLog;
use crate::project::ProjectContext;

/// What a completion call returns to the renderer.
///
/// `secrets_redacted` is a measurement, not decoration: the UI's security
/// counters and the audit log are driven by it, replacing figures that used to
/// be hard-coded constants in the JSX.
#[derive(Debug, Serialize, Clone)]
pub struct CompletionResult {
    pub content: String,
    pub model_id: String,
    pub provider_id: String,
    pub secrets_redacted: usize,
}

#[tauri::command]
pub async fn set_ai_credential(
    manager: State<'_, AIManager>,
    audit: State<'_, AuditLog>,
    provider_id: String,
    key: String,
) -> Result<(), String> {
    if key.trim().is_empty() {
        return Err("Refusing to store an empty API key.".to_string());
    }
    manager.set_key(&provider_id, &key)?;
    // Log *that* a credential changed and for which provider — never the key.
    audit.record(
        "ai.credential.stored",
        serde_json::json!({ "provider": provider_id, "bytes": key.len() }),
    );
    Ok(())
}

#[tauri::command]
pub async fn generate_ai_completion(
    manager: State<'_, AIManager>,
    audit: State<'_, AuditLog>,
    provider_id: String,
    model_id: String,
    messages: Vec<AIMessage>,
) -> Result<CompletionResult, String> {
    // Redact every message of every role before anything leaves the machine.
    let (redacted_messages, secrets_redacted) = RedactionEngine::redact_messages(&messages);

    let res = manager
        .complete(&provider_id, &model_id, redacted_messages)
        .await?;

    audit.record(
        "ai.completion",
        serde_json::json!({
            "provider": provider_id.clone(),
            "model": model_id.clone(),
            "messages": messages.len(),
            "secrets_redacted": secrets_redacted,
        }),
    );

    Ok(CompletionResult {
        content: res.content,
        model_id: res.model_id,
        provider_id,
        secrets_redacted,
    })
}

#[tauri::command]
pub async fn run_aos_completion(
    aos: State<'_, AgentOS>,
    manager: State<'_, AIManager>,
    audit: State<'_, AuditLog>,
    project: State<'_, ProjectContext>,
    role_id: String,
    goal: String,
    mut context: serde_json::Value,
) -> Result<CompletionResult, String> {
    // Inject real git state (branch / status / recent commits) for context.
    // `get_git_state_summary` needs the open project: without it the compiled
    // prompt has no idea which repository it is talking about.
    if let Ok(git_summary) = crate::git::get_git_state_summary(&project) {
        context["git_context"] = git_summary;
    }
    if let Ok(root) = project.current() {
        context["project_path"] = serde_json::Value::String(root.to_string_lossy().into_owned());
    }

    let compiled_prompt = aos.compile_prompt(&role_id, &goal, &context)?;

    // The router states a preference ("reasoning goes to Claude"); the
    // credentials the user actually stored decide what is usable. A
    // substitution is logged and returned so the switch is never silent —
    // otherwise a user who configured only Gemini hit "No API key is stored
    // for 'anthropic'" and the persona feature looked broken.
    let (preferred_provider, preferred_model) =
        aos::router::ModelRouter::route(aos::router::ModelCapability::Reasoning);
    let (provider_id, model_id, route_substituted) =
        manager.resolve_route(preferred_provider, preferred_model)?;

    let messages = vec![
        AIMessage {
            role: "system".to_string(),
            content: compiled_prompt,
        },
        AIMessage {
            role: "user".to_string(),
            content: goal.clone(),
        },
    ];

    // The original applied redaction to neither the compiled system prompt nor
    // the goal on this path; the compiled prompt embeds repository and git
    // context, which is exactly where a stray secret would surface.
    let (redacted_messages, secrets_redacted) = RedactionEngine::redact_messages(&messages);

    let res = manager
        .complete(&provider_id, &model_id, redacted_messages)
        .await?;

    // `json!` takes ownership of the Strings it interpolates, and every value
    // here is used again in the return below, so each one is cloned.
    audit.record(
        "ai.aos.completion",
        serde_json::json!({
            "role": role_id,
            "provider": provider_id.clone(),
            "model": model_id.clone(),
            "routed_provider": preferred_provider,
            "route_substituted": route_substituted,
            "secrets_redacted": secrets_redacted,
        }),
    );

    Ok(CompletionResult {
        content: res.content,
        model_id: res.model_id.to_string(),
        provider_id: provider_id.to_string(),
        secrets_redacted,
    })
}

#[tauri::command]
pub fn get_operating_manuals(aos: State<'_, AgentOS>) -> Vec<OperatingManual> {
    // Poisoning means an earlier panic already broke the registry, and this
    // command returns a plain Vec, so there is no Result to report it through.
    let registry = aos.persona_registry.lock().unwrap();
    let mut manuals: Vec<OperatingManual> = registry.manuals.values().cloned().collect();
    // HashMap iteration order is random; the registry UI must be stable.
    manuals.sort_by(|a, b| a.name.cmp(&b.name));
    manuals
}

#[tauri::command]
pub fn reload_personas(aos: State<'_, AgentOS>) -> Result<(), String> {
    let mut registry = aos.persona_registry.lock().map_err(|e| e.to_string())?;
    registry.reload()
}

#[tauri::command]
pub fn plan_aos_workflow(aos: State<'_, AgentOS>, goal: String) -> aos::workflow::TaskGraph {
    // Same trade-off as `get_operating_manuals`: no Result to carry a poisoned
    // lock, and a poisoned engine means an earlier panic.
    let mut engine = aos.workflow_engine.lock().unwrap();
    engine.plan_workflow(&goal)
}
