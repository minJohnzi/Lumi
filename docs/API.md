# API

前端通过 `@tauri-apps/api/core` 的 `invoke(command, args)` 调用 Rust command。Rust 侧统一返回 `Result<T, String>`，错误时 Promise reject。

## Chat

### `send_message`

发送用户消息给 LLM，自动注入最近记忆，返回助手回复。

```ts
invoke<{ reply: string }>("send_message", {
  request: {
    message: string;
    provider: "openai" | "anthropic" | "deepseek" | "local";
    api_key: string;
    model: string;
  }
})
```

副作用：

- 读取最近 5 条 memory 注入 system prompt。
- 将本次对话摘要写入 memories，key 为 `conv_<timestamp>`。

## Memory

### `save_memory`

```ts
invoke("save_memory", {
  key: string,
  content: string,
})
```

语义：upsert，同 key 会覆盖。

### `get_memories`

```ts
invoke<Array<{
  id: number;
  key: string;
  content: string;
  updated_at: number;
}>>("get_memories", {
  limit?: number,
})
```

### `delete_memory`

```ts
invoke("delete_memory", {
  key: string,
})
```

### `save_conversation`

```ts
invoke("save_conversation", {
  id: string,
  role: "user" | "assistant",
  content: string,
})
```

### `get_conversations`

```ts
invoke<Array<{
  id: string;
  role: string;
  content: string;
  created_at: number;
}>>("get_conversations", {
  limit?: number,
})
```

## Preferences

目标主路径为 Rust/SQLite preferences。当前代码仍有 `localStorage` 兼容路径，待迁移。

### `get_preferences`

```ts
invoke<Record<string, string>>("get_preferences")
```

### `set_preference`

```ts
invoke("set_preference", {
  key: string,
  value: string,
})
```

### API Key 存储

API Key 不应作为普通 preference 明文持久化。目标方案是新增 Rust 侧加密存储接口，由设置页提交 key，聊天请求只传 provider/model 或 key 引用。

当前代码尚未实现该接口，迁移任务见 `docs/TASKS.md`。

## System

### `list_models`

扫描 `public/models/`，返回可识别模型。

```ts
invoke<Array<{
  name: string;
  path: string;
  model_type: "live2d" | "sprite";
}>>("list_models")
```

检测规则：

- 文件夹内存在 `sprite.json`：`model_type = "sprite"`，`path = "models/<folder>"`
- 文件夹内存在 `*.model3.json` 或 `*.model.json`：`model_type = "live2d"`，`path = "models/<folder>/<model-file>"`
- 其他文件夹跳过。

### `get_system_info`

```ts
invoke<{
  cpu_usage: number;
  memory_total_gb: number;
  memory_used_gb: number;
  disk_total_gb: number;
  disk_used_gb: number;
  uptime_minutes: number;
}>("get_system_info")
```

### `toggle_screenshot_detect`

```ts
invoke("toggle_screenshot_detect", {
  enabled: boolean,
})
```

Windows 下通过截图保护服务应用隐藏策略；其他平台应保持无害。

### `get_screenshot_detect_status`

```ts
invoke<boolean>("get_screenshot_detect_status")
```

### `open_settings`

打开或聚焦设置窗口。

```ts
invoke("open_settings")
```

### `exit_app`

退出应用。

```ts
invoke("exit_app")
```

### `clamp_window_to_visible_frame`

移动当前窗口，并在 Rust 侧按当前显示器边界夹紧。用于拖拽和惯性移动。

```ts
invoke<{
  x: number;
  y: number;
  hit_left: boolean;
  hit_right: boolean;
  hit_top: boolean;
  hit_bottom: boolean;
}>("clamp_window_to_visible_frame", {
  dx: number,
  dy: number,
})
```

## Events

### `refresh-model`

方向：settings window -> main window。

触发时机：设置保存或刷新模型后。

行为：主窗口增加 `refreshKey`，强制 `DesktopPet` remount 并重新读取偏好。

```ts
import { emit, listen } from "@tauri-apps/api/event";

await emit("refresh-model");
const unlisten = await listen("refresh-model", () => {});
```
