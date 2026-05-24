# API — Tauri IPC Commands

前端通过 `invoke(command, args)` 调用，全部为异步。Rust 侧返回 `Result<T, String>`，错误时 Promise reject，reason 为 String。

---

## 聊天

### `send_message`

发送消息给 LLM，自动注入记忆上下文，回复后保存摘要。

**Request**
```ts
{
  message: string;
  provider: "openai" | "anthropic" | "deepseek" | "local";
  api_key: string;
  model: string;
}
```

**Response**
```ts
string  // LLM 回复文本
```

**副作用**
- 读取最近 5 条 memories 注入系统提示
- 将本次对话摘要写入 memories 表（key: `conv_<timestamp>`）

---

## 记忆

### `save_memory`

```ts
invoke("save_memory", { key: string, content: string })
→ void
```

key 唯一，重复调用覆盖已有记录（upsert）。

---

### `get_memories`

```ts
invoke("get_memories", { limit?: number })
→ Array<{ id: number, key: string, content: string, updated_at: string }>
```

按 `updated_at` 降序排列，`limit` 默认不限。

---

### `delete_memory`

```ts
invoke("delete_memory", { key: string })
→ void
```

---

### `save_conversation`

```ts
invoke("save_conversation", { id: string, role: "user" | "assistant", content: string })
→ void
```

---

### `get_conversations`

```ts
invoke("get_conversations", { limit?: number })
→ Array<{ id: string, role: string, content: string, created_at: string }>
```

按 `created_at` 升序排列。

---

## 配置

### `get_preferences`

```ts
invoke("get_preferences")
→ Record<string, string>
```

返回 preferences 表所有键值对。

---

### `set_preference`

```ts
invoke("set_preference", { key: string, value: string })
→ void
```

upsert 语义，key 已存在则更新。

---

## 系统

### `list_models`

扫描 `public/models/` 目录，自动检测模型类型。

```ts
invoke("list_models")
→ Array<{
    name: string;        // 文件夹名
    path: string;        // 相对路径，如 "models/sprites"
    model_type: "live2d" | "sprite";
  }>
```

**检测规则**
- 文件夹内含 `sprite.json` → `"sprite"`
- 文件夹内含 `*.model3.json` 或 `*.model.json` → `"live2d"`
- 都不含 → 跳过

---

### `get_system_info`

```ts
invoke("get_system_info")
→ {
    cpu_usage: number;          // 百分比 0-100
    memory_total_gb: number;
    memory_used_gb: number;
    disk_total_gb: number;      // 所有非可移动磁盘合计
    disk_used_gb: number;
    uptime_minutes: number;
  }
```

---

### `toggle_screenshot_detect`

仅 Windows 有效，其他平台调用无副作用。

```ts
invoke("toggle_screenshot_detect", { enabled: boolean })
→ void
```

---

### `get_screenshot_detect_status`

```ts
invoke("get_screenshot_detect_status")
→ boolean
```

---

## Tauri 事件

| 事件名 | 方向 | 触发时机 | 携带数据 |
|---|---|---|---|
| `refresh-model` | settings → main | 设置保存后 | 无 |

```ts
// 发送（settings window）
import { emit } from "@tauri-apps/api/event";
await emit("refresh-model");

// 监听（main window）
import { listen } from "@tauri-apps/api/event";
const unlisten = await listen("refresh-model", () => { ... });
```

---

## 错误格式

所有命令错误统一为 `string`（Rust `Err(String)` → JS reject reason）：

```ts
try {
  await invoke("send_message", args);
} catch (err: unknown) {
  // err is string, e.g. "reqwest error: connection refused"
  console.error(err);
}
```
