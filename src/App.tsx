import { useState, useEffect, useCallback, useRef } from "react";
import DesktopPet from "./components/DesktopPet";
import ChatPanel from "./components/ChatPanel";
import ContextMenu from "./components/ContextMenu";
import { usePetState } from "./hooks/usePetState";
import { useDragPhysics } from "./hooks/useDragPhysics";
import { bootstrapPrefs, reloadPrefs, savePrefs, DEFAULT_PREFS } from "./utils/prefs";
import type { UserPreferences } from "./types";
import {
  applyPetWindowScale,
  clampPetScale,
  hideCurrentWindow,
  restoreWindowPosition,
  setAlwaysOnTop,
  setScreenshotDetect,
  snapWindowToEdge,
} from "./services/windowActions";
import type { WindowFitMetrics } from "./services/windowActions";

function App() {
  const { state, transition, wakeUp } = usePetState("idle");
  const [showChat, setShowChat] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [prefs, setPrefs] = useState<UserPreferences>(() => ({ ...DEFAULT_PREFS }));

  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [windowFit, setWindowFit] = useState<WindowFitMetrics | null>(null);
  const [petScale, setPetScale] = useState(() => clampPetScale(prefs.pet_scale ?? 1.0));
  const [isEdgeHidden, setIsEdgeHidden] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const prevPos = useRef<{ x: number; y: number } | null>(null);
  const resizePointerId = useRef<number | null>(null);
  const resizeStart = useRef({ x: 0, y: 0, scale: 1 });
  const resizeRaf = useRef<number | null>(null);
  const resizePendingScale = useRef<number | null>(null);

  const {
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    cleanup,
  } = useDragPhysics();

  useEffect(() => () => cleanup(), [cleanup]);

  const handleEdgeHide = useCallback(() => {
    void (async () => {
      prevPos.current = await snapWindowToEdge();
      if (prevPos.current) {
        setIsEdgeHidden(true);
      }
    })();
  }, []);

  const handlePetAreaClick = useCallback(() => {
    if (!isEdgeHidden || isResizing) return;
    void (async () => {
      await restoreWindowPosition(prevPos.current);
      setIsEdgeHidden(false);
    })();
  }, [isEdgeHidden, isResizing]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handlePetPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    wakeUp();
    handleDragStart(e);
  }, [handleDragStart, wakeUp]);

  const applyResizePreview = useCallback((scale: number) => {
    void (async () => {
      const next = await applyPetWindowScale(scale, showChat, windowFit);
      setPetScale(next);
    })();
  }, [showChat, windowFit]);

  const persistResizeScale = useCallback((scale: number) => {
    void (async () => {
      const next = await applyPetWindowScale(scale, showChat, windowFit);
      setPetScale(next);
      setPrefs((prev) => {
        const nextPrefs = { ...prev, pet_scale: next };
        void savePrefs(nextPrefs);
        return nextPrefs;
      });
    })();
  }, [showChat, windowFit]);

  const handleResizeStart = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizePointerId.current = e.pointerId;
    resizeStart.current = { x: e.screenX, y: e.screenY, scale: petScale };
    (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
  }, [petScale]);

  const handleResizeMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (resizePointerId.current !== e.pointerId) return;
    const dx = e.screenX - resizeStart.current.x;
    const dy = e.screenY - resizeStart.current.y;
    const delta = (dx + dy) / 2;
    const nextScale = clampPetScale(resizeStart.current.scale + delta / 240);
    resizePendingScale.current = nextScale;
    if (resizeRaf.current !== null) return;
    resizeRaf.current = window.requestAnimationFrame(() => {
      resizeRaf.current = null;
      if (resizePendingScale.current !== null) {
        const pending = resizePendingScale.current;
        resizePendingScale.current = null;
        applyResizePreview(pending);
      }
    });
  }, [applyResizePreview]);

  const endResize = useCallback((e?: React.PointerEvent<HTMLButtonElement>) => {
    if (e && resizePointerId.current !== e.pointerId) return;
    if (resizeRaf.current !== null) {
      cancelAnimationFrame(resizeRaf.current);
      resizeRaf.current = null;
    }
    const finalScale = resizePendingScale.current ?? petScale;
    resizePendingScale.current = null;
    resizePointerId.current = null;
    setIsResizing(false);
    persistResizeScale(finalScale);
  }, [persistResizeScale, petScale]);

  useEffect(() => {
    void (async () => {
      const loaded = await bootstrapPrefs();
      setPrefs(loaded);
      setPetScale(clampPetScale(loaded.pet_scale ?? 1.0));
      await setAlwaysOnTop(loaded.always_on_top ?? true);
      await setScreenshotDetect(loaded.screenshot_hide);
    })();
  }, [showChat]);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    import("@tauri-apps/api/event").then(({ listen }) => {
      listen("refresh-model", () => {
        void (async () => {
          const loaded = await reloadPrefs();
          setPrefs(loaded);
          setPetScale(clampPetScale(loaded.pet_scale ?? 1.0));
          await setAlwaysOnTop(loaded.always_on_top ?? true);
          await setScreenshotDetect(loaded.screenshot_hide);
          setRefreshKey((k) => k + 1);
        })();
      }).then((fn) => {
        if (disposed) {
          fn();
        } else {
          unlisten = fn;
        }
      });
    }).catch(() => {});
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [showChat]);

  useEffect(() => {
    void applyPetWindowScale(petScale, showChat, windowFit);
  }, [petScale, showChat, windowFit]);

  return (
    <>
      <div className={`app-layout${showChat ? " has-chat" : ""}`}>
        {showChat && (
          <div className="chat-wrapper">
            <ChatPanel
              onClose={() => setShowChat(false)}
              onStateChange={transition}
              prefs={prefs}
            />
          </div>
        )}

        <div
          className={`pet-area${showChat ? " with-chat" : ""}${isEdgeHidden ? " edge-hidden" : ""}`}
          onPointerDown={handlePetPointerDown}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
          onContextMenu={handleContextMenu}
          onClick={handlePetAreaClick}
          style={{ transform: `scale(${petScale})`, transformOrigin: "center center" }}
        >
          <DesktopPet key={refreshKey} state={state} prefs={prefs} onFitChange={setWindowFit} />
        </div>

        <button
          type="button"
          className={`resize-grip${isResizing ? " active" : ""}`}
          aria-label="Resize window"
          title="Resize"
          onPointerDown={handleResizeStart}
          onPointerMove={handleResizeMove}
          onPointerUp={endResize}
          onPointerCancel={endResize}
        />
      </div>

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          onClose={() => setCtxMenu(null)}
          onSnap={handleEdgeHide}
          onHide={() => {
            void hideCurrentWindow();
          }}
          onToggleChat={() => {
            setShowChat((prev) => {
              if (!prev) wakeUp();
              return !prev;
            });
          }}
        />
      )}
    </>
  );
}

export default App;
