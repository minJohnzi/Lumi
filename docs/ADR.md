# Architecture Decision Records

---

## ADR-001 — 使用 Tauri 而非 Electron

**状态：** 已采纳

**背景**

需要一个桌面应用框架支持：透明窗口、始终置顶、系统托盘、Windows 原生 API（截图保护）。

**决策**

选择 Tauri 2。

**理由**

- 内存占用约 Electron 的 1/5（WebView 复用系统 WebKit/WebView2）
- Rust 后端天然支持调用 Windows API（SetWindowDisplayAffinity）
- Tauri 2 原生支持多窗口、系统托盘、透明窗口
- 构建产物更小（无需打包 Chromium）

**放弃的选项**

- Electron：内存重，无法轻松调用原生 API，截图保护实现复杂
- NW.js：生态较弱，长期维护风险高

**约束**

此决策不可推翻，所有 OS 集成功能必须通过 Tauri 插件或 Rust 命令实现。

---

## ADR-002 — PixiJS 固定在 v7，不升级 v8

**状态：** 已采纳

**背景**

pixi-live2d-display 0.5-beta 强依赖 PixiJS v7 API（`PIXI.Application({ view, backgroundAlpha })`，同步构造器等）。PixiJS v8 已发布，API 改为异步 `app.init()`。

**决策**

锁定 `pixi.js@^7.4.3`，不升级到 v8。

**理由**

- 升级 v8 需要重写 `Live2DPet.tsx` 和 `SpritePet.tsx` 的初始化逻辑
- pixi-live2d-display 尚未发布 v8 兼容版本
- 迁移风险高，收益为零（渲染质量不变）

**约束**

- `package.json` 中 `pixi.js` 版本锁定在 `^7.4.x`
- 任何 AI Agent 不得将其升级到 v8
- 当 pixi-live2d-display 发布 v8 兼容版本后，重新评估

---

## ADR-003 — LLM 调用在 Rust 侧完成

**状态：** 已采纳

**背景**

LLM 需要 API Key。若在前端调用，Key 暴露在 WebView 中，存在安全风险（Tauri CSP 较宽松，且用户可打开 DevTools）。

**决策**

所有 LLM HTTP 请求在 `commands/chat.rs` 中通过 reqwest 发起，前端只传递消息内容。

**理由**

- API Key 不出现在前端 bundle 或 JS 运行时
- Rust 层可统一处理重试、超时、错误格式化
- 便于未来添加速率限制或本地代理

**约束**

前端代码不允许通过任何方式直接请求 LLM API，包括 `fetch`、`axios`、Tauri HTTP plugin。

---

## ADR-004 — SQLite + localStorage 双持久化策略

**状态：** 已采纳

**背景**

需要存储：用户偏好（小、频繁读）、对话历史（大、偶尔读）、记忆摘要（中、读写均有）。

**决策**

- 偏好：localStorage（主窗口和设置窗口同源共享，无需 IPC）
- 记忆 / 对话：SQLite（结构化查询，支持 limit / order by）

**理由**

- 偏好通过 localStorage 可以让两个 Tauri 窗口免 IPC 读取，减少延迟
- 记忆需要按时间排序和 limit 查询，localStorage 不适合
- 单一 SQLite 文件便于备份和迁移

**约束**

- `prefs.ts` 是 localStorage 操作的唯一入口
- 组件不允许直接调用 `localStorage.setItem/getItem`
- SQLite 操作只能在 Rust commands 层执行

---

## ADR-005 — PNG Sprite 支持 v1 / v2 双格式

**状态：** 已采纳

**背景**

初始版本使用单张 PNG / 状态的 v1 格式（`sprite.json` root-level `states`）。后续为实现视差深度感，引入 v2 分层格式（`layers` 数组）。

**决策**

`SpritePet.tsx` 通过检测 `layers` 字段存在与否区分 v1 / v2，两种格式并存。

**理由**

- 向后兼容，用户自定义的 v1 模型无需改动
- v2 格式在资产就绪前不强制要求

**约束**

- `isV2()` 函数（`SpritePet.tsx`）是格式检测的唯一入口
- 新模型默认使用 v2 格式
- v1 格式在全部官方模型迁移到 v2 后可评估移除（需更新 ADR）

---

## ADR-006 — 双窗口架构（主窗口 + 设置窗口）

**状态：** 已采纳

**背景**

主窗口是 400×300 的透明悬浮窗，空间有限无法容纳完整设置 UI。

**决策**

设置页面使用独立的 `settings.html` 入口，通过 Tauri 打开独立窗口。

**理由**

- 主窗口保持最小 footprint，不被设置 UI 污染
- 设置窗口可以有独立尺寸和样式
- Vite 多入口构建支持好，无额外框架依赖

**约束**

- 设置窗口不持有运行时状态，只读写 localStorage 和发事件
- 跨窗口通信只通过 Tauri 事件（`emit` / `listen`），不通过 `window.opener` 或其他 DOM API
