use rusqlite::{params, Connection};
use std::sync::Mutex;
use serde::{Deserialize, Serialize};

pub struct MemoryManager {
    pub db: Mutex<Connection>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ADR {
    pub id: i32,
    pub title: String,
    pub status: String,
    pub context: String,
    pub decision: String,
    pub consequences: String,
    pub created_at: String,
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

        Self {
            db: Mutex::new(conn),
        }
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
}
