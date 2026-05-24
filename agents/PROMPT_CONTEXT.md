# Prompt Context — Lumi

本文档是 AI Agent 的长期上下文。每次会话开始时应先读此文件。

---

## 产品定位

Lumi 是一个**桌面 AI 宠物**，不是聊天机器人的变体。它常驻屏幕，有情绪、有记忆、有动画。用户不需要"打开它"，它一直在。

核心体验：**陪伴感** > 功能性。动画质量和角色温度比功能数量更重要。

---

## 工程哲学

- **本地优先**：数据不离开用户设备（SQLite + localStorage）
- **最小 footprint**：主窗口 400×300，透明，不抢视觉焦点
- **渐进增强**：无模型时降级为 emoji，有模型时增强，不 crash
- **单人维护规模**：代码复杂度必须适合一人长期维护，拒绝过度抽象
- **AI 可控**：所有架构决策记录在 ADR，AI 不得擅自推翻

---

## 代码风格

- **TypeScript 严格模式**，不允许 `any`
- 函数组件 + Hooks，不用 class
- 命名用英文，注释 / 变量说明可以用中文
- 简洁优先：不写多余注释，不提前抽象，三行相似代码不比一个过早封装差
- Rust 端遵循标准 Rustfmt 格式，命令函数用 snake_case

---

## 命名风格

| 场景 | 规范 | 示例 |
|---|---|---|
| React 组件 | PascalCase | `DesktopPet`, `SpritePet` |
| Hook | camelCase + `use` 前缀 | `usePetState` |
| 工具函数 | camelCase | `loadPrefs`, `savePrefs` |
| Rust 命令 | snake_case | `send_message`, `list_models` |
| CSS 类 | kebab-case | `.pet-avatar`, `.model-card` |
| CSS 变量 | `--` + kebab-case | `--accent`, `--bg-primary` |
| 事件名 | kebab-case | `refresh-model` |
| 资产文件 | snake_case | `base_idle.png`, `face_blink.png` |

---

## 架构哲学

- **单一真相源**：类型定义在 `types.ts`，偏好读写在 `prefs.ts`，Tauri 事件是跨窗口通信唯一方式
- **层不下穿**：UI 组件不直接访问 SQLite，渲染组件不知道业务逻辑
- **功能边界清晰**：`ActionScheduler` 只管调度，`SpritePet` 只管渲染，`ChatPanel` 只管消息 UI
- **降级而非 crash**：任何渲染失败都应该有 emoji fallback

---

## UI 风格

- **深色半透明**：背景 `rgba(30,30,40,0.92)`，强调色蓝紫 `#7c8cf8`
- **圆角卡片**：`border-radius: 12px` 为基准
- **无衬线字体**：系统默认 sans-serif
- **动画克制**：只有必要的过渡（slide-in，opacity），不炫技
- **不用 emoji 做 UI 元素**（Iconify 图标代替），但角色本身的 emoji 降级保留

---

## 可维护性原则

- **改动前先读相关文件**，不靠记忆
- **最小 diff**：只改任务所需，不顺手做其他事
- **文档与代码同步**：改 IPC 接口 → 更新 `docs/API.md`，改架构 → 更新 `docs/ARCHITECTURE.md`
- **TASKS.md 实时更新**：完成一项就标记，发现技术债就记录

---

## 性能原则

- PixiJS ticker 每帧都在跑，**ticker callback 必须极轻**，不做异步操作，不访问 DOM
- `loadPrefs()` 同步读 localStorage，**在组件体内调用会每次渲染都执行**，用 `useState` 包裹
- Rust 侧 reqwest Client 应全局复用，**不在每次命令调用中新建 Client**（当前是 TODO）
- 图片纹理在 `SpritePet` 初始化时一次性全部预加载，运行时不重新 fetch

---

## 开发偏好

- 对话驱动开发：先对齐方案，再写代码
- 小步提交：一个任务一个 commit，不积累大 diff
- 遇到不确定的架构问题：先写进 ADR 讨论，不急于实现
- 资产（模型文件、贴图）与代码分离管理，大文件不入 Git（TODO: Git LFS）

---

## 当前重点

（2026-05）分层 Sprite 视差方案代码已完成，等待美术切图（`public/models/sprites/layers/`）。其余功能开发暂停，优先完善工程文档和代码质量。
