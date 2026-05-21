use serde::{Deserialize, Serialize};
use tauri::State;

use crate::db::Database;

#[derive(Debug, Serialize, Deserialize)]
pub struct MemoryEntry {
    pub id: i64,
    pub key: String,
    pub content: String,
    pub updated_at: i64,
}

#[tauri::command]
pub fn save_memory(db: State<Database>, key: String, content: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().timestamp();
    conn.execute(
        "INSERT INTO memories (key, content, updated_at) VALUES (?1, ?2, ?3)
         ON CONFLICT(key) DO UPDATE SET content = ?2, updated_at = ?3",
        rusqlite::params![key, content, now],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_memories(db: State<Database>, limit: Option<usize>) -> Result<Vec<MemoryEntry>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let limit = limit.unwrap_or(20);
    let mut stmt = conn
        .prepare("SELECT id, key, content, updated_at FROM memories ORDER BY updated_at DESC LIMIT ?1")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(rusqlite::params![limit as i64], |row| {
            Ok(MemoryEntry {
                id: row.get(0)?,
                key: row.get(1)?,
                content: row.get(2)?,
                updated_at: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut entries = Vec::new();
    for row in rows {
        entries.push(row.map_err(|e| e.to_string())?);
    }
    Ok(entries)
}

#[tauri::command]
pub fn delete_memory(db: State<Database>, key: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM memories WHERE key = ?1", rusqlite::params![key])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn save_conversation(
    db: State<Database>,
    id: String,
    role: String,
    content: String,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().timestamp();
    conn.execute(
        "INSERT INTO conversations (id, role, content, created_at) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![id, role, content, now],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConversationEntry {
    pub id: String,
    pub role: String,
    pub content: String,
    pub created_at: i64,
}

#[tauri::command]
pub fn get_conversations(
    db: State<Database>,
    limit: Option<usize>,
) -> Result<Vec<ConversationEntry>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let limit = limit.unwrap_or(50);
    let mut stmt = conn
        .prepare(
            "SELECT id, role, content, created_at FROM conversations ORDER BY created_at DESC LIMIT ?1",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(rusqlite::params![limit as i64], |row| {
            Ok(ConversationEntry {
                id: row.get(0)?,
                role: row.get(1)?,
                content: row.get(2)?,
                created_at: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut entries = Vec::new();
    for row in rows {
        entries.push(row.map_err(|e| e.to_string())?);
    }
    Ok(entries)
}

// Internal helpers (not Tauri commands)
pub fn get_memories_inner(db: &Database, limit: usize) -> Result<Vec<MemoryEntry>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, key, content, updated_at FROM memories ORDER BY updated_at DESC LIMIT ?1")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(rusqlite::params![limit as i64], |row| {
            Ok(MemoryEntry {
                id: row.get(0)?,
                key: row.get(1)?,
                content: row.get(2)?,
                updated_at: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut entries = Vec::new();
    for row in rows {
        entries.push(row.map_err(|e| e.to_string())?);
    }
    Ok(entries)
}

pub fn save_memory_inner(db: &Database, key: &str, content: &str) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().timestamp();
    conn.execute(
        "INSERT INTO memories (key, content, updated_at) VALUES (?1, ?2, ?3)
         ON CONFLICT(key) DO UPDATE SET content = ?2, updated_at = ?3",
        rusqlite::params![key, content, now],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
