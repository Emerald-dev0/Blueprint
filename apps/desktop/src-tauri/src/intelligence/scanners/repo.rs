//! Local, gitignore-respecting repository scanner.
//!
//! Corrections over the original:
//! - `Cargo.toml` was reported under `frontend`, and `backend` / `database`
//!   were never populated at all, so every Rust or Go project was described as
//!   a frontend stack.
//! - The walk now reports how many files it examined, so the UI can show real
//!   evidence of work instead of an ambiguous "Engine Active" badge.
//! - Framework detection reads `package.json` dependencies rather than guessing
//!   from the mere presence of the file.

use ignore::WalkBuilder;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::path::Path;

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct TechStack {
    pub languages: Vec<String>,
    pub frontend: Vec<String>,
    pub backend: Vec<String>,
    pub database: Vec<String>,
}

pub struct RepoScanner;

const FRONTEND_MARKERS: &[(&str, &str)] = &[
    ("next", "Next.js"),
    ("react", "React"),
    ("vue", "Vue"),
    ("svelte", "Svelte"),
    ("angular", "Angular"),
    ("tailwindcss", "Tailwind CSS"),
    ("vite", "Vite"),
];

const BACKEND_MARKERS: &[(&str, &str)] = &[
    ("express", "Express"),
    ("fastify", "Fastify"),
    ("@nestjs/core", "NestJS"),
    ("koa", "Koa"),
    ("hono", "Hono"),
    ("axum", "Axum"),
    ("actix-web", "Actix Web"),
    ("rocket", "Rocket"),
    ("django", "Django"),
    ("fastapi", "FastAPI"),
    ("flask", "Flask"),
    ("gin", "Gin"),
    ("echo", "Echo"),
];

const DATABASE_MARKERS: &[(&str, &str)] = &[
    ("prisma", "Prisma"),
    ("drizzle-orm", "Drizzle"),
    ("typeorm", "TypeORM"),
    ("sequelize", "Sequelize"),
    ("knex", "Knex"),
    ("diesel", "Diesel"),
    ("sqlx", "SQLx"),
    ("mongoose", "MongoDB (Mongoose)"),
    ("pg", "PostgreSQL (pg)"),
    ("mysql2", "MySQL"),
    ("sqlite3", "SQLite"),
    ("rusqlite", "SQLite (rusqlite)"),
];

impl RepoScanner {
    /// Scan `path` and return the detected stack plus the file count.
    pub fn scan(path: &str) -> Result<(TechStack, usize), String> {
        let root = Path::new(path);
        if !root.exists() {
            return Err(format!("Path does not exist: {path}"));
        }

        let mut stack = TechStack::default();
        let mut languages = HashSet::new();
        let mut frontend = HashSet::new();
        let mut backend = HashSet::new();
        let mut database = HashSet::new();
        let mut files_scanned = 0usize;

        // High-performance walk respecting .gitignore and skipping hidden dirs.
        for result in WalkBuilder::new(root).build() {
            let Ok(entry) = result else { continue };
            let entry_path = entry.path();

            if entry_path.is_file() {
                files_scanned += 1;
            }

            if let Some(ext) = entry_path.extension().and_then(|e| e.to_str()) {
                match ext {
                    "ts" | "tsx" | "mts" | "cts" => {
                        languages.insert("TypeScript".to_string());
                    }
                    "js" | "jsx" | "mjs" | "cjs" => {
                        languages.insert("JavaScript".to_string());
                    }
                    "rs" => {
                        languages.insert("Rust".to_string());
                    }
                    "py" => {
                        languages.insert("Python".to_string());
                    }
                    "go" => {
                        languages.insert("Go".to_string());
                    }
                    "java" | "kt" => {
                        languages.insert("JVM".to_string());
                    }
                    "cs" => {
                        languages.insert("C#".to_string());
                    }
                    "sql" => {
                        languages.insert("SQL".to_string());
                    }
                    _ => {}
                }
            }

            // File-name based detection.
            if let Some(name) = entry_path.file_name().and_then(|n| n.to_str()) {
                match name {
                    "Cargo.toml" => {
                        languages.insert("Rust".to_string());
                        if let Ok(manifest) = std::fs::read_to_string(entry_path) {
                            for (marker, label) in BACKEND_MARKERS {
                                if manifest.contains(marker) {
                                    backend.insert(label.to_string());
                                }
                            }
                            for (marker, label) in DATABASE_MARKERS {
                                if manifest.contains(marker) {
                                    database.insert(label.to_string());
                                }
                            }
                        }
                    }
                    "go.mod" => {
                        languages.insert("Go".to_string());
                    }
                    "package.json" => {
                        languages.insert("Node.js".to_string());
                        if let Ok(content) = std::fs::read_to_string(entry_path) {
                            for (marker, label) in FRONTEND_MARKERS {
                                if content.contains(&format!("\"{marker}\"")) {
                                    frontend.insert(label.to_string());
                                }
                            }
                            for (marker, label) in BACKEND_MARKERS {
                                if content.contains(&format!("\"{marker}\"")) {
                                    backend.insert(label.to_string());
                                }
                            }
                            for (marker, label) in DATABASE_MARKERS {
                                if content.contains(&format!("\"{marker}\"")) {
                                    database.insert(label.to_string());
                                }
                            }
                        }
                    }
                    "requirements.txt" | "pyproject.toml" | "setup.py" => {
                        languages.insert("Python".to_string());
                    }
                    "docker-compose.yml" | "docker-compose.yaml" => {
                        // A compose file is strong evidence of stateful services.
                        if let Ok(content) = std::fs::read_to_string(entry_path) {
                            let lowered = content.to_lowercase();
                            for needle in ["postgres", "mysql", "mariadb", "mongo", "redis"] {
                                if lowered.contains(needle) {
                                    database.insert(needle.to_string());
                                }
                            }
                        }
                    }
                    _ => {}
                }
            }
        }

        stack.languages = sorted(languages);
        stack.frontend = sorted(frontend);
        stack.backend = sorted(backend);
        stack.database = sorted(database);

        Ok((stack, files_scanned))
    }
}

fn sorted(set: HashSet<String>) -> Vec<String> {
    let mut v: Vec<String> = set.into_iter().collect();
    v.sort();
    v
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn detects_typescript_and_node_without_mislabeling() {
        let dir = std::env::temp_dir().join("blueprint_scanner_test");
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(dir.join("src")).unwrap();
        fs::write(dir.join("src/index.ts"), "export const a = 1;").unwrap();
        fs::write(
            dir.join("package.json"),
            r#"{"dependencies":{"next":"15.0.0","pg":"8.0.0"}}"#,
        )
        .unwrap();

        let (stack, files) = RepoScanner::scan(dir.to_str().unwrap()).unwrap();
        assert!(stack.languages.contains(&"TypeScript".to_string()));
        assert!(stack.frontend.contains(&"Next.js".to_string()));
        assert!(stack.database.contains(&"PostgreSQL (pg)".to_string()));
        // Rust must not appear just because some repo has a Cargo.toml elsewhere.
        assert!(!stack.languages.contains(&"Rust".to_string()));
        assert_eq!(files, 2);

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn rejects_missing_path() {
        assert!(RepoScanner::scan("/definitely/not/a/real/path").is_err());
    }
}
