# Issue #001: Live2D 模型在 Tauri 中不显示

状态: **排查中**

## 现象
在 `npm run tauri dev` 中只看到 emoji 回退（😊），Live2D 模型和 canvas 均未渲染。

## 初始化流程
```
index.html
  → <script> 加载 live2dcubismcore.min.js (207KB, Cubism 5.1.0)
  → <script type="module"> 加载 main.tsx → App → DesktopPet → Live2DPet
  → Live2DPet.useEffect:
      1. import("pixi.js")                        ← 动态加载
      2. (window as any).PIXI = PIXI              ← 设全局，供 Cubism 插件找 Ticker
      3. import("pixi-live2d-display/cubism4")    ← 顶层检查 window.Live2DCubismCore
      4. new PIXI.Application({ view: canvas, backgroundAlpha: 0 })
      5. if (renderer.type !== 1) → WebGL 不可用 → onLoadError() → emoji 回退
      6. Live2DModel.from("models/haru_greeter_t03.model3.json")
         内部: cubism4Ready() → CubismFramework.startUp() → .initialize()
      7. model 加入 stage → 播放 Idle 动作
```

## 可能原因（按概率排序）

### 1. WebGL 在 WebView2 中不可用 (概率最高)
**现象**: `app.renderer.type` 不是 1（不是 WebGL），代码触发 `onLoadError()`。
**原因**: Tauri 在 Windows 上使用 WebView2（Edge Chromium）作为 webview。
某些 GPU/驱动组合下 WebView2 的 WebGL 被禁用或列入黑名单。
**验证方法**: 在 Live2DPet 初始化时看红色调试文字是否显示：
```
PIXI app created (renderer type: X)   ← X=1 表示 WebGL, X=2 表示 Canvas2D
ERROR: WebGL not available            ← 如果 X≠1 会显示这行
```

### 2. 透明窗口 + WebGL 合成失败 (概率较高)
**现象**: WebGL 正常（renderer.type=1），模型也加载了，但在透明窗口上不可见。
**原因**: Tauri 的 `"transparent": true` 使用 `WS_EX_LAYERED` 窗口风格。
在某些 Windows 版本/GPU上，WebGL 内容无法正确合成到分层窗口表面。
表现为：canvas 元素存在、模型加载成功、但画面上看不到 Live2D 角色。
**相关配置**: `src-tauri/tauri.conf.json` → `app.windows[0].transparent: true`

### 3. CubismFramework 在 StrictMode 双重挂载下初始化失败
**现象**: `Live2DModel.from()` 抛出异常："Failed to start up Cubism 4 framework."
**原因**: React.StrictMode 在开发模式下会挂载→卸载→重新挂载组件。
第一次挂载: CubismFramework.startUp() + .initialize() 成功。
卸载: PIXI App destroyed，但 CubismFramework 未 dispose。
第二次挂载: cubism4Ready() 中的 retry loop（20次×10ms）全部失败。
**代码位置**: `Live2DPet.tsx:76` import cubism4 → `Live2DModel.from()` → `cubism4Ready()`
**Playwright 测试**: 曾出现过（在引入手动 dispose 之前）

### 4. Cubism Core SDK 未能正确设置全局变量
**现象**: `import("pixi-live2d-display/cubism4")` 抛出异常：
"Could not find Cubism 4 runtime. This plugin requires live2dcubismcore.js to be loaded."
**原因**: `public/libs/live2dcubismcore.min.js` 未能加载或执行。
- 如果 Vite 未正确 serve 该文件
- 如果 WebView2 有 CSP 限制
**验证**: 红色调试文字停在 "Loading Cubism4 plugin..."

### 5. 模型文件加载失败
**现象**: `Live2DModel.from()` reject → "Live2D model load failed" → emoji 回退。
**原因**: 模型文件 fetch 失败（网络/路径问题）。
**验证**: 红色调试文字停在 "Loading model: models/haru_greeter_t03.model3.json..."
**模型文件清单** (`public/models/`):
- haru_greeter_t03.model3.json (清单)
- haru_greeter_t03.moc3 (385KB 二进制模型)
- haru_greeter_t03.cdi3.json (显示参数，已补充)
- haru_greeter_t03.physics3.json / .pose3.json
- haru_greeter_t03.2048/texture_00.png / texture_01.png
- motion/*.motion3.json (5 个动作文件)
- expressions/*.exp3.json (8 个表情文件)

### 6. 调试文字不可见（妨碍排查）
**现象**: Live2DPet 中的红色调试文字（`statusRef`）在 `onLoadError()` 触发后立即消失。
**原因**: `onLoadError()` → `setLive2dFailed(true)` → DesktopPet 切换到 emoji 回退 → Live2DPet 被卸载 → 调试 div 随组件一起卸载。
**影响**: 用户永远看不到错误信息，无法定位失败步骤。

## 已完成的修复
- [x] 下载官方 Cubism 5.1.0 SDK 到 `public/libs/live2dcubismcore.min.js` (207KB)
- [x] 导入路径从 `pixi-live2d-display` 改为 `pixi-live2d-display/cubism4`
- [x] 补充缺失的 `haru_greeter_t03.cdi3.json`
- [x] 添加 `(window as any).PIXI = PIXI` 解决 Ticker 警告
- [x] 添加 WebGL 检测 (`renderer.type !== 1` → onLoadError)
- [x] 添加 `preserveDrawingBuffer: true` + `powerPreference: "high-performance"`
- [x] CSS `background: rgba(0,0,0,0.001)` 解决透明窗口鼠标穿透
- [x] `vite.config.ts` 中 `strictPort: false`

## 待尝试
- [ ] 将调试文字移到 DesktopPet（不随 Live2DPet 卸载）
- [ ] 检查 WebView2 的 WebGL 状态：在 Tauri 窗口内打开 `chrome://gpu`
- [ ] 尝试关闭透明窗口 (`transparent: false`) 测试是否为合成问题
- [ ] 在 `tauri.conf.json` 的 CSP 中允许 `localhost:1420`
- [ ] 尝试在 init 前手动 dispose CubismFramework 解决 StrictMode 问题
- [ ] 检查 `chrome://gpu` 的 WebGL 状态
