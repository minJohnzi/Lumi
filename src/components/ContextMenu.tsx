import { Icon } from "@iconify/react";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef } from "react";
import "../styles/context-menu.css";

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onSnap: () => void;
  onHide: () => void;
  onToggleChat: () => void;
}

type ArcDirection = "up" | "down";
type ArcSide = "left" | "right";

const menuItems = [
  {
    key: "chat",
    label: "Chat",
    icon: "mage:message-round",
  },
  {
    key: "snap",
    label: "Snap",
    icon: "arcticons:edge-gestures",
  },
  {
    key: "hide",
    label: "Hide",
    icon: "mdi:hide-outline",
  },
] as const;

export default function ContextMenu({
  x,
  y,
  onClose,
  onSnap,
  onHide,
  onToggleChat,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  const layout = useMemo(() => {
    const width = 96;
    const height = 148;
    const margin = 8;
    const arcDirection: ArcDirection = y + height > window.innerHeight && y > height ? "up" : "down";
    const arcSide: ArcSide = x + width + 14 <= window.innerWidth ? "right" : "left";
    const rawLeft = arcSide === "right" ? x + 10 : x - width - 10;
    const left = Math.min(Math.max(margin, rawLeft), Math.max(margin, window.innerWidth - width - margin));
    const top = arcDirection === "down"
      ? Math.min(Math.max(margin, y - 18), Math.max(margin, window.innerHeight - height - margin))
      : Math.max(margin, Math.min(y - height + 18, window.innerHeight - height - margin));

    const outerX = arcSide === "right" ? 40 : 14;
    const innerX = arcSide === "right" ? 50 : 4;

    const points =
      arcDirection === "down"
        ? [
            { top: 4, left: outerX },
            { top: 52, left: innerX },
            { top: 100, left: outerX },
          ]
        : [
            { top: 102, left: outerX },
            { top: 54, left: innerX },
            { top: 6, left: outerX },
          ];

    return { left, top, points, arcDirection, arcSide, width, height };
  }, [x, y]);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const id = window.setTimeout(() => document.addEventListener("mousedown", handle), 0);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("mousedown", handle);
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  useEffect(() => {
    if (menuRef.current) {
      menuRef.current.style.setProperty("--arc-direction", layout.arcDirection);
      menuRef.current.style.setProperty("--arc-side", layout.arcSide);
    }
  }, [layout.arcDirection, layout.arcSide]);

  return createPortal(
    <div className="context-menu-portal" onContextMenu={(e) => e.preventDefault()}>
      <div
        ref={menuRef}
        className={`context-menu side-${layout.arcSide}`}
        style={{ left: layout.left, top: layout.top, width: layout.width, height: layout.height }}
      >
        <div className="context-menu-orbit">
          {menuItems.map((item, index) => {
            const onClick =
              item.key === "chat" ? onToggleChat : item.key === "snap" ? onSnap : onHide;
            const point = layout.points[index];
            return (
              <button
                key={item.key}
                type="button"
                className={`context-menu-node node-${item.key}`}
                style={{ left: point.left, top: point.top }}
                aria-label={item.label}
                title={item.label}
                onClick={() => {
                  onClick();
                  onClose();
                }}
              >
                <span className="context-menu-node-ring" />
                <Icon icon={item.icon} width={18} height={18} />
              </button>
            );
          })}
          <span className="context-menu-arc" />
        </div>
      </div>
    </div>,
    document.body,
  );
}
