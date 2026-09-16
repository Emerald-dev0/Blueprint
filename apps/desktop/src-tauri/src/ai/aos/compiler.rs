use super::persona::OperatingManual;
use serde_json::Value;

/// Upper bound on the verbatim operating manual injected into the system prompt.
/// Persona manuals run to a few KB; the cap keeps a rogue 200 KB file from
/// blowing the context window while still admitting every real persona.
const MAX_INSTRUCTIONS_CHARS: usize = 8_000;

pub struct PromptCompiler;

impl PromptCompiler {
    pub fn compile(manual: &OperatingManual, goal: &str, context: &Value) -> String {
        let mut prompt = String::new();

        // 1. Mission Control Header
        prompt.push_str("### BLUEPRINT AGENT OPERATING SYSTEM ###\n");
        prompt.push_str(&format!(
            "### ROLE: {} | VERSION: {} ###\n\n",
            manual.name.to_uppercase(),
            manual.version
        ));

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
            prompt.push('\n');
        }

        // 4. Core Responsibilities (parsed from the persona's instructions.md)
        if !manual.responsibilities.is_empty() {
            prompt.push_str("# CORE RESPONSIBILITIES\n");
            for (i, item) in manual.responsibilities.iter().enumerate() {
                prompt.push_str(&format!("{}. {}\n", i + 1, item));
            }
            prompt.push('\n');
        }

        // 5. The full operating manual. This is the persona's behaviour
        //    contract — decision frameworks, failure modes, output standards —
        //    and the reason the personas are more than a name and a mission.
        if !manual.instructions.trim().is_empty() {
            prompt.push_str("# OPERATING MANUAL\n");
            prompt.push_str(&truncate_chars(
                manual.instructions.trim(),
                MAX_INSTRUCTIONS_CHARS,
            ));
            prompt.push_str("\n\n");
        }

        // 6. Injected Context (The "Eyes" of the Agent)
        prompt.push_str("# PROJECT CONTEXT\n");
        if let Some(root) = context.get("project_path").and_then(|v| v.as_str()) {
            prompt.push_str(&format!("## REPOSITORY ROOT\n- {}\n", root));
        }
        if let Some(git) = context.get("git_context") {
            prompt.push_str("## VCS STATE\n");
            prompt.push_str(&format!(
                "- Branch: {}\n",
                git.get("branch")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown")
            ));
            prompt.push_str(&format!(
                "- Status: {}\n",
                git.get("status")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown")
            ));
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

        // Prior turns, when the caller keeps a conversation. Without this the
        // persona path is single-shot and the renderer's chat has no memory of
        // what it just asked.
        if let Some(history) = context
            .get("conversation_history")
            .and_then(|h| h.as_array())
        {
            if !history.is_empty() {
                prompt.push_str("## CONVERSATION SO FAR\n");
                for turn in history {
                    let role = turn
                        .get("role")
                        .and_then(|v| v.as_str())
                        .unwrap_or("user")
                        .to_uppercase();
                    let content = turn.get("content").and_then(|v| v.as_str()).unwrap_or("");
                    prompt.push_str(&format!("{role}: {content}\n"));
                }
            }
        }
        prompt.push('\n');

        // 7. Reasoning Framework. Entries are already hierarchical
        //    ("STEP 1: TITLE" followed by indented "- sub-question"), so they
        //    are emitted verbatim rather than renumbered into a flat list.
        if !manual.thinking_framework.is_empty() {
            prompt.push_str("# THINKING FRAMEWORK\n");
            for step in &manual.thinking_framework {
                prompt.push_str(step);
                prompt.push('\n');
            }
            prompt.push('\n');
        }

        // 8. Tools Availability
        if !manual.tools.is_empty() {
            prompt.push_str("# AVAILABLE TOOLS\n");
            for tool in &manual.tools {
                prompt.push_str(&format!("- {}\n", tool));
            }
            prompt.push('\n');
        }

        // 9. Executive Decision
        prompt.push_str("# ACTIVE REQUIREMENT\n");
        prompt.push_str(goal);
        prompt.push_str("\n\n");

        // 10. Quality Control & Output
        if !manual.quality_standards.is_empty() {
            prompt.push_str("# QUALITY STANDARDS\n");
            for std in &manual.quality_standards {
                prompt.push_str(&format!("* {}\n", std));
            }
            prompt.push('\n');
        }

        prompt.push_str("# OUTPUT FORMAT\n");
        prompt.push_str(&manual.output_format);
        prompt.push_str("\n\n");

        prompt.push_str("### SYSTEM OVERRIDE: Do not hallucinate capabilities. If a tool is missing, report it. ###");

        prompt
    }
}

/// Truncate on a character boundary so multi-byte markdown is never split.
fn truncate_chars(text: &str, max_chars: usize) -> String {
    if text.chars().count() <= max_chars {
        return text.to_string();
    }
    let mut out: String = text.chars().take(max_chars).collect();
    out.push_str("\n[... operating manual truncated ...]");
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn manual() -> OperatingManual {
        OperatingManual {
            id: "test-persona".to_string(),
            name: "Test Persona".to_string(),
            identity: "A persona used in tests.".to_string(),
            mission: "Prove the compiler works.".to_string(),
            expertise: vec!["testing".to_string()],
            responsibilities: vec!["Write the test".to_string()],
            thinking_framework: vec![
                "STEP 1: PLAN".to_string(),
                "  - What is the goal?".to_string(),
            ],
            tools: vec!["test_runner".to_string()],
            output_format: "A short report.".to_string(),
            quality_standards: vec!["Tests pass".to_string()],
            version: "1.0.0".to_string(),
            labels: vec!["test".to_string()],
            instructions: "# TEST OPERATING MANUAL\n\n## DECISION FRAMEWORK\nBe careful.\n"
                .to_string(),
        }
    }

    #[test]
    fn compile_includes_manual_responsibilities_and_context() {
        let prompt = PromptCompiler::compile(
            &manual(),
            "Audit the auth flow",
            &json!({
                "git_context": { "branch": "main", "status": "clean" },
                "conversation_history": [
                    { "role": "user", "content": "Earlier question" },
                    { "role": "assistant", "content": "Earlier answer" }
                ]
            }),
        );

        assert!(prompt.contains("ROLE: TEST PERSONA"));
        assert!(prompt.contains("# OPERATING MANUAL"));
        assert!(prompt.contains("Be careful."));
        assert!(prompt.contains("1. Write the test"));
        assert!(prompt.contains("STEP 1: PLAN"));
        assert!(prompt.contains("- What is the goal?"));
        assert!(prompt.contains("Branch: main"));
        assert!(prompt.contains("## CONVERSATION SO FAR"));
        assert!(prompt.contains("USER: Earlier question"));
        assert!(prompt.contains("ASSISTANT: Earlier answer"));
        assert!(prompt.contains("# ACTIVE REQUIREMENT\nAudit the auth flow"));
        assert!(prompt.contains("A short report."));
    }

    #[test]
    fn truncation_happens_on_char_boundaries() {
        let long = "é".repeat(MAX_INSTRUCTIONS_CHARS + 10);
        let out = truncate_chars(&long, MAX_INSTRUCTIONS_CHARS);
        assert!(out.contains("operating manual truncated"));
        assert!(out.chars().count() > MAX_INSTRUCTIONS_CHARS);
        assert_eq!(
            out.chars().take(MAX_INSTRUCTIONS_CHARS).collect::<String>(),
            "é".repeat(MAX_INSTRUCTIONS_CHARS)
        );
    }
}
