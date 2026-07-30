pub mod providers;
pub mod manager;
pub mod orchestration;

use manager::AIManager;
use providers::AIMessage;
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
    let res = manager.complete(&provider_id, &model_id, messages).await?;
    Ok(res.content)
}

#[tauri::command]
pub fn get_personas() -> Vec<orchestration::roles::Persona> {
    orchestration::roles::AgentRegistry::new().personas
}

#[tauri::command]
pub fn plan_goal_execution(goal: String) -> orchestration::tasks::TaskGraph {
    orchestration::tasks::TaskGraph {
        id: "mock-id".to_string(),
        goal,
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
