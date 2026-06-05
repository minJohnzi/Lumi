import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from "../utils/logger";
import {
  DEFAULT_RENDERER_RECOVERY_PAUSE_MS,
  isLongRendererPause,
} from "./renderRecovery";

type RecoverablePixiApp = {
  renderer?: {
    resize?: (width: number, height: number) => void;
    render?: (stage: unknown) => void;
  };
  stage?: unknown;
  ticker?: {
    start?: () => void;
    stop?: () => void;
  };
};

interface UseRenderRecoveryOptions {
  canvasRef: { current: HTMLCanvasElement | null };
  appRef: { current: RecoverablePixiApp | null };
  rendererName: "live2d" | "sprite";
  modelPath: string;
  revive?: () => boolean;
  longPauseMs?: number;
}

function nowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export function useRenderRecovery({
  canvasRef,
  appRef,
  rendererName,
  modelPath,
  revive,
  longPauseMs = DEFAULT_RENDERER_RECOVERY_PAUSE_MS,
}: UseRenderRecoveryOptions) {
  const [recoveryVersion, setRecoveryVersion] = useState(0);
  const hiddenAtRef = useRef<number | null>(null);
  const lastHeartbeatRef = useRef(nowMs());
  const recoveryTimerRef = useRef<number | null>(null);

  const scheduleReload = useCallback((reason: string) => {
    if (typeof window === "undefined" || recoveryTimerRef.current !== null) return;

    logger.warn("renderer", "scheduling renderer recovery", {
      renderer: rendererName,
      path: modelPath,
      reason,
    });

    recoveryTimerRef.current = window.setTimeout(() => {
      recoveryTimerRef.current = null;
      setRecoveryVersion((v) => v + 1);
    }, 120);
  }, [modelPath, rendererName]);

  const tryRevive = useCallback((reason: string) => {
    const app = appRef.current;
    if (!app) return;

    try {
      app.ticker?.start?.();
      const canvas = canvasRef.current;
      const width = Math.max(1, canvas?.width || Math.ceil(canvas?.getBoundingClientRect().width ?? 0));
      const height = Math.max(1, canvas?.height || Math.ceil(canvas?.getBoundingClientRect().height ?? 0));
      app.renderer?.resize?.(width, height);

      const revived = revive?.() ?? true;
      app.renderer?.render?.(app.stage);

      if (!revived) scheduleReload(reason);
    } catch (error) {
      logger.warn("renderer", "renderer revive failed", {
        renderer: rendererName,
        path: modelPath,
        reason,
        error,
      });
      scheduleReload(reason);
    }
  }, [appRef, canvasRef, modelPath, rendererName, revive, scheduleReload]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const canvas = canvasRef.current;

    const onContextLost = (event: Event) => {
      event.preventDefault();
      appRef.current?.ticker?.stop?.();
      scheduleReload("webgl context lost");
    };

    const onContextRestored = () => {
      scheduleReload("webgl context restored");
    };

    const onVisibilityChange = () => {
      const now = nowMs();
      if (document.hidden) {
        hiddenAtRef.current = now;
        appRef.current?.ticker?.stop?.();
        return;
      }

      const hiddenFor = hiddenAtRef.current === null ? 0 : now - hiddenAtRef.current;
      hiddenAtRef.current = null;
      lastHeartbeatRef.current = now;

      if (isLongRendererPause(hiddenFor, longPauseMs)) {
        scheduleReload(`visible after ${Math.round(hiddenFor)}ms hidden`);
      } else {
        tryRevive("visible");
      }
    };

    const onFocus = () => {
      lastHeartbeatRef.current = nowMs();
      tryRevive("window focus");
    };

    const onPageShow = (event: PageTransitionEvent) => {
      lastHeartbeatRef.current = nowMs();
      if (event.persisted) scheduleReload("page restored from bfcache");
      else tryRevive("pageshow");
    };

    const heartbeat = window.setInterval(() => {
      const now = nowMs();
      const gap = now - lastHeartbeatRef.current;
      lastHeartbeatRef.current = now;
      if (!document.hidden && isLongRendererPause(gap, longPauseMs)) {
        scheduleReload(`heartbeat gap ${Math.round(gap)}ms`);
      }
    }, Math.min(5_000, Math.max(1_000, longPauseMs / 4)));

    canvas?.addEventListener("webglcontextlost", onContextLost);
    canvas?.addEventListener("webglcontextrestored", onContextRestored);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      if (recoveryTimerRef.current !== null) {
        window.clearTimeout(recoveryTimerRef.current);
        recoveryTimerRef.current = null;
      }
      window.clearInterval(heartbeat);
      canvas?.removeEventListener("webglcontextlost", onContextLost);
      canvas?.removeEventListener("webglcontextrestored", onContextRestored);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [appRef, canvasRef, longPauseMs, scheduleReload, tryRevive]);

  return recoveryVersion;
}
