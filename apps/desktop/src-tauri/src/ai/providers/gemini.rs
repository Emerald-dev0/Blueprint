use super::{AIProvider, AIMessage, CompletionResponse};
use async_trait::async_trait;
use serde_json::json;

pub struct GeminiProvider;

#[async_trait]
impl AIProvider for GeminiProvider {
    fn id(&self) -> &str {
        "gemini"
    }

    async fn complete(&self, api_key: &str, messages: Vec<AIMessage>, model_id: &str) -> Result<CompletionResponse, String> {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(120))
            .build()
            .map_err(|e| e.to_string())?;

        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent",
            model_id
        );

        // Gemini also accepts `?key=`, but a key in the query string leaks into
        // proxy logs, crash reports and any error surface that echoes the URL.
        // Send it as a header instead.
        let contents: Vec<serde_json::Value> = messages.into_iter().map(|m| {
            json!({
                "role": if m.role == "assistant" { "model" } else { "user" },
                "parts": [{"text": m.content}]
            })
        }).collect();

        let body = json!({ "contents": contents });

        let res = client.post(url)
            .header("x-goog-api-key", api_key)
            .json(&body)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        let status = res.status();
        if !status.is_success() {
            // Do not echo the response body verbatim into the error: it can
            // contain the echoed request, and this string is surfaced in the UI.
            return Err(format!("Gemini request failed with status {}", status));
        }

        let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;

        let text = json["candidates"][0]["content"]["parts"][0]["text"]
            .as_str()
            .ok_or("Gemini returned a response with no text candidate")?;

        Ok(CompletionResponse {
            content: text.to_string(),
            model_id: model_id.to_string(),
        })
    }
}
