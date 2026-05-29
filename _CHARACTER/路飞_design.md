# 路飞 (Luffy) - Sprite Sheet 设计方案

> **角色概念**：[路飞.md](./路飞.md)
> **目标格式**：V3 Sprite Sheet（像素风）
> **当前渲染方式**：透明 PNG + 行帧动画
> **版权注意**：个人本地使用，不涉及商业分发

---

## 1. 视觉规格

| 参数 | 值 |
|------|-----|
| 角色形态 | 像素风 Chibi 草帽路飞，盘腿坐在木桶上 |
| 帧尺寸 | **460×460 px** |
| 网格 | 4 列 × 5 行 = 20 cells |
| 实际画布 | 1840×2300 px |
| 帧数 | idle:4 / talking:2 / thinking:3 / happy:3 / sleepy:2 |
| 背景 | 透明背景，空白 cell 也保持透明 |
| 质感 | 1:1 像素对齐，无抗锯齿，无渐变，无 dithering |
| 风格 | 复古 8/16-bit 游戏精灵风格（非数字绘画） |

### 色调体系（仅保留角色与道具颜色）

| 色彩类型 | 色名 | 色号 | 作用与效果 |
|----------|------|------|-----------|
| **草帽** (4阶) | 亮部 | `#E6B870` | 草帽受光面 |
| | 中间调 | `#C48B3E` | 草帽主色 |
| | 暗部 | `#A67C3D` | 帽檐阴影 |
| | 深暗 | `#805A28` | 帽檐底部最深处 |
| **肤色** (3阶) | 亮部 | `#F5B895` | 面颊/手背 |
| | 中间调 | `#E69A70` | 肤色主色 |
| | 暗部 | `#D48A6A` | 脖颈/手臂内侧阴影 |
| **头发** (2阶) | 主色 | `#2D2D2D` | 乱发主体 |
| | 暗部 | `#1A1A1A` | 发丝深度 |
| **红色背心** (3阶) | 亮部 | `#FF5555` | 受光面 |
| | 主色 | `#E63946` | 背心固有色 |
| | 暗部 | `#B82A36` | 褶皱阴影 |
| **蓝色短裤** (2阶) | 主色 | `#5B88C8` | 短裤固有色 |
| | 暗部 | `#3A6599` | 褶皱阴影 |
| **木桶/棕色** (4阶) | 亮部 | `#965A3E` | 桶面受光 |
| | 中间调 | `#70422B` | 桶身主色 |
| | 暗部 | `#503020` | 桶侧暗面 |
| | 最深 | `#301F15` | 桶底/裂缝深色 |
| **通用** (2色) | 白色 | `#FFFFFF` | 牙齿 / 眼白 |
| | 黑色 | `#000000` | 轮廓线 / 五官 |

---

## 2. 状态帧序列

```
Row 0 — idle（4帧, 2400ms）：船头晃腿
  帧0: 盘腿坐，双手撑膝，眺望远方
  帧1: 单手抬起压草帽帽檐
  帧2: 双腿轻轻交替晃荡
  帧3: 恢复坐姿，露齿微笑

Row 1 — talking（2帧, 1400ms）：说短句
  帧0: 转头面向观众，嘴张开说话
  帧1: 闭嘴咧嘴笑，眼睛眯成弯线

Row 2 — thinking（3帧, 2000ms）：经典思考
  帧0: 歪头，食指戳太阳穴
  帧1: 双臂交叉抱胸，认真思考
  帧2: 睁眼，右拳敲左掌心

Row 3 — happy（3帧, 1200ms）：标志大笑
  帧0: 仰头张嘴大笑，眼睛弯成线
  帧1: 身体后仰，橡胶手臂向上拉伸
  帧2: 恢复坐姿，手背擦嘴角，仍在笑

Row 4 — sleepy（2帧, 3200ms）：草帽盖脸打盹
  帧0: 身体歪靠桶边，草帽遮住眼睛
  帧1: 完全躺平，草帽盖脸，轻微打呼
```

---

## 3. 设计重点

- 当前 sprite 走透明贴图，不再依赖绿幕或色键。
- 每个 cell 只保留角色和木桶，空白 cell 完全透明。
- 角色重心尽量固定，避免窗口 auto fit 时上下跳动。
- 关键表情必须在小尺寸下能读出：笑、困、思考、打盹。
- 木桶、草帽、红背心、蓝短裤是最重要的识别锚点。

---

## 4. NB2 生成 Prompt

### 4.1 角色设定图

```
pixel art of a chibi Monkey D. Luffy sitting cross-legged on a wooden barrel,
red vest, blue shorts, yellow straw hat with red ribbon, black messy hair,
STRICT COLOR PALETTE — use only these colors:
  STRAW HAT: #E6B870 #C48B3E #A67C3D #805A28
  SKIN: #F5B895 #E69A70 #D48A6A
  HAIR: #2D2D2D #1A1A1A
  RED VEST: #FF5555 #E63946 #B82A36
  BLUE SHORTS: #5B88C8 #3A6599
  BARREL: #965A3E #70422B #503020 #301F15
  UNIVERSAL: #FFFFFF #000000
every pixel must be one of these colors only,
transparent background, character takes up 50-60% of canvas,
chibi 2.5-heads-tall proportions, simple readable facial features at pixel scale,
8-bit console sprite aesthetic, SNES/GBA-era quality
```

### 4.2 单帧基准测试

```
single character sprite frame, one character only,
chibi Monkey D. Luffy sitting cross-legged on a wooden barrel,
hands on knees, gazing forward,
transparent background, 460x460 canvas,
same character scale and camera distance for future frames,
no anti-aliasing, no gradients, no dithering, no blur,
black outlines define all edges,
do not create a sprite sheet, do not create multiple poses, do not create multiple characters,
one frame only,
pixel art, SNES/GBA-era quality
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
chibi Monkey D. Luffy sitting on a wooden barrel,
transparent background, same character scale, same camera distance,
460x460 canvas,
no anti-aliasing, no gradients, no dithering, no blur,
black outlines define all edges,
do not create a sprite sheet, do not create multiple poses, do not create multiple characters,
one frame only,
pixel art, SNES/GBA-era quality
```

#### Key Pose Prompts

- **idle_key**：盘腿坐在木桶上，双手撑膝，眺望前方。
- **talking_key**：参考 idle_key 的同一角色和比例，转头面向观众，嘴张开，像在说一句短句。
- **thinking_key**：参考 idle_key 的同一角色和比例，歪头，食指戳太阳穴，像在努力思考。
- **happy_key**：参考 idle_key 的同一角色和比例，仰头张嘴大笑，眼睛弯成线。
- **sleepy_key**：参考 idle_key 的同一角色和比例，身体歪靠木桶，草帽拉低遮住眼睛，嘴微张。

#### Variant Prompts

生成变体时，把对应 key 图作为参考图，并追加：

```
create one subtle animation variant from the reference image,
keep the exact same character identity, outfit, scale, camera distance, pixel palette, and transparent background,
change only the specified small pose detail,
one character only, one frame only
```

#### 最终帧清单

推荐文件名：

```text
luffy_idle_00.png      luffy_idle_01.png      luffy_idle_02.png      luffy_idle_03.png
luffy_talking_00.png   luffy_talking_01.png
luffy_thinking_00.png  luffy_thinking_01.png  luffy_thinking_02.png
luffy_happy_00.png     luffy_happy_01.png     luffy_happy_02.png
luffy_sleepy_00.png    luffy_sleepy_01.png
```

##### idle

- **idle_00**：盘腿坐在木桶上，双手撑膝，眺望前方。
- **idle_01**：基于 idle_key，单手抬起，压低草帽帽檐。
- **idle_02**：基于 idle_key，双腿轻轻晃动。
- **idle_03**：基于 idle_key，恢复坐姿，对观众露出标志性露齿笑。

##### talking

- **talking_00**：转头面向观众，嘴张开，像在说一句短句。
- **talking_01**：基于 talking_key，闭嘴咧嘴笑，眼睛眯成弯线。

##### thinking

- **thinking_00**：歪头，食指戳太阳穴，像在努力思考。
- **thinking_01**：基于 thinking_key，双臂交叉抱胸，眉毛成 V 字，闭眼认真想。
- **thinking_02**：基于 thinking_key，睁眼，右拳敲左掌心，突然想到点子。

##### happy

- **happy_00**：仰头张嘴大笑，眼睛弯成线。
- **happy_01**：基于 happy_key，身体后仰，橡胶手臂向上拉伸，但不要超出画布。
- **happy_02**：基于 happy_key，恢复坐姿，用手背擦嘴角，仍然咧嘴笑。

##### sleepy

- **sleepy_00**：身体歪靠木桶，草帽拉低遮住眼睛，嘴微张。
- **sleepy_01**：基于 sleepy_key，躺在木桶上，草帽盖住脸，出现一个小鼻涕泡。

---

## 5. 后处理

```
NB2 输出透明 PNG
  → 导入 Aseprite
  → 按推荐文件名保存 14 张最终帧
  → 检查每个 cell 的重心是否一致
  → 裁掉多余透明边，但不要破坏帧间对齐
  → 确认空白 cell 完全透明
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
  "name": "路飞 (Luffy)",
  "scale": 0.55,
  "anchor": [0.5, 0.5],
  "size": [460, 460],
  "fit": {
    "paddingX": 28,
    "paddingY": 30
  },
  "sheet": "spritesheet.png",
  "frameW": 460,
  "frameH": 460,
  "states": {
    "idle":     { "row": 0, "frames": 4, "durationMs": 2400 },
    "talking":  { "row": 1, "frames": 2, "durationMs": 1400 },
    "thinking": { "row": 2, "frames": 3, "durationMs": 2000 },
    "happy":    { "row": 3, "frames": 3, "durationMs": 1200 },
    "sleepy":   { "row": 4, "frames": 2, "durationMs": 3200 }
  }
}
```

