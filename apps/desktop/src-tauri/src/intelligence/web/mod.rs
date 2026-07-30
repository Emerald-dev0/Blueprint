use serde::{Deserialize, Serialize};
use scraper::{Html, Selector};
use reqwest::Client;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WebAnalysis {
    pub title: String,
    pub description: Option<String>,
    pub tech_detected: Vec<String>,
    pub headings: Vec<String>,
}

pub struct WebIntelligence;

impl WebIntelligence {
    pub async fn analyze(url: &str) -> Result<WebAnalysis, String> {
        let client = Client::new();
        let res = client.get(url)
            .header("User-Agent", "Blueprint-Intelligence/1.0")
            .send()
            .await
            .map_err(|e| e.to_string())?;

        let html_content = res.text().await.map_err(|e| e.to_string())?;
        let document = Html::parse_document(&html_content);

        let title_selector = Selector::parse("title").unwrap();
        let title = document.select(&title_selector)
            .next()
            .map(|e| e.inner_html())
            .unwrap_or_else(|| "Unknown".to_string());

        let mut headings = Vec::new();
        let h1_selector = Selector::parse("h1").unwrap();
        for h1 in document.select(&h1_selector) {
            headings.push(h1.text().collect());
        }

        // Basic tech detection via script tags/classes
        let mut tech = Vec::new();
        if html_content.contains("__NEXT_DATA__") {
            tech.push("Next.js".to_string());
        }
        if html_content.contains("svelte-") {
            tech.push("Svelte".to_string());
        }

        Ok(WebAnalysis {
            title,
            description: None,
            tech_detected: tech,
            headings,
        })
    }
}
