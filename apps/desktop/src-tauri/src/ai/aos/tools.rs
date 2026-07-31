use serde::{Deserialize, Serialize};
use crate::git::CredentialManager;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ToolDefinition {
    pub name: String,
    pub description: String,
    pub parameters: serde_json::Value,
}

pub struct ToolRuntime;

impl ToolRuntime {
    pub async fn execute(name: &str, params: serde_json::Value) -> Result<serde_json::Value, String> {
        match name {
            "github_list_repos" => {
                let token = CredentialManager::get_github_token()?;
                let client = reqwest::Client::new();
                let res = client.get("https://api.github.com/user/repos")
                    .header("User-Agent", "Blueprint-App")
                    .header("Authorization", format!("Bearer {}", token))
                    .send()
                    .await
                    .map_err(|e| e.to_string())?;

                let repos: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
                Ok(repos)
            },
            "git_branch_create" => {
                let branch_name = params.get("name").and_then(|v| v.as_str()).ok_or("Missing branch name")?;
                // In a real implementation, we'd use git2-rs here
                Ok(serde_json::json!({"status": "success", "branch": branch_name}))
            },
            _ => Err(format!("Tool {} not implemented in AOS runtime", name))
        }
    }
}
