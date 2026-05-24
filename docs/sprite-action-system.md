# Sprite 模式动作系统设计

> 版本: 1.0 | 2026-05-22

---

## 角色气质

```
温柔  ·  慢热  ·  观察型  ·  低打扰  ·  长期陪伴
```

核心原则：**少、轻、慢、低频**

她不是在表演，是安静存在于桌面角落。动作永远服务于**存在感**，不是表现欲。

---

## 一、动作体系结构（8 类 50 个）

### 1. 基础生命动作 — "活着"

| # | 动作 | 表现 | 节奏 |
|---|------|------|------|
| 1 | `breathing` | 微 scale + 微上下浮动 | 极慢 sin 波 |
| 2 | `blink_soft` | 普通眨眼（闭眼 80ms） | 随机 2~6s |
| 3 | `blink_slow` | 困倦眨眼（闭眼 200ms） | 随机 6~12s (sleepy 时) |
| 4 | `half_blink` | 半眨眼（alpha=0.5 40ms） | 随机 5~15s |
| 5 | `idle_shift` | 轻微重心偏移 ±3px | 随机 8~18s |
| 6 | `subtle_float` | 极轻漂浮（0.3Hz + scale ±0.005） | 持续 |
| 7 | `hair_sway` | 轻微摆动（rotation 微动） | 持续 |
| 8 | `breathing_pause` | 呼吸短暂停顿 1~2s | 30~60s 一次 |

### 2. 观察动作 — "她在看"

| # | 动作 | 表现 | 间隔 |
|---|------|------|------|
| 9 | `look_left` | rotation -2° → 0° (2s) | 25~50s |
| 10 | `look_right` | rotation +2° → 0° (2s) | 25~50s |
| 11 | `look_down` | y -= 2px (2s) | 40~70s |
| 12 | `look_up` | y += 2px (1.5s) | 40~70s |
| 13 | `distant_stare` | 随机偏移 + 静止 5~10s | 30~60s |
| 14 | `mouse_follow_soft` | 视线微随鼠标（不精准） | 鼠标移动时 |
| 15 | `notice_user` | 用户靠近时微集中 | 事件触发 |

### 3. 交互动作 — "她注意到你了"

| # | 动作 | 触发 | 表现 |
|---|------|------|------|
| 16 | `hover_notice` | 鼠标 hover | scale × 1.02 |
| 17 | `hover_soft_smile` | hover 后续 | 轻微笑 |
| 18 | `click_response` | 点击 | 小点头 + 轻眨眼 |
| 19 | `attention_enter` | 聊天开始 | scale +5%, 视线集中 |
| 20 | `attention_idle` | 聊天中静置 | 略活跃于 idle |
| 21 | `chat_listening` | 用户输入中 | 微前倾 |
| 22 | `thinking` | AI 思考时 | 眼神偏移 + 动作减少 |
| 23 | `talking_soft` | AI 回复中 | 轻嘴型 |
| 24 | `talking_pause` | 回复中停顿 | 静止 1~2s |
| 25 | `chat_end_return` | 聊天结束 | 缓慢回到 idle |

### 4. 情绪动作 — "弱表达"

| # | 动作 | 表现 |
|---|------|------|
| 26 | `soft_smile` | 轻微微笑 |
| 27 | `gentle_happy` | 轻柔开心 |
| 28 | `relieved` | 放松感 |
| 29 | `shy_avoid` | 轻微移开视线 |
| 30 | `slightly_sad` | 轻微失落 |
| 31 | `lonely_idle` | 安静孤独感 |
| 32 | `sleepy` | 困倦 |
| 33 | `sleepy_blink` | 慢眨眼 |
| 34 | `sleepy_nod` | 轻轻点头犯困 |

### 5. 状态动作 — "长期状态"

| # | 动作 | 对应 PetState |
|---|------|--------------|
| 35 | `idle_default` | idle |
| 36 | `idle_quiet` | idle（更安静） |
| 37 | `idle_late_night` | idle（深夜） |
| 38 | `idle_rainy` | idle（雨天，后期） |
| 39 | `focused_presence` | 用户工作时更安静 |
| 40 | `companion_presence` | 长时间陪伴状态 |

### 6. 长期陪伴动作 — "她一直在"

| # | 动作 | 触发条件 |
|---|------|---------|
| 41 | `waiting_soft` | 无互动 3 分钟后 |
| 42 | `quiet_observation` | 观察状态持续 |
| 43 | `silent_company` | 几乎不动，10 分钟+ |
| 44 | `sleepy_waiting` | 深夜陪伴 |
| 45 | `tiny_reaction` | 用户突然操作 |
| 46 | `return_attention` | 用户回来后 |

### 7. 特殊时段动作 — "不同时间的她"

| # | 动作 | 触发 |
|---|------|------|
| 47 | `morning_soft` | 06:00~09:00 |
| 48 | `midnight_sleepy` | 22:00~06:00 |
| 49 | `rainy_day_idle` | 天气 API（后期） |
| 50 | `long_time_no_chat` | 24h+ 无对话 |

---

## 二、调度策略

### 调度器能力扩展

当前 ActionScheduler 支持：冷却期、状态感调配速、动作间最短休息、条件过滤。

需要新增：

| 能力 | 用途 |
|------|------|
| 事件触发通道 | 交互动作（click、hover、chat） |
| 累计时间条件 | 陪伴动作（3min/10min+ 无互动） |
| 时间段条件 | 特殊时段（深夜/早晨） |
| 优先级系统 | 交互 > 情绪 > 观察 > 基础 |

### 各类调度策略

| 分类 | 调度方式 | 优先级 |
|------|---------|--------|
| 基础生命 | 自动随机 + 持续 ticker | 最低 |
| 观察 | 自动随机，长冷却，长休息 | 低 |
| 交互 | 事件触发，立即响应 | 最高 |
| 情绪 | 状态驱动，低频率 | 中 |
| 状态 | 持续 + 状态绑定 | 中 |
| 长期陪伴 | 累计时间条件 | 低 |
| 特殊时段 | 时间段条件 | 低 |

---

## 三、Sprite 实现映射

所有动作通过操作 PIXI.Sprite 属性实现，不需要 motion 文件：

```ts
// 核心操作集
sprite.x          // 水平位移
sprite.y          // 垂直位移
sprite.rotation   // 旋转（弧度）
sprite.scale      // 缩放
sprite.alpha      // 透明度
sprite.texture    // 切换贴图
sprite.skew       // 倾斜（头发摆动）
```

### 动作 → 实现表

| 动作 | 实现 |
|------|------|
| `breathing` | `y += sin(t×0.8) × 1.2` delta 累加 |
| `blink_soft` | 切 blink.png 80ms，无图则 `alpha=0.2` 80ms |
| `blink_slow` | 同上 200ms |
| `half_blink` | `alpha=0.5` 40ms |
| `idle_shift` | `x/y ±3px` smoothstep 2s |
| `subtle_float` | `y sin(t×0.3) × 1.0` + `scale ±0.005` |
| `hair_sway` | `skew.x ±0.005` sin 波 |
| `breathing_pause` | 停止呼吸 delta 1~2s |
| `look_left` | `rotation -0.035rad(-2°)` → 0 (2s) |
| `look_right` | `rotation +0.035rad(+2°)` → 0 (2s) |
| `distant_stare` | `rotation ±3° + x ±2px` → 5~10s 后恢复 |
| `hover_notice` | `scale × 1.02` (100ms smooth) |
| `attention_enter` | `scale → base+5%` |
| `click_response` | `scale × 0.98 → 1.0` (150ms bounce) + blink |
| `thinking` | 切 thinking.png + 动作间隔 × 1.5 |
| `talking_soft` | 切 talking.png + 动作间隔 × 0.7 |
| `soft_smile` | 切 happy.png |
| `sleepy` | 切 sleepy.png + 所有间隔 × 2.0 |

### 贴图切换

状态变化时换贴图，无对应贴图回退到 idle.png：

```ts
function applyState(sprite, config, state, textures) {
  const tex = config.states[state]?.texture || config.states.idle.texture;
  sprite.texture = textures[tex];
}
```

---

## 四、正确节奏

```
长时间安静（8~20s 无动作）
  ↓
一个轻动作（2~3s 持续时间）
  ↓
恢复安静（又是 8~20s）
```

**绝对禁止：**
- ❌ 动作连续播放（blink → tilt → look → smile 不断）
- ❌ 高频动作（任何时候都在动）
- ❌ 大幅动作（超过 ±5px / ±3° / ±0.03 scale）
- ❌ 永远看着用户 / 永远有反应

---

## 五、MVP 第一版（13 个动作）

```
基础:  breathing, blink_soft, idle_shift, subtle_float       (4)
观察:  look_left, look_right, distant_stare                   (3)
交互:  hover_notice, attention_enter, thinking, talking_soft  (4)
情绪:  soft_smile, sleepy                                     (2)
```

---

## 六、和 Live2D 版的关系

| | Live2D 模式 | Sprite 模式 |
|---|---|---|
| 渲染 | PIXI + Cubism SDK | PIXI.Sprite |
| 动作来源 | motion 文件 + 参数操作 | 贴图切换 + 属性操作 |
| 调度器 | 同一个 ActionScheduler 框架 | 同一框架 |
| 动作实现 | `src/live2d/actions.ts` | `src/live2d/spriteActions.ts` |
| 顶层组件 | `Live2DPet.tsx` | `SpritePet.tsx` |
| Props | 完全一致 `PetRendererProps` | 完全一致 |

两个 PetRenderer 对外暴露相同接口，DesktopPet 只做路由：

```
DesktopPet
  ├─ model_type === "live2d"  → Live2DPet
  ├─ model_type === "sprite"  → SpritePet
  └─ 加载失败/无模型            → emoji 回退
```

---

## 七、实现顺序

| 阶段 | 内容 |
|------|------|
| 1 | SpritePet 组件（渲染挂载、贴图加载、状态切换） |
| 2 | spriteActions.ts（MVP 13 个动作注册） |
| 3 | 设置面板加 `model_type` 字段 |
| 4 | ActionScheduler 加事件触发通道 |
| 5 | 交互动作接入现有事件（click, chat） |
| 6 | 陪伴+时段动作（累计时间条件） |
