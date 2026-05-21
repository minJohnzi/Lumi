# Issue #002: Live2D 调试文字随组件卸载消失

状态: **未修复**

## 现象
Live2DPet.tsx 中的红色调试文字在 `onLoadError()` 触发后瞬间消失，无法用来定位失败步骤。

## 原因
```
Live2DPet.useEffect → init() 失败 → onLoadError()
  → DesktopPet.setLive2dFailed(true)
    → useLive2D = false
      → React 重新渲染
        → Live2DPet 组件卸载 ← 调试文字在此组件内，随卸载消失
        → emoji 回退显示
```

调试文字的 `statusRef` div 是 Live2DPet 的子元素。当 Live2D 初始化失败，`onLoadError()` 导致 DesktopPet 切换到 emoji 回退，Live2DPet 被 React 卸载，调试文字也随之从 DOM 中移除。

## 修复建议
将调试状态提升到 DesktopPet 或 App 层，使其不受 Live2DPet 卸载影响。

方案 A（DesktopPet 层面）:
```tsx
// DesktopPet.tsx
const [live2dStatus, setLive2dStatus] = useState<string>("");

<Live2DPet onStatusChange={setLive2dStatus} ... />
{live2dFailed && live2dStatus && (
  <div className="live2d-error">{live2dStatus}</div>
)}
```

方案 B（Live2DPet 层面，在卸载前延迟）:
```tsx
// Live2DPet.tsx - 不在 onLoadError 时立即卸载
// 改为延迟 500ms，让用户看到错误信息
```
