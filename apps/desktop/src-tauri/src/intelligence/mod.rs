//! Project and web intelligence entry points.

pub mod scanners;
pub mod web;

use scanners::repo::{RepoScanner, TechStack};
use serde::{Deserialize, Serialize};
use tauri::State;
use web::{WebAnalysis, WebIntelligence};

use crate::audit::AuditLog;
use crate::project::ProjectContext;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectIntelligenceReport {
    pub stack: TechStack,
    pub path: String,
    pub files_scanned: usize,
}

/// Scan the currently open project (or an explicit override path).
///
/// The renderer previously had no way to reach this command — the only button
/// that could have triggered it had no handler — so the one piece of real
/// analysis logic in the codebase was dead. It is now driven by the directory
/// picker on the Intelligence page.
#[tauri::command]
pub async fn start_repo_analysis(
    project: State<'_, ProjectContext>,
    audit: State<'_, AuditLog>,
    path: Option<String>,
) -> Result<ProjectIntelligenceReport, String> {
    // Both arms must yield `String`: `RepoScanner::scan` takes `&str` and
    // `ProjectIntelligenceReport.path` is a `String`, while `ProjectContext`
    // hands back a `PathBuf`.
    let target = match path {
        Some(p) if !p.trim().is_empty() => p,
        _ => project.current()?.to_string_lossy().into_owned(),
    };

    // A full walk of a large repository is CPU- and IO-bound; running it inline
    // would stall the async runtime that is also serving the window, which is
    // exactly the "main thread never blocked during indexing" property the
    // performance gates promise.
    let scan_target = target.clone();
    let (stack, files_scanned) = tauri::async_runtime::spawn_blocking(move || {
        RepoScanner::scan(&scan_target)
    })
    .await
    .map_err(|e| format!("scan task failed: {e}"))??;

    audit.record(
        "intelligence.repo.scanned",
        serde_json::json!({ "path": target.clone(), "files_scanned": files_scanned }),
    );

    Ok(ProjectIntelligenceReport {
        stack,
        path: target,
        files_scanned,
    })
}

#[tauri::command]
pub async fn analyze_website(url: String) -> Result<WebAnalysis, String> {
    // Refuse anything that is not an http(s) URL before handing it to reqwest:
    // `file://`, `gopher://` and friends have no place in a web-analysis tool
    // and could otherwise be used to read local files through the WebView.
    let lowered = url.to_lowercase();
    if !(lowered.starts_with("http://") || lowered.starts_with("https://")) {
        return Err("Only http:// and https:// URLs can be analysed.".to_string());
    }

    WebIntelligence::analyze(&url).await
}
