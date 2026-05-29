# 琥珀 (Amber) - Sprite Sheet 设计方案

> **角色概念**：[琥珀.md](./琥珀.md)
> **目标格式**：V3 Sprite Sheet
> **当前渲染方式**：透明 PNG + 行帧动画 + 可选分层

---

## 1. 视觉规格

| 参数 | 值 |
|------|-----|
| 角色形态 | 古典钟表店见习修表师 |
| 色系 | 红棕 `#6b3a2e`、黄铜 `#c8a860`、象牙白 `#f5f0e0`、黑曜 `#1a1a18` |
| 质感 | 蕾丝、齿轮、麂皮、珐琅表盘 |
| 风格 | 轻蒸汽朋克 / 维多利亚复古萌系（非 pixel art） |
| 帧尺寸 | 512×512 |
| 网格 | 4 列 × 5 行 |
| 实际画布 | 2048×2560 px |
| 背景 | 透明背景，空白 cell 也保持透明 |
| 贴图要求 | 角色边缘清晰，避免细碎背景元素污染留白 |

---

## 2. 状态帧序列

```
Row 0 — idle（4帧, 2800ms）：钟表维护
  帧0: 坐在古典时钟旁，用麂皮布擦拭怀表
  帧1: 举起怀表对光检查，齿轮反光映在脸上
  帧2: 放下怀表，给身旁的八音盒上发条
  帧3: 坐回原位，双手叠在膝上，安静看向前方

Row 1 — talking（2帧, 1600ms）：礼貌回应
  帧0: 微微鞠躬，嘴型说着短句
  帧1: 直起身，手指轻触下巴，认真倾听

Row 2 — thinking（3帧, 2200ms）：困惑寻觅
  帧0: 左右张望，手在桌面上摸索放大镜
  帧1: 从背后摸出放大镜，举到眼前
  帧2: 仔细检查齿轮咬合，微微皱眉

Row 3 — happy（3帧, 1400ms）：整点报时
  帧0: 听到整点钟声，转头看时钟
  帧1: 拿起小银槌，轻轻敲击小银钟
  帧2: 敲完后俏皮眨眼，礼貌微笑

Row 4 — sleepy（2帧, 3400ms）：齿轮渐慢
  帧0: 手托腮，眼角微垂，怀表滑到桌上
  帧1: 靠着时钟基座睡着，贝雷帽滑落到鼻尖
```

---

## 3. 设计重点

- sprite 画面必须透明，不能依赖纯色底去抠图。
- 每一帧的角色重心尽量固定，减少自动 fit 时的跳动。
- 服装、怀表、钟表基座要保持同一比例，不要帧与帧之间换造型。
- 角色整体偏小巧，留出适度透明边距，方便当前窗口自动贴合。
- 如果做分层版，建议至少拆成 `body` / `face` / `props` 三层，便于后续细化。

---

## 4. NB2 生成 Prompt

### 4.1 角色设定图

```
a single illustration of a petite elegant girl in Victorian-inspired dress with suspender skirt and beret,
standing beside an antique grandfather clock with brass gears and a music box,
light steampunk aesthetic, warm reddish-brown, aged brass, ivory white, and onyx palette,
she has cat-like curious eyes, delicate lace trim on her collar and cuffs,
holding a pocket watch and a small piece of chamois cloth,
refined cute style, not overly mechanical — more like a clock shop apprentice than an engineer,
transparent background, full body, centered, poised and slightly shy expression,
clear silhouette, clean edges, no scene background
```

### 4.2 单帧基准测试

```
single character sprite frame, one character only,
Victorian-style clock apprentice girl named Amber,
sitting beside a small antique clock base,
carefully polishing a pocket watch with chamois cloth,
transparent background, 512x512 canvas,
full body, centered, clean silhouette, warm vintage lighting,
light steampunk Victorian cute style,
do not create a sprite sheet, do not create multiple poses, do not create multiple characters,
one frame only
```

### 4.3 关键图 + 变体图生成流程

目标是减少工作量，同时避免 Nano Banana 误画多个角色。先生成 5 张状态关键图，再基于关键图做小幅变体。不要从零生成全部 14 张。

执行顺序：

1. 生成 `idle_key`，作为全角色基准。
2. 用 `idle_key` 做参考，生成 `talking_key / thinking_key / happy_key / sleepy_key`。
3. 对每张 key 做小幅变体，得到最终帧。
4. 统一检查尺寸、重心、透明背景。
5. 按 `sprite.json` 顺序拼成 4×5 sheet。

#### 通用前缀

```
single character sprite frame, one character only,
Victorian-style clock apprentice girl named Amber,
petite elegant girl in beret and suspender skirt beside a small antique clock base,
warm reddish-brown, aged brass, ivory white, and onyx palette,
transparent background, 512x512 canvas,
full body, centered, same camera distance as the reference,
clear silhouette, no scene background,
do not create a sprite sheet, do not create multiple poses, do not create multiple characters,
one frame only
```

#### Key Pose Prompts

- **idle_key**：坐在古典时钟旁，用麂皮布擦拭怀表，神情安静专注。
- **talking_key**：参考 idle_key 的同一角色和比例，微微鞠躬，嘴型像在说一句简短礼貌的话。
- **thinking_key**：参考 idle_key 的同一角色和比例，举起放大镜检查齿轮，微微皱眉。
- **happy_key**：参考 idle_key 的同一角色和比例，拿起小银槌，轻轻敲击银钟，礼貌微笑。
- **sleepy_key**：参考 idle_key 的同一角色和比例，靠着时钟基座困倦地睡着，贝雷帽略微滑落。

#### Variant Prompts

生成变体时，把对应 key 图作为参考图，并追加：

```
create one subtle animation variant from the reference image,
keep the exact same character identity, outfit, scale, camera distance, lighting, and transparent background,
change only the specified small pose detail,
one character only, one frame only
```

#### 最终帧清单

推荐文件名：

```text
amber_idle_00.png      amber_idle_01.png      amber_idle_02.png      amber_idle_03.png
amber_talking_00.png   amber_talking_01.png
amber_thinking_00.png  amber_thinking_01.png  amber_thinking_02.png
amber_happy_00.png     amber_happy_01.png     amber_happy_02.png
amber_sleepy_00.png    amber_sleepy_01.png
```

##### idle

- **idle_00**：坐在古典时钟旁，用麂皮布擦拭怀表，神情安静专注。
- **idle_01**：基于 idle_key，举起怀表对光检查。
- **idle_02**：基于 idle_key，放下怀表，转身给小八音盒上发条。
- **idle_03**：基于 idle_key，坐回原位，双手叠在膝上。

##### talking

- **talking_00**：微微鞠躬，嘴型像在说一句简短礼貌的话。
- **talking_01**：基于 talking_key，直起身，手指轻触下巴，认真倾听。

##### thinking

- **thinking_00**：基于 thinking_key，左右张望，手在桌面上摸索放大镜。
- **thinking_01**：从身后摸出放大镜，举到一只眼前。
- **thinking_02**：用放大镜仔细检查齿轮咬合，微微皱眉。

##### happy

- **happy_00**：基于 happy_key，听到整点钟声，转头看向身边的小钟。
- **happy_01**：拿起小银槌，轻轻敲击银钟。
- **happy_02**：敲完后对观众俏皮眨眼，礼貌微笑。

##### sleepy

- **sleepy_00**：基于 sleepy_key，手托腮，眼角微垂，怀表从手边滑到桌上。
- **sleepy_01**：靠着时钟基座睡着，贝雷帽滑落到鼻尖。

---

## 5. 后处理

```
NB2 输出透明 PNG
  → 导入 Aseprite / PS
  → 按推荐文件名保存 14 张最终帧
  → 检查每个 cell 的重心是否一致
  → 裁掉无意义的透明空边，但不要破坏每帧的对齐基准
  → 逐帧检查：角色轮廓、怀表、钟表基座是否稳定
  → 保持空白 cell 完全透明
  → 导出 PNG-24 with alpha
  → 拼版顺序：
      row 0: idle_00, idle_01, idle_02, idle_03
      row 1: talking_00, talking_01, empty, empty
      row 2: thinking_00, thinking_01, thinking_02, empty
      row 3: happy_00, happy_01, happy_02, empty
      row 4: sleepy_00, sleepy_01, empty, empty
  → build-sprite-sheet.mjs 拼版
```

---

## 6. sprite.json

```json
{
  "type": "sprite",
  "name": "琥珀 (Amber)",
  "scale": 0.38,
  "anchor": [0.5, 0.5],
  "size": [512, 512],
  "fit": {
    "paddingX": 24,
    "paddingY": 26
  },
  "sheet": "spritesheet.png",
  "frameW": 512,
  "frameH": 512,
  "states": {
    "idle":     { "row": 0, "frames": 4, "durationMs": 2800 },
    "talking":  { "row": 1, "frames": 2, "durationMs": 1600 },
    "thinking": { "row": 2, "frames": 3, "durationMs": 2200 },
    "happy":    { "row": 3, "frames": 3, "durationMs": 1400 },
    "sleepy":   { "row": 4, "frames": 2, "durationMs": 3400 }
  }
}
```
