/// Makes the main window invisible to screen capture tools.
///
/// Uses SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE) on Windows 10 2004+.
/// The window remains visible to the user but cannot be captured by
/// screenshot tools, OBS, Discord streaming, etc.

use tauri::Manager;

const WDA_NONE: u32 = 0x00000000;
const WDA_EXCLUDEFROMCAPTURE: u32 = 0x00000011;

#[link(name = "user32")]
extern "system" {
    fn SetWindowDisplayAffinity(hwnd: *const std::ffi::c_void, affinity: u32) -> i32;
}

pub struct ScreenshotProtection {
    enabled: bool,
}

impl ScreenshotProtection {
    pub fn new() -> Self {
        Self { enabled: false }
    }

    pub fn set_enabled(&mut self, app_handle: &tauri::AppHandle, value: bool) {
        self.enabled = value;

        #[cfg(target_os = "windows")]
        if let Some(window) = app_handle.get_webview_window("main") {
            if let Ok(hwnd) = window.hwnd() {
                let affinity = if value { WDA_EXCLUDEFROMCAPTURE } else { WDA_NONE };
                #[allow(clippy::transmute_ptr_to_ref)]
                let raw: isize = unsafe { std::mem::transmute_copy::<_, isize>(&hwnd) };
                let ptr = raw as *const std::ffi::c_void;
                unsafe { SetWindowDisplayAffinity(ptr, affinity) };
            }
        }
    }

    pub fn is_enabled(&self) -> bool {
        self.enabled
    }
}
