use super::persona::OperatingManual;
use serde_json::Value;

pub struct PromptCompiler;

impl PromptCompiler {
    pub fn compile(manual: &OperatingManual, goal: &str, context: &Value) -> String {
        let mut prompt = String::new();

        // 1. Mission Control Header
        prompt.push_str("### BLUEPRINT AGENT OPERATING SYSTEM ###\n");
        prompt.push_str(&format!("### ROLE: {} | VERSION: {} ###\n\n", manual.name.to_uppercase(), manual.version));

        // 2. Identity & Mission
        prompt.push_str("# IDENTITY\n");
        prompt.push_str(&manual.identity);
        prompt.push_str("\n\n");

        prompt.push_str("# MISSION\n");
        prompt.push_str(&manual.mission);
        prompt.push_str("\n\n");

        // 3. Operational Expertise
        if !manual.expertise.is_empty() {
            prompt.push_str("# EXPERTISE & CAPABILITIES\n");
            for exp in &manual.expertise {
                prompt.push_str(&format!("- {}\n", exp));
            }
            prompt.push_str("\n");
        }

        // 4. Injected Context (The "Eyes" of the Agent)
        prompt.push_str("# PROJECT CONTEXT\n");
        if let Some(git) = context.get("git_context") {
            prompt.push_str("## VCS STATE\n");
            prompt.push_str(&format!("- Branch: {}\n", git.get("branch").and_then(|v| v.as_str()).unwrap_or("unknown")));
            prompt.push_str(&format!("- Status: {}\n", git.get("status").and_then(|v| v.as_str()).unwrap_or("unknown")));
        }

        if let Some(pum) = context.get("pum") {
            prompt.push_str("## PROJECT UNDERSTANDING MODEL (PUM)\n");
            prompt.push_str(&pum.to_string());
        }

        if let Some(memories) = context.get("relevant_memories").and_then(|m| m.as_array()) {
            prompt.push_str("## RELEVANT MEMORIES\n");
            for mem in memories {
                prompt.push_str(&format!("* {}\n", mem));
            }
        }
        prompt.push_str("\n");

        // 5. Reasoning Framework
        if !manual.thinking_framework.is_empty() {
            prompt.push_str("# THINKING FRAMEWORK\n");
            for (i, step) in manual.thinking_framework.iter().enumerate() {
                prompt.push_str(&format!("{}. {}\n", i + 1, step));
            }
            prompt.push_str("\n");
        }

        // 6. Tools Availability
        if !manual.tools.is_empty() {
            prompt.push_str("# AVAILABLE TOOLS\n");
            for tool in &manual.tools {
                prompt.push_str(&format!("- {}\n", tool));
            }
            prompt.push_str("\n");
        }

        // 7. Executive Decision
        prompt.push_str("# ACTIVE REQUIREMENT\n");
        prompt.push_str(goal);
        prompt.push_str("\n\n");

        // 8. Quality Control & Output
        if !manual.quality_standards.is_empty() {
            prompt.push_str("# QUALITY STANDARDS\n");
            for std in &manual.quality_standards {
                prompt.push_str(&format!("* {}\n", std));
            }
            prompt.push_str("\n");
        }

        prompt.push_str("# OUTPUT FORMAT\n");
        prompt.push_str(&manual.output_format);
        prompt.push_str("\n\n");

        prompt.push_str("### SYSTEM OVERRIDE: Do not hallucinate capabilities. If a tool is missing, report it. ###");

        prompt
    }
}
