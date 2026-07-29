pub mod providers;
pub mod manager;

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
