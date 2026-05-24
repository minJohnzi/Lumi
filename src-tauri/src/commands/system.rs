use serde::Serialize;
use std::sync::Mutex;
use tauri::{Manager, State};

use crate::services::screenshot::ScreenshotProtection;

#[derive(Debug, Serialize)]
pub struct ModelEntry {
    pub name: String,
    pub path: String,
    pub model_type: String, // "live2d" | "sprite"
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

            entries.push(ModelEntry { name, path: model_path, model_type });
        }
    }

    Ok(entries)
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
pub fn open_settings(app: tauri::AppHandle) -> Result<(), String> {
    use tauri::{WebviewUrl, WebviewWindowBuilder};
    if let Some(win) = app.get_webview_window("settings") {
        let _ = win.show();
        let _ = win.set_focus();
    } else {
        let _ = WebviewWindowBuilder::new(
            &app,
            "settings",
            WebviewUrl::App("settings.html".into()),
        )
        .title("Lumi 设置")
        .inner_size(760.0, 560.0)
        .resizable(false)
        .decorations(true)
        .center()
        .build();
    }
    Ok(())
}

#[tauri::command]
pub fn exit_app(app: tauri::AppHandle) {
    app.exit(0);
}
