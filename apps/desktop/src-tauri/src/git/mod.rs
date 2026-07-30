use serde::{Deserialize, Serialize};
use keyring::Entry;
use tauri::State;
use reqwest::header::{HeaderMap, HeaderValue, USER_AGENT, AUTHORIZATION};

#[derive(Debug, Serialize, Deserialize)]
pub struct GitHubRepo {
    pub id: u64,
    pub name: String,
    #[serde(rename = "full_name")]
    pub full_name: String,
    pub description: Option<String>,
    #[serde(rename = "html_url")]
    pub url: String,
    #[serde(rename = "private")]
    pub is_private: bool,
    pub language: Option<String>,
    #[serde(rename = "stargazers_count")]
    pub stars: u32,
    #[serde(rename = "updated_at")]
    pub updated_at: String,
}

pub struct CredentialManager;

impl CredentialManager {
    pub fn set_github_token(token: &str) -> Result<(), String> {
        let entry = Entry::new("blueprint-vcs", "github").map_err(|e| e.to_string())?;
        entry.set_password(token).map_err(|e| e.to_string())
    }

    pub fn get_github_token() -> Result<String, String> {
        let entry = Entry::new("blueprint-vcs", "github").map_err(|e| e.to_string())?;
        entry.get_password().map_err(|e| e.to_string())
    }
}

pub fn get_git_state_summary() -> Result<serde_json::Value, String> {
    // Basic summary for AOS context injection
    Ok(serde_json::json!({
        "branch": "develop",
        "status": "clean",
        "recent_commits": []
    }))
}

#[tauri::command]
pub async fn set_github_credential(token: String) -> Result<(), String> {
    CredentialManager::set_github_token(&token)
}

#[tauri::command]
pub async fn list_github_repositories() -> Result<Vec<GitHubRepo>, String> {
    let token = CredentialManager::get_github_token()?;
    let client = reqwest::Client::new();

    let mut headers = HeaderMap::new();
    headers.insert(USER_AGENT, HeaderValue::from_static("Blueprint-App"));
    headers.insert(AUTHORIZATION, HeaderValue::from_str(&format!("Bearer {}", token)).map_err(|e| e.to_string())?);

    let res = client.get("https://api.github.com/user/repos?sort=updated&per_page=50")
        .headers(headers)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let repos: Vec<GitHubRepo> = res.json().await.map_err(|e| e.to_string())?;
    Ok(repos)
}

#[tauri::command]
pub fn get_git_status() -> Result<String, String> {
    Ok("Clean workspace (Mock)".to_string())
}

#[tauri::command]
pub fn create_git_branch(name: String) -> Result<(), String> {
    println!("Creating branch: {}", name);
    Ok(())
}

#[tauri::command]
pub fn suggest_git_commit_message(diff: String) -> Result<String, String> {
    // This will eventually call the AI Orchestrator
    Ok(format!("feat(core): update system components based on recent changes\n\nDetected diff size: {} chars", diff.len()))
}

#[tauri::command]
pub async fn generate_github_release_notes(tag: String) -> Result<String, String> {
    Ok(format!("## Release {}\n- Automated changelog coming soon.", tag))
}
