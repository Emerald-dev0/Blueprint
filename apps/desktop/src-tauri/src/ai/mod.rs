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
use tauri::{State, Manager};

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
    context: serde_json::Value
) -> Result<String, String> {
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
pub fn get_personas() -> Vec<orchestration::roles::Persona> {
    orchestration::roles::AgentRegistry::new().personas
}

#[tauri::command]
pub fn get_operating_manuals(aos: State<'_, AgentOS>) -> Vec<OperatingManual> {
    aos.persona_registry.manuals.values().cloned().collect()
}

#[tauri::command]
pub fn plan_goal_execution(goal: String) -> orchestration::tasks::TaskGraph {
    let redacted_goal = RedactionEngine::redact(&goal);
    orchestration::tasks::TaskGraph {
        id: "mock-id".to_string(),
        goal: redacted_goal,
        tasks: vec![
            orchestration::tasks::Task {
                id: "1".to_string(),
                title: "Decompose Goal".to_string(),
                description: "Breaking down high-level requirement.".to_string(),
                role_id: orchestration::roles::AgentRoleId::Principal,
                status: orchestration::tasks::TaskStatus::Completed,
                dependencies: vec![],
                output: Some("Goal decomposed into 4 sub-tasks.".to_string()),
                error: None,
            },
        ],
        status: "executing".to_string(),
    }
}
