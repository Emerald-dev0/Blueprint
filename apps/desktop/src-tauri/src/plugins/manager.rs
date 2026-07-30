use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PluginManifest {
    pub id: String,
    pub name: String,
    pub version: String,
    pub author: String,
    pub description: String,
    pub permissions: Vec<String>,
}

pub struct PluginManager {
    pub plugin_dir: PathBuf,
}

impl PluginManager {
    pub fn new(app_data_dir: PathBuf) -> Self {
        let plugin_dir = app_data_dir.join("plugins");
        if !plugin_dir.exists() {
            fs::create_dir_all(&plugin_dir).expect("failed to create plugin directory");
        }
        Self { plugin_dir }
    }

    pub fn list_plugins(&self) -> Result<Vec<PluginManifest>, String> {
        let mut plugins = Vec::new();
        for entry in fs::read_dir(&self.plugin_dir).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();
            if path.is_dir() {
                let manifest_path = path.join("manifest.json");
                if manifest_path.exists() {
                    let content = fs::read_to_string(manifest_path).map_err(|e| e.to_string())?;
                    let manifest: PluginManifest = serde_json::from_str(&content).map_err(|e| e.to_string())?;
                    plugins.push(manifest);
                }
            }
        }
        Ok(plugins)
    }
}
