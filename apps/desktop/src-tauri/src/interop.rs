//! Agent interoperability: export what Blueprint knows into the files that
//! other coding agents read.
//!
//! Blueprint is not the only agent a developer runs. OpenCode, Codex CLI,
//! Gemini CLI, Claude Code, Amp, Jules, Cursor and Zed all bootstrap their
//! repository understanding from a markdown file at the project root — `AGENTS.md`
//! for the emerging cross-tool convention, plus tool-specific `CLAUDE.md` and
//! `GEMINI.md`.
//!
//! Rather than shipping N fragile integrations, Blueprint writes the one file
//! every one of them understands and points the tool-specific files at it:
//!
//! ```text
//! AGENTS.md     <- full generated context (stack, commands, ADRs, knowledge, standards)
//! CLAUDE.md     <- pointer + "@AGENTS.md" import, so Claude Code reads the same content
//! GEMINI.md     <- pointer + "@AGENTS.md" import, so Gemini CLI reads the same content
//! knowledge.md  <- pointer, because Codebuff and Freebuff look for this name first
//! ```
//!
//! Freebuff (the free, ad-supported Codebuff CLI) resolves per-directory context
//! as `knowledge.md` → `AGENTS.md` → `CLAUDE.md`, so the pointer file is what
//! makes Blueprint's memory land in that agent instead of being skipped.
//!
//! Two safety rules are enforced here:
//!
//! 1. **Never clobber human work.** A target file is only overwritten when it
//!    carries Blueprint's generation marker. A hand-written `CLAUDE.md` is left
//!    untouched and reported back as skipped.
//! 2. **Never write secrets to disk.** Every value that reaches the file passes
//!    through the same [`RedactionEngine`] used for outbound prompts, and the
//!    number of redacted spans is returned so the UI can state it plainly.

use std::fs;
use std::path::Path;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;
use tauri::State;

use crate::ai::aos::AgentOS;
use crate::ai::redaction::RedactionEngine;
use crate::audit::AuditLog;
use crate::git::get_git_state_summary;
use crate::intelligence::scanners::repo::RepoScanner;
use crate::memory::{MemoryManager, DEFAULT_PROJECT_ID};
use crate::project::ProjectContext;

/// Written into every generated file so a later export can recognise its own
/// output and leave human-authored files alone.
pub const GENERATED_MARKER: &str = "<!-- blueprint:generated -->";

/// Files written after `AGENTS.md`, each containing only a pointer to it.
///
/// Each tool has its own preferred filename, and some prefer a file that is not
/// `AGENTS.md`: Codebuff and its free tier Freebuff pick `knowledge.md` first,
/// then `AGENTS.md`, then `CLAUDE.md`. Writing the pointer under the name the
/// tool looks for first is what makes the handoff actually happen.
const POINTER_FILES: &[(&str, &str)] = &[
    ("CLAUDE.md", "Claude Code"),
    ("GEMINI.md", "Gemini CLI"),
    ("knowledge.md", "Codebuff / Freebuff"),
];

/// Hard caps so a long-lived project cannot produce a 2 MB context file that
/// eats an agent's whole window.
const MAX_ADRS: usize = 40;
const MAX_MEMORIES: usize = 60;
const MAX_COMMANDS: usize = 20;
const MAX_BODY_CHARS: usize = 1_200;

#[derive(Debug, Serialize, Clone)]
pub struct ExportedFile {
    pub path: String,
    pub bytes: usize,
}

#[derive(Debug, Serialize, Clone)]
pub struct SkippedFile {
    pub path: String,
    pub reason: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct AgentContextExport {
    pub project_path: String,
    pub written: Vec<ExportedFile>,
    pub skipped: Vec<SkippedFile>,
    pub personas: usize,
    pub adrs: usize,
    pub memories: usize,
    pub files_scanned: usize,
    pub secrets_redacted: usize,
}

/// Rendered inputs for [`render_agents_md`]. Pure data so the markdown can be
/// unit-tested without a Tauri runtime, a database or a repository.
#[derive(Debug, Clone, Default)]
pub struct AgentContextData {
    pub generated_on: String,
    pub project_name: String,
    pub project_root: String,
    pub git_branch: Option<String>,
    pub git_status: Option<String>,
    pub files_scanned: Option<usize>,
    pub languages: Vec<String>,
    pub frontend: Vec<String>,
    pub backend: Vec<String>,
    pub database: Vec<String>,
    pub adrs: Vec<AdrSummary>,
    pub memories: Vec<MemorySummary>,
    pub personas: Vec<PersonaSummary>,
    pub commands: Vec<CommandSummary>,
}

#[derive(Debug, Clone)]
pub struct AdrSummary {
    pub title: String,
    pub status: String,
    pub context: String,
    pub decision: String,
    pub consequences: String,
}

#[derive(Debug, Clone)]
pub struct MemorySummary {
    pub tier: String,
    pub key: String,
    pub content: String,
}

#[derive(Debug, Clone)]
pub struct PersonaSummary {
    pub id: String,
    pub name: String,
    pub mission: String,
}

/// A command an agent can run, and where it was declared.
///
/// Ecosystem guidance on `AGENTS.md` is consistent that the commands section is
/// the highest-value part of the file: agents fail most often by inventing build
/// and test invocations. Blueprint already walks the repository, so it can
/// publish the real ones instead of leaving the agent to guess.
#[derive(Debug, Clone)]
pub struct CommandSummary {
    pub command: String,
    pub source: String,
}

/// Export Blueprint's project understanding into the open project root.
///
/// The scan runs on a blocking thread; everything else is cheap reads from
/// state that is already in memory or SQLite.
#[tauri::command]
pub async fn export_agent_context(
    project: State<'_, ProjectContext>,
    aos: State<'_, AgentOS>,
    memory: State<'_, Arc<MemoryManager>>,
    audit: State<'_, AuditLog>,
) -> Result<AgentContextExport, String> {
    let root = project.current()?;
    let root_str = root.to_string_lossy().into_owned();

    // Repository scan first: it is the only await, so no state guard is held
    // across an await point.
    let scan_target = root_str.clone();
    let scanned = tauri::async_runtime::spawn_blocking(move || RepoScanner::scan(&scan_target))
        .await
        .map_err(|e| format!("scan task failed: {e}"))?
        .ok();

    let mut data = AgentContextData {
        generated_on: today_utc(),
        project_name: root
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_else(|| "project".to_string()),
        project_root: root_str.clone(),
        ..Default::default()
    };

    if let Some((stack, files_scanned)) = scanned {
        data.files_scanned = Some(files_scanned);
        data.languages = stack.languages;
        data.frontend = stack.frontend;
        data.backend = stack.backend;
        data.database = stack.database;
    }

    data.commands = discover_commands(&root);

    // Not a git repository is not an error: the export still describes the
    // stack, decisions and standards. `get_git_state_summary` yields
    // {branch, ahead, behind, dirty_files, status, recent_commits}.
    if let Ok(git) = get_git_state_summary(&project) {
        data.git_branch = git
            .get("branch")
            .and_then(|v| v.as_str())
            .map(str::to_string);
        let status = git
            .get("status")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown");
        let dirty = git
            .get("dirty_files")
            .and_then(|v| v.as_u64())
            .unwrap_or(0);
        data.git_status = Some(if status == "clean" {
            "clean".to_string()
        } else {
            format!("{status} ({dirty} changed file(s))")
        });
    }

    if let Ok(adrs) = memory.list_adrs(DEFAULT_PROJECT_ID) {
        data.adrs = adrs
            .into_iter()
            .take(MAX_ADRS)
            .map(|a| AdrSummary {
                title: a.title,
                status: a.status,
                context: a.context,
                decision: a.decision,
                consequences: a.consequences,
            })
            .collect();
    }

    // An empty query matches every row, which is exactly what the export wants.
    if let Ok(entries) = memory.search_memory(DEFAULT_PROJECT_ID, "") {
        data.memories = entries
            .into_iter()
            .take(MAX_MEMORIES)
            .map(|m| MemorySummary {
                tier: tier_label(&m.tier),
                key: m.key,
                content: m.content,
            })
            .collect();
    }

    {
        let registry = aos
            .persona_registry
            .lock()
            .map_err(|e| format!("persona registry lock poisoned: {e}"))?;
        let mut personas: Vec<PersonaSummary> = registry
            .manuals
            .values()
            .map(|m| PersonaSummary {
                id: m.id.clone(),
                name: m.name.clone(),
                mission: m.mission.clone(),
            })
            .collect();
        personas.sort_by(|a, b| a.name.cmp(&b.name));
        data.personas = personas;
    }

    let counts = AgentContextExport {
        project_path: root_str.clone(),
        written: Vec::new(),
        skipped: Vec::new(),
        personas: data.personas.len(),
        adrs: data.adrs.len(),
        memories: data.memories.len(),
        files_scanned: data.files_scanned.unwrap_or(0),
        secrets_redacted: 0,
    };

    let agents_md = render_agents_md(&data);
    let (agents_md, secrets_redacted) = {
        let outcome = RedactionEngine::redact(&agents_md);
        (outcome.text, outcome.secrets_removed)
    };

    let mut result = counts;
    result.secrets_redacted = secrets_redacted;

    // 1. The canonical file.
    match write_if_owned_by_blueprint(&root, "AGENTS.md", &agents_md) {
        Ok(Some(bytes)) => result.written.push(ExportedFile {
            path: root.join("AGENTS.md").to_string_lossy().into_owned(),
            bytes,
        }),
        Ok(None) => result.skipped.push(SkippedFile {
            path: root.join("AGENTS.md").to_string_lossy().into_owned(),
            reason: "an AGENTS.md not generated by Blueprint already exists and was left untouched"
                .to_string(),
        }),
        Err(e) => return Err(format!("could not write AGENTS.md: {e}")),
    }

    // 2. Tool-specific pointers that import it.
    for &(file_name, tool) in POINTER_FILES {
        let body = render_pointer_md(file_name, tool, &data.generated_on);
        match write_if_owned_by_blueprint(&root, file_name, &body) {
            Ok(Some(bytes)) => result.written.push(ExportedFile {
                path: root.join(file_name).to_string_lossy().into_owned(),
                bytes,
            }),
            Ok(None) => result.skipped.push(SkippedFile {
                path: root.join(file_name).to_string_lossy().into_owned(),
                reason: format!(
                    "an existing {file_name} was not generated by Blueprint and was left untouched"
                ),
            }),
            Err(e) => return Err(format!("could not write {file_name}: {e}")),
        }
    }

    audit.record(
        "interop.agent_context.exported",
        serde_json::json!({
            "path": result.project_path.clone(),
            "files": result.written.len(),
            "skipped": result.skipped.len(),
            "adrs": result.adrs,
            "memories": result.memories,
            "personas": result.personas,
            "secrets_redacted": result.secrets_redacted,
        }),
    );

    Ok(result)
}

/// Commands declared at the project root: package manager scripts and `make`
/// targets. Deliberately limited to declarations that exist on disk — guessing
/// commands is worse than listing none.
fn discover_commands(root: &Path) -> Vec<CommandSummary> {
    let mut commands: Vec<CommandSummary> = Vec::new();

    let manifest_path = root.join("package.json");
    if let Ok(content) = fs::read_to_string(&manifest_path) {
        if let Ok(manifest) = serde_json::from_str::<serde_json::Value>(&content) {
            let runner = package_runner(&manifest, root);
            for (script, body) in package_scripts(&manifest) {
                commands.push(CommandSummary {
                    command: format!("{runner} run {script}"),
                    source: format!("package.json ({body})"),
                });
            }
        }
    }

    for makefile in ["Makefile", "makefile", "GNUmakefile"] {
        let path = root.join(makefile);
        if let Ok(content) = fs::read_to_string(&path) {
            for target in makefile_targets(&content) {
                commands.push(CommandSummary {
                    command: format!("make {target}"),
                    source: makefile.to_string(),
                });
            }
            break;
        }
    }

    commands.truncate(MAX_COMMANDS);
    commands
}

/// Which package manager to name in the command, from `packageManager` or the
/// lockfile present in the project root.
fn package_runner(manifest: &serde_json::Value, root: &Path) -> &'static str {
    if let Some(spec) = manifest
        .get("packageManager")
        .and_then(|v| v.as_str())
        .map(str::to_lowercase)
    {
        for runner in ["pnpm", "yarn", "bun", "npm"] {
            if spec.starts_with(runner) {
                return runner;
            }
        }
    }

    for (lockfile, runner) in [
        ("pnpm-lock.yaml", "pnpm"),
        ("yarn.lock", "yarn"),
        ("bun.lockb", "bun"),
        ("package-lock.json", "npm"),
    ] {
        if root.join(lockfile).exists() {
            return runner;
        }
    }

    "npm"
}

/// `scripts` entries as `(name, body)` in declaration order.
fn package_scripts(manifest: &serde_json::Value) -> Vec<(String, String)> {
    let Some(scripts) = manifest.get("scripts").and_then(|v| v.as_object()) else {
        return Vec::new();
    };
    scripts
        .iter()
        .map(|(name, body)| {
            (
                name.clone(),
                clip(body.as_str().unwrap_or_default(), 120),
            )
        })
        .collect()
}

/// Phony-style `make` targets: `name:` at column 0, excluding variable
/// assignments, pattern rules and files with extensions.
fn makefile_targets(content: &str) -> Vec<String> {
    let mut targets = Vec::new();
    for line in content.lines() {
        if line.starts_with('\t') || line.starts_with('#') {
            continue;
        }
        let Some(colon) = line.find(':') else { continue };
        let name = line[..colon].trim();
        let rest = line[colon + 1..].trim();
        if name.is_empty() || name.contains('=') || name.contains('%') || name.contains('.') {
            continue;
        }
        if !name
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
        {
            continue;
        }
        // `name: dep1 dep2` is a rule; `name := value` is an assignment.
        if rest.starts_with('=') {
            continue;
        }
        if !targets.contains(&name.to_string()) {
            targets.push(name.to_string());
        }
    }
    targets
}

/// Write `body` to `root/file_name`.
///
/// Returns `Ok(Some(bytes))` when written, `Ok(None)` when an existing file was
/// preserved because it is not Blueprint's, and `Err` on I/O failure.
fn write_if_owned_by_blueprint(
    root: &Path,
    file_name: &str,
    body: &str,
) -> Result<Option<usize>, String> {
    let target = root.join(file_name);

    if target.exists() {
        let existing = fs::read_to_string(&target).unwrap_or_default();
        if !existing.contains(GENERATED_MARKER) {
            return Ok(None);
        }
    }

    fs::write(&target, body).map_err(|e| e.to_string())?;
    Ok(Some(body.len()))
}

/// The full generated context file.
fn render_agents_md(data: &AgentContextData) -> String {
    let mut md = String::with_capacity(4096);

    md.push_str(GENERATED_MARKER);
    md.push('\n');
    md.push_str(&format!(
        "# AGENTS.md — {}\n\n",
        escape_inline(&data.project_name)
    ));
    md.push_str(&format!(
        "_Generated by Blueprint on {} from a local scan of this repository, its recorded \
         architecture decisions and its sealed project knowledge. Re-export from Blueprint \
         (Intelligence → Export agent context) instead of editing this file by hand._\n\n",
        data.generated_on
    ));

    md.push_str(
        "Blueprint is a local-first engineering command centre: it scans a repository, keeps \
         its architecture decisions and hard-won knowledge in a durable memory, and drives AI \
         teammates through versioned persona operating manuals. This file exists so that any \
         coding agent working here — OpenCode, Codebuff and Freebuff, Codex CLI, Amp, Jules, \
         Cursor, Zed — starts from the same understanding of the codebase instead of \
         rediscovering it (or contradicting a decision that was already made). `CLAUDE.md`, \
         `GEMINI.md` and `knowledge.md` point here, because those tools look for their own \
         filename first.\n\n",
    );

    // Repository
    md.push_str("## Repository\n\n");
    md.push_str(&format!("- Root: `{}`\n", escape_inline(&data.project_root)));
    if let Some(branch) = &data.git_branch {
        md.push_str(&format!("- Branch: `{}`\n", escape_inline(branch)));
    }
    if let Some(status) = &data.git_status {
        md.push_str(&format!("- Working tree: {}\n", escape_inline(status)));
    }
    if let Some(files) = data.files_scanned {
        md.push_str(&format!("- Files scanned: {files}\n"));
    }
    md.push('\n');

    // Stack
    md.push_str("## Detected stack\n\n");
    push_stack_line(&mut md, "Languages", &data.languages);
    push_stack_line(&mut md, "Frontend", &data.frontend);
    push_stack_line(&mut md, "Backend", &data.backend);
    push_stack_line(&mut md, "Databases", &data.database);
    if data.languages.is_empty()
        && data.frontend.is_empty()
        && data.backend.is_empty()
        && data.database.is_empty()
    {
        md.push_str(
            "_No stack markers were detected. Either the scan was skipped or this repository \
             uses a layout Blueprint does not yet recognise._\n",
        );
    }
    md.push('\n');

    // Commands. Highest-value section for an agent: it stops inventing build
    // and test invocations. Only declarations found on disk are listed.
    md.push_str("## Key commands\n\n");
    if data.commands.is_empty() {
        md.push_str(
            "_No `package.json` scripts or `make` targets were found at the project root. \
             Discover the real commands before running anything, and do not invent them._\n\n",
        );
    } else {
        md.push_str("Declared in this repository — use these instead of guessing:\n\n");
        for c in &data.commands {
            md.push_str(&format!(
                "- `{}` — {}\n",
                escape_inline(&c.command),
                escape_inline(&c.source)
            ));
        }
        md.push('\n');
    }

    // Decisions
    md.push_str("## Architectural decisions\n\n");
    if data.adrs.is_empty() {
        md.push_str(
            "_No decisions recorded yet. Capture them in Blueprint (Memory → New ADR) so that \
             agents stop relitigating settled questions._\n\n",
        );
    } else {
        for (i, adr) in data.adrs.iter().enumerate() {
            md.push_str(&format!(
                "### {}. {} ({})\n\n",
                i + 1,
                escape_inline(&adr.title),
                escape_inline(&adr.status)
            ));
            push_field(&mut md, "Context", &adr.context);
            push_field(&mut md, "Decision", &adr.decision);
            push_field(&mut md, "Consequences", &adr.consequences);
            md.push('\n');
        }
    }

    // Sealed knowledge
    md.push_str("## Sealed project knowledge\n\n");
    if data.memories.is_empty() {
        md.push_str("_Nothing sealed yet._\n\n");
    } else {
        for m in &data.memories {
            md.push_str(&format!(
                "- **{}** ({}) — {}\n",
                escape_inline(&m.key),
                escape_inline(&m.tier),
                clip(&m.content, MAX_BODY_CHARS)
            ));
        }
        md.push('\n');
    }

    // Personas / standards
    md.push_str("## Engineering standards\n\n");
    if data.personas.is_empty() {
        md.push_str("_No persona operating manuals were loaded._\n\n");
    } else {
        md.push_str(&format!(
            "Blueprint ships {} persona operating manuals. When you are asked to act as one of \
             these roles, follow its manual: the decision frameworks and failure modes in it are \
             the project's agreed standards, not suggestions.\n\n",
            data.personas.len()
        ));
        md.push_str("| Persona | Id | Mission |\n| --- | --- | --- |\n");
        for p in &data.personas {
            md.push_str(&format!(
                "| {} | `{}` | {} |\n",
                escape_inline(&p.name),
                escape_inline(&p.id),
                clip(&p.mission, MAX_BODY_CHARS)
            ));
        }
        md.push('\n');
    }

    // Boundaries, in the three-tier form agent documentation converges on:
    // what is always fine, what needs a human first, what is never fine.
    md.push_str("## Boundaries for agents working in this repository\n\n");
    md.push_str("### Always\n\n");
    for rule in [
        "Read the decisions above before changing anything they cover.",
        "Use the commands listed under Key commands rather than inventing invocations.",
        "Keep claims and code in step: do not document behaviour that is not implemented.",
        "Prefer the smallest change that satisfies the requirement, and state the trade-off.",
        "Run the project's lint, typecheck and test commands before declaring work done.",
    ] {
        md.push_str(&format!("- {rule}\n"));
    }
    md.push('\n');

    md.push_str("### Ask first\n\n");
    for rule in [
        "Reversing or superseding a recorded architecture decision.",
        "Schema or migration changes, and anything touching authentication or authorization.",
        "Adding a dependency, or changing build, CI or packaging configuration.",
        "Deleting or rewriting tests instead of fixing what they caught.",
    ] {
        md.push_str(&format!("- {rule}\n"));
    }
    md.push('\n');

    md.push_str("### Never\n\n");
    for rule in [
        "Write secrets, tokens or personal data into tracked files. Blueprint redacts what it \
         sends to models; files you create are your responsibility.",
        "Edit this file by hand — it is regenerated wholesale from Blueprint, never merged.",
        "Force-push, or bypass hooks and CI checks.",
        "Claim a capability the codebase does not have.",
    ] {
        md.push_str(&format!("- {rule}\n"));
    }

    md
}

/// `CLAUDE.md` / `GEMINI.md` / `knowledge.md`: a pointer, not a duplicate.
///
/// Two forms of the same instruction are included on purpose. `@AGENTS.md` is an
/// import for the tools that parse it (Claude Code, Gemini CLI); the imperative
/// sentence covers tools that load the file as plain text and have a read tool
/// (Codebuff/Freebuff, OpenCode without import parsing).
fn render_pointer_md(file_name: &str, tool: &str, generated_on: &str) -> String {
    format!(
        "{}\n# {}\n\n\
         This project keeps its agent instructions in `AGENTS.md`, which Blueprint regenerates \
         from the repository scan, declared build and test commands, recorded architecture \
         decisions and sealed project knowledge.\n\n\
         Read `AGENTS.md` in this directory now, before working on this repository. It states \
         the commands to run, the decisions already made, and the boundaries for agents.\n\n\
         @AGENTS.md\n\n\
         _Pointer generated by Blueprint on {} for {}. Edit `AGENTS.md` (or re-export it from \
         Blueprint) instead of this file._\n",
        GENERATED_MARKER, file_name, generated_on, tool
    )
}

fn push_stack_line(md: &mut String, label: &str, values: &[String]) {
    if values.is_empty() {
        return;
    }
    md.push_str(&format!(
        "- {}: {}\n",
        label,
        values
            .iter()
            .map(|v| escape_inline(v))
            .collect::<Vec<_>>()
            .join(", ")
    ));
}

fn push_field(md: &mut String, label: &str, value: &str) {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return;
    }
    md.push_str(&format!(
        "- {}: {}\n",
        label,
        clip(trimmed, MAX_BODY_CHARS)
    ));
}

/// Collapse newlines (they would break list items and table cells), escape pipes
/// and clip to a maximum length.
fn clip(text: &str, max_chars: usize) -> String {
    let single_line = escape_inline(text);
    if single_line.chars().count() <= max_chars {
        return single_line;
    }
    let mut out: String = single_line.chars().take(max_chars).collect();
    out.push_str(" …");
    out
}

fn escape_inline(text: &str) -> String {
    text.replace('\r', " ")
        .replace('\n', " ")
        .replace('|', "\\|")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn tier_label(tier: &crate::memory::MemoryTier) -> String {
    match tier {
        crate::memory::MemoryTier::Session => "session",
        crate::memory::MemoryTier::Project => "project",
        crate::memory::MemoryTier::Decision => "decision",
        crate::memory::MemoryTier::Knowledge => "knowledge",
        crate::memory::MemoryTier::User => "user",
        crate::memory::MemoryTier::Agent => "agent",
    }
    .to_string()
}

/// Today's date in UTC as `YYYY-MM-DD`, computed without a date crate.
pub fn today_utc() -> String {
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let (y, m, d) = civil_from_days((secs / 86_400) as i64);
    format!("{y:04}-{m:02}-{d:02}")
}

/// Inverse of days-from-civil (Howard Hinnant's public-domain algorithm).
fn civil_from_days(days_since_epoch: i64) -> (i64, u32, u32) {
    let z = days_since_epoch + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = (z - era * 146_097) as u64; // [0, 146096]
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365; // [0, 399]
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100); // [0, 365]
    let mp = (5 * doy + 2) / 153; // [0, 11]
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32; // [1, 31]
    let m = if mp < 10 { mp + 3 } else { mp - 9 } as u32; // [1, 12]
    (if m <= 2 { y + 1 } else { y }, m, d)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample() -> AgentContextData {
        AgentContextData {
            generated_on: "2026-09-15".to_string(),
            project_name: "acme-api".to_string(),
            project_root: "/home/dev/acme-api".to_string(),
            git_branch: Some("main".to_string()),
            git_status: Some("clean".to_string()),
            files_scanned: Some(128),
            languages: vec!["TypeScript".to_string(), "Rust".to_string()],
            frontend: vec!["Next.js".to_string()],
            backend: vec!["Tauri".to_string()],
            database: vec!["SQLite".to_string()],
            adrs: vec![AdrSummary {
                title: "Use SQLite for the project brain".to_string(),
                status: "Accepted".to_string(),
                context: "A packaged desktop app cannot assume a server.".to_string(),
                decision: "Store memory in a local SQLite file.".to_string(),
                consequences: "No network dependency; single-writer.".to_string(),
            }],
            memories: vec![MemorySummary {
                tier: "knowledge".to_string(),
                key: "build-quirk".to_string(),
                content: "The static export must exist before cargo builds.".to_string(),
            }],
            personas: vec![PersonaSummary {
                id: "principal-engineer".to_string(),
                name: "Principal Engineer".to_string(),
                mission: "Brutal technical review before production.".to_string(),
            }],
            commands: vec![CommandSummary {
                command: "pnpm run build".to_string(),
                source: "package.json (next build)".to_string(),
            }],
        }
    }

    #[test]
    fn civil_from_days_matches_known_dates() {
        assert_eq!(civil_from_days(0), (1970, 1, 1));
        assert_eq!(civil_from_days(10_957), (2000, 1, 1));
        assert_eq!(civil_from_days(20_711), (2026, 9, 15));
        assert_eq!(civil_from_days(-1), (1969, 12, 31));
    }

    #[test]
    fn agents_md_contains_every_section_and_the_marker() {
        let md = render_agents_md(&sample());
        assert!(md.starts_with(GENERATED_MARKER));
        assert!(md.contains("# AGENTS.md — acme-api"));
        assert!(md.contains("- Branch: `main`"));
        assert!(md.contains("- Files scanned: 128"));
        assert!(md.contains("- Languages: TypeScript, Rust"));
        assert!(md.contains("### 1. Use SQLite for the project brain (Accepted)"));
        assert!(md.contains("**build-quirk** (knowledge)"));
        assert!(md.contains("| Principal Engineer | `principal-engineer` |"));
        assert!(md.contains("- `pnpm run build` — package.json (next build)"));
        assert!(md.contains("## Boundaries for agents working in this repository"));
        assert!(md.contains("### Always"));
        assert!(md.contains("### Ask first"));
        assert!(md.contains("### Never"));
    }

    #[test]
    fn empty_inputs_still_produce_a_useful_file() {
        let md = render_agents_md(&AgentContextData {
            generated_on: "2026-09-15".to_string(),
            project_name: "empty".to_string(),
            project_root: "/tmp/empty".to_string(),
            ..Default::default()
        });
        assert!(md.contains("No stack markers were detected"));
        assert!(md.contains("No decisions recorded yet"));
        assert!(md.contains("Nothing sealed yet"));
        assert!(md.contains("No persona operating manuals were loaded"));
        assert!(md.contains("No `package.json` scripts or `make` targets were found"));
    }

    #[test]
    fn package_scripts_are_listed_in_declaration_order() {
        let manifest: serde_json::Value = serde_json::from_str(
            r#"{"packageManager":"pnpm@11.5.1","scripts":{"build":"next build","test":"vitest run"}}"#,
        )
        .unwrap();

        let scripts = package_scripts(&manifest);
        assert_eq!(
            scripts,
            vec![
                ("build".to_string(), "next build".to_string()),
                ("test".to_string(), "vitest run".to_string())
            ]
        );

        let empty: serde_json::Value = serde_json::from_str("{}").unwrap();
        assert!(package_scripts(&empty).is_empty());
    }

    #[test]
    fn package_runner_follows_the_manifest_then_the_lockfile() {
        let manifest: serde_json::Value =
            serde_json::from_str(r#"{"packageManager":"pnpm@11.5.1"}"#).unwrap();
        assert_eq!(package_runner(&manifest, Path::new("/nonexistent")), "pnpm");

        let yarn: serde_json::Value = serde_json::from_str(r#"{"packageManager":"yarn@4.1.0"}"#).unwrap();
        assert_eq!(package_runner(&yarn, Path::new("/nonexistent")), "yarn");

        let plain: serde_json::Value = serde_json::from_str("{}").unwrap();
        assert_eq!(package_runner(&plain, Path::new("/nonexistent")), "npm");
    }

    #[test]
    fn makefile_targets_skip_assignments_patterns_and_recipes() {
        let makefile = "CC := gcc\n\nall: build test\n\nbuild:\n\tgcc main.c\n\ntest: build\n\t./run-tests\n\n%.o: %.c\n\tgcc -c $<\n\nclean:\n\trm -f *.o\n";
        let targets = makefile_targets(makefile);
        assert_eq!(targets, vec!["all", "build", "test", "clean"]);
    }

    #[test]
    fn pointer_files_import_agents_md() {
        let pointer = render_pointer_md("CLAUDE.md", "Claude Code", "2026-09-15");
        assert!(pointer.contains(GENERATED_MARKER));
        assert!(pointer.contains("@AGENTS.md"));
        // Tools that do not parse imports still get an explicit instruction.
        assert!(pointer.contains("Read `AGENTS.md` in this directory now"));

        let knowledge = render_pointer_md("knowledge.md", "Codebuff / Freebuff", "2026-09-15");
        assert!(knowledge.starts_with(GENERATED_MARKER));
        assert!(knowledge.contains("# knowledge.md"));
        assert!(knowledge.contains("@AGENTS.md"));
    }

    #[test]
    fn pointer_files_cover_the_tools_that_do_not_read_agents_md_first() {
        let names: Vec<&str> = POINTER_FILES.iter().map(|(name, _)| *name).collect();
        assert!(names.contains(&"CLAUDE.md"));
        assert!(names.contains(&"GEMINI.md"));
        // Codebuff/Freebuff pick knowledge.md before AGENTS.md.
        assert!(names.contains(&"knowledge.md"));
    }

    #[test]
    fn inline_values_cannot_break_tables_or_lists() {
        assert_eq!(escape_inline("a | b\nc"), "a \\| b c");
        assert_eq!(clip(&"x".repeat(20), 5), "xxxxx …");
    }
}
