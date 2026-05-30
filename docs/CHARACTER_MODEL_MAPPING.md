# Character to Model Mapping

本文记录 Lumi 中“角色设定、状态机、Live2D / Sprite 模型”之间的交互边界和落地方式。它的目标不是替代角色设计文档，而是把角色文档中的性格、行为、视觉设定，稳定地映射到代码和模型资源里。

## 1. 当前代码事实

当前运行链路如下：

```text
用户交互 / 聊天流程 / 时间规则
  -> usePetState
  -> PetState
  -> DesktopPet
  -> Live2DPet / SpritePet / emoji fallback
  -> Live2D motion 或 sprite sheet frame rows
```

核心状态定义在 `src/types.ts`：

```ts
export type PetState = "idle" | "talking" | "thinking" | "happy" | "sleepy";
```

当前各层职责：

| 层 | 当前职责 | 不应该承担 |
|---|---|---|
| `usePetState` | 维护全局行为状态、定时器、夜间 idle 缩短、交互唤醒 | 不关心 Live2D / Sprite 的资源结构 |
| `App.tsx` / `ChatPanel` | 根据用户交互或聊天进程触发 `transition()` | 不直接播放 motion 或改 sprite 帧 |
| `DesktopPet` | 根据偏好选择 Live2D、Sprite 或 emoji fallback | 不解释角色性格 |
| `Live2DPet` | 把 `PetState` 映射到 Live2D motion，并运行基础动作调度 | 不改变业务状态 |
| `SpritePet` | 把 `PetState` 映射到 `sprite.json` 的 row / frames / duration | 不改变业务状态 |
| `ActionScheduler` | Live2D 自动微动作、冷却、节奏控制、呼吸 | 不拥有角色设定，不修改 `PetState` |

这意味着：`PetState` 是模型无关的语义状态；Live2D 和 Sprite 只是两种“表演这个状态”的实现。

## 2. 状态机如何和模型交互

### 2.1 状态机输出的是语义，不是动作文件名

状态机只回答：

```text
现在角色处于哪一种行为段？
idle / talking / thinking / happy / sleepy
```

模型层再回答：

```text
这个角色、这种模型类型，要如何把该行为段演出来？
```

例如 `happy`：

- 对 Luffy sprite：播放 row 3，3 帧，1200ms，表现为大笑和夸张橡胶手臂。
- 对 Amber sprite：播放 row 3，3 帧，1400ms，表现为整点报时、轻敲银铃、礼貌微笑。
- 对 Live2D Haru：通过 `motionResolver.ts` 找 `Tap` / `happy` / `surprise` / `cheer` 相关 motion。

同一个 `PetState` 不要求不同角色做一样的动作，只要求语义一致。

### 2.2 Sprite 的映射方式

Sprite 当前通过 `sprite.json` 直接定义状态到帧序列的映射：

```json
{
  "states": {
    "idle": { "row": 0, "frames": 4, "durationMs": 2400 },
    "talking": { "row": 1, "frames": 2, "durationMs": 1400 },
    "thinking": { "row": 2, "frames": 3, "durationMs": 2000 },
    "happy": { "row": 3, "frames": 3, "durationMs": 1200 },
    "sleepy": { "row": 4, "frames": 2, "durationMs": 3200 }
  }
}
```

状态切换时，`SpritePet` 会读取当前 state 对应的配置，并重置所有 `SpriteAnimator`：

```text
PetState changes
  -> config.states[state]
  -> animator.reset(frames, durationMs)
  -> renderer ticker picks frame rects for current state
```

Sprite 模型的角色表达主要落在：

- 每个 row 的动作设计。
- 每个状态的帧数和循环时长。
- `scale`、`anchor`、`fit` 控制视觉稳定性。
- 可选 `layers` 控制 body / face / props 分层表演。

### 2.3 Live2D 的映射方式

Live2D 当前通过 `motionResolver.ts` 做弱约定映射：

| `PetState` | 优先 group | 文件名关键词 |
|---|---|---|
| `idle` | `Idle` | `idle` |
| `talking` | `Tap`, `Talk` | `talk`, `tap` |
| `thinking` | `Tap` | `think`, `doubt`, `look` |
| `happy` | `Tap` | `happy`, `surprise`, `cheer` |
| `sleepy` | `Idle` | `sleep`, `yawn`, `tired` |

状态切换时：

```text
PetState changes
  -> findMotion(model, state)
  -> model.motion(...)
```

同时，`ActionScheduler` 会在不改变 `PetState` 的前提下做自动微动作：

- blink
- head_tilt
- look_away
- idle_shift
- breathing

这些动作是“生命感层”，不是“业务状态层”。它们可以让模型更自然，但不应该覆盖角色主状态。

## 3. 角色设定如何映射到模型

角色文档分两类信息：

1. 角色概念文档：性格、行为模式、说话风格、关系成长、打扰风险。
2. 模型设计文档：视觉规格、状态帧序列、生成 prompt、sprite.json。

建议采用三段式映射：

```text
Character Design
  -> Character Behavior Map
  -> Model Adapter
```

### 3.1 Character Design

角色文档定义“这个角色是谁”：

- 核心气质。
- 行为边界。
- 什么情况下主动，什么情况下克制。
- 典型道具和视觉锚点。
- 台词风格。
- 与用户关系成长曲线。

例如 Luffy 的重点不是“每次都热血大喊”，而是“休息模式的冒险伙伴”：热血还在，但桌面陪伴场景里更安静、更稳。

例如 Amber 的重点不是“机械感助手”，而是“古董钟表店见习修表师”：礼貌、克制、细致、低打扰。

### 3.2 Character Behavior Map `[提案]`

这一层把角色文档翻译成可执行语义。*当前为提案阶段，尚未落地为代码。* 建议为每个角色维护一个行为映射表，后续可以进入 `character.json` 或模型 manifest。

建议字段：

```ts
type CharacterBehaviorMap = {
  id: string;
  displayName: string;
  temperament: {
    activity: "low" | "medium" | "high";
    interruptiveness: "low" | "medium" | "high";
    warmth: "reserved" | "gentle" | "expressive";
  };
  stateSemantics: Record<PetState, {
    intent: string;
    performanceNotes: string[];
    pacing: {
      loopMs?: number;
      microActionDensity?: "low" | "medium" | "high";
    };
    speechStyle?: string[];
  }>;
};
```

它不直接写 Live2D motion group，也不直接写 sprite row。它描述“这个状态应该怎么演”。

### 3.3 Model Adapter

这一层把行为映射落到不同模型类型：

| 模型类型 | 落地位置 | 映射内容 |
|---|---|---|
| Sprite | `sprite.json` + spritesheet | row、frames、durationMs、layers、fit |
| Live2D | `motionResolver.ts` 或 per-model mapping | motion group、motion index、expression、参数动作 |
| Emoji fallback | CSS class / emoji map | 状态 emoji、简单视觉反馈 |

后续如果要精细化，推荐把 Live2D 从”全局关键词猜测”升级为”每模型可选映射文件” `[提案]`：

```json
{
  "type": "live2d",
  "name": "Haru",
  "behaviorMap": {
    "idle": { "motions": [{ "group": "Idle", "index": 0 }] },
    "talking": { "motions": [{ "group": "Tap", "index": 1 }] },
    "thinking": { "motions": [{ "group": "Tap", "match": "look" }] },
    "happy": { "motions": [{ "group": "Tap", "match": "happy" }] },
    "sleepy": { "motions": [{ "group": "Idle", "match": "sleep" }] }
  }
}
```

如果没有 per-model mapping，则继续使用 `motionResolver.ts` 的默认策略。

## 4. Luffy 映射草案

来源：

- `_CHARACTER/路飞.md`
- `_CHARACTER/路飞_design.md`
- `public/models/Luffy/sprite.json`

角色关键词：

- 休息模式的冒险伙伴。
- 直率、热血，但桌面场景里低打扰。
- 能让用户感觉“有人守着桌面”，不是频繁打断。
- 视觉锚点：草帽、红背心、蓝短裤、木桶、露齿笑。

状态映射：

| `PetState` | 角色语义 | Sprite 表演 | 节奏建议 |
|---|---|---|---|
| `idle` | 船头/木桶常驻，保持陪伴感 | 盘腿坐、压草帽、晃腿、露齿微笑 | 中等偏慢，稳定重心 |
| `talking` | 短句回应，直接但不吵 | 转向观众、开口、咧嘴笑 | 短循环，不长时间停留 |
| `thinking` | 简单直率地想办法 | 歪头、戳太阳穴、抱胸、敲掌心 | 比 idle 略明显 |
| `happy` | 标志性大笑，但作为短暂奖励 | 大笑、后仰、橡胶手臂小彩蛋 | 高活跃但低频 |
| `sleepy` | 草帽盖脸打盹，休息模式 | 靠桶、躺平、草帽遮脸 | 慢循环，尽量安静 |

当前 `sprite.json` 已经基本符合：

| `PetState` | row | frames | durationMs |
|---|---:|---:|---:|
| `idle` | 0 | 4 | 2400 |
| `talking` | 1 | 2 | 1400 |
| `thinking` | 2 | 3 | 2000 |
| `happy` | 3 | 3 | 1200 |
| `sleepy` | 4 | 2 | 3200 |

需要注意：

- `happy` 可以夸张，但应由状态机或事件低频触发，避免长期打扰。
- `idle` 和 `sleepy` 的重心必须稳定，否则桌面窗口会显得跳。
- 如果未来增加自主动作，Luffy 可以有极低频“橡胶手臂彩蛋”，但不应成为常规 idle。

## 5. Amber 映射草案

来源：

- `_CHARACTER/琥珀.md`
- `_CHARACTER/琥珀_design.md`

角色关键词：

- 古董钟表店见习修表师。
- 礼貌、克制、观察细致。
- 对节奏敏感，低打扰式好奇。
- 视觉锚点：怀表、钟表基座、黄铜齿轮、贝雷帽、蕾丝、暖红棕/黄铜/象牙白/黑曜色。

状态映射：

| `PetState` | 角色语义 | Sprite 表演 | 节奏建议 |
|---|---|---|---|
| `idle` | 安静维护钟表，像值守者 | 擦怀表、对光检查、给八音盒上发条、安静坐回 | 慢，低幅度 |
| `talking` | 礼貌短句回应，认真倾听 | 微微鞠躬、嘴型短句、直起身倾听 | 短而克制 |
| `thinking` | 困惑寻物，细致检查 | 找放大镜、举到眼前、检查齿轮咬合 | 中慢，有一点天然呆 |
| `happy` | 整点报时的小满足 | 看时钟、轻敲银铃、礼貌微笑 | 轻快但不喧闹 |
| `sleepy` | 齿轮渐慢，靠着钟座睡着 | 托腮、怀表滑落、贝雷帽滑到鼻尖 | 很慢，最低打扰 |

建议的 `sprite.json` `[提案]`：

| `PetState` | row | frames | durationMs |
|---|---:|---:|---:|
| `idle` | 0 | 4 | 2800 |
| `talking` | 1 | 2 | 1600 |
| `thinking` | 2 | 3 | 2200 |
| `happy` | 3 | 3 | 1400 |
| `sleepy` | 4 | 2 | 3400 |

需要注意：

- Amber 的动作幅度应小于 Luffy。
- 她可以对鼠标/窗口变化有“轻微视线跟随”，但不追着用户跑。
- 深夜或长时间工作时，可以强化陪伴感而不是提醒感。

## 6. 建议的实现演进 `[规划]`

> 以下四个阶段均为未来规划，当前均未落地。代码结构保持 §1 描述的状态。

### 阶段 1：文档和资源约定 `[规划]`

先保持代码结构不大改，统一约定：

- 每个角色必须有角色概念文档。
- 每个 sprite 角色必须有设计文档和 `sprite.json`。
- 每个 `PetState` 都必须在角色设计中有明确语义。
- 如果某状态没有角色依据，不在模型层凭空新增动作。

### 阶段 2：增加角色配置文件 `[规划]`

建议每个模型目录增加可选 `character.json`：

```json
{
  "id": "luffy",
  "displayName": "Luffy",
  "profileDoc": "_CHARACTER/路飞.md",
  "designDoc": "_CHARACTER/路飞_design.md",
  "temperament": {
    "activity": "medium",
    "interruptiveness": "low",
    "warmth": "expressive"
  },
  "states": {
    "idle": {
      "intent": "resting adventure companion",
      "microActionDensity": "medium"
    },
    "happy": {
      "intent": "short celebratory burst",
      "microActionDensity": "high"
    }
  }
}
```

这份文件服务于：

- 设置页展示角色说明。
- 未来 LLM prompt 注入角色说话风格。
- 未来动作调度按角色调节密度。
- 未来 Live2D per-model motion mapping。

### 阶段 3：把调度参数角色化 `[规划]`

当前 `ActionScheduler` 的节奏是全局的：

```ts
const STATE_PACING: Partial<Record<PetState, number>> = {
  idle: 1.0,
  talking: 0.7,
  thinking: 0.8,
  happy: 0.6,
  sleepy: 2.0,
};
```

后续可以扩展为：

```text
global state pacing
  x character activity multiplier
  x user context multiplier
```

例如：

- Luffy：`happy` 活跃度高，但冷却更长。
- Amber：整体动作密度低，`thinking` 可以略微提高小动作频率。

### 阶段 4：Live2D 映射显式化 `[规划]`

当前 Live2D 通过 group 和关键词猜测 motion。短期可用，但角色越多越容易不准。

建议未来支持：

```text
model folder
  -> model3.json / model.json
  -> fit.json
  -> character.json
  -> motion-map.json
```

其中 `motion-map.json` 只负责模型资源绑定，`character.json` 负责角色语义。

## 7. 对齐问题

我们需要确认以下设计决策：

1. `PetState` 是否继续保持 5 个基础状态，还是要增加更细状态，例如 `attention`、`hover`、`dragging`、`focus`？
2. 角色设定是否要成为运行时可读配置，也就是引入 `character.json`？
3. Live2D 是否接受每模型 `motion-map.json`，避免长期依赖关键词猜测？
4. Sprite 是否继续把 row 顺序固定为 `idle / talking / thinking / happy / sleepy`，以降低制作成本？
5. 角色的说话风格是否要进入聊天 prompt，还是先只影响动作和模型表现？

建议默认答案：

- 基础 `PetState` 先保持 5 个。
- hover、dragging、attention 先作为事件或调度动作，不升级为长期状态。
- 新增 `character.json`，但第一版只读不强依赖。
- Sprite row 顺序继续固定。
- 说话风格后续进入 prompt，但和模型动作映射保持解耦。

