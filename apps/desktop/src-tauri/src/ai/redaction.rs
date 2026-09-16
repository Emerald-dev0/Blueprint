//! Local secret redaction applied to every outbound AI prompt.
//!
//! Two defects were fixed here:
//!
//! 1. **Coverage.** Redaction used to run only on messages whose `role` was
//!    exactly `"user"`, and only inside `generate_ai_completion`. The Agent OS
//!    path (`run_aos_completion`) compiled a system prompt containing git state
//!    and repository context and sent it *without any redaction at all*, so the
//!    flagship feature bypassed the security control the documentation leads
//!    with. Every message of every role now passes through the engine on every
//!    provider path.
//! 2. **Pattern breadth.** The original set matched four shapes and the
//!    "generic API key" pattern required the value to be wrapped in quotes and
//!    be 32-48 alphanumeric characters, missing essentially every real token
//!    format in use. The set below covers the common vendor formats plus
//!    bearer headers, connection strings and private key blocks.

use regex::Regex;
use std::sync::OnceLock;

use super::providers::AIMessage;

static SECRET_PATTERNS: OnceLock<Vec<Regex>> = OnceLock::new();

/// Result of a redaction pass.
#[derive(Debug, Clone, Default)]
pub struct RedactionOutcome {
    pub text: String,
    /// Number of secret-looking spans replaced. Surfaced to the UI so the
    /// "Security Redactions" figure is a measurement rather than a constant.
    pub secrets_removed: usize,
}

pub struct RedactionEngine;

impl RedactionEngine {
    fn patterns() -> &'static Vec<Regex> {
        SECRET_PATTERNS.get_or_init(|| {
            vec![
                // PEM private key blocks (match the whole block, not the header).
                Regex::new(
                    r"-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----",
                )
                .expect("private key pattern"),
                // AWS
                Regex::new(r"AKIA[0-9A-Z]{16}").expect("aws access key pattern"),
                Regex::new(r#"(?i)aws.{0,20}?['"][0-9a-zA-Z/+]{40}['"]"#).expect("aws secret pattern"),
                // Anthropic (must precede the generic OpenAI `sk-` shape)
                Regex::new(r"sk-ant-[A-Za-z0-9_-]{20,}").expect("anthropic pattern"),
                // OpenAI
                Regex::new(r"sk-[A-Za-z0-9_-]{20,}").expect("openai pattern"),
                // GitHub
                Regex::new(r"gh[pousr]_[A-Za-z0-9]{36,255}").expect("github pattern"),
                // Stripe
                Regex::new(r"(sk|rk|pk)_(live|test)_[0-9a-zA-Z]{10,}").expect("stripe pattern"),
                // Slack
                Regex::new(r"xox[baprs]-[0-9A-Za-z-]{10,}").expect("slack pattern"),
                // Google
                Regex::new(r"AIza[0-9A-Za-z_-]{35}").expect("google pattern"),
                // JSON Web Tokens
                Regex::new(r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}")
                    .expect("jwt pattern"),
                // Authorization: Bearer <token>
                Regex::new(r"(?i)\bbearer\s+[A-Za-z0-9._~+/-]{20,}=*").expect("bearer pattern"),
                // Database / broker connection strings embedding credentials
                Regex::new(
                    r"(?i)\b(postgres|postgresql|mysql|mongodb(\+srv)?|redis|amqp|amqps)://[^\s:@/]+:[^\s@/]+@",
                )
                .expect("connection string pattern"),
                // api_key = '...' style assignments
                Regex::new(r#"(?i)\bapi[-_]?key\b\s*[:=]\s*['"]?[A-Za-z0-9_\-]{24,}['"]?"#)
                    .expect("generic api key pattern"),
                // secret/token/password = '...' style assignments
                Regex::new(r#"(?i)\b(secret|token|passwd|password)\b\s*[:=]\s*['"][^'"]{12,}['"]"#)
                    .expect("generic secret assignment pattern"),
            ]
        })
    }

    pub fn redact(text: &str) -> RedactionOutcome {
        let mut outcome = RedactionOutcome {
            text: text.to_string(),
            secrets_removed: 0,
        };

        for re in Self::patterns() {
            let matches = re.find_iter(&outcome.text).count();
            if matches > 0 {
                outcome.text = re.replace_all(&outcome.text, "[REDACTED_SECRET]").into_owned();
                outcome.secrets_removed += matches;
            }
        }

        outcome
    }

    /// Redact every message in an outbound conversation, regardless of role.
    ///
    /// System prompts carry repository and git context and are exactly where a
    /// leaked `.env` snippet would end up, so they are not exempt.
    pub fn redact_messages(messages: &[AIMessage]) -> (Vec<AIMessage>, usize) {
        let mut total = 0usize;
        let redacted = messages
            .iter()
            .map(|m| {
                let outcome = Self::redact(&m.content);
                total += outcome.secrets_removed;
                AIMessage {
                    role: m.role.clone(),
                    content: outcome.text,
                }
            })
            .collect();
        (redacted, total)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strips_vendor_tokens() {
        let input = "key=ghp_abcdefghijklmnopqrstuvwxyz0123456789 and sk-ant-api03-abcdefghijklmnopqrst";
        let outcome = RedactionEngine::redact(input);
        assert!(!outcome.text.contains("ghp_"));
        assert!(!outcome.text.contains("sk-ant-"));
        assert_eq!(outcome.secrets_removed, 2);
        assert!(outcome.text.contains("[REDACTED_SECRET]"));
    }

    #[test]
    fn strips_pem_block_entirely() {
        let input = "before\n-----BEGIN RSA PRIVATE KEY-----\nMIIBogIBAAJB\n-----END RSA PRIVATE KEY-----\nafter";
        let outcome = RedactionEngine::redact(input);
        assert!(!outcome.text.contains("MIIBogIBAAJB"));
        assert!(outcome.text.contains("before"));
        assert!(outcome.text.contains("after"));
    }

    #[test]
    fn leaves_benign_text_alone() {
        let input = "We chose PostgreSQL for the project brain and React for the renderer.";
        let outcome = RedactionEngine::redact(input);
        assert_eq!(outcome.text, input);
        assert_eq!(outcome.secrets_removed, 0);
    }

    #[test]
    fn redacts_all_message_roles() {
        let messages = vec![
            AIMessage {
                role: "system".into(),
                content: "context AKIAABCDEFGHIJKLMNOP".into(),
            },
            AIMessage {
                role: "user".into(),
                content: "plain request".into(),
            },
        ];
        let (redacted, count) = RedactionEngine::redact_messages(&messages);
        assert_eq!(count, 1);
        assert!(redacted[0].content.contains("[REDACTED_SECRET]"));
        assert_eq!(redacted[1].content, "plain request");
    }
}
