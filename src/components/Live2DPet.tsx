import { useCallback, useEffect, useRef } from "react";
import type { PetState } from "../types";
import { ActionScheduler } from "../live2d/ActionScheduler";
import { registerBasicActions } from "../live2d/actions";
import { findMotion } from "../live2d/motionResolver";
import type { Live2DModelLike, PixiAppLike } from "../live2d/live2dTypes";
import { measureLive2DFit, type FitMetadata } from "../services/modelBounds";
import { live2dModelUrl, modelAssetUrl, modelDirectoryPath, normalizeModelPath } from "../services/modelPaths";

interface Live2DPetProps {
  state: PetState;
  modelPath: string;
  onLoadError: () => void;
  onStatus: (msg: string) => void;
}

async function loadLive2DFitMeta(cleanPath: string): Promise<FitMetadata | null> {
  const fitUrl = modelAssetUrl(modelDirectoryPath(cleanPath), "fit.json");
  try {
    const res = await fetch(fitUrl);
    if (!res.ok) return null;
    const meta = await res.json();
    if (!meta || typeof meta !== "object") return null;
    return meta as FitMetadata;
  } catch {
    return null;
  }
}

export default function Live2DPet({ state, modelPath, onLoadError, onStatus }: Live2DPetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<PixiAppLike | null>(null);
  const modelRef = useRef<Live2DModelLike | null>(null);
  const schedulerRef = useRef<ActionScheduler | null>(null);
  const stateRef = useRef<PetState>("idle");

  stateRef.current = state;

  const log = useCallback((msg: string) => {
    console.log("[Live2D]", msg);
    onStatus(msg);
  }, [onStatus]);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    async function init() {
      try {
        log("Loading PixiJS...");
        const PIXI = await import("pixi.js");
        (window as Window & { PIXI?: unknown }).PIXI = PIXI;
        const normalizedModelPath = normalizeModelPath(modelPath);

        const isCubism4 = normalizedModelPath.endsWith(".model3.json");
        const mod = isCubism4
          ? await import("pixi-live2d-display/cubism4")
          : await import("pixi-live2d-display/cubism2");
        const { Live2DModel } = mod;

        if (cancelled || !canvasRef.current) return;

        const app = new PIXI.Application({
          view: canvasRef.current,
          width: 300,
          height: 300,
          backgroundAlpha: 0,
          antialias: true,
          resolution: 1,
          preserveDrawingBuffer: true,
          powerPreference: "high-performance",
        });
        appRef.current = app as PixiAppLike;

        if ((app.renderer as { type?: number }).type !== 1) {
          onLoadError();
          return;
        }

        const model = (await Live2DModel.from(live2dModelUrl(normalizedModelPath))) as unknown as Live2DModelLike;
        if (cancelled) {
          model.destroy?.();
          return;
        }

        modelRef.current = model;
        model.anchor?.set?.(0.5, 0.5);
        model.x = 150;
        model.y = 160;
        model.scale?.set?.(0.07);
        app.stage.addChild(model as unknown as never);

        const fitMeta = await loadLive2DFitMeta(normalizedModelPath);
        const fit = await measureLive2DFit(model, (petState) => findMotion(model, petState), fitMeta);
        if (cancelled) return;

        const idleMotion = findMotion(model, "idle");
        if (idleMotion) {
          try {
            await model.motion?.(idleMotion);
          } catch {
            // ignore
          }
        }

        app.renderer.resize(Math.max(1, fit.width), Math.max(1, fit.height));

        const bounds = model.getBounds?.() ?? model.getLocalBounds?.();
        if (bounds) {
          model.x += fit.paddingX - bounds.x;
          model.y += fit.paddingY - bounds.y;
        }
        app.renderer.render(app.stage);

        const scheduler = new ActionScheduler(model, () => stateRef.current);
        registerBasicActions(scheduler, model, () => stateRef.current);
        scheduler.start();
        schedulerRef.current = scheduler;
        app.ticker.add(() => scheduler.tickBreath());

        onStatus("");
      } catch (err) {
        log(`FAIL: ${String(err)}`);
        onLoadError();
      }
    }

    void init();

    return () => {
      cancelled = true;
      schedulerRef.current?.stop();
      schedulerRef.current = null;
      modelRef.current?.destroy?.();
      modelRef.current = null;
      appRef.current?.destroy?.(true, { children: true, texture: true, baseTexture: true });
      appRef.current = null;
    };
  }, [log, modelPath, onLoadError, onStatus]);

  useEffect(() => {
    const model = modelRef.current;
    if (!model) return;
    const motion = findMotion(model, state);
    if (motion) {
      try {
        model.motion?.(motion);
      } catch {
        // ignore
      }
    }
  }, [state]);

  return <canvas ref={canvasRef} className="live2d-canvas" width={300} height={300} />;
}
