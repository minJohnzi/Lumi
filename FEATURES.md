# Lumi 功能清单

## 已完成

### 窗口与系统
- [x] 透明无边框窗口
- [x] 始终置顶
- [x] 可拖拽移动（data-tauri-drag-region）
- [x] 跳过任务栏显示
- [x] 系统托盘（显示/隐藏、退出）
- [x] 窗口尺寸可调整

### 桌宠角色
- [x] 五种状态：idle / talking / thinking / happy / sleepy
- [x] 状态视觉反馈（不同发光颜色）
- [x] 浮动动画
- [x] 头像点击打开聊天
- [x] 状态指示器文字
- [x] 自定义宠物名字

### 状态机
- [x] 45 秒无操作进入 sleepy
- [x] 夜间（22:00-07:00）自动进入 sleepy
- [x] 交互唤醒（sleepy → idle）
- [x] happy 状态 6 秒后自动回到 idle
- [x] talking 状态 8 秒后自动回到 idle

### 聊天
- [x] 聊天面板（右下弹出）
- [x] 消息气泡（用户/助手样式区分）
- [x] Enter 发送消息
- [x] 发送中 loading 状态

### AI 接入
- [x] OpenAI 支持
- [x] Anthropic 支持
- [x] DeepSeek 支持
- [x] Ollama 本地模型支持
- [x] 记忆增强 Prompt（上下文注入）
- [x] 对话自动摘要存入记忆

### 本地存储
- [x] SQLite 数据库（rusqlite bundled）
- [x] conversations 表（会话历史）
- [x] memories 表（记忆摘要）
- [x] preferences 表（用户偏好）
- [x] localStorage 偏好缓存（前端）

### 设置面板
- [x] 宠物名字
- [x] LLM 服务商选择
- [x] API Key 输入（密码框）
- [x] 模型名称输入

### IPC 通信
- [x] send_message — AI 对话
- [x] save_memory / get_memories / delete_memory — 记忆管理
- [x] get_preferences / set_preference — 偏好管理
- [x] save_conversation / get_conversations — 会话管理

---

## 待开发

### 桌宠表现
- [ ] Live2D / Spine 骨骼动画集成
- [ ] 更多状态动画（眨眼、跳跃、摇头）
- [ ] 状态切换过渡动画
- [ ] 随机小动作（idle 时偶尔晃动、看屏幕）
- [ ] 鼠标跟随（视线追踪光标）
- [ ] 多套皮肤/主题切换

### 交互
- [ ] 右键菜单（快捷操作）
- [ ] 拖拽到屏幕边缘自动收起
- [ ] 双击唤醒/睡眠
- [ ] 快捷键呼出/隐藏
- [ ] 鼠标悬停提示

### 聊天增强
- [ ] Markdown 渲染回复
- [ ] 流式输出（streaming）
- [ ] 多轮对话上下文管理
- [ ] 聊天历史搜索
- [ ] 导出对话记录
- [ ] 预设 Prompt 模板

### 记忆系统
- [ ] 自动记忆提取与摘要
- [ ] 记忆重要性分级
- [ ] 记忆过期/清理策略
- [ ] 向量检索（语义记忆）

### 通知与提醒
- [ ] 系统通知推送
- [ ] 定时提醒
- [ ] 待办事项
- [ ] 番茄钟

### 系统能力
- [ ] 开机自启动
- [ ] 全局快捷键
- [ ] 多显示器适配
- [ ] 窗口位置记忆
- [ ] 系统主题跟随（亮/暗）

### 打包与发布
- [ ] Windows 安装包
- [ ] macOS 安装包
- [ ] Linux 安装包
- [ ] 自动更新

---

> 标注你的优先级和补充项

#### 添加

* 截图能够自动识别并隐藏（可选）
* 添加天气接口，识别用户所处天气状况。
* 添加获取本机CPU，磁盘，网速等接口。
