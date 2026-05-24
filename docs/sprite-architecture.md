# Sprite 模式架构设计

> 对齐版本：待确认

---

## 一、组件树

```
App
 ├─ ChatPanel          （聊天面板，不变）
 ├─ SettingsPage       （设置窗口，不变）
 │
 └─ app-layout
     └─ pet-area (data-tauri-drag-region)
         └─ DesktopPet
              │ 读取 prefs.model_type
              │
              ├─ "live2d"  → Live2DPet   (已有)
              ├─ "sprite"  → SpritePet   (新增)
              └─ 失败      → emoji 回退  (已有)
```

Live2DPet 和 SpritePet 实现**完全相同的接口**，DesktopPet 不做类型判断，只传 props。

---

## 二、统一 Props 接口

```ts
// types.ts
interface PetRendererProps {
  state: PetState;           // 当前状态，来自 usePetState
  modelPath: string;         // 模型文件夹路径
  onLoadError: () => void;   // 加载失败 → emoji 回退
  onStatus: (msg: string) => void;  // 调试状态信息
}
```

两个组件签名完全一致：

```ts
// Live2DPet.tsx
export default function Live2DPet({ state, modelPath, onLoadError, onStatus }: PetRendererProps)

// SpritePet.tsx (新增)
export default function SpritePet({ state, modelPath, onLoadError, onStatus }: PetRendererProps)
```

DesktopPet 路由：

```ts
// DesktopPet.tsx
const renderer = prefs.model_type === "sprite"
  ? <SpritePet  key={prefs.model_path} state={state} modelPath={prefs.model_path} ... />
  : <Live2DPet  key={prefs.model_path} state={state} modelPath={prefs.model_path} ... />;
```

---

## 三、数据流

```
用户选模型 → SettingsPage.save()
  ↓ 写入
localStorage: { model_type, model_path }
  ↓ 读取
DesktopPet: loadPrefs()
  ↓ 路由
Live2DPet / SpritePet
  ↓ 加载模型文件
  ↓ 创建 PIXI 实例
  ↓ 注册动作到 ActionScheduler
  ↓ 渲染
PIXI Canvas
```

状态变更流：

```
usePetState(state)  ← AI 状态机（idle/talking/thinking/happy/sleepy）
  ↓ props
PetRenderer
  ↓ useEffect
ActionScheduler （调速）
  ↓
action registry（选动作）
  ↓
PIXI 对象操作（Live2D: motion/param | Sprite: texture/transform）
```

---

## 四、ActionScheduler 共享设计

当前 ActionScheduler 已支持：冷却期、状态调速、动作间休息、状态过滤。

需要扩展的能力：

```ts
// 新增：事件触发通道
scheduler.trigger(event: ActionEvent, payload?: any): void;

type ActionEvent =
  | "click" | "hover" | "hover_end"
  | "chat_start" | "chat_end" | "user_typing"
  | "user_return" | "idle_timeout_3m" | "idle_timeout_10m"
  | "time_morning" | "time_midnight";

// 新增：条件动作
interface ConditionalAction extends ScheduledAction {
  condition?: () => boolean;          // 是否允许执行
  trigger?: ActionEvent;              // 事件触发（替代随机调度）
  minIdleTime?: number;               // 累计空闲时间条件
}
```

调度优先级：

```
事件触发 (交互)  >  状态绑定 (情绪/状态)  >  自动随机 (基础/观察)
```

两个模式共用调度器核心（定时器管理、冷却期、速度调节），各自注册不同的动作实现：

```
src/live2d/
  ActionScheduler.ts        ← 核心引擎（共用）
  actions.ts                ← Live2D 动作注册
  spriteActions.ts          ← Sprite 动作注册（新增）

src/components/
  Live2DPet.tsx  → new ActionScheduler + registerBasicActions()
  SpritePet.tsx  → new ActionScheduler + registerSpriteActions()
```

---

## 五、文件结构

```
新增:
  src/components/SpritePet.tsx        ← Sprite 渲染组件
  src/live2d/spriteActions.ts         ← Sprite 动作注册
  docs/sprite-action-system.md        ← 动作体系文档
  docs/sprite-architecture.md         ← 本文档

修改:
  src/types.ts                        ← 加 model_type 字段
  src/utils/prefs.ts                  ← 加 model_type 默认值
  src/components/DesktopPet.tsx       ← 路由逻辑
  src/live2d/ActionScheduler.ts       ← 扩展事件/条件系统
  src/components/SettingsPage.tsx     ← 加模型类型选择
```

---

## 六、SpritePet 组件结构

```tsx
// SpritePet.tsx
export default function SpritePet({ state, modelPath, onLoadError, onStatus }: PetRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<PIXI.Application>();
  const spriteRef = useRef<PIXI.Sprite>();
  const configRef = useRef<SpriteConfig>();
  const texturesRef = useRef<Record<string, PIXI.Texture>>({});
  const schedulerRef = useRef<ActionScheduler>();

  // 初始化：(1) 加载 sprite.json → (2) 预加载贴图 → (3) 创建 PIXI → (4) 注册动作
  useEffect(() => { init(); return cleanup; }, [modelPath]);

  // 状态切换：换贴图
  useEffect(() => {
    if (!spriteRef.current || !configRef.current) return;
    const texKey = configRef.current.states[state]?.texture
                || configRef.current.states.idle.texture;
    spriteRef.current.texture = texturesRef.current[texKey];
  }, [state]);

  return <canvas ref={canvasRef} width={300} height={300} />;
}
```

---

## 七、sprite.json 格式

```json
{
  "type": "sprite",
  "name": "My Sprite",
  "scale": 1.0,
  "anchor": [0.5, 0.5],
  "size": [300, 300],
  "blinkStyle": "texture",
  "blinkDuration": 80,
  "states": {
    "idle":    { "texture": "idle.png" },
    "talking": { "texture": "talking.png", "blink": "talking_blink.png" },
    "thinking":{ "texture": "thinking.png" },
    "happy":   { "texture": "happy.png", "blink": "happy_blink.png" },
    "sleepy":  { "texture": "sleepy.png" }
  }
}
```

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `type` | string | 必填 | `"sprite"` |
| `name` | string | `""` | 显示名 |
| `scale` | number | `1.0` | 缩放倍数 |
| `anchor` | [number,number] | `[0.5,0.5]` | 锚点 |
| `size` | [number,number] | `[300,300]` | canvas 尺寸 |
| `blinkStyle` | "texture"\|"opacity" | `"opacity"` | 眨眼方式 |
| `blinkDuration` | number | `80` | 闭眼 ms |
| `states.<s>.texture` | string | 必填 | 贴图路径 |
| `states.<s>.blink` | string | 可选 | 眨眼贴图 |

---

## 八、类型变更

```ts
// types.ts
export interface UserPreferences {
  // ... existing ...
  live2d_enabled: boolean;
  model_path: string;
  model_type: "live2d" | "sprite";   // 新增
}
```

```ts
// prefs.ts
const DEFAULTS: UserPreferences = {
  // ... existing ...
  live2d_enabled: true,
  model_path: "models/haru_greeter_t03/haru_greeter_t03.model3.json",
  model_type: "live2d",              // 新增
};
```

---

## 九、设置面板改动

```
设置窗口:
  启用 Live2D      [✓]          ← 保留
  模型类型          [Live2D ▼]   ← 新增 (Live2D / Sprite)
  模型路径          [_______]    ← 不变
```

---

## 十、错误处理与回退

```
加载 sprite.json 失败     → onLoadError() → emoji 回退 + 显示错误
贴图文件不存在             → 回退到 idle.png
某状态缺贴图               → 回退到 idle.png
PIXI 创建失败 (无 WebGL)   → onLoadError() → emoji 回退
```

---

## 十一、实现阶段

**阶段 1 — 骨架（本次）**
- SpritePet 组件（渲染 + 贴图加载 + 状态切换）
- types + prefs + SettingsPage 加 model_type
- DesktopPet 路由
- spriteActions 空壳

**阶段 2 — MVP 动作**
- 基础生命 4 个 (breathing, blink_soft, idle_shift, subtle_float)
- 观察 3 个 (look_left, look_right, distant_stare)
- 情绪 2 个 (soft_smile, sleepy)

**阶段 3 — 交互动作 + 事件系统**
- ActionScheduler 加 trigger() 通道
- hover_notice, attention_enter, thinking, talking_soft
- 接入 chat 事件、click 事件

**阶段 4 — 陪伴 + 时段**
- 累计时间条件
- silent_company, midnight_sleepy 等
