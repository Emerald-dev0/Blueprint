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
        let client = reqwest::Client::new();
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
            model_id, api_key
        );

        let contents: Vec<serde_json::Value> = messages.into_iter().map(|m| {
            json!({
                "role": if m.role == "assistant" { "model" } else { "user" },
                "parts": [{"text": m.content}]
            })
        }).collect();

        let body = json!({ "contents": contents });

        let res = client.post(url)
            .json(&body)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;

        let text = json["candidates"][0]["content"]["parts"][0]["text"]
            .as_str()
            .ok_or_else(|| format!("Invalid response from Gemini: {:?}", json))?;

        Ok(CompletionResponse {
            content: text.to_string(),
            model_id: model_id.to_string(),
        })
    }
}
