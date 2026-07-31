use serde::{Deserialize, Serialize};
use tauri::{Emitter, Window};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SystemEvent {
    pub event_type: String,
    pub payload: serde_json::Value,
}

pub struct EventBus;

impl EventBus {
    pub fn publish(window: &Window, event_type: &str, payload: serde_json::Value) -> Result<(), String> {
        window.emit("system-event", SystemEvent {
            event_type: event_type.to_string(),
            payload,
        }).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn publish_system_event(window: Window, event_type: String, payload: serde_json::Value) -> Result<(), String> {
    EventBus::publish(&window, &event_type, payload)
}
