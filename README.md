# Lumi

桌面 AI 宠物。常驻屏幕角落，接受对话，有状态、有记忆、有动画。

---

## 功能

- **桌宠渲染** — 支持 Live2D（Cubism 2/4）和 PNG Sprite（单层 / 分层视差）两种模型格式
- **状态机** — 5 状态：idle / talking / thinking / happy / sleepy，含 45s 无操作和夜间自动规则
- **AI 对话** — OpenAI / Anthropic / DeepSeek / Ollama，记忆注入上下文
- **记忆系统** — 对话自动摘要存入 SQLite，下次对话注入 top-5 记忆
- **截图隐藏** — Win+Shift+S / OBS 等截图工具不可见（Windows Only）
- **系统监控** — CPU / 内存 / 磁盘 / 运行时间查询接口
- **窗口行为** — 透明无边框、始终置顶、跳过任务栏、系统托盘控制

---

## 技术栈

| 层 | 技术 |
|---|---|
| 应用框架 | Tauri 2 |
| 前端 | React 19 + TypeScript 5.7 |
| 构建 | Vite 6（多入口：main + settings） |
| 渲染 | PixiJS 7 + pixi-live2d-display 0.5 |
| 后端 | Rust（Tokio + Reqwest） |
| 数据库 | SQLite via rusqlite（bundled） |
| 持久化 | localStorage（偏好）+ SQLite（记忆 / 对话） |

---

## 快速开始

```bash
npm install
npm run tauri dev    # 开发模式
npm run tauri build  # 构建
```

**前置：** Rust stable、Node ≥ 18、[Tauri 系统依赖](https://tauri.app/start/prerequisites/)

API Key 在应用内设置面板配置，存于本地 SQLite，不上传任何服务器。

---

## 项目结构

```
Lumi/
├── src/                        # React 前端
│   ├── App.tsx                 # 主窗口根组件
│   ├── settingsMain.tsx        # 设置窗口入口
│   ├── types.ts                # 全局类型定义（单一真相源）
│   ├── hooks/
│   │   └── usePetState.ts      # 宠物状态机 Hook
│   ├── utils/
│   │   └── prefs.ts            # localStorage 偏好读写
│   ├── components/
│   │   ├── DesktopPet.tsx      # 渲染路由（Live2D / Sprite / Emoji）
│   │   ├── Live2DPet.tsx       # Live2D 渲染器
│   │   ├── SpritePet.tsx       # PNG Sprite 渲染器（v1 / v2 分层）
│   │   ├── ChatPanel.tsx       # 聊天 UI
│   │   ├── SettingsPage.tsx    # 设置窗口（独立 HTML 入口）
│   │   └── SettingsPanel.tsx   # 主窗口内嵌快速设置弹层
│   ├── live2d/
│   │   ├── ActionScheduler.ts  # 通用离散动作调度器
│   │   ├── actions.ts          # Live2D 动作集
│   │   └── spriteActions.ts    # Sprite 动作集
│   └── styles/global.css
├── src-tauri/
│   ├── src/
│   │   ├── lib.rs              # Tauri 初始化 + 命令注册
│   │   ├── commands/           # IPC 命令层
│   │   │   ├── chat.rs         # LLM 适配（4 providers）
│   │   │   ├── memory.rs       # 记忆 + 对话持久化
│   │   │   ├── config.rs       # 偏好读写
│   │   │   └── system.rs       # 模型扫描 / 系统信息 / 截图保护
│   │   ├── db/mod.rs           # SQLite 连接 + 迁移
│   │   └── services/
│   │       └── screenshot.rs   # Windows 截图保护服务
│   ├── Cargo.toml
│   └── tauri.conf.json
├── public/models/              # 模型资产（不打包到 Git LFS 以外的大文件）
├── docs/                       # 工程文档
└── agents/                     # AI Agent 协作规则
```

---

## AI-native 开发

本项目使用 Claude Code 进行日常开发。新 Agent 会话推荐按顺序阅读：

1. [`agents/PROMPT_CONTEXT.md`](agents/PROMPT_CONTEXT.md) — 项目风格与工程哲学
2. [`agents/AI_RULES.md`](agents/AI_RULES.md) — 操作约束
3. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — 架构边界
4. 相关组件源码

---

## 贡献

见 [`CONTRIBUTING.md`](CONTRIBUTING.md)

## License

MIT
