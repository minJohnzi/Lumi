use serde::Serialize;
use std::sync::Mutex;
use tauri::State;

use crate::services::screenshot::ScreenshotProtection;

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
