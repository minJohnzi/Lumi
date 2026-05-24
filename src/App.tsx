import { useState, useEffect, useCallback, useRef } from "react";
import DesktopPet from "./components/DesktopPet";
import ChatPanel from "./components/ChatPanel";
import ContextMenu from "./components/ContextMenu";
import { usePetState } from "./hooks/usePetState";
import { loadPrefs, savePrefs } from "./utils/prefs";
import { Icon } from "@iconify/react";

function App() {
  const { state, transition, wakeUp } = usePetState("idle");
  const [showChat, setShowChat] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Context menu state
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [petScale, setPetScale] = useState(() => loadPrefs().pet_scale ?? 1.0);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(() => loadPrefs().always_on_top ?? true);
  const [isExiting, setIsExiting] = useState(false);
  const [isEdgeHidden, setIsEdgeHidden] = useState(false);
  const prevPos = useRef<{ x: number; y: number } | null>(null);

  // Persist scale changes
  const handleScaleChange = useCallback((s: number) => {
    setPetScale(s);
    const p = loadPrefs();
    p.pet_scale = s;
    savePrefs(p);
  }, []);

  // Toggle always-on-top
  const handleToggleAlwaysOnTop = useCallback(() => {
    import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
      const next = !isAlwaysOnTop;
      getCurrentWindow().setAlwaysOnTop(next);
      setIsAlwaysOnTop(next);
      const p = loadPrefs();
      p.always_on_top = next;
      savePrefs(p);
    });
  }, [isAlwaysOnTop]);

  // Edge hide: snap to nearest screen edge
  const handleEdgeHide = useCallback(() => {
    import("@tauri-apps/api/window").then(async ({ getCurrentWindow }) => {
      const win = getCurrentWindow();
      const pos = await win.outerPosition();
      const size = await win.outerSize();
      const monitor = await win.currentMonitor();
      if (!monitor) return;

      const mLeft = monitor.position.x;
      const mRight = monitor.position.x + monitor.size.width;
      const winLeft = pos.x;
      const winRight = pos.x + size.width;

      const distLeft = winLeft - mLeft;
      const distRight = mRight - winRight;

      prevPos.current = { x: pos.x, y: pos.y };
      const SLIVER = 30;
      if (distLeft <= distRight) {
        await win.setPosition({ x: mLeft - size.width + SLIVER, y: pos.y });
      } else {
        await win.setPosition({ x: mRight - SLIVER, y: pos.y });
      }
      setIsEdgeHidden(true);
    });
  }, []);

  // Click-to-restore from edge-hidden state
  const handlePetAreaClick = useCallback(() => {
    if (!isEdgeHidden) return;
    import("@tauri-apps/api/window").then(async ({ getCurrentWindow }) => {
      if (prevPos.current) {
        await getCurrentWindow().setPosition(prevPos.current);
      }
      setIsEdgeHidden(false);
    });
  }, [isEdgeHidden]);

  // Exit with animation
  const handleQuit = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      import("@tauri-apps/api/process").then(({ exit }) => exit(0));
    }, 300);
  }, []);

  // Right-click handler
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  }, []);

  // Apply saved screenshot protection on startup
  useEffect(() => {
    const prefs = loadPrefs();
    import("@tauri-apps/api/core").then(({ invoke }) => {
      invoke("toggle_screenshot_detect", { enabled: prefs.screenshot_hide }).catch(() => {});
    });
  }, []);

  // Listen for refresh-model event from settings window
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    import("@tauri-apps/api/event").then(({ listen }) => {
      listen("refresh-model", () => setRefreshKey((k) => k + 1)).then((fn) => { unlisten = fn; });
    }).catch(() => {});
    return () => { unlisten?.(); };
  }, []);

  return (
    <>
      <div className={`app-layout${showChat ? " has-chat" : ""}${isExiting ? " is-exiting" : ""}`}>
        {showChat && (
          <div className="chat-wrapper">
            <ChatPanel
              onClose={() => setShowChat(false)}
              onStateChange={transition}
            />
          </div>
        )}

        <div
          className={`pet-area${showChat ? " with-chat" : ""}${isEdgeHidden ? " edge-hidden" : ""}`}
          data-tauri-drag-region
          onContextMenu={handleContextMenu}
          onClick={handlePetAreaClick}
          style={{ transform: `scale(${petScale})`, transformOrigin: "center center" }}
        >
          <DesktopPet key={refreshKey} state={state} />

          <button
            className="chat-toggle-btn"
            onClick={() => {
              setShowChat(!showChat);
              if (!showChat) wakeUp();
            }}
            title="对话"
          >
            <Icon icon="mage:message-round" width={22} height={22} />
          </button>
        </div>
      </div>

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          isAlwaysOnTop={isAlwaysOnTop}
          currentScale={petScale}
          onClose={() => setCtxMenu(null)}
          onEdgeHide={handleEdgeHide}
          onScaleChange={handleScaleChange}
          onToggleAlwaysOnTop={handleToggleAlwaysOnTop}
          onHide={() => {
            import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
              getCurrentWindow().hide();
            });
          }}
          onOpenChat={() => {
            setShowChat(true);
            wakeUp();
          }}
          onOpenSettings={() => {
            import("@tauri-apps/api/core").then(({ invoke }) => {
              invoke("open_settings").catch(() => {});
            });
          }}
          onQuit={handleQuit}
        />
      )}
    </>
  );
}

export default App;
