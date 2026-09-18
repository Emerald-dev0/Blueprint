//! Discovery of installed plugin manifests.
//!
//! The plugin directory is supplied by [`crate::paths::AppPaths`] (per-user
//! data directory) rather than the process working directory, and a manifest
//! that fails to parse is reported and skipped instead of aborting the list.

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
    /// Declared by manifests as `minBlueprintVersion` (camelCase). Optional so a
    /// manifest that omits it still loads.
    #[serde(rename = "minBlueprintVersion", default)]
    pub min_blueprint_version: Option<String>,
    #[serde(default)]
    pub entrypoints: Option<serde_json::Value>,
}

pub struct PluginManager {
    pub plugin_dir: PathBuf,
}

impl PluginManager {
    pub fn new(plugin_dir: PathBuf) -> Self {
        if let Err(e) = fs::create_dir_all(&plugin_dir) {
            // Not fatal: an empty plugin list is a valid state, whereas a panic
            // here would kill the window at startup on a read-only filesystem.
            log::warn!(
                "could not create plugin directory {}: {e}",
                plugin_dir.display()
            );
        }
        Self { plugin_dir }
    }

    pub fn list_plugins(&self) -> Result<Vec<PluginManifest>, String> {
        let mut plugins = Vec::new();

        let entries = fs::read_dir(&self.plugin_dir).map_err(|e| {
            format!(
                "could not read plugin directory {}: {e}",
                self.plugin_dir.display()
            )
        })?;

        for entry in entries {
            let entry = match entry {
                Ok(e) => e,
                Err(e) => {
                    log::warn!("skipping unreadable plugin entry: {e}");
                    continue;
                }
            };

            let path = entry.path();
            if !path.is_dir() {
                continue;
            }

            let manifest_path = path.join("manifest.json");
            if !manifest_path.exists() {
                continue;
            }

            match fs::read_to_string(&manifest_path)
                .map_err(|e| e.to_string())
                .and_then(|content| {
                    serde_json::from_str::<PluginManifest>(&content).map_err(|e| e.to_string())
                }) {
                Ok(manifest) => plugins.push(manifest),
                Err(e) => {
                    log::warn!(
                        "skipping plugin with invalid manifest {}: {e}",
                        manifest_path.display()
                    );
                }
            }
        }

        plugins.sort_by(|a, b| a.name.cmp(&b.name));
        Ok(plugins)
    }
}
