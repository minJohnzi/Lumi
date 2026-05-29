import { useEffect, useRef } from "react";
import type { PetState, SpriteConfigV3 } from "../types";
import { isSpriteConfigV3 } from "../live2d/spriteSheet";
import { renderSpriteSheet, type SpriteSheetRuntime } from "../live2d/spriteRenderer";
import type { WindowFitMetrics } from "../services/windowActions";
import { measureSpriteFit } from "../services/modelBounds";
import { modelAssetUrl, normalizeModelPath } from "../services/modelPaths";

interface SpritePetProps {
  state: PetState;
  modelPath: string;
  onLoadError: () => void;
  onStatus: (msg: string) => void;
  onFitChange?: (fit: WindowFitMetrics) => void;
}

export default function SpritePet({ state, modelPath, onLoadError, onStatus, onFitChange }: SpritePetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<any>(null);
  const configRef = useRef<SpriteConfigV3 | null>(null);
  const stateRef = useRef<PetState>(state);
  const sheetDataRef = useRef<SpriteSheetRuntime | null>(null);
  const reducedMotionRef = useRef(false);

  stateRef.current = state;

  const log = (msg: string) => {
    console.log("[Sprite]", msg);
    onStatus(msg);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = mq.matches;
    const onChange = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    async function init() {
      try {
        const cleanPath = normalizeModelPath(modelPath);
        const configUrl = modelAssetUrl(cleanPath, "sprite.json");
        log(`Loading: ${configUrl}`);

        const res = await fetch(configUrl);
        if (!res.ok) throw new Error(`Failed to fetch sprite.json (${res.status})`);
        const config = await res.json();
        if (!isSpriteConfigV3(config)) {
          throw new Error("sprite.json must use the current sheet schema (requires type, sheet, frameW, frameH, states)");
        }
        configRef.current = config;

        const PIXI = await import("pixi.js");
        (window as any).PIXI = PIXI;

        const scale = config.scale ?? 1.0;
        const anchor = config.anchor ?? [0.5, 0.5];
        const originalSize: [number, number] = config.size ?? [300, 300];
        const measuredFit = await measureSpriteFit(PIXI, config, cleanPath);
        const fitWidth = Math.ceil(measuredFit.bounds.width * scale + measuredFit.paddingX * 2);
        const fitHeight = Math.ceil(measuredFit.bounds.height * scale + measuredFit.paddingY * 2);
        const size: [number, number] = [
          Math.max(1, Math.min(config.fit?.maxWidth ?? Number.POSITIVE_INFINITY, fitWidth)),
          Math.max(1, Math.min(config.fit?.maxHeight ?? Number.POSITIVE_INFINITY, fitHeight)),
        ];
        onFitChange?.({ width: size[0], height: size[1] });

        const app = new PIXI.Application({
          view: canvasRef.current!,
          width: size[0],
          height: size[1],
          backgroundAlpha: 0,
          antialias: true,
          resolution: 1,
          preserveDrawingBuffer: true,
          powerPreference: "high-performance",
        });
        appRef.current = app;

        if ((app.renderer as any).type !== 1) {
          log("FAIL: WebGL not available");
          onLoadError();
          return;
        }

        sheetDataRef.current = await renderSpriteSheet({
          app,
          PIXI,
          config,
          fit: measuredFit,
          originalSize,
          scale,
          anchor,
          cleanPath,
          getState: () => stateRef.current,
          isReducedMotion: () => reducedMotionRef.current,
          shouldCancel: () => cancelled,
        });

        if (!cancelled) {
          log("OK");
          onStatus("");
        }
      } catch (err) {
        log(`FAIL: ${String(err)}`);
        onLoadError();
      }
    }

    void init();

    function onVisibility() {
      if (!appRef.current) return;
      if (document.hidden) {
        appRef.current.ticker?.stop?.();
      } else {
        appRef.current.ticker?.start?.();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      sheetDataRef.current = null;
      if (appRef.current) {
        try {
          appRef.current.destroy?.(true, { children: true, texture: true, baseTexture: true });
        } catch {
          // ignore
        }
        appRef.current = null;
      }
    };
  }, [modelPath, onFitChange, onLoadError, onStatus]);

  useEffect(() => {
    const config = configRef.current;
    const sheetData = sheetDataRef.current;
    if (!config || !sheetData) return;

    const stateCfg = config.states[state] ?? config.states.idle;
    if (!stateCfg) return;

    for (const a of sheetData.animators) {
      a.reset(stateCfg.frames, stateCfg.durationMs);
      if (reducedMotionRef.current) a.setPaused(true);
    }
  }, [state]);

  return (
    <canvas
      ref={canvasRef}
      className="live2d-canvas"
      width={300}
      height={300}
    />
  );
}
