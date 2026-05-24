# Tasks

---

## In Progress

- [ ] **Sprite 分层资产切图** — 将现有合并 PNG 切割为 `layers/body.png` + `layers/face_*.png`，放入 `public/models/sprites/layers/`，代码已就绪等待资产

---

## Todo

### 交互
- [ ] 右键菜单（快捷打开设置、切换静音、退出）
- [ ] 双击唤醒 / 进入睡眠
- [ ] 鼠标悬停时显示状态提示
- [ ] 拖拽到屏幕边缘自动收起（半隐藏模式）

### 聊天增强
- [ ] 流式输出（streaming SSE，前端逐字显示）
- [ ] Markdown 渲染回复（react-markdown 或轻量手写）
- [ ] 多轮上下文管理（当前每次独立发送，无历史注入）
- [ ] 预设 Prompt 模板（快速发送）

### 记忆系统
- [ ] 记忆重要性分级（1~5 分，高分记忆优先注入）
- [ ] 记忆过期策略（超过 N 天未访问自动降权）
- [ ] 向量相似度检索（替换当前 top-5 时序查询）

### 系统能力
- [ ] 开机自启动（Tauri autostart plugin）
- [ ] 全局快捷键呼出 / 隐藏（tauri-plugin-global-shortcut）
- [ ] 窗口位置记忆（退出前保存 x/y 到 preferences）
- [ ] 多显示器适配（detect monitor bounds）
- [ ] 系统主题跟随（亮 / 暗模式切换）

### 通知与提醒
- [ ] 系统通知推送（tauri-plugin-notification）
- [ ] 定时提醒（用户设置 cron 表达式）
- [ ] 简单待办事项

### 角色与外观
- [ ] 鼠标视线跟随（Sprite 分层视差扩展为鼠标驱动）
- [ ] 更多 Sprite 状态动画（跳跃、摇头）
- [ ] 多套皮肤切换

### 打包与发布
- [ ] Windows NSIS 安装包配置
- [ ] macOS .dmg 构建验证
- [ ] GitHub Actions CI 自动构建
- [ ] 自动更新（tauri-plugin-updater）

---

## Done

- [x] 透明无边框窗口，始终置顶，跳过任务栏
- [x] 可拖拽移动（data-tauri-drag-region）
- [x] 系统托盘（显示 / 隐藏 / 打开设置 / 退出）
- [x] 5 状态宠物（idle / talking / thinking / happy / sleepy）
- [x] 状态机：45s 无操作 → sleepy，夜间 22:00-07:00 → sleepy，happy 6s / talking 8s 自动回 idle
- [x] emoji 降级显示（无模型时）
- [x] 聊天面板（右下弹出，Enter 发送，loading 状态）
- [x] AI 接入：OpenAI / Anthropic / DeepSeek / Ollama
- [x] 记忆增强 Prompt（最近 5 条 memories 注入系统提示）
- [x] 对话后自动摘要存入 memories 表
- [x] SQLite（conversations / memories / preferences 三表）
- [x] localStorage 偏好缓存（前端快速读取）
- [x] Live2D 渲染器（PixiJS + pixi-live2d-display，Cubism 2/4）
- [x] ActionScheduler 通用离散动作调度器
- [x] PNG Sprite 渲染器 v1（单层纹理 / 状态切换 / 眨眼）
- [x] PNG Sprite 渲染器 v2（分层视差，face layer 独立 blink）
- [x] 设置窗口（模型选择卡片 + AI 配置双标签）
- [x] list_models 命令（扫描 public/models/，自动区分 live2d / sprite）
- [x] get_system_info 命令（CPU / 内存 / 磁盘 / 运行时间）
- [x] 截图隐藏（Windows SetWindowDisplayAffinity）
- [x] refresh-model 跨窗口事件（设置保存后主窗口热重载模型）

---

## Technical Debt

- [ ] `DesktopPet.tsx` 在组件体内调用 `loadPrefs()`（非 state/memo），每次渲染重读 localStorage — 改为 `useState` + 事件监听
- [ ] `SettingsPanel.tsx` 与 `SettingsPage.tsx` 存在重复的 LLM 配置 UI，应提取共享组件
- [ ] Sprite v1 格式长期需维护兼容逻辑 — 评估是否在资产全部迁移到 v2 后移除
- [ ] `send_message` 每次调用都新建 reqwest Client — 应全局复用 Client
- [ ] 无任何前端或后端测试覆盖
- [ ] CSS 变量定义分散（部分写在 `:root`，部分内联），需整理到统一位置

---

## Future Ideas

- 天气接口集成（根据城市显示天气提示宠物台词）
- 法线贴图动态光照（Sprite 模式伪 3D 感）
- 鼠标视线跟随（Sprite parallax 扩展）
- 系统信息 Widget（浮动显示 CPU / 网速）
- 插件系统（第三方扩展宠物能力）
- 多角色切换（不重启直接换角色）
