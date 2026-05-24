# Context Menu Redesign — Design Spec

## Summary

Replace the default Windows system right-click menu ("移动/大小/最小化/关闭") with a custom React context menu that speaks in the desktop pet's voice. Two-section layout: window controls + app interactions.

## Menu Structure

### Section 1: 空间法则 (Window Controls)

| # | Primary | Sub-label | Action |
|---|---------|-----------|--------|
| 1 | 去边缘贴贴 | 靠边隐藏 | Slide window to nearest screen edge, leave ~30px visible. Click exposed portion to restore. |
| 2 | 换个身形 ▸ | 调整大小 | Hover to expand right-side submenu: **娇小** (0.7x) / **刚好** (1.0x) / **显眼** (1.3x) |
| 3 | 别挡着你 / 看着我 | 置顶切换 | Toggle `alwaysOnTop`. Label switches dynamically based on current state. |
| 4 | 累啦，眯一会儿 | 收进托盘 | `window.hide()` |

### Section 2: 日常交集 (App Interactions)

| # | Primary | Sub-label | Action |
|---|---------|-----------|--------|
| 5 | 来聊聊天吧 | 打开对话 | Open ChatPanel |
| 6 | 打理一下房间 | 打开设置 | Open settings window |
| 7 | 下次再找你玩，晚安 | 退出应用 | Fade-out animation (300ms), then `app.exit()` |

- Separator line between item 4 and 5.

## Interactions

- **Trigger**: right-click anywhere on the pet area (`data-tauri-drag-region` div).
- **Position**: menu appears at cursor position, auto-adjusting to stay within screen bounds.
- **Dismiss**: click any menu item, or click outside the menu.
- **Prevent default**: `e.preventDefault()` on `contextmenu` event to suppress native system menu.
- **Submenu**: hover over "换个身形 ▸" for 150ms shows the size submenu sliding out to the right.

## Components

### New: `src/components/ContextMenu.tsx`

Props:
```ts
interface ContextMenuProps {
  x: number;
  y: number;
  isAlwaysOnTop: boolean;
  currentScale: number;       // 0.7 | 1.0 | 1.3
  onClose: () => void;
  onEdgeHide: () => void;
  onScaleChange: (s: number) => void;
  onToggleAlwaysOnTop: () => void;
  onHide: () => void;
  onOpenChat: () => void;
  onOpenSettings: () => void;
  onQuit: () => void;
}
```

Renders 7 menu items in two groups with a separator. Item 2 has a nested submenu that opens on hover.

### New: `src/styles/context-menu.css`

- Glassmorphism backdrop matching existing style (--bg-primary, blur, border)
- Menu items: two-line layout (primary label + subdued sub-label)
- Hover highlight state
- Submenu: absolute positioned to the right, same visual style
- Fade-in animation on mount

### Modified: `src/App.tsx`

- Add `onContextMenu` handler on `pet-area` div
- Manage context menu visibility + position state
- Pass callbacks for each action
- `data-tauri-drag-region` stays, context menu click areas have `no-drag`

### Modified: `src/types.ts`

- Add `pet_scale` and `always_on_top` to `UserPreferences` (persisted)

### Modified: `src/utils/prefs.ts`

- Defaults: `pet_scale: 1.0`, `always_on_top: true`

## Data Flow

```
Right-click on pet-area
  → App sets { showMenu: true, menuX, menuY }
  → ContextMenu renders at (menuX, menuY)
  → User clicks item → callback invoked → menu closes
  → User clicks outside → menu closes
```

Scale preference and always-on-top state persist in localStorage via the existing prefs system.

## Edge Hide Behavior

- Compute nearest edge (left/right) from current window position
- Animate window to edge, leaving a small sliver visible
- Clicking the sliver restores window to previous position
- Tauri `window.setPosition()` for the animation

## Exit Animation

- On "下次再找你玩，晚安" click: apply CSS fade-out class (300ms opacity + scale transition)
- After animation completes (setTimeout 300ms), call Tauri `app.exit()`
- Pure CSS approach, no Tauri backend changes needed

## Scope

- New: `ContextMenu.tsx`, `context-menu.css`
- Modified: `App.tsx`, `types.ts`, `prefs.ts`
- Not in scope: model-specific config files for edge-hide sliver size and scale presets (use defaults for now)
