# Architecture

## 系统结构

```text
Tauri app
├─ Main WebView: index.html
│  └─ React
│     ├─ App.tsx
│     │  ├─ usePetState
│     │  ├─ useDragPhysics
│     │  ├─ services/windowActions
│     │  ├─ ChatPanel
│     │  ├─ ContextMenu
│     │  └─ DesktopPet
│     │     ├─ Live2DPet
│     │     ├─ SpritePet
│     │     └─ emoji fallback
│     └─ preferences via utils/prefs.ts -> Tauri IPC
│
├─ Settings WebView: settings.html
│  └─ SettingsPage
│     ├─ useModelCatalog
│     ├─ preferences via utils/prefs.ts -> Tauri IPC
│     ├─ invoke("list_models")
│     └─ emit("refresh-model")
│
└─ Rust backend
   ├─ commands/chat.rs
   ├─ commands/memory.rs
   ├─ commands/config.rs
   ├─ commands/system.rs
   ├─ db/mod.rs
   └─ services/screenshot.rs
```

## 模块边界

### 前端

| 模块 | 职责 | 禁止承担 |
|---|---|---|
| `App.tsx` | 主窗口布局、顶层事件、宠物状态串联 | 直接实现系统 API 细节 |
| `services/windowActions.ts` | Tauri window / system command 的前端封装 | React 状态和 UI |
| `hooks/usePetState.ts` | 宠物状态机 | Tauri API、渲染细节 |
| `hooks/useDragPhysics.ts` | 拖拽和惯性移动 | 宠物业务状态 |
| `hooks/useModelCatalog.ts` | 设置页模型列表、选择态、导入弹层状态 | 渲染模型 |
| `utils/prefs.ts` | 前端偏好入口，封装 Tauri IPC 和旧 localStorage 一次性迁移 | React UI |
| `DesktopPet.tsx` | 根据偏好选择 Live2D / Sprite / emoji | 聊天、记忆、系统能力 |
| `Live2DPet.tsx` | PixiJS + Live2D 初始化和生命周期 | Sprite 渲染、Tauri IPC |
| `SpritePet.tsx` | PixiJS + sprite sheet 初始化和生命周期 | Live2D 逻辑、Tauri IPC |
| `live2d/spriteRenderer.ts` | Sprite sheet 单层 / 分层渲染、ticker、动作刷新 | React 状态、Tauri IPC |
| `live2d/ActionScheduler.ts` | 离散动作调度、冷却和节奏控制 | React 依赖 |
| `live2d/actions.ts` | Live2D 基础动作注册 | React / Tauri |
| `live2d/spriteSheet.ts` | Sprite sheet 配置校验、路径、帧矩形 helper | React 组件状态 |
| `live2d/motionResolver.ts` | Live2D motion group 选择 | Pixi 应用生命周期 |

### 后端

| 模块 | 职责 | 禁止承担 |
|---|---|---|
| `lib.rs` | Tauri 初始化、托盘、命令注册、状态注入 | 业务流程细节 |
| `commands/chat.rs` | LLM provider 调用、记忆上下文注入 | UI 状态 |
| `commands/memory.rs` | memories / conversations CRUD | LLM HTTP |
| `commands/config.rs` | SQLite preferences CRUD | 聊天、记忆逻辑 |
| `commands/system.rs` | 模型扫描、系统信息、窗口辅助、设置窗口 | 聊天和记忆逻辑 |
| `db/mod.rs` | SQLite 连接和迁移 | command 层业务流程 |
| `services/screenshot.rs` | Windows 截图保护封装 | UI / DB |

## 数据流

### 发送聊天消息

```text
ChatPanel
  -> receives prefs from App state
  -> invoke("send_message", { request })
  -> commands/chat.rs
     -> get_memories_inner(limit=5)
     -> call provider via reqwest
     -> save_memory_inner(conv_<timestamp>, summary)
  -> ChatPanel append assistant reply
  -> usePetState: thinking -> talking -> happy -> idle
```

### 切换模型

```text
SettingsPage
  -> useModelCatalog loads invoke("list_models")
  -> user selects model
  -> savePrefs(prefs)
  -> setScreenshotDetect()
  -> emit("refresh-model")
  -> App listens refresh-model
  -> DesktopPet remounts
  -> Live2DPet or SpritePet loads selected model
```

### 偏好存储

当前架构以 Rust/SQLite `preferences` 表为主：

- 前端通过 Tauri IPC 读写偏好。
- API Key 由 Rust 侧加密存储，不再作为普通偏好写入 `localStorage`。
- 主窗口和设置窗口通过 Tauri event 同步刷新。
- `src/utils/prefs.ts` 只保留旧 `lumi_prefs` 的一次性迁移兼容。

## 状态机

`PetState = idle | talking | thinking | happy | sleepy`

| 规则 | 行为 |
|---|---|
| 初始时间在 22:00-07:00 | 进入 `sleepy` |
| idle 超过 45s | 进入 `sleepy` |
| talking 8s 后 | 回到 `idle` |
| happy 6s 后 | 回到 `idle` |
| sleepy 被交互唤醒 | 回到 `idle` |
| 每分钟时间检查 | 夜间 idle 会转为 sleepy |

## 窗口结构

- 主窗口：透明、无边框、置顶、跳过任务栏，承载宠物和聊天入口。
- 设置窗口：独立 `settings.html`，用于模型选择、AI 配置、隐私设置。
- 跨窗口通信只使用 Tauri event，目前事件为 `refresh-model`。

## 关键约束

- 前端不能直接调用 LLM API。
- 前端不能直接读写 SQLite。
- `Live2DPet` 和 `SpritePet` 不能互相依赖。
- `ActionScheduler` 不能导入 React。
- PixiJS 保持 v7，不升级 v8。
- 渲染失败必须降级，不应 crash。

## Model Catalog Flow

```text
public/models/manifest.json
  -> useModelCatalog fetches bundled models
SQLite model_catalog
  -> list_imported_models returns external models
SettingsPage
  -> add_model_from_path(path)
  -> Rust validates model folder/file
  -> SQLite stores external model entry
  -> selected model preference stores model_id/model_type/model_path/model_name
DesktopPet
  -> bundled paths load through /models/...
  -> external paths load through Tauri asset protocol
```

Bundled models belong to the application package and are not copied into SQLite. SQLite only records user choice and imported external model metadata.
