use serde::{Deserialize, Serialize};
use keyring::Entry;
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

/// Opens the repository at `path`, walking upward to find the `.git` dir.
fn open_repo(path: &str) -> Result<git2::Repository, String> {
    git2::Repository::discover(path)
        .map_err(|e| format!("No git repository at '{}': {}", path, e.message()))
}

fn current_branch(repo: &git2::Repository) -> Result<String, String> {
    let head = match repo.head() {
        Ok(h) => h,
        // A repo with no commits yet has an unborn HEAD; that is a valid state,
        // not an error.
        Err(ref e) if e.code() == git2::ErrorCode::UnbornBranch => {
            return Ok("(no commits yet)".to_string())
        }
        Err(e) => return Err(e.message().to_string()),
    };
    Ok(head
        .shorthand()
        .unwrap_or("(detached HEAD)")
        .to_string())
}

/// Real working-tree summary for AOS context injection.
///
/// This previously returned a hardcoded `{"branch": "develop", "status":
/// "clean"}` regardless of the actual repository, so every persona reasoned
/// about a fictional git state.
pub fn get_git_state_summary_at(path: &str) -> Result<serde_json::Value, String> {
    let repo = open_repo(path)?;
    let branch = current_branch(&repo)?;

    let mut opts = git2::StatusOptions::new();
    opts.include_untracked(true).recurse_untracked_dirs(false);
    let statuses = repo
        .statuses(Some(&mut opts))
        .map_err(|e| e.message().to_string())?;

    let mut modified = Vec::new();
    let mut untracked = Vec::new();
    let mut staged = Vec::new();
    for entry in statuses.iter() {
        let Some(name) = entry.path() else { continue };
        let s = entry.status();
        if s.is_index_new() || s.is_index_modified() || s.is_index_deleted() {
            staged.push(name.to_string());
        }
        if s.is_wt_modified() || s.is_wt_deleted() {
            modified.push(name.to_string());
        }
        if s.is_wt_new() {
            untracked.push(name.to_string());
        }
    }

    let mut recent = Vec::new();
    if let Ok(mut walk) = repo.revwalk() {
        if walk.push_head().is_ok() {
            for oid in walk.take(10).flatten() {
                if let Ok(commit) = repo.find_commit(oid) {
                    recent.push(serde_json::json!({
                        "sha": oid.to_string()[..7].to_string(),
                        "summary": commit.summary().unwrap_or("").to_string(),
                    }));
                }
            }
        }
    }

    Ok(serde_json::json!({
        "branch": branch,
        "clean": modified.is_empty() && untracked.is_empty() && staged.is_empty(),
        "staged": staged,
        "modified": modified,
        "untracked": untracked,
        "recent_commits": recent,
    }))
}

pub fn get_git_state_summary() -> Result<serde_json::Value, String> {
    get_git_state_summary_at(".")
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
pub fn get_git_status(path: Option<String>) -> Result<serde_json::Value, String> {
    get_git_state_summary_at(path.as_deref().unwrap_or("."))
}

#[tauri::command]
pub fn create_git_branch(path: Option<String>, name: String) -> Result<(), String> {
    let repo = open_repo(path.as_deref().unwrap_or("."))?;
    let head = repo.head().map_err(|e| e.message().to_string())?;
    let commit = head.peel_to_commit().map_err(|e| e.message().to_string())?;
    repo.branch(&name, &commit, false)
        .map_err(|e| format!("Could not create branch '{}': {}", name, e.message()))?;
    Ok(())
}

#[tauri::command]
pub fn create_git_commit(
    path: Option<String>,
    message: String,
    paths: Option<Vec<String>>,
) -> Result<String, String> {
    let repo = open_repo(path.as_deref().unwrap_or("."))?;
    let mut index = repo.index().map_err(|e| e.message().to_string())?;

    match paths {
        Some(list) if !list.is_empty() => {
            for p in list {
                index
                    .add_path(std::path::Path::new(&p))
                    .map_err(|e| format!("Could not stage '{}': {}", p, e.message()))?;
            }
        }
        _ => {
            index
                .add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)
                .map_err(|e| e.message().to_string())?;
        }
    }
    index.write().map_err(|e| e.message().to_string())?;

    let tree_id = index.write_tree().map_err(|e| e.message().to_string())?;
    let tree = repo.find_tree(tree_id).map_err(|e| e.message().to_string())?;
    // Uses the repository's configured identity — Blueprint does not invent an
    // author.
    let sig = repo
        .signature()
        .map_err(|e| format!("No git identity configured: {}", e.message()))?;

    let parents = match repo.head().and_then(|h| h.peel_to_commit()) {
        Ok(parent) => vec![parent],
        Err(_) => vec![], // first commit in the repository
    };
    let parent_refs: Vec<&git2::Commit> = parents.iter().collect();

    let oid = repo
        .commit(Some("HEAD"), &sig, &sig, &message, &tree, &parent_refs)
        .map_err(|e| e.message().to_string())?;

    Ok(oid.to_string())
}

/// Pushes the current branch.
///
/// Deliberately shells out to `git` rather than using `git2`'s push: git2 needs
/// explicit credential callbacks and would not pick up the user's existing
/// credential helper, SSH agent, or 2FA setup. Shelling out means push works
/// wherever the user's own `git push` already works.
#[tauri::command]
pub fn push_git_changes(
    path: Option<String>,
    remote: Option<String>,
    branch: Option<String>,
) -> Result<String, String> {
    let dir = path.unwrap_or_else(|| ".".to_string());
    let repo = open_repo(&dir)?;
    let branch = match branch {
        Some(b) => b,
        None => current_branch(&repo)?,
    };
    let remote = remote.unwrap_or_else(|| "origin".to_string());

    let out = std::process::Command::new("git")
        .current_dir(&dir)
        .args(["push", "--set-upstream", &remote, &branch])
        .output()
        .map_err(|e| format!("Could not run git: {}", e))?;

    if out.status.success() {
        Ok(String::from_utf8_lossy(&out.stderr).trim().to_string())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).trim().to_string())
    }
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

// ---------------------------------------------------------------------------
// GitHub REST
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize, Deserialize)]
pub struct GitHubIssue {
    pub number: u64,
    pub title: String,
    pub state: String,
    pub body: Option<String>,
    #[serde(rename = "html_url")]
    pub url: String,
    #[serde(rename = "created_at")]
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitHubPullRequest {
    pub number: u64,
    pub title: String,
    pub state: String,
    #[serde(rename = "html_url")]
    pub url: String,
}

/// Builds an authenticated GitHub client with a timeout.
fn github_client() -> Result<(reqwest::Client, HeaderMap), String> {
    let token = CredentialManager::get_github_token()
        .map_err(|_| "No GitHub token configured. Add one in Settings.".to_string())?;

    let mut headers = HeaderMap::new();
    headers.insert(USER_AGENT, HeaderValue::from_static("Blueprint-App"));
    headers.insert(
        AUTHORIZATION,
        HeaderValue::from_str(&format!("Bearer {}", token))
            .map_err(|_| "Stored GitHub token is not a valid header value.".to_string())?,
    );
    headers.insert(
        reqwest::header::ACCEPT,
        HeaderValue::from_static("application/vnd.github+json"),
    );

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;

    Ok((client, headers))
}

/// Converts a non-2xx GitHub response into a message safe to show the user.
/// The body is not echoed — it can contain request content.
fn github_status_error(status: reqwest::StatusCode) -> String {
    match status.as_u16() {
        401 => "GitHub rejected the token. Re-authenticate in Settings.".to_string(),
        403 => "GitHub denied the request (rate limited, or the token lacks scope).".to_string(),
        404 => "Repository not found, or the token cannot see it.".to_string(),
        s => format!("GitHub request failed with status {}", s),
    }
}

#[tauri::command]
pub async fn list_github_issues(
    owner: String,
    repo: String,
    state: Option<String>,
) -> Result<Vec<GitHubIssue>, String> {
    let (client, headers) = github_client()?;
    let state = state.unwrap_or_else(|| "open".to_string());

    let res = client
        .get(format!(
            "https://api.github.com/repos/{}/{}/issues?state={}&per_page=50",
            owner, repo, state
        ))
        .headers(headers)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Err(github_status_error(res.status()));
    }

    // The issues endpoint also returns pull requests; drop them so the UI's
    // issue count is actually an issue count.
    let raw: Vec<serde_json::Value> = res.json().await.map_err(|e| e.to_string())?;
    let issues = raw
        .into_iter()
        .filter(|v| v.get("pull_request").is_none())
        .filter_map(|v| serde_json::from_value(v).ok())
        .collect();

    Ok(issues)
}

#[tauri::command]
pub async fn create_github_pull_request(
    owner: String,
    repo: String,
    title: String,
    head: String,
    base: String,
    body: Option<String>,
) -> Result<GitHubPullRequest, String> {
    let (client, headers) = github_client()?;

    let res = client
        .post(format!(
            "https://api.github.com/repos/{}/{}/pulls",
            owner, repo
        ))
        .headers(headers)
        .json(&serde_json::json!({
            "title": title,
            "head": head,
            "base": base,
            "body": body.unwrap_or_default(),
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = res.status();
    if !status.is_success() {
        // 422 is the common, actionable case: no diff, or the PR already exists.
        if status.as_u16() == 422 {
            return Err(
                "GitHub rejected the pull request: the branch may have no changes against the base, or a PR already exists."
                    .to_string(),
            );
        }
        return Err(github_status_error(status));
    }

    res.json().await.map_err(|e| e.to_string())
}
