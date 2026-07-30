use serde::{Deserialize, Serialize};
use std::path::Path;
use ignore::WalkBuilder;
use std::collections::HashSet;

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct TechStack {
    pub languages: Vec<String>,
    pub frontend: Vec<String>,
    pub backend: Vec<String>,
    pub database: Vec<String>,
}

pub struct RepoScanner;

impl RepoScanner {
    pub fn scan(path: &str) -> Result<TechStack, String> {
        let root = Path::new(path);
        if !root.exists() {
            return Err("Path does not exist".to_string());
        }

        let mut stack = TechStack::default();
        let mut languages = HashSet::new();
        let mut frontend = HashSet::new();

        // High-performance walk respecting .gitignore
        for result in WalkBuilder::new(root).build() {
            if let Ok(entry) = result {
                let path = entry.path();

                if let Some(ext) = path.extension() {
                    match ext.to_str().unwrap_or("") {
                        "ts" | "tsx" => { languages.insert("TypeScript".to_string()); },
                        "js" | "jsx" => { languages.insert("JavaScript".to_string()); },
                        "rs" => { languages.insert("Rust".to_string()); },
                        "py" => { languages.insert("Python".to_string()); },
                        "go" => { languages.insert("Go".to_string()); },
                        _ => {}
                    }
                }

                // File name based detection
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    match name {
                        "package.json" => { frontend.insert("Node.js".to_string()); },
                        "Cargo.toml" => { frontend.insert("Rust/Cargo".to_string()); },
                        "tailwind.config.js" | "tailwind.config.ts" => { frontend.insert("Tailwind CSS".to_string()); },
                        "next.config.js" | "next.config.ts" => { frontend.insert("Next.js".to_string()); },
                        _ => {}
                    }
                }
            }
        }

        stack.languages = languages.into_iter().collect();
        stack.frontend = frontend.into_iter().collect();

        Ok(stack)
    }
}
