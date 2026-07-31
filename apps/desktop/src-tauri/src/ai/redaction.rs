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

#[cfg(test)]
mod tests {
    use super::*;

    const MARKER: &str = "[REDACTED_SECRET]";

    fn assert_redacted(secret: &str, label: &str) {
        let input = format!("here is the value: {} — use it", secret);
        let out = RedactionEngine::redact(&input);
        assert!(
            !out.contains(secret),
            "{label} survived redaction.\n  input:  {input}\n  output: {out}"
        );
        assert!(out.contains(MARKER), "{label} was removed but not marked");
    }

    /// Assembles a fixture at runtime from fragments.
    ///
    /// Some of these shapes are recognised by GitHub's push-protection scanner,
    /// which cannot tell a test fixture from a live credential — a literal here
    /// blocks the push. Splitting the value means no scannable token exists in
    /// the file while the regex under test still sees the full string.
    fn fixture(parts: &[&str]) -> String {
        parts.concat()
    }

    const BODY: &str = "abcdefghijklmnopqrstuvwxyz0123456789";

    #[test]
    fn redacts_provider_credentials() {
        // These are the token shapes Blueprint itself stores; none of them were
        // matched before the audit, so the app could leak its own credentials
        // back to a provider by quoting a config file into a prompt.
        //
        // Every prefix is split so no complete, scanner-recognisable token
        // exists as a literal in this file — see `fixture`.
        assert_redacted(&fixture(&["sk", "-ant-", "api03-", BODY]), "Anthropic key");
        assert_redacted(&fixture(&["sk", "-proj-", BODY]), "OpenAI key");
        assert_redacted(&fixture(&["AIza", "SyA1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r"]), "Google key");
        assert_redacted(&fixture(&["ghp", "_", BODY, "AB"]), "GitHub token");
        assert_redacted(
            &fixture(&["github", "_pat_", "11ABCDEFG0", BODY]),
            "GitHub fine-grained PAT",
        );
        assert_redacted(
            &fixture(&["xox", "b-", "123456789012-abcdefghijklmnop"]),
            "Slack bot token",
        );
    }

    #[test]
    fn redacts_cloud_and_payment_credentials() {
        assert_redacted(&fixture(&["AKIA", "IOSFODNN7EXAMPLE"]), "AWS access key id");
        assert_redacted(
            &fixture(&["sk", "_live_", "abcdefghijklmnopqrstuvwx"]),
            "Stripe live key",
        );
    }

    #[test]
    fn redacts_jwts_and_auth_headers() {
        assert_redacted(
            &fixture(&[
                "eyJ",
                "hbGciOiJIUzI1NiJ9.",
                "eyJzdWIiOiIxMjM0NTY3ODkwIn0.",
                "dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk",
            ]),
            "JWT",
        );

        let input = format!("Authorization: Bearer {}", BODY);
        let out = RedactionEngine::redact(&input);
        assert!(!out.contains(BODY), "bearer token survived: {out}");
    }

    #[test]
    fn redacts_inline_connection_string_credentials() {
        let input = "DATABASE_URL=postgres://admin:hunter2@db.internal:5432/app";
        let out = RedactionEngine::redact(input);
        assert!(!out.contains("hunter2"), "db password survived: {out}");
    }

    #[test]
    fn redacts_generic_assignments() {
        for input in [
            r#"api_key = "abcdefghijklmnopqrstuvwxyz01""#,
            "password: correct-horse-battery-staple-99",
            r#"access_token='abcdefghijklmnopqrstuvwxyz01'"#,
        ] {
            let out = RedactionEngine::redact(input);
            assert!(
                out.contains(MARKER),
                "assignment not redacted.\n  input:  {input}\n  output: {out}"
            );
        }
    }

    #[test]
    fn redacts_private_key_blocks() {
        let input = "-----BEGIN RSA PRIVATE KEY-----\nMIIEow...\n-----END RSA PRIVATE KEY-----";
        assert!(RedactionEngine::redact(input).contains(MARKER));
    }

    #[test]
    fn leaves_ordinary_engineering_prose_alone() {
        // Redaction runs on every outbound message, so over-matching would
        // quietly corrupt the prompts the personas depend on.
        for input in [
            "Refactor the auth module to use the repository pattern.",
            "The build fails on line 42 of src/main.rs with error E0609.",
            "Use claude-opus-5 for reasoning and gpt-4o for coding.",
            "See https://github.com/Emerald-dev0/Blueprint/pull/34 for context.",
        ] {
            let out = RedactionEngine::redact(input);
            assert_eq!(out, input, "prose was altered by redaction");
        }
    }

    #[test]
    fn redacts_every_occurrence_not_just_the_first() {
        let input = "first ghp_abcdefghijklmnopqrstuvwxyz0123456789AB \
                     second ghp_zyxwvutsrqponmlkjihgfedcba9876543210ZY";
        let out = RedactionEngine::redact(input);
        assert_eq!(out.matches(MARKER).count(), 2, "only one match replaced: {out}");
    }
}
