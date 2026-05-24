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
    import("@tauri-apps/api/window").then(async ({ getCurrentWindow, availableMonitors }) => {
      import("@tauri-apps/api/dpi").then(async ({ LogicalPosition }) => {
        const win = getCurrentWindow();
        const pos = await win.outerPosition();
        const size = await win.outerSize();
        const monitors = await availableMonitors();
        if (monitors.length === 0) return;

        // Find the monitor that contains the window, or use primary
        const monitor = monitors.find((m) => {
          const mx = m.position.x;
          const my = m.position.y;
          const mw = m.size.width;
          const mh = m.size.height;
          const cx = pos.x + size.width / 2;
          const cy = pos.y + size.height / 2;
          return cx >= mx && cx <= mx + mw && cy >= my && cy <= my + mh;
        }) ?? monitors[0];

        const mLeft = monitor.position.x;
        const mRight = monitor.position.x + monitor.size.width;
        const winLeft = pos.x;
        const winRight = pos.x + size.width;

        const distLeft = winLeft - mLeft;
        const distRight = mRight - winRight;

        prevPos.current = { x: pos.x, y: pos.y };
        const SLIVER = 30;
        if (distLeft <= distRight) {
          await win.setPosition(new LogicalPosition(mLeft - size.width + SLIVER, pos.y));
        } else {
          await win.setPosition(new LogicalPosition(mRight - SLIVER, pos.y));
        }
        setIsEdgeHidden(true);
      });
    });
  }, []);

  // Click-to-restore from edge-hidden state
  const handlePetAreaClick = useCallback(() => {
    if (!isEdgeHidden) return;
    import("@tauri-apps/api/window").then(async ({ getCurrentWindow }) => {
      import("@tauri-apps/api/dpi").then(async ({ LogicalPosition }) => {
        if (prevPos.current) {
          await getCurrentWindow().setPosition(
            new LogicalPosition(prevPos.current.x, prevPos.current.y),
          );
        }
        setIsEdgeHidden(false);
      });
    });
  }, [isEdgeHidden]);

  // Exit with animation
  const handleQuit = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      import("@tauri-apps/api/core").then(({ invoke }) => {
        invoke("exit_app").catch(() => {});
      });
    }, 300);
  }, []);

  // Start window drag on left mouse (replaces data-tauri-drag-region)
  const handlePetAreaMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
      getCurrentWindow().startDragging();
    });
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
          onMouseDown={handlePetAreaMouseDown}
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
