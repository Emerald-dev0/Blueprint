use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OperatingManual {
    pub id: String,
    pub name: String,
    pub identity: String,
    pub mission: String,
    pub expertise: Vec<String>,
    pub responsibilities: Vec<String>,
    pub thinking_framework: Vec<String>,
    pub tools: Vec<String>,
    pub output_format: String,
    pub quality_standards: Vec<String>,
    pub version: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PersonaManifest {
    pub id: String,
    pub name: String,
    pub identity: String,
    pub mission: String,
    pub version: String,
    pub capabilities: Vec<String>,
    pub labels: Vec<String>,
}

pub struct PersonaRegistry {
    pub manuals: HashMap<String, OperatingManual>,
    pub personas_root: PathBuf,
}

impl PersonaRegistry {
    pub fn new(personas_root: PathBuf) -> Self {
        let mut registry = Self {
            manuals: HashMap::new(),
            personas_root,
        };
        registry.reload().ok();
        registry
    }

    pub fn reload(&mut self) -> Result<(), String> {
        if !self.personas_root.exists() {
            return Err(format!("Personas root path does not exist: {:?}", self.personas_root));
        }

        let mut new_manuals = HashMap::new();

        for entry in fs::read_dir(&self.personas_root).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();

            if path.is_dir() {
                if let Ok(manual) = self.load_persona_dir(&path) {
                    new_manuals.insert(manual.id.clone(), manual);
                }
            }
        }

        self.manuals = new_manuals;
        Ok(())
    }

    fn load_persona_dir(&self, path: &Path) -> Result<OperatingManual, String> {
        let manifest_path = path.join("persona.json");
        let instructions_path = path.join("instructions.md");

        if !manifest_path.exists() {
            return Err("Missing persona.json".to_string());
        }

        let manifest_content = fs::read_to_string(manifest_path).map_err(|e| e.to_string())?;
        let manifest: PersonaManifest = serde_json::from_str(&manifest_content).map_err(|e| e.to_string())?;

        // For now, we use a basic version of OperatingManual
        // In later phases, we'll parse the .md files more deeply
        let instructions = if instructions_path.exists() {
            fs::read_to_string(instructions_path).unwrap_or_default()
        } else {
            String::new()
        };

        Ok(OperatingManual {
            id: manifest.id,
            name: manifest.name,
            identity: manifest.identity,
            mission: manifest.mission,
            expertise: vec![], // To be extracted from docs
            responsibilities: vec![], // To be extracted from docs
            thinking_framework: vec![], // To be extracted from docs
            tools: vec![],
            output_format: "Structured Technical Document".to_string(),
            quality_standards: vec![],
            version: manifest.version,
        })
    }

    pub fn get(&self, id: &str) -> Option<&OperatingManual> {
        self.manuals.get(id)
    }
}
