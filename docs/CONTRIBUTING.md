# Contributing

---

## 分支规范

```
main          — 稳定可运行，直接合并需 review
feat/<name>   — 新功能
fix/<name>    — bug 修复
refactor/<name> — 重构（不改行为）
docs/<name>   — 文档
```

---

## Commit 规范

格式：`<type>(<scope>): <描述>`

| type | 用途 |
|---|---|
| feat | 新功能 |
| fix | bug 修复 |
| refactor | 重构（无行为变化） |
| docs | 文档 |
| style | 样式（不影响逻辑） |
| chore | 构建 / 依赖 / 配置 |

示例：
```
feat(sprite): add v2 layered parallax format
fix(chat): import registerSpriteActions in SpritePet
docs(arch): update module boundary diagram
```

---

## PR 规范

- PR 只包含一件事，不混入无关改动
- 描述清楚：改了什么 + 为什么 + 如何验证
- 不允许在功能 PR 里顺手重构其他模块
- 破坏性改动（IPC 接口变更、数据库 schema 变更）必须在描述中标注 `BREAKING`

---

## Minimal Diff 原则

- 只改和任务直接相关的代码
- 不改缩进风格、不改命名（除非任务明确要求）
- 不删除看似多余的代码（先确认用途）
- 不在修复 bug 时顺手做代码整理

---

## 文档同步

修改以下内容时必须同步更新对应文档：

| 改动类型 | 需更新 |
|---|---|
| 新增 / 删除 Tauri 命令 | `docs/API.md` |
| 架构变更（新模块、新依赖方向） | `docs/ARCHITECTURE.md` |
| 新增依赖 | `docs/TECH_SPEC.md` + `docs/ADR.md`（如果是重要决策） |
| 新增 / 完成 / 取消功能 | `TASKS.md` |

---

## AI Agent 协作规则

详见 [`agents/AI_RULES.md`](agents/AI_RULES.md)。

核心约束（人类贡献者也须遵守）：

- **不允许** 在未讨论的情况下引入新的 npm 包或 Cargo crate
- **不允许** 修改与当前任务无关的模块
- **不允许** 推翻 `docs/ADR.md` 中记录的决策（需先讨论）
- **必须** 在改动 IPC 接口前确认前后端同步更新
- **必须** 保持 `types.ts` 作为前端类型的单一真相源
