pub mod scanners;
pub mod web;

use scanners::repo::{RepoScanner, TechStack};
use web::{WebIntelligence, WebAnalysis};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectIntelligenceReport {
    pub stack: TechStack,
    pub path: String,
}

#[tauri::command]
pub async fn start_repo_analysis(path: String) -> Result<ProjectIntelligenceReport, String> {
    let stack = RepoScanner::scan(&path)?;
    Ok(ProjectIntelligenceReport {
        stack,
        path,
    })
}

#[tauri::command]
pub async fn analyze_website(url: String) -> Result<WebAnalysis, String> {
    WebIntelligence::analyze(&url).await
}
