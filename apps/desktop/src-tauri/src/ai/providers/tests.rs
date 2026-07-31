//! End-to-end tests for the provider transport.
//!
//! These stand up a real TCP listener serving canned responses and drive the
//! actual provider implementations against it, so the SSE framing, the delta
//! extraction, and the error mapping are all exercised rather than mocked out.
//! No network access and no third-party test dependency.

use super::{
    anthropic::AnthropicProvider, gemini::GeminiProvider, opencode::OpenCodeProvider, AIMessage,
    AIProvider, CompletionRequest, ProviderConfig, ProviderError, StreamEvent,
};
use std::io::{BufRead, BufReader, Write};
use std::net::{TcpListener, TcpStream};
use std::thread;

/// Serves exactly one HTTP response, then shuts down. Returns the base URL.
fn serve_once(status_line: &'static str, headers: &'static str, body: &'static str) -> String {
    let listener = TcpListener::bind("127.0.0.1:0").expect("bind ephemeral port");
    let addr = listener.local_addr().expect("local addr");

    thread::spawn(move || {
        if let Ok((stream, _)) = listener.accept() {
            let _ = respond(stream, status_line, headers, body);
        }
    });

    format!("http://127.0.0.1:{}", addr.port())
}

fn respond(
    mut stream: TcpStream,
    status_line: &str,
    headers: &str,
    body: &str,
) -> std::io::Result<()> {
    // Drain the request head so the client isn't blocked writing.
    let mut reader = BufReader::new(stream.try_clone()?);
    let mut content_length = 0usize;
    loop {
        let mut line = String::new();
        if reader.read_line(&mut line)? == 0 {
            break;
        }
        if let Some(v) = line.to_lowercase().strip_prefix("content-length:") {
            content_length = v.trim().parse().unwrap_or(0);
        }
        if line == "\r\n" || line == "\n" {
            break;
        }
    }
    if content_length > 0 {
        let mut body_buf = vec![0u8; content_length];
        use std::io::Read;
        let _ = reader.read_exact(&mut body_buf);
    }

    write!(
        stream,
        "{status_line}\r\n{headers}Content-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    )?;
    stream.flush()
}

fn config(base: &str) -> ProviderConfig {
    ProviderConfig {
        api_key: Some("test-key".to_string()),
        base_url: Some(base.to_string()),
    }
}

fn request() -> CompletionRequest {
    CompletionRequest::new(
        "test-model",
        vec![AIMessage {
            role: "user".to_string(),
            content: "hello".to_string(),
        }],
    )
}

/// Collects a provider's stream into (text, terminal event).
async fn drain(
    provider: &dyn AIProvider,
    cfg: &ProviderConfig,
) -> (String, Option<StreamEvent>, Result<(), ProviderError>) {
    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();
    let result = provider.stream(cfg, request(), tx).await;

    let mut text = String::new();
    let mut terminal = None;
    while let Some(event) = rx.recv().await {
        match event {
            StreamEvent::Delta { text: t } => text.push_str(&t),
            other => {
                terminal = Some(other);
                break;
            }
        }
    }
    (text, terminal, result)
}

const SSE_HEADERS: &str = "Content-Type: text/event-stream\r\n";

#[tokio::test]
async fn anthropic_assembles_deltas_in_order() {
    // Real Anthropic SSE framing, including events we must ignore.
    let body = concat!(
        "event: message_start\n",
        "data: {\"type\":\"message_start\"}\n\n",
        "event: content_block_delta\n",
        "data: {\"type\":\"content_block_delta\",\"delta\":{\"type\":\"text_delta\",\"text\":\"Hello\"}}\n\n",
        "event: content_block_delta\n",
        "data: {\"type\":\"content_block_delta\",\"delta\":{\"type\":\"text_delta\",\"text\":\", world\"}}\n\n",
        "event: message_stop\n",
        "data: {\"type\":\"message_stop\"}\n\n",
    );
    let base = serve_once("HTTP/1.1 200 OK", SSE_HEADERS, body);

    let (text, terminal, result) = drain(&AnthropicProvider, &config(&base)).await;

    assert!(result.is_ok(), "stream failed: {result:?}");
    assert_eq!(text, "Hello, world");
    assert!(matches!(terminal, Some(StreamEvent::Done { .. })));
}

#[tokio::test]
async fn anthropic_complete_buffers_the_stream() {
    let body = concat!(
        "data: {\"type\":\"content_block_delta\",\"delta\":{\"type\":\"text_delta\",\"text\":\"buffered\"}}\n\n",
        "data: {\"type\":\"message_stop\"}\n\n",
    );
    let base = serve_once("HTTP/1.1 200 OK", SSE_HEADERS, body);

    let res = AnthropicProvider
        .complete(&config(&base), request())
        .await
        .expect("complete failed");

    assert_eq!(res.content, "buffered");
    assert_eq!(res.model_id, "test-model");
}

#[tokio::test]
async fn openai_compatible_handles_done_sentinel() {
    // OpenCode/Ollama/OpenAI all share this framing, including the [DONE]
    // sentinel that is not valid JSON.
    let body = concat!(
        "data: {\"choices\":[{\"delta\":{\"content\":\"local \"}}]}\n\n",
        "data: {\"choices\":[{\"delta\":{\"content\":\"model\"}}]}\n\n",
        "data: [DONE]\n\n",
    );
    let base = serve_once("HTTP/1.1 200 OK", SSE_HEADERS, body);

    let cfg = ProviderConfig {
        api_key: None, // local provider — no credential
        base_url: Some(base),
    };
    let (text, terminal, result) = drain(&OpenCodeProvider, &cfg).await;

    assert!(result.is_ok(), "stream failed: {result:?}");
    assert_eq!(text, "local model");
    assert!(matches!(terminal, Some(StreamEvent::Done { .. })));
}

#[tokio::test]
async fn gemini_extracts_candidate_parts() {
    let body = concat!(
        "data: {\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"from \"}]}}]}\n\n",
        "data: {\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"gemini\"}]}}]}\n\n",
    );
    let base = serve_once("HTTP/1.1 200 OK", SSE_HEADERS, body);

    let (text, _, result) = drain(&GeminiProvider, &config(&base)).await;

    assert!(result.is_ok(), "stream failed: {result:?}");
    assert_eq!(text, "from gemini");
}

#[tokio::test]
async fn auth_failure_is_typed_not_stringly() {
    let base = serve_once(
        "HTTP/1.1 401 Unauthorized",
        "Content-Type: application/json\r\n",
        r#"{"error":{"message":"invalid x-api-key"}}"#,
    );

    let (_, terminal, result) = drain(&AnthropicProvider, &config(&base)).await;

    assert!(
        matches!(result, Err(ProviderError::Auth { .. })),
        "expected typed Auth error, got {result:?}"
    );
    // The failure must also reach the stream consumer, not just the return value.
    assert!(matches!(
        terminal,
        Some(StreamEvent::Failed {
            error: ProviderError::Auth { .. }
        })
    ));
}

#[tokio::test]
async fn rate_limit_carries_retry_after() {
    let base = serve_once(
        "HTTP/1.1 429 Too Many Requests",
        "Retry-After: 42\r\nContent-Type: application/json\r\n",
        "{}",
    );

    let (_, _, result) = drain(&AnthropicProvider, &config(&base)).await;

    match result {
        Err(ProviderError::RateLimit {
            retry_after_secs, ..
        }) => assert_eq!(retry_after_secs, Some(42)),
        other => panic!("expected RateLimit, got {other:?}"),
    }
}

#[tokio::test]
async fn upstream_error_is_marked_retryable() {
    let base = serve_once("HTTP/1.1 503 Service Unavailable", "", "");

    let (_, _, result) = drain(&AnthropicProvider, &config(&base)).await;

    match result {
        Err(e) => {
            assert!(matches!(e, ProviderError::Upstream { .. }));
            assert!(e.is_retryable(), "5xx should be retryable");
        }
        Ok(()) => panic!("expected an error"),
    }
}

#[tokio::test]
async fn unreachable_local_provider_says_so() {
    // Nothing is listening on this port. A local daemon that isn't running is
    // the most common failure for OpenCode/Ollama and deserves its own variant
    // rather than a bare connection-refused.
    let cfg = ProviderConfig {
        api_key: None,
        base_url: Some("http://127.0.0.1:1".to_string()),
    };

    let (_, _, result) = drain(&OpenCodeProvider, &cfg).await;

    assert!(
        matches!(result, Err(ProviderError::LocalUnavailable { .. })),
        "expected LocalUnavailable, got {result:?}"
    );
}

#[tokio::test]
async fn missing_credential_short_circuits_before_any_request() {
    let cfg = ProviderConfig {
        api_key: None,
        base_url: Some("http://127.0.0.1:1".to_string()),
    };

    let result = AnthropicProvider.complete(&cfg, request()).await;

    assert!(
        matches!(result, Err(ProviderError::MissingCredential { .. })),
        "expected MissingCredential, got {result:?}"
    );
}

#[test]
fn normalize_lifts_system_messages_out_of_the_message_list() {
    // Anthropic takes `system` as a top-level field, OpenAI as a role. Callers
    // build one flat list; normalization is what makes that portable.
    let req = CompletionRequest::new(
        "m",
        vec![
            AIMessage {
                role: "system".into(),
                content: "be terse".into(),
            },
            AIMessage {
                role: "user".into(),
                content: "hi".into(),
            },
        ],
    )
    .normalized();

    assert_eq!(req.system.as_deref(), Some("be terse"));
    assert_eq!(req.messages.len(), 1);
    assert_eq!(req.messages[0].role, "user");
}

#[test]
fn normalize_joins_multiple_system_messages() {
    let req = CompletionRequest::new(
        "m",
        vec![
            AIMessage {
                role: "system".into(),
                content: "first".into(),
            },
            AIMessage {
                role: "system".into(),
                content: "second".into(),
            },
        ],
    )
    .normalized();

    assert_eq!(req.system.as_deref(), Some("first\n\nsecond"));
    assert!(req.messages.is_empty());
}
