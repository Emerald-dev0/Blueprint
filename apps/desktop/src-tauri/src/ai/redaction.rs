use regex::Regex;
use std::sync::OnceLock;

static SECRET_PATTERNS: OnceLock<Vec<Regex>> = OnceLock::new();

pub struct RedactionEngine;

impl RedactionEngine {
    fn patterns() -> &'static Vec<Regex> {
        SECRET_PATTERNS.get_or_init(|| {
            vec![
                // AWS
                Regex::new(r"AKIA[0-9A-Z]{16}").unwrap(),
                // Stripe
                Regex::new(r"sk_live_[0-9a-zA-Z]{24,}").unwrap(),
                // OpenAI (sk-..., sk-proj-...)
                Regex::new(r"sk-(?:proj-)?[A-Za-z0-9_-]{20,}").unwrap(),
                // Anthropic
                Regex::new(r"sk-ant-[A-Za-z0-9_-]{20,}").unwrap(),
                // Google / Gemini
                Regex::new(r"AIza[0-9A-Za-z_-]{35}").unwrap(),
                // GitHub personal access / OAuth / app / refresh tokens
                Regex::new(r"gh[pousr]_[A-Za-z0-9]{36,}").unwrap(),
                Regex::new(r"github_pat_[A-Za-z0-9_]{22,}").unwrap(),
                // Slack
                Regex::new(r"xox[baprs]-[A-Za-z0-9-]{10,}").unwrap(),
                // JWTs
                Regex::new(r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}").unwrap(),
                // Authorization headers
                Regex::new(r"(?i)authorization:\s*(?:bearer|basic|token)\s+[A-Za-z0-9._~+/=-]{16,}").unwrap(),
                // Generic assignments: api_key = "...", secret: '...', token=...
                Regex::new(r#"(?i)(?:api[-_]?key|secret|passwd|password|access[-_]?token|auth[-_]?token)["']?\s*[=:]\s*["']?[A-Za-z0-9._~+/=-]{16,}"#).unwrap(),
                // Connection strings with inline credentials
                Regex::new(r"(?i)[a-z][a-z0-9+.-]*://[^\s:/@]+:[^\s/@]+@").unwrap(),
                // Private Keys
                Regex::new(r"-----BEGIN [A-Z ]+ PRIVATE KEY-----").unwrap(),
            ]
        })
    }

    pub fn redact(text: &str) -> String {
        let mut redacted = text.to_string();
        for re in Self::patterns() {
            redacted = re.replace_all(&redacted, "[REDACTED_SECRET]").to_string();
        }
        redacted
    }
}
