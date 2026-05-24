# Architecture

---

## 系统整体结构

```
┌─────────────────────────────────────────────────────────┐
│  Tauri WebView (main window — 400×300)                  │
│  ┌──────────────┐  ┌──────────────────────────────────┐ │
│  │  ChatPanel   │  │  DesktopPet                      │ │
│  │  (消息收发)  │  │  ├─ Live2DPet (PixiJS + L2D)    │ │
│  └──────┬───────┘  │  ├─ SpritePet (PixiJS + PNG)    │ │
│         │          │  └─ emoji fallback               │ │
│  ┌──────▼──────────────────────────────────────────┐  │ │
│  │  App.tsx — usePetState (状态机) + refreshKey    │  │ │
│  └──────────────────────────────────────────────────┘  │ │
└────────────────────────┬────────────────────────────────┘
                         │ invoke / emit (Tauri IPC)
┌────────────────────────▼────────────────────────────────┐
│  Tauri WebView (settings window — settings.html)        │
│  SettingsPage → invoke("list_models") + emit("refresh-model") │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│  Rust 进程                                              │
│  lib.rs                                                 │
│  ├─ commands/chat.rs    → HTTP → LLM API               │
│  ├─ commands/memory.rs  → SQLite (memories, convs)     │
│  ├─ commands/config.rs  → SQLite (preferences)         │
│  ├─ commands/system.rs  → FS scan + sysinfo + WinAPI   │
│  ├─ db/mod.rs           → rusqlite (Mutex<Connection>) │
│  └─ services/screenshot.rs → SetWindowDisplayAffinity  │
└─────────────────────────────────────────────────────────┘
```

---

## 模块边界

### 前端模块

| 模块 | 职责 | 可依赖 | 禁止依赖 |
|---|---|---|---|
| `App.tsx` | 顶层布局 + 事件监听 | hooks, components | 直接操作 DOM |
| `hooks/usePetState` | 状态机逻辑 | React hooks | components, Tauri API |
| `utils/prefs` | localStorage 序列化 | types | 任何 React 组件 |
| `components/DesktopPet` | 渲染路由 | Live2DPet, SpritePet, prefs | ChatPanel, SettingsPage |
| `components/Live2DPet` | Live2D 渲染 | live2d/, ActionScheduler | 业务逻辑, Tauri invoke |
| `components/SpritePet` | Sprite 渲染 | live2d/, ActionScheduler | 业务逻辑, Tauri invoke |
| `components/ChatPanel` | 聊天 UI | Tauri invoke, prefs | DesktopPet, SettingsPage |
| `components/SettingsPage` | 设置 UI | Tauri invoke, prefs | DesktopPet, ChatPanel |
| `live2d/ActionScheduler` | 动作队列 | types | 任何 React 组件 |
| `live2d/actions` | Live2D 动作集 | ActionScheduler | PixiJS 直接操作（通过 model 参数） |
| `live2d/spriteActions` | Sprite 动作集 | ActionScheduler | Live2DPet |

### 后端模块

| 模块 | 职责 | 可依赖 | 禁止依赖 |
|---|---|---|---|
| `lib.rs` | 初始化 + 命令注册 | 所有 commands, db, services | 业务逻辑 |
| `commands/chat` | LLM 调用 | db（通过 State）, memory 内部函数 | config, system |
| `commands/memory` | 记忆 CRUD | db | chat, config, system |
| `commands/config` | 偏好 CRUD | db | chat, memory, system |
| `commands/system` | 系统查询 + 截图 | services/screenshot, sysinfo, FS | db, chat, memory |
| `db/mod.rs` | SQLite 连接管理 | rusqlite | 所有 commands（反向禁止） |
| `services/screenshot` | Windows API 封装 | tauri::Manager | db, commands |

---

## 数据流

### 用户发送消息

```
ChatPanel.send()
  → loadPrefs() [localStorage]
  → invoke("send_message", {message, provider, api_key, model})
  → chat.rs::send_message()
    → memory.rs::get_memories_inner(db, limit=5)
    → build system_prompt with memories
    → call_llm() [reqwest → LLM API]
    → memory.rs::save_memory_inner(db, key, summary)
    → return reply
  → ChatPanel 更新消息列表
  → onStateChange("talking") → setTimeout → onStateChange("happy")
```

### 模型切换

```
SettingsPage.save()
  → savePrefs(prefs) [localStorage]
  → invoke("toggle_screenshot_detect", {enabled})
  → emit("refresh-model") [Tauri event]
  → App.tsx listen("refresh-model")
    → setRefreshKey(k+1)
    → DesktopPet remount (key={refreshKey})
      → loadPrefs() [localStorage]
      → render Live2DPet or SpritePet
```

---

## 状态流

```
PetState: idle ←→ talking ←→ thinking ←→ happy ←→ sleepy

规则（usePetState.ts）:
  idle     → sleepy  : 45s 无操作 OR 夜间 22:00-07:00
  talking  → idle    : 8s 后自动
  thinking → idle    : 外部调用 transition("idle")
  happy    → idle    : 6s 后自动
  sleepy   → idle    : wakeUp() 调用
  *        → sleepy  : 每分钟检查时间窗口
```

---

## 目录职责

```
src/types.ts          — 前端唯一类型来源，不允许在组件内定义共享类型
src/utils/prefs.ts    — localStorage 唯一读写点，其他地方不允许直接操作 localStorage
public/models/        — 模型资产根目录，list_models 扫描此路径
src-tauri/src/db/     — 数据库连接和迁移，不允许在 commands 中写 SQL 以外的逻辑
```

---

## Forbidden Dependencies

- 前端 **不允许** 直接调用 LLM API（必须通过 Tauri invoke）
- 前端 **不允许** 直接读写 SQLite
- `DesktopPet` **不允许** 知道业务状态（聊天历史、记忆内容）
- `ActionScheduler` **不允许** 导入任何 React 模块
- `db/mod.rs` **不允许** 被 commands 以外的模块直接依赖
- Rust commands **不允许** 共享可变状态（除 `State<Mutex<T>>`）
- `Live2DPet` 和 `SpritePet` **不允许** 相互依赖

---

## 双窗口架构

主窗口（`main.html`）和设置窗口（`settings.html`）共享 `localStorage`（同源）和 Tauri 事件总线，通过 `emit("refresh-model")` 单向通知主窗口重载。

设置窗口不持有任何运行时状态，仅读写 localStorage 和触发事件。
