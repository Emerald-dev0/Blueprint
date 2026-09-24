//! Git and GitHub integration.
//!
//! Every command in this module used to return fabricated data: the branch was
//! always "develop", the workspace was always "clean", creating a branch only
//! printed to stdout, and commit-message / release-note suggestions were string
//! templates that ignored their input. The `git2` crate was even declared as a
//! dependency and never imported. All of that is now implemented for real
//! against the project the user has opened, so the UI shows the actual state of
//! their repository on every platform.

use keyring::Entry;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, USER_AGENT};
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::audit::AuditLog;
use crate::project::ProjectContext;

#[derive(Debug, Serialize, Deserialize, Clone)]
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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileStatus {
    pub path: String,
    pub state: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CommitSummary {
    pub id: String,
    pub summary: String,
    pub author: String,
    pub time: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GitStatusReport {
    pub repository_root: String,
    pub branch: String,
    pub is_clean: bool,
    pub ahead: usize,
    pub behind: usize,
    pub files: Vec<FileStatus>,
    pub recent_commits: Vec<CommitSummary>,
}

pub struct CredentialManager;

impl CredentialManager {
    pub fn set_github_token(token: &str) -> Result<(), String> {
        let entry = Entry::new("blueprint-vcs", "github")
            .map_err(|e| format!("could not reach the system credential store: {e}"))?;
        entry
            .set_password(token)
            .map_err(|e| format!("the system credential store rejected the write: {e}"))
    }

    pub fn get_github_token() -> Result<String, String> {
        let entry = Entry::new("blueprint-vcs", "github")
            .map_err(|e| format!("could not reach the system credential store: {e}"))?;
        entry
            .get_password()
            .map_err(|_| "No GitHub token is stored. Add one in Settings → GitHub.".to_string())
    }
}

fn open_repo(project: &ProjectContext) -> Result<git2::Repository, String> {
    let path = project.current()?;
    git2::Repository::discover(&path)
        .map_err(|e| format!("'{}' is not inside a git repository: {e}", path.display()))
}

fn describe(state: git2::Status) -> &'static str {
    use git2::Status as S;
    if state.contains(S::CONFLICTED) {
        "conflicted"
    } else if state.contains(S::INDEX_NEW) {
        "staged-new"
    } else if state.contains(S::INDEX_DELETED) {
        "staged-deleted"
    } else if state.contains(S::INDEX_MODIFIED) {
        "staged-modified"
    } else if state.contains(S::INDEX_RENAMED) || state.contains(S::WT_RENAMED) {
        "renamed"
    } else if state.contains(S::WT_NEW) {
        "untracked"
    } else if state.contains(S::WT_DELETED) {
        "deleted"
    } else if state.contains(S::WT_MODIFIED) || state.contains(S::WT_TYPECHANGE) {
        "modified"
    } else {
        "unknown"
    }
}

fn recent_commits(repo: &git2::Repository, limit: usize) -> Vec<CommitSummary> {
    let mut out = Vec::new();
    let walk = match repo.revwalk() {
        Ok(mut w) => {
            if w.push_head().is_err() {
                return out;
            }
            w
        }
        Err(_) => return out,
    };

    for oid in walk.take(limit).flatten() {
        if let Ok(commit) = repo.find_commit(oid) {
            let full = oid.to_string();
            out.push(CommitSummary {
                id: full.chars().take(7).collect(),
                summary: commit.summary().unwrap_or_default().to_string(),
                author: commit.author().name().unwrap_or("unknown").to_string(),
                time: commit.time().seconds(),
            });
        }
    }
    out
}

/// Branch name plus ahead/behind against the configured upstream, if any.
fn branch_state(repo: &git2::Repository) -> (String, usize, usize) {
    let head = match repo.head() {
        Ok(h) => h,
        Err(_) => return ("(no commits yet)".to_string(), 0, 0),
    };

    let name = head
        .shorthand()
        .map(|s| s.to_string())
        .unwrap_or_else(|| "(detached)".to_string());

    let (mut ahead, mut behind) = (0usize, 0usize);
    if head.is_branch() {
        if let Ok(branch) = repo.find_branch(&name, git2::BranchType::Local) {
            let local = branch.get().target();
            let upstream = branch.upstream().ok().and_then(|u| u.get().target());
            if let (Some(l), Some(u)) = (local, upstream) {
                if let Ok((a, b)) = repo.graph_ahead_behind(l, u) {
                    ahead = a;
                    behind = b;
                }
            }
        }
    }

    (name, ahead, behind)
}

/// Real VCS state for Agent OS prompt context.
///
/// Replaces the previous hard-coded `{"branch":"develop","status":"clean"}`.
pub fn get_git_state_summary(project: &ProjectContext) -> Result<serde_json::Value, String> {
    let repo = open_repo(project)?;
    let (branch, ahead, behind) = branch_state(&repo);

    let mut opts = git2::StatusOptions::new();
    opts.include_untracked(true).recurse_untracked_dirs(true);
    let dirty = repo
        .statuses(Some(&mut opts))
        .map(|s| s.iter().filter(|e| !e.status().is_ignored()).count())
        .unwrap_or(0);

    Ok(serde_json::json!({
        "branch": branch,
        "ahead": ahead,
        "behind": behind,
        "dirty_files": dirty,
        "status": if dirty == 0 { "clean" } else { "dirty" },
        "recent_commits": recent_commits(&repo, 5),
    }))
}

#[tauri::command]
pub fn get_git_status(project: State<'_, ProjectContext>) -> Result<GitStatusReport, String> {
    let repo = open_repo(&project)?;
    let root = repo
        .workdir()
        .map(|p| p.to_string_lossy().into_owned())
        .unwrap_or_default();

    let (branch, ahead, behind) = branch_state(&repo);

    let mut opts = git2::StatusOptions::new();
    opts.include_untracked(true).recurse_untracked_dirs(true);

    let mut files = Vec::new();
    if let Ok(statuses) = repo.statuses(Some(&mut opts)) {
        for entry in statuses.iter() {
            let state = entry.status();
            if state.is_ignored() {
                continue;
            }
            if let Some(path) = entry.path() {
                files.push(FileStatus {
                    path: path.to_string(),
                    state: describe(state).to_string(),
                });
            }
        }
    }

    let is_clean = files.is_empty();

    Ok(GitStatusReport {
        repository_root: root,
        branch,
        is_clean,
        ahead,
        behind,
        files,
        recent_commits: recent_commits(&repo, 8),
    })
}

#[tauri::command]
pub fn create_git_branch(
    project: State<'_, ProjectContext>,
    audit: State<'_, AuditLog>,
    name: String,
) -> Result<(), String> {
    // Validate before touching libgit2: refuse control characters, spaces and
    // ref-hostile sequences so a bad name cannot create a confusing ref.
    let trimmed = name.trim();
    if trimmed.is_empty()
        || trimmed.starts_with('-')
        || trimmed.ends_with('.')
        || trimmed.contains("..")
        || trimmed.contains("@{")
        || trimmed.chars().any(|c| c.is_control() || c.is_whitespace())
    {
        return Err(format!("'{name}' is not a valid branch name."));
    }

    let repo = open_repo(&project)?;
    let head = repo
        .head()
        .map_err(|e| format!("cannot read HEAD (empty repository?): {e}"))?;
    let commit = head
        .peel_to_commit()
        .map_err(|e| format!("cannot resolve HEAD to a commit: {e}"))?;

    repo.branch(trimmed, &commit, false)
        .map_err(|e| format!("could not create branch '{trimmed}': {e}"))?;

    audit.record(
        "git.branch.created",
        serde_json::json!({ "branch": trimmed }),
    );
    Ok(())
}

#[tauri::command]
pub fn suggest_git_commit_message(
    project: State<'_, ProjectContext>,
    diff: String,
) -> Result<String, String> {
    // Deterministic, evidence-based suggestion derived from the *actual*
    // working tree. (AI-authored messages will arrive with the orchestrator;
    // until then we never pretend otherwise.)
    let repo = open_repo(&project)?;

    let mut opts = git2::StatusOptions::new();
    opts.include_untracked(true).recurse_untracked_dirs(true);

    let (mut added, mut modified, mut deleted, mut renamed) = (0usize, 0, 0, 0);
    if let Ok(statuses) = repo.statuses(Some(&mut opts)) {
        for entry in statuses.iter() {
            let s = entry.status();
            if s.is_ignored() {
                continue;
            }
            match describe(s) {
                "staged-new" | "untracked" => added += 1,
                "staged-modified" | "modified" => modified += 1,
                "staged-deleted" | "deleted" => deleted += 1,
                "renamed" => renamed += 1,
                _ => {}
            }
        }
    }

    let scope = if added + modified + deleted + renamed == 0 {
        "chore".to_string()
    } else if deleted > added.max(modified) {
        "refactor".to_string()
    } else if modified >= added {
        "feat".to_string()
    } else {
        "chore".to_string()
    };

    let mut parts = Vec::new();
    if added > 0 {
        parts.push(format!("{added} added"));
    }
    if modified > 0 {
        parts.push(format!("{modified} modified"));
    }
    if deleted > 0 {
        parts.push(format!("{deleted} deleted"));
    }
    if renamed > 0 {
        parts.push(format!("{renamed} renamed"));
    }

    let summary = if parts.is_empty() {
        "no tracked changes detected".to_string()
    } else {
        parts.join(", ")
    };

    Ok(format!(
        "{scope}: update working tree ({summary})\n\nReview size: {} characters of diff supplied.",
        diff.chars().count()
    ))
}

#[tauri::command]
pub fn generate_github_release_notes(
    project: State<'_, ProjectContext>,
    tag: String,
) -> Result<String, String> {
    let repo = open_repo(&project)?;

    // Start from the tag when it exists, otherwise from HEAD.
    let start = repo
        .resolve_reference_from_short_name(&tag)
        .ok()
        .and_then(|r| r.peel_to_commit().ok())
        .map(|c| c.id())
        .or_else(|| repo.head().ok().and_then(|h| h.target()));

    let Some(start) = start else {
        return Ok(format!("## Release {tag}\n\n_No commits available yet._"));
    };

    let mut groups: std::collections::BTreeMap<&'static str, Vec<String>> = Default::default();
    if let Ok(mut walk) = repo.revwalk() {
        if walk.push(start).is_ok() {
            for oid in walk.take(200).flatten() {
                if let Ok(commit) = repo.find_commit(oid) {
                    let summary = commit.summary().unwrap_or_default().to_string();
                    let group = match summary.split(':').next().unwrap_or("") {
                        "feat" => "Features",
                        "fix" => "Fixes",
                        "docs" => "Documentation",
                        "perf" => "Performance",
                        "refactor" => "Refactoring",
                        "test" => "Tests",
                        _ => "Other Changes",
                    };
                    groups
                        .entry(group)
                        .or_default()
                        .push(format!("- {summary}"));
                }
            }
        }
    }

    let mut notes = format!("## Release {tag}\n");
    if groups.is_empty() {
        notes.push_str("\n_No commits found for this release._");
    }
    for (group, lines) in groups {
        notes.push_str(&format!("\n### {group}\n"));
        notes.push_str(&lines.join("\n"));
        notes.push('\n');
    }

    Ok(notes)
}

#[tauri::command]
pub async fn set_github_credential(
    audit: State<'_, AuditLog>,
    token: String,
) -> Result<(), String> {
    if token.trim().is_empty() {
        return Err("Refusing to store an empty token.".to_string());
    }
    CredentialManager::set_github_token(&token)?;
    audit.record(
        "github.credential.stored",
        serde_json::json!({ "bytes": token.len() }),
    );
    Ok(())
}

#[tauri::command]
pub async fn list_github_repositories() -> Result<Vec<GitHubRepo>, String> {
    let token = CredentialManager::get_github_token()?;
    let client = reqwest::Client::new();

    let mut headers = HeaderMap::new();
    headers.insert(USER_AGENT, HeaderValue::from_static("Blueprint-App"));
    headers.insert(
        AUTHORIZATION,
        HeaderValue::from_str(&format!("Bearer {token}")).map_err(|e| e.to_string())?,
    );

    let response = client
        .get("https://api.github.com/user/repos?sort=updated&per_page=50")
        .headers(headers)
        .send()
        .await
        .map_err(|e| format!("request to GitHub failed: {e}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("GitHub returned HTTP {status}: {body}"));
    }

    let repos: Vec<GitHubRepo> = response
        .json()
        .await
        .map_err(|e| format!("could not parse GitHub response: {e}"))?;
    Ok(repos)
}
