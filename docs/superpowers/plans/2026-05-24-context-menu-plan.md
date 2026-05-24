# Context Menu Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the default Windows system right-click menu with a custom React context menu using pet-personality language.

**Architecture:** New `ContextMenu` component receives position + callbacks from `App`. `App` manages menu state, handles edge-hide/size/topmost via Tauri window API, and persists scale + topmost preferences via the existing localStorage system. Pure CSS for animations.

**Tech Stack:** React 19, TypeScript, Tauri v2 (`@tauri-apps/api` window/process), CSS modules

---

### Task 1: Update types and prefs with new preferences

**Files:**
- Modify: `src/types.ts`
- Modify: `src/utils/prefs.ts`

- [ ] **Step 1: Add `pet_scale` and `always_on_top` to UserPreferences**

In `src/types.ts`, add two fields to the `UserPreferences` interface:

```ts
export interface UserPreferences {
  pet_name: string;
  llm_provider: string;
  llm_api_key: string;
  llm_model: string;
  screenshot_hide: boolean;
  live2d_enabled: boolean;
  model_type: ModelType;
  model_path: string;
  model_name: string;
  pet_scale: number;
  always_on_top: boolean;
}
```

- [ ] **Step 2: Add defaults in prefs.ts**

In `src/utils/prefs.ts`, add the two new defaults:

```ts
const DEFAULTS: UserPreferences = {
  pet_name: "Lumi",
  llm_provider: "openai",
  llm_api_key: "",
  llm_model: "gpt-4o-mini",
  screenshot_hide: false,
  live2d_enabled: true,
  model_type: "live2d",
  model_path: "models/haru_greeter_t03/haru_greeter_t03.model3.json",
  model_name: "Haru",
  pet_scale: 1.0,
  always_on_top: true,
};
```

- [ ] **Step 3: Commit**

```bash
git add src/types.ts src/utils/prefs.ts
git commit -m "feat: add pet_scale and always_on_top preferences"
```

---

### Task 2: Create ContextMenu component

**Files:**
- Create: `src/components/ContextMenu.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { useState, useEffect, useRef, useCallback } from "react";
import "../styles/context-menu.css";

interface MenuItemDef {
  label: string;
  sub: string;
  action: () => void;
  hasSubmenu?: boolean;
  dynamicLabel?: string;
}

interface ContextMenuProps {
  x: number;
  y: number;
  isAlwaysOnTop: boolean;
  currentScale: number;
  onClose: () => void;
  onEdgeHide: () => void;
  onScaleChange: (s: number) => void;
  onToggleAlwaysOnTop: () => void;
  onHide: () => void;
  onOpenChat: () => void;
  onOpenSettings: () => void;
  onQuit: () => void;
}

const SCALES = [
  { label: "娇小", value: 0.7 },
  { label: "刚好", value: 1.0 },
  { label: "显眼", value: 1.3 },
];

export default function ContextMenu({
  x,
  y,
  isAlwaysOnTop,
  currentScale,
  onClose,
  onEdgeHide,
  onScaleChange,
  onToggleAlwaysOnTop,
  onHide,
  onOpenChat,
  onOpenSettings,
  onQuit,
}: ContextMenuProps) {
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const [adjX, setAdjX] = useState(x);
  const [adjY, setAdjY] = useState(y);
  const menuRef = useRef<HTMLDivElement>(null);
  const subTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Adjust position to stay within screen bounds
  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const rect = menu.getBoundingClientRect();
    let nx = x;
    let ny = y;
    if (x + rect.width > window.innerWidth) nx = x - rect.width;
    if (y + rect.height > window.innerHeight) ny = y - rect.height;
    setAdjX(Math.max(0, nx));
    setAdjY(Math.max(0, ny));
  }, [x, y]);

  // Click outside to close
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid the same right-click event closing immediately
    const id = setTimeout(() => document.addEventListener("mousedown", handle), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", handle);
    };
  }, [onClose]);

  const handleSubEnter = useCallback(() => {
    clearTimeout(subTimeout.current);
    setSubmenuOpen(true);
  }, []);

  const handleSubLeave = useCallback(() => {
    subTimeout.current = setTimeout(() => setSubmenuOpen(false), 200);
  }, []);

  const items: MenuItemDef[] = [
    { label: "去边缘贴贴", sub: "靠边隐藏", action: onEdgeHide },
    { label: "换个身形 ▸", sub: "调整大小", action: () => {}, hasSubmenu: true },
    { label: isAlwaysOnTop ? "别挡着你" : "看着我", sub: "置顶切换", action: onToggleAlwaysOnTop },
    { label: "累啦，眯一会儿", sub: "收进托盘", action: onHide },
    { label: "来聊聊天吧", sub: "打开对话", action: onOpenChat },
    { label: "打理一下房间", sub: "打开设置", action: onOpenSettings },
    { label: "下次再找你玩，晚安", sub: "退出应用", action: onQuit },
  ];

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ left: adjX, top: adjY }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, i) => {
        const isSeparatorBefore = i === 4;
        return (
          <div key={i}>
            {isSeparatorBefore && <div className="context-menu-sep" />}
            <div
              className={`context-menu-item${item.hasSubmenu ? " has-submenu" : ""}`}
              onClick={() => {
                if (!item.hasSubmenu) {
                  item.action();
                  onClose();
                }
              }}
              onMouseEnter={item.hasSubmenu ? handleSubEnter : undefined}
              onMouseLeave={item.hasSubmenu ? handleSubLeave : undefined}
            >
              <span className="context-menu-label">{item.label}</span>
              <span className="context-menu-sub">{item.sub}</span>
              {item.hasSubmenu && submenuOpen && (
                <div
                  className="context-submenu"
                  onMouseEnter={handleSubEnter}
                  onMouseLeave={handleSubLeave}
                >
                  {SCALES.map((s) => (
                    <div
                      key={s.value}
                      className={`context-submenu-item${currentScale === s.value ? " active" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onScaleChange(s.value);
                        onClose();
                      }}
                    >
                      <span className="context-menu-label">{s.label}</span>
                      <span className="context-menu-sub">{s.value}x</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ContextMenu.tsx
git commit -m "feat: add ContextMenu component"
```

---

### Task 3: Create context menu styles

**Files:**
- Create: `src/styles/context-menu.css`

- [ ] **Step 1: Write the CSS**

```css
.context-menu {
  position: fixed;
  z-index: 9999;
  min-width: 180px;
  padding: 6px;
  background: rgba(30, 30, 40, 0.94);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
  animation: menu-fade-in 0.15s ease-out;
  -webkit-app-region: no-drag;
}

@keyframes menu-fade-in {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}

.context-menu-sep {
  height: 1px;
  margin: 4px 8px;
  background: rgba(255, 255, 255, 0.06);
}

.context-menu-item {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.12s;
}

.context-menu-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.context-menu-item.has-submenu {
  cursor: default;
}

.context-menu-label {
  font-size: 13px;
  color: #e0e0e8;
  line-height: 1.3;
}

.context-menu-sub {
  font-size: 11px;
  color: #6b6b7a;
}

/* Submenu */
.context-submenu {
  position: absolute;
  left: calc(100% + 4px);
  top: -6px;
  min-width: 100px;
  padding: 6px;
  background: rgba(30, 30, 40, 0.94);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
  animation: submenu-slide-in 0.12s ease-out;
}

@keyframes submenu-slide-in {
  from { opacity: 0; transform: translateX(-4px); }
  to   { opacity: 1; transform: translateX(0); }
}

.context-submenu-item {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.12s;
}

.context-submenu-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.context-submenu-item.active .context-menu-label {
  color: #b8a8f0;
}
```

- [ ] **Step 2: Import CSS in global.css or ContextMenu.tsx**

The CSS is already imported in ContextMenu.tsx via the import statement. Verify the build picks it up.

- [ ] **Step 3: Commit**

```bash
git add src/styles/context-menu.css
git commit -m "feat: add context menu styles"
```

---

### Task 4: Wire context menu into App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add imports for Tauri window/process APIs and ContextMenu**

At the top of `src/App.tsx`:

```tsx
import { useState, useEffect, useCallback, useRef } from "react";
import DesktopPet from "./components/DesktopPet";
import ChatPanel from "./components/ChatPanel";
import ContextMenu from "./components/ContextMenu";
import { usePetState } from "./hooks/usePetState";
import { loadPrefs, savePrefs } from "./utils/prefs";
import { Icon } from "@iconify/react";
```

- [ ] **Step 2: Replace App function body with full implementation**

```tsx
function App() {
  const { state, transition, wakeUp } = usePetState("idle");
  const [showChat, setShowChat] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Context menu state
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [petScale, setPetScale] = useState(() => loadPrefs().pet_scale ?? 1.0);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(() => loadPrefs().always_on_top ?? true);
  const [isExiting, setIsExiting] = useState(false);
  const [isEdgeHidden, setIsEdgeHidden] = useState(false);
  const prevPos = useRef<{ x: number; y: number } | null>(null);

  // Persist scale changes
  const handleScaleChange = useCallback((s: number) => {
    setPetScale(s);
    const p = loadPrefs();
    p.pet_scale = s;
    savePrefs(p);
  }, []);

  // Toggle always-on-top
  const handleToggleAlwaysOnTop = useCallback(() => {
    import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
      const next = !isAlwaysOnTop;
      getCurrentWindow().setAlwaysOnTop(next);
      setIsAlwaysOnTop(next);
      const p = loadPrefs();
      p.always_on_top = next;
      savePrefs(p);
    });
  }, [isAlwaysOnTop]);

  // Edge hide: snap to nearest screen edge. Click pet-area when hidden to restore.
  const handleEdgeHide = useCallback(() => {
    import("@tauri-apps/api/window").then(async ({ getCurrentWindow }) => {
      const win = getCurrentWindow();
      const pos = await win.outerPosition();
      const size = await win.outerSize();
      const monitor = await win.currentMonitor();
      if (!monitor) return;

      const mLeft = monitor.position.x;
      const mRight = monitor.position.x + monitor.size.width;
      const winLeft = pos.x;
      const winRight = pos.x + size.width;

      const distLeft = winLeft - mLeft;
      const distRight = mRight - winRight;

      // Store current position and snap to nearest edge
      prevPos.current = { x: pos.x, y: pos.y };
      const SLIVER = 30;
      if (distLeft <= distRight) {
        await win.setPosition({ x: mLeft - size.width + SLIVER, y: pos.y });
      } else {
        await win.setPosition({ x: mRight - SLIVER, y: pos.y });
      }
      setIsEdgeHidden(true);
    });
  }, []);

  // Click-to-restore from edge-hidden state
  const handlePetAreaClick = useCallback(() => {
    if (!isEdgeHidden) return;
    import("@tauri-apps/api/window").then(async ({ getCurrentWindow }) => {
      if (prevPos.current) {
        await getCurrentWindow().setPosition(prevPos.current);
      }
      setIsEdgeHidden(false);
    });
  }, [isEdgeHidden]);

  // Exit with animation
  const handleQuit = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      import("@tauri-apps/api/process").then(({ exit }) => exit(0));
    }, 300);
  }, []);

  // Right-click handler
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  }, []);

  // Apply screenshot protection on startup
  useEffect(() => {
    const prefs = loadPrefs();
    import("@tauri-apps/api/core").then(({ invoke }) => {
      invoke("toggle_screenshot_detect", { enabled: prefs.screenshot_hide }).catch(() => {});
    });
  }, []);

  // Listen for refresh-model event from settings window
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    import("@tauri-apps/api/event").then(({ listen }) => {
      listen("refresh-model", () => setRefreshKey((k) => k + 1)).then((fn) => { unlisten = fn; });
    }).catch(() => {});
    return () => { unlisten?.(); };
  }, []);

  return (
    <>
      <div className={`app-layout${showChat ? " has-chat" : ""}${isExiting ? " is-exiting" : ""}`}>
        {showChat && (
          <div className="chat-wrapper">
            <ChatPanel
              onClose={() => setShowChat(false)}
              onStateChange={transition}
            />
          </div>
        )}

        <div
          className={`pet-area${showChat ? " with-chat" : ""}${isEdgeHidden ? " edge-hidden" : ""}`}
          data-tauri-drag-region
          onContextMenu={handleContextMenu}
          onClick={handlePetAreaClick}
          style={{ transform: `scale(${petScale})`, transformOrigin: "center center" }}
        >
          <DesktopPet key={refreshKey} state={state} />

          <button
            className="chat-toggle-btn"
            onClick={() => {
              setShowChat(!showChat);
              if (!showChat) wakeUp();
            }}
            title="对话"
          >
            <Icon icon="mage:message-round" width={22} height={22} />
          </button>
        </div>
      </div>

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          isAlwaysOnTop={isAlwaysOnTop}
          currentScale={petScale}
          onClose={() => setCtxMenu(null)}
          onEdgeHide={handleEdgeHide}
          onScaleChange={handleScaleChange}
          onToggleAlwaysOnTop={handleToggleAlwaysOnTop}
          onHide={() => {
            import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
              getCurrentWindow().hide();
            });
          }}
          onOpenChat={() => {
            setShowChat(true);
            wakeUp();
          }}
          onOpenSettings={() => {
            import("@tauri-apps/api/core").then(({ invoke }) => {
              invoke("open_settings").catch(() => {});
            });
          }}
          onQuit={handleQuit}
        />
      )}
    </>
  );
}
```

Wait — there's no `open_settings` Tauri command. The settings window is opened from the tray menu in lib.rs. Let me instead open it the same way: use the Tauri window API to get or create the settings window, or add a simple invoke command. The simplest approach for the frontend is to use `@tauri-apps/api/window` to get or create the settings WebviewWindow.

Let me check how Tauri v2 creates windows from the frontend. Actually, in Tauri v2, you can't create windows from the frontend without a permission. Let me use a different approach — create a Tauri command `open_settings` in lib.rs, or use the existing pattern and create the window from the frontend using the webview window API.

Actually, looking at the Tauri v2 docs, you can import `WebviewWindow` from `@tauri-apps/api/webviewWindow` and create/get windows. Let me use that.

- [ ] **Step 1 (revised): Settings window opener**

Replace the `onOpenSettings` callback with:

```tsx
onOpenSettings={() => {
  import("@tauri-apps/api/webviewWindow").then(({ WebviewWindow }) => {
    const existing = WebviewWindow.getByLabel("settings");
    if (existing) {
      existing.show();
      existing.setFocus();
    } else {
      new WebviewWindow("settings", {
        url: "settings.html",
        title: "Lumi 设置",
        width: 760,
        height: 560,
        resizable: false,
        decorations: true,
        center: true,
      });
    }
  });
}}
```

- [ ] **Step 2: Add exit animation and edge-hidden CSS to global.css**

```css
/* Exit animation */
.app-layout.is-exiting {
  animation: pet-fade-out 0.3s ease-in forwards;
}

@keyframes pet-fade-out {
  from { opacity: 1; transform: scale(1); }
  to   { opacity: 0; transform: scale(0.9); }
}

/* Edge-hidden state — subtle glow on the visible sliver */
.pet-area.edge-hidden {
  border-right: 2px solid rgba(180, 160, 240, 0.4);
  cursor: pointer;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx src/styles/global.css
git commit -m "feat: wire context menu into App with edge-hide, scale, topmost, exit animation"
```

---

### Task 5: Add `open_settings` Tauri command

**Files:**
- Modify: `src-tauri/src/commands/system.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Add `open_settings` command to system.rs**

Open `src-tauri/src/commands/system.rs` and add at the end:

```rust
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
```

- [ ] **Step 2: Register the command in lib.rs**

In `src-tauri/src/lib.rs`, register the new command in `generate_handler![]`:

```rust
.invoke_handler(tauri::generate_handler![
    // ... existing commands ...
    commands::system::open_settings,
])
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/system.rs src-tauri/src/lib.rs
git commit -m "feat: add open_settings Tauri command"
```

---

### Task 6: Verify build and fix permissions

**Files:**
- Modify: `src-tauri/capabilities/default.json` (if needed)

- [ ] **Step 1: Add Tauri permissions if needed**

The frontend now calls these Tauri APIs: `setPosition`, `outerPosition`, `outerSize`, `currentMonitor`, `setAlwaysOnTop`, `hide` (all from `@tauri-apps/api/window`), plus `open_settings` (custom invoke). Ensure `src-tauri/capabilities/default.json` has:

```json
{
  "$schema": "https://github.com/nicegui/tauri-v2-nicegui-template/raw/main/src-tauri/capabilities/default.json",
  "identifier": "default",
  "description": "Default capabilities for Lumi",
  "windows": ["*"],
  "permissions": [
    "core:default",
    "shell:allow-open",
    "core:window:allow-set-position",
    "core:window:allow-outer-position",
    "core:window:allow-outer-size",
    "core:window:allow-current-monitor",
    "core:window:allow-set-always-on-top",
    "core:window:allow-hide"
  ]
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run build**

```bash
npm run build
```

Expected: builds successfully.

- [ ] **Step 4: Commit any fixes**

---

## Self-Review

1. **Spec coverage**: All 7 menu items covered. Submenu for size ✓. Edge hide with restore ✓. Always-on-top toggle ✓. Exit animation ✓. Scale persistence ✓. Position boundary adjustment ✓. Click-outside-to-close ✓.

2. **Placeholder scan**: No TBD/TODO/placeholder found. All code is explicit.

3. **Type consistency**: `pet_scale: number` in types, default `1.0`, scale values `0.7 | 1.0 | 1.3`. `always_on_top: boolean`, default `true`. Props interface matches ContextMenu component. Callback signatures match between App and ContextMenu.
