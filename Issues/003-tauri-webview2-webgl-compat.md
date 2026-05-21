# Issue #003: Tauri WebView2 + 透明窗口 + WebGL 兼容性

状态: **待验证**

## 背景
Live2D 渲染需要三个条件同时满足：
1. WebGL 上下文可用 (PIXI.Application renderer.type === 1)
2. Cubism Core SDK 成功加载并初始化 (window.Live2DCubismCore + CubismFramework)
3. WebGL 内容能合成到 Tauri 透明窗口上

Playwright 测试（headless Chromium）中三个条件都满足。Tauri 中可能因以下原因失败。

## WebView2 WebGL 支持
Windows 上的 Tauri v2 使用 WebView2（Edge Chromium）作为渲染引擎。
WebView2 的 GPU/WebGL 支持取决于：
- GPU 驱动版本
- Windows 图形设置
- WebView2 的 GPU 黑名单

**验证方法**: 在 Tauri 窗口内按 F12 打开 DevTools，访问 `edge://gpu` 查看 WebGL 状态。

## 透明窗口的合成问题
Tauri 的 `"transparent": true` 在 Windows 上使用 `WS_EX_LAYERED` 窗口风格。
已知问题：
- 部分 GPU 上 WebGL 无法渲染到分层窗口表面
- WebGL framebuffer 的 alpha 通道处理可能与分层窗口不兼容
- 表现为：模型加载成功、canvas 有内容、但在屏幕上不可见

## 关键文件
- `src-tauri/tauri.conf.json` → `app.windows[0].transparent: true`
- `src-tauri/tauri.conf.json` → `app.windows[0].decorations: false`
- `src/styles/global.css` → `html, body, #root { background: rgba(0,0,0,0.001); }`

## 可能的解决方案
1. 关闭透明窗口测试 (`"transparent": false`)，确认 WebGL 在不透明窗口下是否正常
2. 如果关闭透明后 Live2D 正常显示，再考虑如何恢复透明效果
3. 可能的替代方案：使用 chroma-key (绿幕) + 窗口后处理，而非真正的透明窗口
