mod commands;
mod db;
mod services;

use db::Database;
use services::screenshot::ScreenshotProtection;
use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager,
    WebviewUrl,
    WebviewWindowBuilder,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_dir = dirs::data_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("Lumi");

    let database = Database::new(app_dir).expect("Failed to initialize database");
    let protection = Mutex::new(ScreenshotProtection::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(database)
        .manage(protection)
        .invoke_handler(tauri::generate_handler![
            commands::memory::save_memory,
            commands::memory::get_memories,
            commands::memory::delete_memory,
            commands::memory::save_conversation,
            commands::memory::get_conversations,
            commands::config::get_preferences,
            commands::config::set_preference,
            commands::chat::send_message,
            commands::system::get_system_info,
            commands::system::toggle_screenshot_detect,
            commands::system::get_screenshot_detect_status,
        ])
        .setup(|app| {
            let settings = MenuItem::with_id(app, "settings", "设置...", true, None::<&str>)?;
            let show = MenuItem::with_id(app, "show", "显示/隐藏", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&settings, &show, &quit])?;

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "settings" => {
                        if let Some(win) = app.get_webview_window("settings") {
                            let _ = win.show();
                            let _ = win.set_focus();
                        } else {
                            let _ = WebviewWindowBuilder::new(
                                app,
                                "settings",
                                WebviewUrl::App("settings.html".into()),
                            )
                            .title("Lumi 设置")
                            .inner_size(360.0, 480.0)
                            .resizable(false)
                            .decorations(true)
                            .always_on_top(true)
                            .center()
                            .build();
                        }
                    }
                    "quit" => app.exit(0),
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
