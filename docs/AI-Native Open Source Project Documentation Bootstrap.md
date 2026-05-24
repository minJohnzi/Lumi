# AI-Native Open Source Project Documentation Bootstrap

请为当前项目生成完整的 AI-native / vibe-coding 工程文档体系。

要求：

- 所有文档使用 Markdown
- 内容必须简洁、高密度、长期可维护
- 不要写企业废话
- 不要生成空泛模板
- 文档必须适合长期 AI Agent 协作
- 优先考虑：
  - 架构稳定性
  - AI 可控性
  - 长期迭代
  - 开源维护
- 所有规则必须明确、可执行、无歧义
- 所有文档内容必须互相一致
- 不允许重复定义同一规则
- 文档内容必须基于当前项目代码结构自动推断
- 如果项目已有实现，优先从代码反推架构与规范
- 缺失信息时，用 TODO 标记，不要幻想需求

---

# 目标

生成一套适用于：

- 独立开发
- 开源项目
- AI-native 开发
- Claude Code / Cursor / Copilot Agent
- 长期 vibe coding

的工程文档系统。

---

# 需要生成的文件

## 根目录

README.md
TASKS.md
CONTRIBUTING.md

---

## /docs

/docs/PRD.md
/docs/ARCHITECTURE.md
/docs/TECH_SPEC.md
/docs/API.md
/docs/ADR.md

---

## /agents

/agents/AI_RULES.md
/agents/PROMPT_CONTEXT.md

---

# 每个文件的要求

---

## README.md

包含：

- 项目简介
- 项目目标
- 核心功能
- 技术栈
- 快速开始
- 项目结构
- 开发方式
- AI-native 开发说明
- 如何与 AI Agent 协作
- 贡献指南入口

重点：

README 必须同时服务：
- 人类开发者
- AI Agent

不要写营销文案。

---

## TASKS.md

使用：

# Todo
# In Progress
# Done
# Technical Debt
# Future Ideas

格式。

要求：

- 所有任务必须可执行
- 不允许模糊描述
- 每个任务尽量小颗粒度
- 明确当前开发状态

---

## CONTRIBUTING.md

包含：

- 分支规范
- Commit 规范
- PR 规范
- Minimal Diff 原则
- 禁止大规模无关重构
- 文档同步要求
- AI Agent 协作规则

重点：

必须明确：
- AI 不允许随意重构
- AI 不允许引入新框架
- AI 不允许修改无关模块

---

## PRD.md

保持精简。

包含：

- 项目目标
- 用户画像
- 核心问题
- MVP 范围
- 非目标（明确不做什么）
- 用户流程
- 核心页面
- 功能优先级

不要写企业套话。

---

## ARCHITECTURE.md

这是最重要文档之一。

必须包含：

- 系统整体结构
- 模块边界
- 数据流
- 状态流
- 目录职责
- 服务边界
- API 边界
- Forbidden Dependencies

必须明确：

哪些模块：
- 可以依赖谁
- 不可以依赖谁

重点：

避免：
- 跨层调用
- util 黑洞
- service 泄漏
- 业务逻辑污染 UI

如果可能：
- 自动根据现有代码结构生成目录说明

---

## TECH_SPEC.md

包含：

- 技术栈
- 为什么选择这些技术
- 不允许替换的核心基础设施
- 状态管理策略
- 数据获取策略
- 错误处理策略
- 类型策略
- 测试策略
- 部署策略
- 环境变量规范

不要变成百科全书。

重点：

解释：
- 为什么这样设计
- 哪些约束不能破坏

---

## API.md

如果项目已有 API：

自动分析并生成：

- Endpoint
- Request
- Response
- Auth
- Error Format

推荐 OpenAPI 风格。

如果还没有 API：

生成未来约定规范。

重点：

保持统一格式。

---

## ADR.md

生成：

# ADR-001
# ADR-002

格式。

记录：

- 关键技术决策
- 为什么这样做
- 为什么不选其他方案

重点：

未来 AI 不允许轻易推翻 ADR。

---

## AI_RULES.md

这是核心文件。

必须严格、明确、工程化。

至少包含：

# Coding Rules
# Architecture Rules
# Refactor Rules
# Dependency Rules
# Testing Rules
# UI Rules
# Forbidden Actions
# Definition of Done

必须明确：

- 不允许 any
- 不允许重复组件
- 不允许跨层访问
- 不允许无关重构
- 不允许新增依赖未经批准
- 必须最小 diff
- 必须优先复用现有代码
- 必须先阅读相关文件
- 必须保持 API 向后兼容
- 必须处理 loading/error/empty state

重点：

把 AI 当成：
“需要严格管理的工程师”

---

## PROMPT_CONTEXT.md

生成长期 AI 上下文。

包含：

- 产品风格
- UI 风格
- 工程哲学
- 代码风格
- 命名风格
- 架构哲学
- 可维护性原则
- 性能原则
- 开发偏好

重点：

这是长期上下文。

不要写临时需求。

---

# 输出要求

- 所有文档必须真实可用
- 不要生成空模板
- 不要生成 filler content
- 必须结合当前项目结构
- 必须适合长期 AI 协作
- 所有规则必须具体
- 所有内容必须互相一致
- 如果信息不足：
  使用 TODO 标记
- 不允许编造不存在功能

---

# 最后要求

在生成完成后：

1. 检查所有文档是否互相冲突
2. 检查是否存在重复规则
3. 检查是否存在架构矛盾
4. 检查是否存在过度设计
5. 检查是否适合独立开发者长期维护
6. 优化为：
   - 高密度
   - 低冗余
   - AI 易理解
   - 长期稳定

最终目标：

让这个项目具备：
“长期 AI-native 工程协作能力”
而不是：
“只有一次性的 prompt 生成能力”。