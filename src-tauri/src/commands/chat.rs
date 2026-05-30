use serde::{Deserialize, Serialize};
use tauri::State;

use crate::{db::Database, services::secret_store};

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatRequest {
    pub message: String,
    pub provider: String,
    pub model: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatResponse {
    pub reply: String,
}

fn preview_chars(value: &str, limit: usize) -> String {
    value.chars().take(limit).collect()
}

#[tauri::command]
pub async fn send_message(
    db: State<'_, Database>,
    request: ChatRequest,
) -> Result<ChatResponse, String> {
    // Retrieve recent memories for context
    let memories = crate::commands::memory::get_memories_inner(&db, 5)?;

    // Build system prompt with memory context
    let memory_context = if memories.is_empty() {
        String::new()
    } else {
        let lines: Vec<String> = memories
            .iter()
            .map(|m| format!("- {}: {}", m.key, m.content))
            .collect();
        format!("\n\n过去的重要记忆:\n{}", lines.join("\n"))
    };

    let memory_prompt = if memories.is_empty() {
        String::new()
    } else {
        format!("\n这是你和用户之间的一些记忆摘要，可以在对话中自然提及:\n{}", memory_context)
    };

    let system_prompt = format!(
        "你是一个可爱的桌宠 AI，名字叫 Lumi。你友好、热情、有好奇心。\
        回复要简洁，像朋友聊天一样。{}",
        memory_prompt
    );

    let api_key = if request.provider == "local" {
        String::new()
    } else {
        secret_store::get_api_key(&request.provider)?
            .filter(|key| !key.trim().is_empty())
            .ok_or_else(|| format!("Missing API key for provider: {}", request.provider))?
    };

    // Call LLM API
    let reply = call_llm(&request.provider, &api_key, &request.model, &system_prompt, &request.message).await?;

    // Save this conversation to memory as a summary
    let summary_key = format!("conv_{}", chrono::Utc::now().timestamp());
    let user_preview = preview_chars(&request.message, 100);
    let reply_preview = preview_chars(&reply, 100);
    let summary = format!("用户: {}\nLumi: {}", user_preview, reply_preview);
    crate::commands::memory::save_memory_inner(&db, &summary_key, &summary)?;

    Ok(ChatResponse { reply })
}

async fn call_llm(
    provider: &str,
    api_key: &str,
    model: &str,
    system_prompt: &str,
    user_message: &str,
) -> Result<String, String> {
    match provider {
        "openai" => call_openai(api_key, model, system_prompt, user_message).await,
        "anthropic" => call_anthropic(api_key, model, system_prompt, user_message).await,
        "deepseek" => call_deepseek(api_key, model, system_prompt, user_message).await,
        "local" => call_ollama(model, system_prompt, user_message).await,
        _ => Err(format!("Unsupported provider: {}", provider)),
    }
}

async fn call_openai(
    api_key: &str,
    model: &str,
    system_prompt: &str,
    user_message: &str,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ],
        "max_tokens": 512,
        "temperature": 0.8
    });

    let resp = client
        .post("https://api.openai.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("HTTP error: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("OpenAI error ({}): {}", status, text));
    }

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    json["choices"][0]["message"]["content"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Unexpected OpenAI response format".to_string())
}

async fn call_anthropic(
    api_key: &str,
    model: &str,
    system_prompt: &str,
    user_message: &str,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "model": model,
        "max_tokens": 512,
        "system": system_prompt,
        "messages": [
            {"role": "user", "content": user_message}
        ]
    });

    let resp = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("HTTP error: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("Anthropic error ({}): {}", status, text));
    }

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    json["content"][0]["text"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Unexpected Anthropic response format".to_string())
}

async fn call_deepseek(
    api_key: &str,
    model: &str,
    system_prompt: &str,
    user_message: &str,
) -> Result<String, String> {
    // DeepSeek uses OpenAI-compatible API
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ],
        "max_tokens": 512,
        "temperature": 0.8
    });

    let resp = client
        .post("https://api.deepseek.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("HTTP error: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("DeepSeek error ({}): {}", status, text));
    }

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    json["choices"][0]["message"]["content"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Unexpected DeepSeek response format".to_string())
}

async fn call_ollama(model: &str, system_prompt: &str, user_message: &str) -> Result<String, String> {
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "model": model,
        "system": system_prompt,
        "prompt": user_message,
        "stream": false
    });

    let resp = client
        .post("http://localhost:11434/api/generate")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("HTTP error: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("Ollama error ({}): {}", status, text));
    }

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    json["response"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Unexpected Ollama response format".to_string())
}
