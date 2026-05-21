# Lumi - AI Desktop Pet

基于 Tauri v2 + React + TypeScript + Rust 的 AI 桌宠应用。

## 功能

- 透明悬浮窗，始终置顶，可拖拽移动
- 系统托盘，支持显示/隐藏
- 多状态角色：空闲、聊天、思考、开心、困倦
- AI 对话：支持 OpenAI / Anthropic / DeepSeek / Ollama
- 本地 SQLite 存储：会话历史、记忆摘要、用户偏好
- 时间感知：夜间自动进入睡眠状态

## 技术栈

| 层 | 技术 |
|---|---|
| 桌面框架 | Tauri v2 |
| 前端 | React 19 + TypeScript + Vite 6 |
| 后端 | Rust |
| 存储 | SQLite (rusqlite, bundled) |
| HTTP | reqwest |

## 快速开始

### 前提条件

- Node.js >= 18
- Rust >= 1.77
- Windows 10+ / macOS 12+ / Linux

### 安装与运行

```bash
# 安装前端依赖
npm install

# 启动开发模式
npm run tauri dev

# 构建生产版本
npm run tauri build
```

### 环境变量

| 变量 | 说明 | 默认值 |
|---|---|---|
| `TAURI_DEV_HOST` | 开发服务器地址 | - |

API Key 通过应用内设置面板配置，存储在本地 SQLite 数据库中。

## 项目结构

```
E:\Lumi\
├── src/                      # React 前端
│   ├── App.tsx               # 主应用
│   ├── main.tsx              # 入口
│   ├── types.ts              # 类型定义
│   ├── components/
│   │   ├── DesktopPet.tsx    # 桌宠角色
│   │   ├── ChatPanel.tsx     # 聊天面板
│   │   ├── SettingsPanel.tsx # 设置面板
│   │   └── StatusBadge.tsx   # 状态指示器
│   ├── hooks/
│   │   └── usePetState.ts    # 角色状态机
│   └── styles/
│       └── global.css        # 全局样式
├── src-tauri/                # Rust 后端
│   ├── src/
│   │   ├── main.rs           # 入口
│   │   ├── lib.rs            # 模块注册 + 托盘
│   │   ├── db/mod.rs         # SQLite 数据库
│   │   └── commands/
│   │       ├── mod.rs
│   │       ├── chat.rs       # LLM 调用 + 记忆增强
│   │       ├── memory.rs     # 记忆 CRUD
│   │       └── config.rs     # 用户偏好 CRUD
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 通信模型

```
React UI ←→ Tauri Command / Event ←→ Rust ←→ SQLite / LLM API
```

- 前端通过 `invoke()` 调用 Rust 命令
- Rust 通过 `State<Database>` 管理 SQLite 连接
- LLM 调用在 Rust 侧完成，前端不直接暴露 API Key

## 支持的 LLM 服务商

| 服务商 | 模型示例 |
|---|---|
| OpenAI | gpt-4o-mini, gpt-4o |
| Anthropic | claude-haiku, claude-sonnet |
| DeepSeek | deepseek-chat |
| Ollama (本地) | llama3, qwen2, ... |

## 扩展接口

### Live2D / 动画

在 `DesktopPet.tsx` 的 `.pet-avatar` 区域替换 emoji 即可对接 Live2D SDK：

```tsx
// 预留接口: Live2DModel 组件
// import Live2DModel from './Live2DModel';
// <Live2DModel state={state} />
```

### 托盘菜单

托盘已实现基础菜单（显示/隐藏、退出），可在 `lib.rs` 的 `on_menu_event` 中扩展更多选项。

### 快捷键

在 `lib.rs` 中通过 Tauri 的全局快捷键插件注册：
```rust
// tauri-plugin-global-shortcut
app.plugin(tauri_plugin_global_shortcut::init())?
```

### 通知

通过 Tauri notification 插件实现系统通知：
```rust
// tauri-plugin-notification
app.plugin(tauri_plugin_notification::init())?
```

## License

MIT
