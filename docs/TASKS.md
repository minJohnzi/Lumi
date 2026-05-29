# Tasks

## In Progress

- [ ] Sprite 分层资产切图：补齐 `public/models/sprites/layers/` 下的 body / face / hair 等分层素材，并验证现有 Sprite sheet 配置。
- [ ] 文档与代码同步：保持 `docs/ARCHITECTURE.md`、`docs/API.md`、`docs/TASKS.md` 与实现一致。

## Todo

### 稳定性和工程质量

- [x] 添加 `SpriteAnimator` 单元测试。
- [ ] 添加 `usePetState` 状态机测试。
- [ ] 添加 Rust memory/config command 测试。
- [ ] 明确 npm 在本地开发环境中的可用路径，修复 `npm run tauri dev/build` 依赖系统 PATH 的问题。
- [ ] 建立 CI：`tsc -b`、`vite build`、`cargo check`。

### 架构和技术债

- [ ] 偏好主路径迁移到 Rust/SQLite：前端通过 IPC 读写 `preferences`，`localStorage` 只保留迁移期兼容。
- [ ] API Key 迁移到 Rust 侧加密存储：设置页提交 key，聊天请求不再携带明文 key。
- [ ] 继续拆分 `SpritePet.tsx` 的 Pixi 生命周期和 renderer 逻辑。
- [ ] Rust `send_message` 复用 reqwest client。
- [ ] 清理第三方渲染边界的 `any`，保留必要的兼容封装。

### 交互

- [ ] 双击唤醒 / 进入睡眠。
- [ ] 鼠标悬停状态提示。
- [ ] 鼠标视线跟随。
- [ ] 全局快捷键呼出 / 隐藏。
- [ ] 窗口位置记忆。

### 聊天增强

- [ ] 多轮上下文管理。
- [ ] Markdown 回复渲染。
- [ ] 流式输出。
- [ ] 预设 Prompt 模板。
- [ ] 聊天历史搜索和导出。

### 记忆系统

- [ ] 记忆重要性分级。
- [ ] 记忆过期 / 降权策略。
- [ ] 向量相似度检索。
- [ ] 用户可编辑记忆管理界面。

### 系统能力

- [ ] 开机自启动。
- [ ] 系统通知。
- [ ] 定时提醒。
- [ ] 简单待办。
- [ ] 多显示器行为完整验证。
- [ ] 系统主题跟随。

### 打包发布

- [ ] Windows NSIS 配置。
- [ ] macOS dmg 验证。
- [ ] Linux AppImage 验证。
- [ ] 自动更新。

## Done

- [x] Tauri 2 桌面应用骨架。
- [x] React + Vite 双入口：主窗口和设置窗口。
- [x] 透明无边框、置顶、跳过任务栏。
- [x] 系统托盘：显示/隐藏、打开设置、退出。
- [x] 右键菜单：设置、聊天、置顶、缩放、隐藏、退出等。
- [x] 拖拽移动、惯性移动、窗口边界夹紧。
- [x] 边缘隐藏和点击恢复。
- [x] 5 状态宠物：idle / talking / thinking / happy / sleepy。
- [x] 45s idle 进入 sleepy，夜间 22:00-07:00 sleepy。
- [x] ChatPanel：输入、发送、loading、回复气泡。
- [x] OpenAI / Anthropic / DeepSeek / Ollama provider。
- [x] SQLite：conversations / memories / preferences 表。
- [x] 记忆注入 prompt：最近 5 条 memories。
- [x] 对话后写入 memory 摘要。
- [x] localStorage 偏好读写（迁移前实现）。
- [x] Live2D 渲染：Cubism 2/4。
- [x] ActionScheduler 基础动作调度。
- [x] Sprite sheet 渲染。
- [x] 设置窗口：模型选择、AI 配置、隐私开关。
- [x] `list_models` 自动扫描 `public/models/`。
- [x] `get_system_info`。
- [x] Windows 截图隐藏。
- [x] `refresh-model` 跨窗口刷新事件。
- [x] 前端构建阻塞类型错误修复。
- [x] 初步重构：`windowActions`、`useModelCatalog`、`spriteSheet`、`motionResolver`。
- [x] `DesktopPet.tsx` 改为 state/event 驱动读取偏好，避免 render 阶段反复 `loadPrefs()`。
- [x] 删除未使用的旧 `SettingsPanel.tsx`，统一设置入口到 `SettingsPage.tsx`。

## Future Ideas

- 天气接口集成。
- 系统信息浮层 Widget。
- 更多角色皮肤。
- 插件系统。
- 多角色切换。

## Recent Completion Notes

- [x] Added bundled model manifest at `public/models/manifest.json`.
- [x] Added SQLite `model_catalog` table for imported external model entries.
- [x] Added settings import flow that accepts a local folder/file path instead of requiring manual placement under `public/models/`.
- [x] Added renderer path helpers for bundled `/models/...` URLs and external Tauri asset URLs.
- [x] Added invalid model fallback to `manifest.defaultModelId`.
- [x] Prune stale imported model rows when the original path is missing.
- [x] Added imported model removal without deleting user files.
- [x] Auto-save selected model after successful external import.
- [x] Added bilingual settings UI with default Chinese and persisted `ui_language`.
