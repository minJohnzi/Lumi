# Tech Spec

---

## 技术栈

| 技术 | 版本 | 用途 | 是否可替换 |
|---|---|---|---|
| Tauri | 2.x | 桌面应用框架 | **否** |
| React | 19.x | UI 框架 | **否** |
| TypeScript | 5.7 | 类型系统 | **否** |
| Vite | 6.x | 构建工具 | 否（与 Tauri 深度集成） |
| PixiJS | 7.4 | 2D 渲染引擎 | 否（pixi-live2d-display 锁定 v7） |
| pixi-live2d-display | 0.5-beta | Live2D 渲染 | 否 |
| Rust | stable | 后端逻辑 | **否** |
| rusqlite | 0.31 | SQLite（bundled） | 否 |
| reqwest | 0.12 | HTTP 客户端 | 否 |
| sysinfo | 0.33 | 系统信息 | 可替换 |
| Tokio | 1.x | 异步运行时 | 否（Tauri 依赖） |

---

## 选型原因

**Tauri over Electron**：内存占用小 5-10x，原生系统 API 访问，Rust 后端安全性。见 ADR-001。

**PixiJS 7（不升级 v8）**：pixi-live2d-display 仅支持 v7 API，升级 v8 需重写 Live2D 集成层。

**SQLite（bundled）**：零依赖部署，用户无需安装任何数据库，单文件易备份。

**localStorage 偏好缓存**：设置窗口和主窗口共享同源 localStorage，无需额外 IPC 读取偏好，降低延迟。

---

## 不允许替换的核心约束

1. **PixiJS 不得升级到 v8**，直到 pixi-live2d-display 兼容 v8 后才评估迁移
2. **Tauri IPC 为唯一跨进程通信方式**，禁止前端通过其他方式（WebSocket、HTTP）访问后端
3. **LLM 调用必须在 Rust 侧完成**，API Key 不得出现在前端 bundle 中
4. **SQLite 不得替换为远程数据库**，本地优先是产品核心承诺

---

## 状态管理策略

- **宠物状态** — `usePetState` Hook 内部 `useState`，通过 props 向下传递
- **偏好设置** — localStorage（`prefs.ts`）作为持久层，组件读取时直接调用 `loadPrefs()`
- **对话记录** — 组件本地 `useState`（ChatPanel），不需要全局状态
- **跨窗口同步** — Tauri 事件（`emit` / `listen`），不使用共享 Rust 状态

无全局状态管理库（Redux / Zustand 等），当前规模不需要。

---

## 数据获取策略

- Tauri 命令调用：`invoke(command, args)` 返回 `Promise`，直接 `await`
- 无数据缓存层，依赖 SQLite 查询速度（本地，通常 <1ms）
- 模型列表（`list_models`）在设置页面挂载时一次性加载，不轮询

---

## 错误处理策略

- Tauri 命令错误：`invoke()` reject → 组件 catch → 显示内联错误文本
- 模型加载失败：`onLoadError` 回调 → `DesktopPet` 降级为 emoji 显示
- 纹理缺失：`SpritePet` 记录警告日志，跳过缺失纹理，不中断加载
- LLM API 错误：Rust 返回 `Err(String)` → 前端显示错误消息气泡
- 原则：**错误可见，不静默失败，不 crash**

---

## 类型策略

- `src/types.ts` 是前端所有共享类型的唯一来源
- 禁止在组件内部定义跨组件使用的类型
- Rust 端结构体通过 `#[derive(Serialize)]` 自动映射到前端类型，需手动保持同步
- 严格 TypeScript，禁止 `any`（ActionScheduler 中的 `model: any` 为历史遗留，标注 TODO）

---

## 测试策略

当前：**无测试覆盖**。

计划：
- Rust 命令层单元测试（mock SQLite，使用内存数据库）
- 前端状态机 `usePetState` 逻辑测试（Vitest）
- 关键路径集成测试（Tauri driver）

在添加测试前，不允许大规模重构（无法验证行为一致性）。

---

## 部署策略

- **Windows**：NSIS 安装包（TODO）
- **macOS**：.dmg + 代码签名（TODO）
- **Linux**：AppImage（TODO）
- 构建：`npm run tauri build`
- CI：GitHub Actions（TODO）

---

## 环境变量规范

| 变量 | 用途 | 使用位置 |
|---|---|---|
| `TAURI_DEV_HOST` | Vite 开发服务器地址（移动设备测试） | vite.config.ts |

API Key 不通过环境变量管理，由用户在设置 UI 中输入，存储于 SQLite `preferences` 表。

---

## 多入口构建

Vite 配置两个 HTML 入口：

| 入口 | HTML | React 根 | 用途 |
|---|---|---|---|
| main | index.html | `src/main.tsx` | 主窗口（桌宠 + 聊天） |
| settings | settings.html | `src/settingsMain.tsx` | 设置窗口 |

Tauri 通过 `tauri.conf.json` 中的 `additionalBrowserArgs` 控制各窗口加载哪个 HTML。
