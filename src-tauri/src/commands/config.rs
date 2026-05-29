use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::State;

use crate::{db::Database, services::secret_store};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Preferences {
    pub pet_name: String,
    pub llm_provider: String,
    pub llm_model: String,
    pub ui_language: String,
    pub screenshot_hide: bool,
    pub live2d_enabled: bool,
    pub model_id: String,
    pub model_type: String,
    pub model_path: String,
    pub model_name: String,
    pub pet_scale: f64,
    pub always_on_top: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub prefs: Preferences,
    pub llm_api_key: String,
}

impl Default for Preferences {
    fn default() -> Self {
        Self {
            pet_name: "Lumi".to_string(),
            llm_provider: "openai".to_string(),
            llm_model: "gpt-4o-mini".to_string(),
            ui_language: "zh".to_string(),
            screenshot_hide: false,
            live2d_enabled: true,
            model_id: "haru".to_string(),
            model_type: "live2d".to_string(),
            model_path: "models/haru_greeter_t03/haru_greeter_t03.model3.json".to_string(),
            model_name: "Haru".to_string(),
            pet_scale: 1.0,
            always_on_top: true,
        }
    }
}

fn parse_bool(value: Option<&String>, default: bool) -> bool {
    value
        .map(|v| matches!(v.as_str(), "true" | "1" | "yes"))
        .unwrap_or(default)
}

fn parse_f64(value: Option<&String>, default: f64) -> f64 {
    value
        .and_then(|v| v.parse::<f64>().ok())
        .unwrap_or(default)
}

fn get_string(map: &HashMap<String, String>, key: &str, default: &str) -> String {
    map.get(key).cloned().unwrap_or_else(|| default.to_string())
}

fn row_pairs(prefs: &Preferences) -> [(&str, String); 12] {
    [
        ("pet_name", prefs.pet_name.clone()),
        ("llm_provider", prefs.llm_provider.clone()),
        ("llm_model", prefs.llm_model.clone()),
        ("ui_language", prefs.ui_language.clone()),
        ("screenshot_hide", prefs.screenshot_hide.to_string()),
        ("live2d_enabled", prefs.live2d_enabled.to_string()),
        ("model_id", prefs.model_id.clone()),
        ("model_type", prefs.model_type.clone()),
        ("model_path", prefs.model_path.clone()),
        ("model_name", prefs.model_name.clone()),
        ("pet_scale", prefs.pet_scale.to_string()),
        ("always_on_top", prefs.always_on_top.to_string()),
    ]
}

fn upsert_preferences(db: &Database, prefs: &Preferences) -> Result<(), String> {
    let mut conn = db.conn.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    for (key, value) in row_pairs(prefs) {
        tx.execute(
            "INSERT INTO preferences (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            rusqlite::params![key, value],
        )
        .map_err(|e| e.to_string())?;
    }
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

fn read_preferences(db: &Database) -> Result<Preferences, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT key, value FROM preferences")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))
        .map_err(|e| e.to_string())?;

    let mut map = HashMap::new();
    for row in rows {
        let (key, value) = row.map_err(|e| e.to_string())?;
        map.insert(key, value);
    }

    let defaults = Preferences::default();
    Ok(Preferences {
        pet_name: get_string(&map, "pet_name", &defaults.pet_name),
        llm_provider: get_string(&map, "llm_provider", &defaults.llm_provider),
        llm_model: get_string(&map, "llm_model", &defaults.llm_model),
        ui_language: get_string(&map, "ui_language", &defaults.ui_language),
        screenshot_hide: parse_bool(map.get("screenshot_hide"), defaults.screenshot_hide),
        live2d_enabled: parse_bool(map.get("live2d_enabled"), defaults.live2d_enabled),
        model_id: get_string(&map, "model_id", &defaults.model_id),
        model_type: get_string(&map, "model_type", &defaults.model_type),
        model_path: get_string(&map, "model_path", &defaults.model_path),
        model_name: get_string(&map, "model_name", &defaults.model_name),
        pet_scale: parse_f64(map.get("pet_scale"), defaults.pet_scale),
        always_on_top: parse_bool(map.get("always_on_top"), defaults.always_on_top),
    })
}

#[tauri::command]
pub fn get_preferences(db: State<Database>) -> Result<Preferences, String> {
    read_preferences(&db)
}

#[tauri::command]
pub fn save_preferences(db: State<Database>, prefs: Preferences) -> Result<(), String> {
    upsert_preferences(&db, &prefs)
}

#[tauri::command]
pub fn get_app_settings(db: State<Database>) -> Result<AppSettings, String> {
    let prefs = read_preferences(&db)?;
    let llm_api_key = secret_store::get_api_key(&prefs.llm_provider)?.unwrap_or_default();
    Ok(AppSettings { prefs, llm_api_key })
}

#[tauri::command]
pub fn save_app_settings(db: State<Database>, settings: AppSettings) -> Result<(), String> {
    upsert_preferences(&db, &settings.prefs)?;
    secret_store::set_api_key(&settings.prefs.llm_provider, &settings.llm_api_key)?;
    Ok(())
}

#[tauri::command]
pub fn set_preference(db: State<Database>, key: String, value: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO preferences (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        rusqlite::params![key, value],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_api_key(provider: String) -> Result<Option<String>, String> {
    secret_store::get_api_key(&provider)
}

#[tauri::command]
pub fn set_api_key(provider: String, api_key: String) -> Result<(), String> {
    secret_store::set_api_key(&provider, &api_key)
}
