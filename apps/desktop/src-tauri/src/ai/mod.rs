pub mod providers;
pub mod manager;
pub mod orchestration;
pub mod redaction;
pub mod aos;

use manager::AIManager;
use providers::AIMessage;
use redaction::RedactionEngine;
use aos::AgentOS;
use aos::persona::OperatingManual;
use tauri::State;

#[tauri::command]
pub async fn set_ai_credential(
    manager: State<'_, AIManager>,
    provider_id: String,
    key: String
) -> Result<(), String> {
    manager.set_key(&provider_id, &key)
}

#[tauri::command]
pub async fn generate_ai_completion(
    manager: State<'_, AIManager>,
    provider_id: String,
    model_id: String,
    messages: Vec<AIMessage>
) -> Result<String, String> {
    // Redact all outgoing user messages
    let redacted_messages: Vec<AIMessage> = messages.into_iter().map(|mut m| {
        if m.role == "user" {
            m.content = RedactionEngine::redact(&m.content);
        }
        m
    }).collect();

    let res = manager.complete(&provider_id, &model_id, redacted_messages).await?;
    Ok(res.content)
}

#[tauri::command]
pub async fn run_aos_completion(
    aos: State<'_, AgentOS>,
    manager: State<'_, AIManager>,
    role_id: String,
    goal: String,
    mut context: serde_json::Value
) -> Result<String, String> {
    // 1. Inject GitHub context
    if let Ok(git_summary) = crate::git::get_git_state_summary() {
        context["git_context"] = git_summary;
    }

    let compiled_prompt = aos.compile_prompt(&role_id, &goal, &context)?;

    // Choose model
    let (provider_id, model_id) = aos::router::ModelRouter::route(aos::router::ModelCapability::Reasoning);

    let messages = vec![
        providers::AIMessage {
            role: "system".to_string(),
            content: compiled_prompt,
        },
        providers::AIMessage {
            role: "user".to_string(),
            content: goal,
        }
    ];

    let res = manager.complete(provider_id, model_id, messages).await?;
    Ok(res.content)
}

#[tauri::command]
pub fn get_personas() -> Vec<orchestration::roles::AgentRole> {
    orchestration::roles::AgentRegistry::new().roles
}

#[tauri::command]
pub fn get_operating_manuals(aos: State<'_, AgentOS>) -> Vec<OperatingManual> {
    let registry = aos.persona_registry.lock().unwrap();
    registry.manuals.values().cloned().collect()
}

#[tauri::command]
pub fn reload_personas(aos: State<'_, AgentOS>) -> Result<(), String> {
    let mut registry = aos.persona_registry.lock().unwrap();
    registry.reload()
}

#[tauri::command]
pub fn plan_aos_workflow(aos: State<'_, AgentOS>, goal: String) -> aos::workflow::TaskGraph {
    let mut engine = aos.workflow_engine.lock().unwrap();
    engine.plan_workflow(&goal)
}
