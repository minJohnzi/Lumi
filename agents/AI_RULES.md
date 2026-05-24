# AI Rules

适用于所有在本仓库工作的 AI Agent（Claude Code、Cursor、Copilot 等）。

**这不是建议，是约束。违反任何规则前必须明确告知用户并获得确认。**

---

## Coding Rules

1. **禁止 `any`**。现有代码中的 `any`（如 ActionScheduler 的 `model: any`）是历史遗留，不允许新增。
2. **类型必须来自 `src/types.ts`**。共享类型不允许在组件内部就地定义。
3. **React 组件必须是函数组件**。不使用 class component。
4. **不允许内联样式**（除非是动态计算值，如 PIXI canvas 尺寸）。样式写入 `global.css`。
5. **PixiJS 版本锁定 v7**。不得修改 `pixi.js` 的版本约束。
6. **每个文件只导出一个主要实体**（组件 / 类 / 函数集）。
7. **不写注释解释 WHAT**，只在 WHY 非显然时写注释。

---

## Architecture Rules

1. **严格遵守模块边界**，见 `docs/ARCHITECTURE.md`。违反前必须修改 ARCHITECTURE.md 并说明原因。
2. **前端禁止直接调用 LLM API**。所有 LLM 调用必须通过 `invoke("send_message")`。
3. **前端禁止直接操作 localStorage**（除 `src/utils/prefs.ts`）。
4. **`DesktopPet` 只负责渲染路由**，不允许承载业务逻辑。
5. **`ActionScheduler` 不允许导入任何 React 模块**。
6. **`Live2DPet` 和 `SpritePet` 互相不可见**。
7. **Rust commands 不允许共享可变状态**（除 `State<Mutex<T>>`）。
8. **跨窗口通信只能通过 Tauri 事件**，不使用 DOM API。

---

## Refactor Rules

1. **不允许在功能 PR 中顺带重构无关代码**。
2. **不允许在 bug fix 中改变代码结构**。
3. **重构前必须确认：当前有无方式验证行为不变**（无测试时慎重重构）。
4. **不允许批量改变命名规范**（除非整个文件范围内明确任务）。
5. **不允许"顺手"删除看似无用的代码**——先确认用途。

---

## Dependency Rules

1. **新增 npm 包或 Cargo crate 必须先告知用户，获得确认后再写入配置**。
2. **`pixi.js` 不得升级到 v8**（见 ADR-002）。
3. **不引入状态管理库**（Redux、Zustand 等），当前规模不需要。
4. **不引入 CSS-in-JS 方案**，坚持 `global.css`。
5. **新 Tauri 插件必须更新 `Cargo.toml` + `tauri.conf.json` + `capabilities/`，三处缺一不可**。

---

## Testing Rules

1. **当前无测试，改动前不得声称"测试通过"**。
2. **新增 Rust 命令时，推荐同时写单元测试（使用内存 SQLite）**。
3. **新增状态机分支时，推荐同时写 `usePetState` 的 Vitest 用例**。
4. **不允许为了让测试通过而修改被测代码的副作用语义**。

---

## UI Rules

1. **CSS 变量定义在 `:root`（`global.css`），不允许硬编码颜色值**。
2. **动画使用 CSS transition 或 PixiJS ticker，不引入动画库**。
3. **不允许引入 UI 组件库**（Ant Design、MUI 等），手写是当前选择。
4. **PixiJS canvas 尺寸固定为 300×300**，如需修改必须同步更新 `sprite.json` 的 `size` 字段。
5. **任何 UI 改动必须考虑透明背景的对比度**（窗口背景透明，桌面内容可见）。

---

## Forbidden Actions

- **禁止推翻 `docs/ADR.md` 中的决策**，不讨论直接执行。
- **禁止修改数据库 schema 而不更新 `docs/API.md`**。
- **禁止在 `src/types.ts` 以外的地方定义 `PetState`、`UserPreferences` 等共享类型**。
- **禁止将 API Key 写入任何日志、错误消息或前端变量**。
- **禁止 `git push --force` 到 `main`**。
- **禁止 `--no-verify` 跳过 git hooks**。
- **禁止在前端 bundle 中包含 SQLite 操作逻辑**。
- **禁止静默吞掉错误**（`catch { }` 空块），至少记录日志。

---

## Definition of Done

一个任务完成的标准：

- [ ] 代码编译通过（`tsc -b` + `cargo check`）
- [ ] 功能在开发模式下可手动验证
- [ ] 相关文档已同步（API.md / ARCHITECTURE.md / TASKS.md）
- [ ] 没有新增 `any` 类型
- [ ] 没有修改无关模块
- [ ] Diff 最小化（无格式化噪声、无无关重构）
- [ ] `TASKS.md` 中对应任务已标记完成
