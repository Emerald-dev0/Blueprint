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
                Regex::new(r"sk_live_[0-9a-zA-Z]{24}").unwrap(),
                // Generic API Keys
                Regex::new(r"api[-_]key[=: ]+['\"][0-9a-zA-Z]{32,48}['\"]").unwrap(),
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
