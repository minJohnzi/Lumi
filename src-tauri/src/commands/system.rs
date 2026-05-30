use serde::{Deserialize, Serialize};
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{command, Manager, PhysicalPosition, State};

use crate::db::Database;
use crate::services::screenshot::ScreenshotProtection;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelEntry {
    pub id: String,
    pub name: String,
    pub path: String,
    pub model_type: String, // "live2d" | "sprite"
    pub source: String, // "bundled" | "external"
}

#[tauri::command]
pub fn list_models() -> Result<Vec<ModelEntry>, String> {
    let mut entries = Vec::new();

    // Resolve public/models/ relative to the project root.
    // CARGO_MANIFEST_DIR is <root>/src-tauri at build time → parent = <root>
    let manifest_dir = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let base = manifest_dir
        .parent()
        .unwrap_or_else(|| std::path::Path::new("."))
        .join("public")
        .join("models");

    if !base.exists() {
        return Err(format!("模型目录不存在: {}", base.display()));
    }

    if let Ok(dir) = std::fs::read_dir(&base) {
        for entry in dir.flatten() {
            let folder = entry.path();
            if !folder.is_dir() { continue; }
            let name = folder.file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default();

            // Detect model type from files in folder
            let has_sprite = folder.join("sprite.json").exists();

            // Scan for Live2D model files (*.model3.json or *.model.json)
            let live2d_file: Option<String> = std::fs::read_dir(&folder).ok().and_then(|d| {
                d.flatten().find_map(|f| {
                    let s = f.file_name().to_string_lossy().to_string();
                    if s.ends_with(".model3.json") || s.ends_with(".model.json") {
                        Some(s)
                    } else {
                        None
                    }
                })
            });

            let (model_type, model_path) = if has_sprite {
                ("sprite".to_string(), format!("models/{}", name))
            } else if let Some(lf) = live2d_file {
                ("live2d".to_string(), format!("models/{}/{}", name, lf))
            } else {
                continue; // No recognized model
            };

            let id = name.to_lowercase().replace(' ', "-");
            entries.push(ModelEntry { id, name, path: model_path, model_type, source: "bundled".to_string() });
        }
    }

    Ok(entries)
}

#[tauri::command]
pub fn list_imported_models(db: State<Database>) -> Result<Vec<ModelEntry>, String> {
    let entries = {
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                "SELECT id, name, path, model_type, source
                 FROM model_catalog
                 ORDER BY updated_at DESC, name ASC",
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map([], |row| {
                Ok(ModelEntry {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    path: row.get(2)?,
                    model_type: row.get(3)?,
                    source: row.get(4)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut entries = Vec::new();
        for row in rows {
            entries.push(row.map_err(|e| e.to_string())?);
        }
        entries
    };

    let mut valid_entries = Vec::new();
    let mut stale_ids = Vec::new();
    for entry in entries {
        if entry.source == "external" && detect_external_model(&entry.path).is_err() {
            stale_ids.push(entry.id);
        } else {
            valid_entries.push(entry);
        }
    }

    if !stale_ids.is_empty() {
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        for id in stale_ids {
            conn.execute("DELETE FROM model_catalog WHERE id = ?1", rusqlite::params![id])
                .map_err(|e| e.to_string())?;
        }
    }

    Ok(valid_entries)
}

#[tauri::command]
pub fn add_model_from_path(db: State<Database>, path: String) -> Result<ModelEntry, String> {
    let entry = detect_external_model(&path)?;
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO model_catalog (id, name, path, model_type, source, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)
         ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            path = excluded.path,
            model_type = excluded.model_type,
            source = excluded.source,
            updated_at = excluded.updated_at",
        rusqlite::params![
            &entry.id,
            &entry.name,
            &entry.path,
            &entry.model_type,
            &entry.source,
            chrono::Utc::now().timestamp(),
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(entry)
}

#[tauri::command]
pub fn remove_imported_model(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM model_catalog WHERE id = ?1 AND source = 'external'", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn detect_external_model(input: &str) -> Result<ModelEntry, String> {
    let raw = input.trim().trim_matches('"');
    if raw.is_empty() {
        return Err("Model path is empty".to_string());
    }

    let candidate = PathBuf::from(raw);
    let canonical = candidate
        .canonicalize()
        .map_err(|_| format!("Model path does not exist: {raw}"))?;

    if canonical.is_dir() {
        if canonical.join("sprite.json").exists() {
            return Ok(make_external_entry(&canonical, &canonical, "sprite"));
        }
        if let Some(model_file) = find_live2d_model_file(&canonical) {
            return Ok(make_external_entry(&canonical, &model_file, "live2d"));
        }
        return Err("Folder must contain sprite.json or a Live2D .model3.json/.model.json file".to_string());
    }

    let file_name = canonical
        .file_name()
        .map(|value| value.to_string_lossy().to_string())
        .unwrap_or_default();
    if file_name == "sprite.json" {
        let folder = canonical
            .parent()
            .ok_or_else(|| "sprite.json must have a parent folder".to_string())?;
        return Ok(make_external_entry(folder, folder, "sprite"));
    }
    if is_live2d_model_file(&file_name) {
        let folder = canonical.parent().unwrap_or_else(|| Path::new(""));
        return Ok(make_external_entry(folder, &canonical, "live2d"));
    }

    Err("Unsupported model path. Choose a model folder, sprite.json, .model3.json, or .model.json".to_string())
}

fn find_live2d_model_file(folder: &Path) -> Option<PathBuf> {
    std::fs::read_dir(folder).ok()?.flatten().find_map(|entry| {
        let file_name = entry.file_name().to_string_lossy().to_string();
        if is_live2d_model_file(&file_name) {
            Some(entry.path())
        } else {
            None
        }
    })
}

fn is_live2d_model_file(file_name: &str) -> bool {
    file_name.ends_with(".model3.json") || file_name.ends_with(".model.json")
}

fn make_external_entry(name_source: &Path, model_path: &Path, model_type: &str) -> ModelEntry {
    let path = model_path.to_string_lossy().to_string();
    let name = name_source
        .file_name()
        .map(|value| value.to_string_lossy().to_string())
        .unwrap_or_else(|| "External model".to_string());
    let mut hasher = DefaultHasher::new();
    path.to_lowercase().hash(&mut hasher);
    let id = format!("external:{:x}", hasher.finish());
    ModelEntry {
        id,
        name,
        path,
        model_type: model_type.to_string(),
        source: "external".to_string(),
    }
}

#[derive(Debug, Serialize)]
pub struct SystemInfo {
    pub cpu_usage: f32,
    pub memory_total_gb: f64,
    pub memory_used_gb: f64,
    pub disk_total_gb: f64,
    pub disk_used_gb: f64,
    pub uptime_minutes: u64,
}

#[tauri::command]
pub fn get_system_info() -> Result<SystemInfo, String> {
    use sysinfo::System;

    let mut sys = System::new_all();
    sys.refresh_all();

    let cpu_usage = sys.global_cpu_usage();
    let memory_total = sys.total_memory() as f64;
    let memory_used = (sys.total_memory() - sys.available_memory()) as f64;
    let uptime_secs = System::uptime();
    let uptime_minutes = uptime_secs / 60;

    let mut disk_total: u64 = 0;
    let mut disk_used: u64 = 0;
    let disks = sysinfo::Disks::new_with_refreshed_list();
    for disk in disks.list() {
        if disk.is_removable() {
            continue;
        }
        disk_total += disk.total_space();
        disk_used += disk.total_space() - disk.available_space();
    }

    let to_gb = |bytes: u64| bytes as f64 / 1_073_741_824.0;

    Ok(SystemInfo {
        cpu_usage,
        memory_total_gb: to_gb(memory_total as u64),
        memory_used_gb: to_gb(memory_used as u64),
        disk_total_gb: to_gb(disk_total),
        disk_used_gb: to_gb(disk_used),
        uptime_minutes,
    })
}

#[tauri::command]
pub fn toggle_screenshot_detect(
    protection: State<Mutex<ScreenshotProtection>>,
    app_handle: tauri::AppHandle,
    enabled: bool,
) -> Result<(), String> {
    if let Ok(mut p) = protection.lock() {
        p.set_enabled(&app_handle, enabled);
    }
    Ok(())
}

#[tauri::command]
pub fn get_screenshot_detect_status(
    protection: State<Mutex<ScreenshotProtection>>,
) -> Result<bool, String> {
    if let Ok(p) = protection.lock() {
        Ok(p.is_enabled())
    } else {
        Ok(false)
    }
}

#[tauri::command]
pub async fn open_settings(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("settings") {
        let _ = win.show();
        let _ = win.set_focus();
    } else {
        tauri::WebviewWindowBuilder::new(
            &app,
            "settings",
            tauri::WebviewUrl::App("settings.html".into()),
        )
        .title("Lumi 设置")
        .inner_size(760.0, 560.0)
        .resizable(false)
        .decorations(true)
        .center()
        .build()
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn exit_app() {
    std::process::exit(0);
}

/// 碰撞检测返回结构
#[derive(Debug, Serialize)]
pub struct ClampResult {
    x: f64,
    y: f64,
    hit_left: bool,
    hit_right: bool,
    hit_top: bool,
    hit_bottom: bool,
}

/// 移动窗口并按屏幕可见区域夹紧
///
/// 前端计算 dx/dy 增量，后端负责碰撞检测和坐标夹紧。
/// 这比纯前端方案更精确，因为可以访问显示器工作区的准确尺寸。
#[command]
pub fn clamp_window_to_visible_frame(
    window: tauri::WebviewWindow,
    dx: f64,
    dy: f64,
) -> Result<ClampResult, String> {
    let pos = window.outer_position().map_err(|e| e.to_string())?;
    let size = window.outer_size().map_err(|e| e.to_string())?;

    // 通过窗口中心点查找当前所在显示器
    let center_x = pos.x as f64 + size.width as f64 / 2.0;
    let center_y = pos.y as f64 + size.height as f64 / 2.0;

    let monitor = window
        .available_monitors()
        .map_err(|e| e.to_string())?
        .into_iter()
        .find(|m| {
            let mp = m.position();
            let ms = m.size();
            center_x >= mp.x as f64
                && center_x <= mp.x as f64 + ms.width as f64
                && center_y >= mp.y as f64
                && center_y <= mp.y as f64 + ms.height as f64
        })
        .or_else(|| window.available_monitors().ok()?.into_iter().next())
        .ok_or("no monitor found")?;

    let monitor_pos = monitor.position();
    let monitor_size = monitor.size();
    let monitor_x = monitor_pos.x as f64;
    let monitor_y = monitor_pos.y as f64;
    let monitor_w = monitor_size.width as f64;
    let monitor_h = monitor_size.height as f64;

    let target_x = pos.x as f64 + dx;
    let target_y = pos.y as f64 + dy;

    let win_w = size.width as f64;
    let win_h = size.height as f64;

    // 夹紧到可见区域（留 4px 边距确保宠物不完全消失）
    const MARGIN: f64 = 4.0;
    let left_bound = monitor_x - win_w + MARGIN;
    let right_bound = monitor_x + monitor_w - MARGIN;
    let top_bound = monitor_y - win_h + MARGIN;
    let bottom_bound = monitor_y + monitor_h - MARGIN;

    let clamped_x = target_x.max(left_bound).min(right_bound);
    let clamped_y = target_y.max(top_bound).min(bottom_bound);

    let hit_left = clamped_x <= left_bound + 1.0;
    let hit_right = clamped_x >= right_bound - 1.0;
    let hit_top = clamped_y <= top_bound + 1.0;
    let hit_bottom = clamped_y >= bottom_bound - 1.0;

    window
        .set_position(PhysicalPosition::new(clamped_x as i32, clamped_y as i32))
        .map_err(|e| e.to_string())?;

    Ok(ClampResult {
        x: clamped_x,
        y: clamped_y,
        hit_left,
        hit_right,
        hit_top,
        hit_bottom,
    })
}
