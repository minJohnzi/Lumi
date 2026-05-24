import { useState, useEffect, useRef, useCallback } from "react";
import "../styles/context-menu.css";

interface MenuItemDef {
  label: string;
  sub: string;
  action: () => void;
  hasSubmenu?: boolean;
  dynamicLabel?: string;
}

interface ContextMenuProps {
  x: number;
  y: number;
  isAlwaysOnTop: boolean;
  currentScale: number;
  onClose: () => void;
  onEdgeHide: () => void;
  onScaleChange: (s: number) => void;
  onToggleAlwaysOnTop: () => void;
  onHide: () => void;
  onOpenChat: () => void;
  onOpenSettings: () => void;
  onQuit: () => void;
}

const SCALES = [
  { label: "娇小", value: 0.7 },
  { label: "刚好", value: 1.0 },
  { label: "显眼", value: 1.3 },
];

export default function ContextMenu({
  x,
  y,
  isAlwaysOnTop,
  currentScale,
  onClose,
  onEdgeHide,
  onScaleChange,
  onToggleAlwaysOnTop,
  onHide,
  onOpenChat,
  onOpenSettings,
  onQuit,
}: ContextMenuProps) {
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const [adjX, setAdjX] = useState(x);
  const [adjY, setAdjY] = useState(y);
  const menuRef = useRef<HTMLDivElement>(null);
  const subTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Adjust position to stay within screen bounds
  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const rect = menu.getBoundingClientRect();
    let nx = x;
    let ny = y;
    if (x + rect.width > window.innerWidth) nx = x - rect.width;
    if (y + rect.height > window.innerHeight) ny = y - rect.height;
    setAdjX(Math.max(0, nx));
    setAdjY(Math.max(0, ny));
  }, [x, y]);

  // Click outside to close
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid the same right-click event closing immediately
    const id = setTimeout(() => document.addEventListener("mousedown", handle), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", handle);
    };
  }, [onClose]);

  const handleSubEnter = useCallback(() => {
    clearTimeout(subTimeout.current);
    setSubmenuOpen(true);
  }, []);

  const handleSubLeave = useCallback(() => {
    subTimeout.current = setTimeout(() => setSubmenuOpen(false), 200);
  }, []);

  const items: MenuItemDef[] = [
    { label: "去边缘贴贴", sub: "靠边隐藏", action: onEdgeHide },
    { label: "换个身形 ▸", sub: "调整大小", action: () => {}, hasSubmenu: true },
    { label: isAlwaysOnTop ? "别挡着你" : "看着我", sub: "置顶切换", action: onToggleAlwaysOnTop },
    { label: "累啦，眯一会儿", sub: "收进托盘", action: onHide },
    { label: "来聊聊天吧", sub: "打开对话", action: onOpenChat },
    { label: "打理一下房间", sub: "打开设置", action: onOpenSettings },
    { label: "下次再找你玩，晚安", sub: "退出应用", action: onQuit },
  ];

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ left: adjX, top: adjY }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, i) => {
        const isSeparatorBefore = i === 4;
        return (
          <div key={i}>
            {isSeparatorBefore && <div className="context-menu-sep" />}
            <div
              className={`context-menu-item${item.hasSubmenu ? " has-submenu" : ""}`}
              onClick={() => {
                if (!item.hasSubmenu) {
                  item.action();
                  onClose();
                }
              }}
              onMouseEnter={item.hasSubmenu ? handleSubEnter : undefined}
              onMouseLeave={item.hasSubmenu ? handleSubLeave : undefined}
            >
              <span className="context-menu-label">{item.label}</span>
              <span className="context-menu-sub">{item.sub}</span>
              {item.hasSubmenu && submenuOpen && (
                <div
                  className="context-submenu"
                  onMouseEnter={handleSubEnter}
                  onMouseLeave={handleSubLeave}
                >
                  {SCALES.map((s) => (
                    <div
                      key={s.value}
                      className={`context-submenu-item${currentScale === s.value ? " active" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onScaleChange(s.value);
                        onClose();
                      }}
                    >
                      <span className="context-menu-label">{s.label}</span>
                      <span className="context-menu-sub">{s.value}x</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
