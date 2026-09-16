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
    /// Routing/discovery tags from `persona.json` (e.g. "backend", "apis").
    #[serde(default)]
    pub labels: Vec<String>,
    /// The full `instructions.md` operating manual, verbatim. Empty when the
    /// persona ships metadata only. Previously this file was never read at all,
    /// so every behavioural rule the personas define was silently dropped and
    /// the compiled prompt reduced to identity + mission.
    #[serde(default)]
    pub instructions: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PersonaManifest {
    pub id: String,
    pub name: String,
    pub identity: String,
    pub mission: String,
    pub version: String,
    #[serde(default)]
    pub capabilities: Vec<String>,
    #[serde(default)]
    pub labels: Vec<String>,
    /// Optional: tool names this persona is allowed to request.
    #[serde(default)]
    pub tools: Vec<String>,
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
        // Surface failure instead of silently producing an empty registry: the
        // original `.ok()` meant a missing personas directory booted the app
        // with zero agents and no diagnostic anywhere.
        if let Err(e) = registry.reload() {
            log::warn!("persona registry load failed: {e}");
        }
        registry
    }

    pub fn reload(&mut self) -> Result<(), String> {
        if !self.personas_root.exists() {
            return Err(format!(
                "Personas root path does not exist: {:?}",
                self.personas_root
            ));
        }

        let mut new_manuals = HashMap::new();
        let mut skipped: Vec<String> = Vec::new();

        for entry in fs::read_dir(&self.personas_root).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();

            if !path.is_dir() {
                continue;
            }

            let dir_name = path
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default();

            match self.load_persona_dir(&path) {
                Ok(manual) => {
                    new_manuals.insert(manual.id.clone(), manual);
                }
                // A broken persona must be named in the log. Two of the
                // originally shipped directories had no persona.json, so the
                // registry quietly came up with fewer agents than advertised.
                Err(e) => skipped.push(format!("{dir_name}: {e}")),
            }
        }

        if !skipped.is_empty() {
            log::warn!(
                "skipped {} persona director{} without a usable persona.json: {}",
                skipped.len(),
                if skipped.len() == 1 { "y" } else { "ies" },
                skipped.join(", ")
            );
        }

        self.manuals = new_manuals;
        Ok(())
    }

    fn load_persona_dir(&self, path: &Path) -> Result<OperatingManual, String> {
        let manifest_path = path.join("persona.json");
        let framework_path = path.join("thinking-framework.md");
        let instructions_path = path.join("instructions.md");

        if !manifest_path.exists() {
            return Err("missing persona.json".to_string());
        }

        let manifest_content = fs::read_to_string(&manifest_path).map_err(|e| e.to_string())?;
        let manifest: PersonaManifest =
            serde_json::from_str(&manifest_content).map_err(|e| e.to_string())?;

        if manifest.id.trim().is_empty() {
            return Err("persona.json has an empty id".to_string());
        }

        // Full operating manual, verbatim. This is the persona's actual
        // behaviour contract (decision frameworks, failure modes, standards).
        let instructions = if instructions_path.exists() {
            fs::read_to_string(&instructions_path).unwrap_or_default()
        } else {
            String::new()
        };

        // Thinking framework, preserving the step/sub-question hierarchy.
        let mut thinking_framework = Vec::new();
        if framework_path.exists() {
            let content = fs::read_to_string(&framework_path).unwrap_or_default();
            for line in content.lines() {
                let trimmed = line.trim();
                if let Some(rest) = strip_heading(trimmed) {
                    thinking_framework.push(format!("STEP {rest}"));
                } else if let Some(bullet) = trimmed.strip_prefix("- ") {
                    let bullet = bullet.trim();
                    if !bullet.is_empty() {
                        thinking_framework.push(format!("  - {bullet}"));
                    }
                }
            }
        }

        let responsibilities = parse_numbered_items(&instructions, "## CORE RESPONSIBILITIES");
        let quality_standards = parse_checklist(&instructions, "## QUALITY CHECKLIST");
        let output_format = parse_output_format(&instructions)
            .unwrap_or_else(|| "Structured Technical Document".to_string());

        // `capabilities` doubles as the expertise list shown in the registry UI
        // and injected into the prompt's EXPERTISE section.
        let expertise: Vec<String> = manifest
            .capabilities
            .iter()
            .map(|c| c.replace('_', " ").trim().to_string())
            .filter(|c| !c.is_empty())
            .collect();

        Ok(OperatingManual {
            id: manifest.id,
            name: manifest.name,
            identity: manifest.identity,
            mission: manifest.mission,
            expertise,
            responsibilities,
            thinking_framework,
            tools: manifest.tools,
            output_format,
            quality_standards,
            version: manifest.version,
            labels: manifest.labels,
            instructions,
        })
    }

    pub fn get(&self, id: &str) -> Option<&OperatingManual> {
        self.manuals.get(id)
    }
}

/// `## STEP 1: CONTRACT FIRST` -> `1: CONTRACT FIRST` (colon normalised).
fn strip_heading(line: &str) -> Option<String> {
    let rest = line.strip_prefix("## STEP")?;
    let rest = rest.trim().trim_start_matches(':').trim();
    if rest.is_empty() {
        return None;
    }
    // Render "1: TITLE" from the source's "1: TITLE" / "1 - TITLE" spellings.
    Some(rest.to_string())
}

/// Numbered items (`1. **X**: detail`) under a level-2 heading, with markdown
/// emphasis removed. Stops at the next level-2 heading.
fn parse_numbered_items(markdown: &str, heading: &str) -> Vec<String> {
    let mut items = Vec::new();
    let Some(section) = extract_section(markdown, heading) else {
        return items;
    };

    for line in section.lines() {
        let trimmed = line.trim();
        let Some(dot) = trimmed.find(". ") else {
            continue;
        };
        let (index, rest) = trimmed.split_at(dot);
        if index.is_empty() || !index.bytes().all(|b| b.is_ascii_digit()) {
            continue;
        }
        let cleaned = strip_markdown(&rest[2..]);
        if !cleaned.is_empty() {
            items.push(cleaned);
        }
    }

    items
}

/// `- [ ] Question` checklist items under a level-2 heading.
fn parse_checklist(markdown: &str, heading: &str) -> Vec<String> {
    let mut items = Vec::new();
    if let Some(section) = extract_section(markdown, heading) {
        for line in section.lines() {
            let trimmed = line.trim();
            let rest = trimmed
                .strip_prefix("- [ ] ")
                .or_else(|| trimmed.strip_prefix("- [x] "))
                .map(str::trim);
            if let Some(text) = rest {
                if !text.is_empty() {
                    items.push(strip_markdown(text));
                }
            }
        }
    }
    items
}

/// The `- **Format**: ...` line of the OUTPUT STANDARDS section.
fn parse_output_format(markdown: &str) -> Option<String> {
    let section = extract_section(markdown, "## OUTPUT STANDARDS")?;
    for line in section.lines() {
        let trimmed = line.trim();
        if !trimmed.starts_with("- ") {
            continue;
        }
        let cleaned = strip_markdown(trimmed);
        let lower = cleaned.to_lowercase();
        if let Some(idx) = lower.find("format:") {
            let value = cleaned[idx + "format:".len()..].trim();
            if !value.is_empty() {
                return Some(value.to_string());
            }
        }
    }
    None
}

/// Text under `heading` up to (but excluding) the next level-2 heading.
fn extract_section<'a>(markdown: &'a str, heading: &str) -> Option<&'a str> {
    let start = markdown.find(heading)?;
    let after = start + heading.len();
    let rest = &markdown[after..];
    let end = find_next_h2(rest);
    Some(rest[..end].trim())
}

/// Byte offset of the next line starting with `## ` (leading whitespace
/// tolerated), or `text.len()` when there is none. Byte-wise ASCII comparison
/// is safe for UTF-8 and cannot return an offset past the end of the input,
/// which keeps the caller's slice infallible under CRLF input too.
fn find_next_h2(text: &str) -> usize {
    let bytes = text.as_bytes();
    let mut i = 0usize;
    let mut at_line_start = true;
    while i < bytes.len() {
        if at_line_start {
            let mut j = i;
            while j < bytes.len() && (bytes[j] == b' ' || bytes[j] == b'\t') {
                j += 1;
            }
            if j + 3 <= bytes.len()
                && bytes[j] == b'#'
                && bytes[j + 1] == b'#'
                && bytes[j + 2] == b' '
            {
                return i;
            }
        }
        at_line_start = bytes[i] == b'\n';
        i += 1;
    }
    text.len()
}

/// Drop markdown emphasis and inline-code markers, then collapse whitespace so
/// a parsed item reads as plain prose inside a prompt.
fn strip_markdown(text: &str) -> String {
    let without_markers: String = text.chars().filter(|c| *c != '*' && *c != '`').collect();
    without_markers
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_section_and_items() {
        let md = "# MANUAL\n\n## CORE RESPONSIBILITIES\n1. **Pipeline Design**: Batch flows.\n2. Schema.\n\n## OTHER\nignore\n";
        let items = parse_numbered_items(md, "## CORE RESPONSIBILITIES");
        assert_eq!(items, vec!["Pipeline Design: Batch flows.", "Schema."]);
    }

    #[test]
    fn extracts_checklist_and_output_format() {
        let md = "## OUTPUT STANDARDS\n- **Format**: Design doc.\n- **Tone**: Precise.\n\n## QUALITY CHECKLIST\n- [ ] Is every step idempotent?\n";
        assert_eq!(parse_output_format(md), Some("Design doc.".to_string()));
        assert_eq!(
            parse_checklist(md, "## QUALITY CHECKLIST"),
            vec!["Is every step idempotent?"]
        );
    }

    #[test]
    fn strip_heading_normalises_step_lines() {
        assert_eq!(
            strip_heading("## STEP 1: CONTRACT FIRST"),
            Some("1: CONTRACT FIRST".to_string())
        );
        assert_eq!(strip_heading("## OTHER"), None);
    }
}
