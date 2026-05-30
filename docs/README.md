# Lumi 文档索引

这组文档用于给人和 AI Agent 快速建立项目上下文。当前以代码事实为准，历史草案和专题碎片已删除，主干只保留少量核心文档。

## 推荐阅读顺序

1. `docs/PRD.md`：产品目标、MVP 范围、非目标。
2. `docs/ARCHITECTURE.md`：当前模块边界、数据流、窗口结构。
3. `docs/TECH_SPEC.md`：技术栈、约束、状态和测试策略。
4. `docs/API.md`：Tauri IPC command 和事件契约。
5. `docs/ADR.md`：不可随意推翻的架构决策。
6. `docs/TASKS.md`：当前任务、技术债和后续路线。

## Agent 文档

- `agents/PROMPT_CONTEXT.md`：长期上下文和工程哲学。
- `agents/AI_RULES.md`：AI Agent 在本仓库工作的硬约束。

## 当前代码事实

- 主应用是 Tauri 2 + React 19 + TypeScript + Vite。
- 渲染层支持 Live2D 和 Sprite sheet 两条路径，失败时回退 emoji。
- 偏好主路径为 Rust/SQLite `preferences`，`localStorage` 只保留旧 `lumi_prefs` 的一次性迁移兼容。
- API Key 已迁移到 Rust 侧加密存储；聊天请求不再携带明文 key。
- 记忆与会话存入 SQLite。
- 跨窗口刷新使用 Tauri event：`refresh-model`。
- 当前可验证命令：`tsc -b`、`vite build`、`cargo check`。
