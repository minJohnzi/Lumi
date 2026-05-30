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
    model: string;
  }
})
```

副作用：

- 非 local provider 会在 Rust 侧按 provider 从加密存储读取 API Key；请求参数不携带明文 key。
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

主路径为 Rust/SQLite preferences。前端通过 `src/utils/prefs.ts` 调用 Tauri IPC 读写设置；`localStorage` 只用于旧 `lumi_prefs` 的一次性迁移，迁移成功后删除旧值。

偏好字段不包含 `llm_api_key`，API Key 通过 Rust 侧加密存储单独读写。

### `get_preferences`

```ts
invoke<{
  pet_name: string;
  llm_provider: "openai" | "anthropic" | "deepseek" | "local";
  llm_model: string;
  ui_language: "zh" | "en";
  screenshot_hide: boolean;
  live2d_enabled: boolean;
  model_id: string;
  model_type: "live2d" | "sprite";
  model_path: string;
  model_name: string;
  pet_scale: number;
  always_on_top: boolean;
}>("get_preferences")
```

### `save_preferences`

```ts
invoke("save_preferences", {
  prefs: {
    pet_name: string;
    llm_provider: "openai" | "anthropic" | "deepseek" | "local";
    llm_model: string;
    ui_language: "zh" | "en";
    screenshot_hide: boolean;
    live2d_enabled: boolean;
    model_id: string;
    model_type: "live2d" | "sprite";
    model_path: string;
    model_name: string;
    pet_scale: number;
    always_on_top: boolean;
  }
})
```

### `set_preference`

```ts
invoke("set_preference", {
  key: string,
  value: string,
})
```

### API Key 存储

API Key 不作为普通 preference 明文持久化。设置页通过 app settings 接口提交 key；聊天请求只传 provider/model，Rust 在 `send_message` 中读取对应 provider 的 key。

### `get_app_settings`

读取普通偏好和当前 provider 对应的 API Key。前端设置页使用该接口初始化表单。

```ts
invoke<{
  prefs: {
    pet_name: string;
    llm_provider: "openai" | "anthropic" | "deepseek" | "local";
    llm_model: string;
    ui_language: "zh" | "en";
    screenshot_hide: boolean;
    live2d_enabled: boolean;
    model_id: string;
    model_type: "live2d" | "sprite";
    model_path: string;
    model_name: string;
    pet_scale: number;
    always_on_top: boolean;
  };
  llm_api_key: string;
}>("get_app_settings")
```

### `save_app_settings`

保存普通偏好，并把 `llm_api_key` 写入当前 `prefs.llm_provider` 对应的加密存储。

```ts
invoke("save_app_settings", {
  settings: {
    prefs: {
      pet_name: string;
      llm_provider: "openai" | "anthropic" | "deepseek" | "local";
      llm_model: string;
      ui_language: "zh" | "en";
      screenshot_hide: boolean;
      live2d_enabled: boolean;
      model_id: string;
      model_type: "live2d" | "sprite";
      model_path: string;
      model_name: string;
      pet_scale: number;
      always_on_top: boolean;
    },
    llm_api_key: string;
  }
})
```

### `get_api_key`

```ts
invoke<string | null>("get_api_key", {
  provider: "openai" | "anthropic" | "deepseek" | "local",
})
```

### `set_api_key`

```ts
invoke("set_api_key", {
  provider: "openai" | "anthropic" | "deepseek" | "local",
  api_key: string,
})
```

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
