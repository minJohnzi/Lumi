# Architecture Decision Records

## ADR-001 — 使用 Tauri 而非 Electron

**状态：已采纳**

### 背景

Lumi 需要透明窗口、始终置顶、系统托盘、截图保护和原生系统能力。

### 决策

使用 Tauri 2。

### 理由

- 更小的内存占用和安装体积。
- Rust 后端适合封装 Windows API。
- Tauri 原生支持多窗口、托盘、透明窗口和 IPC。

### 约束

OS 集成功能优先通过 Tauri 插件或 Rust command 实现。

## ADR-002 — PixiJS 固定在 v7

**状态：已采纳**

### 背景

`pixi-live2d-display@0.5` 依赖 PixiJS v7 API。PixiJS v8 的初始化方式和 API 有破坏性变化。

### 决策

保持 `pixi.js@^7.4.x`。

### 约束

除非 `pixi-live2d-display` 明确支持 v8 并完成迁移评估，否则不升级 PixiJS v8。

## ADR-003 — LLM 调用和 API Key 存储在 Rust 侧完成

**状态：已采纳**

### 背景

LLM provider 需要 API Key。直接在前端调用会扩大泄露面。

### 决策

前端只通过 `invoke("send_message")` 调用 Rust，由 Rust 使用 reqwest 调 provider。

API Key 使用 Rust 侧 keychain 加密存储。前端设置页只负责输入和提交，不把 key 写入普通偏好。

### 迁移说明

旧 `localStorage` 偏好中的 key 会在 `utils/prefs.ts` 的一次性迁移中写入 Rust 侧加密存储，随后移除旧偏好值。

## ADR-004 — 偏好主路径迁移到 Rust/SQLite

**状态：已采纳，已实现**

### 背景

项目早期为了跨窗口快速读取偏好，使用 `localStorage` 作为偏好主路径；Rust 侧同时保留了 `preferences` 表和相关 IPC，形成双轨。

### 决策

- 偏好主路径迁移到 Rust/SQLite `preferences` 表。
- 前端通过 Tauri IPC 读写偏好。
- `localStorage` 只允许作为旧数据的一次性迁移来源，迁移完成后不再作为权威数据源。
- API Key 不再作为普通偏好写入 `localStorage`，应按 ADR-003 使用 Rust 侧加密存储。

### 迁移说明

`src/utils/prefs.ts` 封装 `get_app_settings` / `save_app_settings`，启动时迁移旧 `lumi_prefs` 后删除旧值。

## ADR-005 — Sprite 正式统一为 sheet/V3 格式

**状态：已采纳**

### 背景

早期文档讨论过单图状态和分层格式，但当前代码实现以 sprite sheet 为主：每个状态是一行帧，支持单 sheet 或多 layer sheet。

### 决策

`SpritePet` 只接受 V3 配置：

```json
{
  "type": "sprite",
  "sheet": "spritesheet.png",
  "frameW": 300,
  "frameH": 300,
  "states": {
    "idle": { "row": 0, "frames": 4, "durationMs": 1200 }
  }
}
```

可选 `layers` 支持多层 sheet 和视差。

### 约束

- `sprite.json` 必须包含 `sheet` 字段。
- 新模型必须使用 sheet/V3。
- 旧 v1/v2 格式正式放弃，不再维护兼容路径。
- 如未来确实需要导入旧格式，应通过一次性迁移工具转换到 V3，而不是在运行时恢复兼容分支。

## ADR-006 — 双窗口架构

**状态：已采纳**

### 背景

主窗口是小尺寸透明桌宠，不适合承载完整设置 UI。

### 决策

使用主窗口 + 独立设置窗口：

- 主窗口：`index.html`
- 设置窗口：`settings.html`

### 约束

- 设置窗口不持有运行时宠物状态。
- 跨窗口通信只使用 Tauri event。
- 当前模型刷新事件为 `refresh-model`。
