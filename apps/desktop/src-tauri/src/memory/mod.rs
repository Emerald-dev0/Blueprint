use rusqlite::{params, Connection};
use std::sync::{Arc, Mutex};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::State;

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
    pub fn new(path: &str) -> Self {
        let conn = Connection::open(path).expect("failed to open database");

        // Initialize tables
        conn.execute(
            "CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                path TEXT NOT NULL,
                tech_stack TEXT
            )",
            [],
        ).expect("failed to create projects table");

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
        ).expect("failed to create adrs table");

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
        ).expect("failed to create memory_entries table");

        conn.execute(
            "CREATE TABLE IF NOT EXISTS user_preferences (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )",
            [],
        ).expect("failed to create user_preferences table");

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
                serde_json::to_string(&entry.tier).unwrap().replace("\"", ""),
                entry.key,
                entry.content,
                entry.metadata
            ],
        ).map_err(|e| e.to_string())?;

        Ok(db.last_insert_rowid() as i32)
    }

    pub fn search_memory(&self, project_id: &str, query: &str) -> Result<Vec<MemoryEntry>, String> {
        let db = self.db.lock().map_err(|e| e.to_string())?;
        let mut stmt = db.prepare(
            "SELECT id, tier, key, content, metadata, created_at
             FROM memory_entries
             WHERE project_id = ? AND (content LIKE ? OR key LIKE ?)
             ORDER BY created_at DESC"
        ).map_err(|e| e.to_string())?;

        let like_query = format!("%{}%", query);
        let entries_iter = stmt.query_map(params![project_id, like_query, like_query], |row| {
            let tier_str: String = row.get(1)?;
            Ok(MemoryEntry {
                id: Some(row.get(0)?),
                tier: serde_json::from_str(&format!("\"{}\"", tier_str)).unwrap_or(MemoryTier::Project),
                key: row.get(2)?,
                content: row.get(3)?,
                metadata: row.get(4)?,
                created_at: Some(row.get(5)?),
            })
        }).map_err(|e| e.to_string())?;

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
            params![project_id, adr.title, adr.status, adr.context, adr.decision, adr.consequences],
        ).map_err(|e| e.to_string())?;

        Ok(db.last_insert_rowid() as i32)
    }

    pub fn list_adrs(&self, project_id: &str) -> Result<Vec<ADR>, String> {
        let db = self.db.lock().map_err(|e| e.to_string())?;
        let mut stmt = db.prepare("SELECT id, title, status, context, decision, consequences, created_at FROM adrs WHERE project_id = ? ORDER BY created_at DESC")
            .map_err(|e| e.to_string())?;

        let adr_iter = stmt.query_map(params![project_id], |row| {
            Ok(ADR {
                id: row.get(0)?,
                title: row.get(1)?,
                status: row.get(2)?,
                context: row.get(3)?,
                decision: row.get(4)?,
                consequences: row.get(5)?,
                created_at: row.get(6)?,
            })
        }).map_err(|e| e.to_string())?;

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
        ).map_err(|e| e.to_string())?;
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
