# Lumi

Lumi 是一个桌面 AI 宠物。它常驻屏幕角落，支持聊天、记忆、状态反馈、Live2D / Sprite 渲染和本地数据存储。

## 功能

- **桌宠渲染**：Live2D（Cubism 2/4）、Sprite sheet、emoji fallback。
- **状态机**：idle / talking / thinking / happy / sleepy，支持 45s idle 和夜间自动 sleepy。
- **AI 对话**：OpenAI / Anthropic / DeepSeek / Ollama。
- **记忆系统**：最近记忆注入 prompt，对话后写入 SQLite memory 摘要。
- **设置窗口**：模型选择、AI provider、API Key、截图隐藏。
- **窗口行为**：透明无边框、置顶、跳过任务栏、托盘、右键菜单、拖拽惯性、边缘隐藏。
- **系统能力**：系统信息查询、Windows 截图隐藏。

## 技术栈

| 层 | 技术 |
|---|---|
| 桌面框架 | Tauri 2 |
| 前端 | React 19 + TypeScript 5.7 |
| 构建 | Vite 6，多入口 |
| 渲染 | PixiJS 7 + pixi-live2d-display |
| 后端 | Rust + Tokio + reqwest |
| 数据 | SQLite via rusqlite；localStorage 为迁移期偏好兼容层 |

## 快速开始

```bash
npm install
npm run tauri dev
npm run tauri build
```

前置依赖：Rust stable、Node 18+、Tauri 系统依赖。

当前工作区如果找不到系统 `npm`，可以先确认 Node/npm 是否已加入 PATH。文档级验证可使用：

```bash
tsc -b
vite build
cargo check
```

## 项目结构

```text
Lumi/
├─ src/
│  ├─ App.tsx
│  ├─ main.tsx
│  ├─ settingsMain.tsx
│  ├─ types.ts
│  ├─ components/
│  │  ├─ DesktopPet.tsx
│  │  ├─ Live2DPet.tsx
│  │  ├─ SpritePet.tsx
│  │  ├─ ChatPanel.tsx
│  │  ├─ ContextMenu.tsx
│  │  ├─ SettingsPage.tsx
│  │  └─ SettingsPanel.tsx
│  ├─ hooks/
│  │  ├─ usePetState.ts
│  │  ├─ useDragPhysics.ts
│  │  └─ useModelCatalog.ts
│  ├─ live2d/
│  │  ├─ ActionScheduler.ts
│  │  ├─ actions.ts
│  │  ├─ SpriteAnimator.ts
│  │  ├─ spriteSheet.ts
│  │  ├─ motionResolver.ts
│  │  └─ live2dTypes.ts
│  ├─ services/
│  │  └─ windowActions.ts
│  ├─ utils/
│  │  └─ prefs.ts
│  └─ styles/
├─ src-tauri/
│  ├─ src/
│  │  ├─ commands/
│  │  ├─ db/
│  │  ├─ services/
│  │  └─ lib.rs
│  ├─ Cargo.toml
│  └─ tauri.conf.json
├─ public/models/
├─ docs/
└─ agents/
```

## 文档

推荐阅读顺序：

1. `docs/README.md`
2. `docs/PRD.md`
3. `docs/ARCHITECTURE.md`
4. `docs/TECH_SPEC.md`
5. `docs/API.md`
6. `docs/ADR.md`
7. `docs/TASKS.md`

AI Agent 相关规则：

- `agents/PROMPT_CONTEXT.md`
- `agents/AI_RULES.md`

## License

MIT
