//! The Project Brain: relational memory backed by SQLite.
//!
//! Fixed here:
//! - The database file is now created in the per-user application data
//!   directory instead of the process working directory, so a packaged app on
//!   Windows/Linux does not scatter `blueprint.db` across arbitrary folders.
//! - The "New ADR" and "Add Knowledge" dialogs in the renderer previously had
//!   no backing command at all, so captured knowledge was silently discarded.
//!   `create_adr` and `save_memory_entry` now persist them.

use std::collections::HashMap;
use std::path::Path;
use std::sync::{Arc, Mutex};

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tauri::State;

/// The workspace every command targets until multi-project support lands.
pub const DEFAULT_PROJECT_ID: &str = "default";

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "lowercase")]
pub enum MemoryTier {
    Session,
    Project,
    Decision,
    Knowledge,
    User,
    Agent,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MemoryEntry {
    pub id: Option<i32>,
    pub tier: MemoryTier,
    pub key: String,
    pub content: String,
    pub metadata: Option<String>, // JSON string
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ADR {
    pub id: i32,
    pub title: String,
    pub status: String,
    pub context: String,
    pub decision: String,
    pub consequences: String,
    pub created_at: String,
}

pub struct MemoryManager {
    pub db: Mutex<Connection>,
    session_cache: Mutex<HashMap<String, String>>,
}

impl MemoryManager {
    pub fn new(path: &Path) -> Self {
        let conn = Connection::open(path).unwrap_or_else(|e| {
            panic!(
                "failed to open the project brain database at {}: {e}",
                path.display()
            )
        });

        // Initialize tables
        conn.execute(
            "CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                path TEXT NOT NULL,
                tech_stack TEXT
            )",
            [],
        )
        .expect("failed to create projects table");

        conn.execute(
            "CREATE TABLE IF NOT EXISTS adrs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id TEXT,
                title TEXT NOT NULL,
                status TEXT NOT NULL,
                context TEXT,
                decision TEXT NOT NULL,
                consequences TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(project_id) REFERENCES projects(id)
            )",
            [],
        )
        .expect("failed to create adrs table");

        conn.execute(
            "CREATE TABLE IF NOT EXISTS memory_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id TEXT,
                tier TEXT NOT NULL,
                key TEXT NOT NULL,
                content TEXT NOT NULL,
                metadata TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(project_id) REFERENCES projects(id)
            )",
            [],
        )
        .expect("failed to create memory_entries table");

        conn.execute(
            "CREATE TABLE IF NOT EXISTS user_preferences (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )",
            [],
        )
        .expect("failed to create user_preferences table");

        // Seed the default workspace so knowledge captured before any explicit
        // project import has somewhere to live.
        conn.execute(
            "INSERT OR IGNORE INTO projects (id, name, path) VALUES (?1, ?2, ?3)",
            params![DEFAULT_PROJECT_ID, "Default Workspace", ""],
        )
        .expect("failed to seed default project");

        Self {
            db: Mutex::new(conn),
            session_cache: Mutex::new(HashMap::new()),
        }
    }

    pub fn save_entry(&self, project_id: &str, entry: MemoryEntry) -> Result<i32, String> {
        if let MemoryTier::Session = entry.tier {
            let mut cache = self.session_cache.lock().map_err(|e| e.to_string())?;
            cache.insert(entry.key, entry.content);
            return Ok(0);
        }

        let db = self.db.lock().map_err(|e| e.to_string())?;
        db.execute(
            "INSERT INTO memory_entries (project_id, tier, key, content, metadata)
             VALUES (?, ?, ?, ?, ?)",
            params![
                project_id,
                serde_json::to_string(&entry.tier).unwrap().replace('"', ""),
                entry.key,
                entry.content,
                entry.metadata
            ],
        )
        .map_err(|e| e.to_string())?;

        Ok(db.last_insert_rowid() as i32)
    }

    pub fn search_memory(&self, project_id: &str, query: &str) -> Result<Vec<MemoryEntry>, String> {
        let db = self.db.lock().map_err(|e| e.to_string())?;
        let mut stmt = db
            .prepare(
                "SELECT id, tier, key, content, metadata, created_at
                 FROM memory_entries
                 WHERE project_id = ? AND (content LIKE ? OR key LIKE ?)
                 ORDER BY created_at DESC",
            )
            .map_err(|e| e.to_string())?;

        let like_query = format!("%{}%", query);
        let entries_iter = stmt
            .query_map(params![project_id, like_query, like_query], |row| {
                let tier_str: String = row.get(1)?;
                Ok(MemoryEntry {
                    id: Some(row.get(0)?),
                    tier: serde_json::from_str(&format!("\"{tier_str}\""))
                        .unwrap_or(MemoryTier::Project),
                    key: row.get(2)?,
                    content: row.get(3)?,
                    metadata: row.get(4)?,
                    created_at: Some(row.get(5)?),
                })
            })
            .map_err(|e| e.to_string())?;

        let mut results = Vec::new();
        for entry in entries_iter {
            results.push(entry.map_err(|e| e.to_string())?);
        }
        Ok(results)
    }

    pub fn add_adr(&self, project_id: &str, adr: ADR) -> Result<i32, String> {
        let db = self.db.lock().map_err(|e| e.to_string())?;
        db.execute(
            "INSERT INTO adrs (project_id, title, status, context, decision, consequences)
             VALUES (?, ?, ?, ?, ?, ?)",
            params![
                project_id,
                adr.title,
                adr.status,
                adr.context,
                adr.decision,
                adr.consequences
            ],
        )
        .map_err(|e| e.to_string())?;

        Ok(db.last_insert_rowid() as i32)
    }

    pub fn list_adrs(&self, project_id: &str) -> Result<Vec<ADR>, String> {
        let db = self.db.lock().map_err(|e| e.to_string())?;
        let mut stmt = db
            .prepare(
                "SELECT id, title, status, context, decision, consequences, created_at
                 FROM adrs WHERE project_id = ? ORDER BY created_at DESC",
            )
            .map_err(|e| e.to_string())?;

        let adr_iter = stmt
            .query_map(params![project_id], |row| {
                Ok(ADR {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    status: row.get(2)?,
                    context: row.get(3)?,
                    decision: row.get(4)?,
                    consequences: row.get(5)?,
                    created_at: row.get(6)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut results = Vec::new();
        for adr in adr_iter {
            results.push(adr.map_err(|e| e.to_string())?);
        }
        Ok(results)
    }

    pub fn set_preference(&self, key: &str, value: &str) -> Result<(), String> {
        let db = self.db.lock().map_err(|e| e.to_string())?;
        db.execute(
            "INSERT OR REPLACE INTO user_preferences (key, value) VALUES (?, ?)",
            params![key, value],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }
}

#[tauri::command]
pub fn get_adrs(
    memory: State<'_, Arc<MemoryManager>>,
    project_id: String,
) -> Result<Vec<ADR>, String> {
    memory.list_adrs(&project_id)
}

#[tauri::command]
pub fn search_memory(
    memory: State<'_, Arc<MemoryManager>>,
    project_id: String,
    query: String,
) -> Result<Vec<MemoryEntry>, String> {
    memory.search_memory(&project_id, &query)
}

/// Persist an Architecture Decision Record captured in the Memory dialog.
#[tauri::command]
pub fn create_adr(
    memory: State<'_, Arc<MemoryManager>>,
    audit: State<'_, crate::audit::AuditLog>,
    project_id: String,
    title: String,
    context: String,
    decision: String,
    consequences: String,
) -> Result<i32, String> {
    if title.trim().is_empty() || decision.trim().is_empty() {
        return Err("An ADR needs at least a title and a decision.".to_string());
    }

    let id = memory.add_adr(
        &project_id,
        ADR {
            id: 0,
            title: title.clone(),
            status: "Accepted".to_string(),
            context,
            decision,
            consequences,
            created_at: String::new(),
        },
    )?;

    audit.record(
        "memory.adr.created",
        serde_json::json!({ "project": project_id, "adr_id": id, "title": title }),
    );
    Ok(id)
}

/// Persist a free-form knowledge entry captured in the Memory dialog.
#[tauri::command]
pub fn save_memory_entry(
    memory: State<'_, Arc<MemoryManager>>,
    project_id: String,
    tier: MemoryTier,
    key: String,
    content: String,
) -> Result<i32, String> {
    if key.trim().is_empty() || content.trim().is_empty() {
        return Err("A knowledge entry needs both a key and content.".to_string());
    }

    memory.save_entry(
        &project_id,
        MemoryEntry {
            id: None,
            tier,
            key,
            content,
            metadata: None,
            created_at: None,
        },
    )
}
