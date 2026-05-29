# Tech Spec

## 技术栈

| 技术 | 当前版本 | 用途 | 约束 |
|---|---:|---|---|
| Tauri | 2.x | 桌面应用、窗口、托盘、IPC | 不替换为 Electron |
| React | 19.x | 前端 UI | 函数组件 + Hooks |
| TypeScript | 5.7.x | 类型系统 | strict 模式 |
| Vite | 6.x | 多入口构建 | `index.html` + `settings.html` |
| PixiJS | 7.4.x | Live2D / Sprite 渲染 | 不升级 v8 |
| pixi-live2d-display | 0.5 beta | Live2D Cubism 2/4 | 依赖 PixiJS v7 |
| Rust | stable | Tauri 后端 | command 层承载系统能力 |
| rusqlite | 0.31 | SQLite | bundled |
| reqwest | 0.12 | LLM HTTP client | 后续应复用 client |
| sysinfo | 0.33 | 系统信息 | 可替换 |
| Tokio | 1.x | 异步运行时 | Tauri 依赖 |

## 构建入口

| 入口 | HTML | React 入口 | 用途 |
|---|---|---|---|
| main | `index.html` | `src/main.tsx` | 主窗口 |
| settings | `settings.html` | `src/settingsMain.tsx` | 设置窗口 |

Vite 在 `vite.config.ts` 中配置两个 Rollup input。

## 核心策略

### 状态管理

- 宠物状态：`usePetState`。
- 拖拽状态：`useDragPhysics`。
- 模型列表状态：`useModelCatalog`。
- 聊天消息：`ChatPanel` 内部本地 state。
- 偏好主路径：Rust/SQLite `preferences` 表，通过 Tauri IPC 读写。
- `utils/prefs.ts` 是前端唯一偏好入口，保留一次性 `localStorage` 迁移兼容。
- 跨窗口刷新：Tauri event `refresh-model`。

当前不引入 Redux、Zustand 等全局状态库。

### 渲染

- Live2D：`Live2DPet` 动态加载 `pixi-live2d-display/cubism2` 或 `cubism4`。
- Sprite：`SpritePet` 只支持当前 sheet/V3 格式，`sprite.json` 需要 `sheet`、`frameW`、`frameH`、`states`。
- 渲染失败：调用 `onLoadError()`，由 `DesktopPet` 回退 emoji。

### 存储

- SQLite：会话、记忆、preferences。
- Rust 侧加密存储：API Key。
- `localStorage`：只用于迁移旧 `lumi_prefs`，迁移后删除旧值。

### LLM

- 前端只调用 `invoke("send_message")`。
- Rust 侧调用 OpenAI、Anthropic、DeepSeek、Ollama。
- 发送前注入最近 5 条 memory。
- 回复后写入 memory 摘要。

## 错误处理

- Tauri command 返回 `Result<T, String>`。
- 前端显示可见错误或降级，不应静默 crash。
- 模型加载失败必须回退 emoji。
- 截图保护、设置窗口打开等系统能力失败不应阻断主体验。

## 测试和验证

当前没有完整测试套件。可用验证命令：

```bash
tsc -b
vite build
cargo check
```

建议补齐顺序：

1. `SpriteAnimator` 单元测试。
2. `usePetState` 状态机测试。
3. Rust command 层针对 SQLite memory/config 的单元测试。
4. 关键窗口行为手动验证清单。

已补充：

- `tests/SpriteAnimator.test.ts`，通过 Node `--test` 验证帧推进、暂停、重置行为。

## 已知技术债

- `SpritePet` 负责加载、校验和生命周期编排；具体 Sprite 渲染已拆到 `live2d/spriteRenderer.ts`。
- `send_message` 每次新建 reqwest client，应复用 client。
- 偏好读写已经走 Rust/SQLite，仍需补充迁移和错误处理测试。
- API Key 已走 Rust 侧 keychain 存储，仍需补充迁移和错误处理测试。
- 文档和代码都提到禁止新增 `any`，但第三方 Pixi/Live2D 边界仍有少量兼容性类型放宽。

## Model Catalog

- Bundled model list lives in `public/models/manifest.json`.
- Vite copies this file to `dist/models/manifest.json`, so packaged builds read the same catalog from frontend assets.
- SQLite does not store the bundled model list. It stores only user preferences and imported external model entries.
- User-selected model preference includes `model_id`, `model_type`, `model_path`, and `model_name`.
- External models are added through `add_model_from_path`, validated in Rust, and stored in SQLite table `model_catalog`.
- Supported external inputs: a folder containing `sprite.json`, a folder containing `.model3.json` / `.model.json`, or a direct model JSON file path.
- External file rendering uses Tauri `assetProtocol` plus `convertFileSrc`; bundled models continue to use `/models/...` URLs.
- If the saved model is missing from the current catalog, settings fall back to `manifest.defaultModelId` and persist that fallback.
- Imported external rows are revalidated on catalog load; missing or unsupported paths are pruned from SQLite.
- Removing an imported model deletes only the SQLite catalog row. The original user files are never deleted.

## Settings Language

- `ui_language` is stored in SQLite preferences and defaults to `zh`.
- The settings page switches between Chinese and English from the Appearance tab.
- The language choice is persisted immediately so the current settings view rerenders in the selected language.
