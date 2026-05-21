import { useEffect, useRef, useCallback } from "react";
import type { PetState } from "../types";
import { ActionScheduler } from "../live2d/ActionScheduler";
import { registerBasicActions } from "../live2d/actions";

interface Live2DPetProps {
  state: PetState;
  modelPath: string;
  onLoadError: () => void;
  onStatus: (msg: string) => void;
}

const STATE_MOTION_HINTS: Record<PetState, { groups: string[]; keys: string[] }> = {
  idle:    { groups: ["Idle"],            keys: ["idle"] },
  talking: { groups: ["Tap", "Talk"],     keys: ["talk", "tap"] },
  thinking:{ groups: ["Tap"],             keys: ["think", "doubt", "look"] },
  happy:   { groups: ["Tap"],             keys: ["happy", "surprise", "cheer"] },
  sleepy:  { groups: ["Idle"],            keys: ["sleep", "yawn", "tired"] },
};

export default function Live2DPet({ state, modelPath, onLoadError, onStatus }: Live2DPetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<unknown>(null);
  const modelRef = useRef<unknown>(null);
  const schedulerRef = useRef<ActionScheduler | null>(null);
  const stateRef = useRef<PetState>("idle");

  // Keep stateRef synced so scheduler always reads current state
  stateRef.current = state;

  const log = (msg: string) => {
    console.log("[Live2D]", msg);
    onStatus(msg);
  };

  const findMotion = useCallback((model: any, petState: PetState): string | null => {
    const hints = STATE_MOTION_HINTS[petState];
    if (!hints) return null;
    try {
      const defs = model.internalModel?.motionManager?.definitions;
      if (!defs) return null;
      for (const group of hints.groups) {
        if (defs[group]) return group;
      }
      const keys = hints.keys.map((k) => k.toLowerCase());
      for (const [groupName, groupDef] of Object.entries(defs)) {
        const motions = (groupDef as any)?.map?.((m: any) => m?.File?.toLowerCase?.() ?? "") ?? [];
        for (const key of keys) {
          if (motions.find((m: string) => m.includes(key))) return groupName as string;
        }
      }
      return Object.keys(defs)[0] ?? null;
    } catch {
      return null;
    }
  }, []);

  // Init PIXI + model
  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    async function init() {
      try {
        log("Step 1: Loading PixiJS...");
        const PIXI = await import("pixi.js");
        (window as any).PIXI = PIXI;
        log("Step 2: PixiJS OK");

        const isCubism4 = modelPath.endsWith(".model3.json");
        log(`Step 3: Loading ${isCubism4 ? "Cubism4" : "Cubism2"} plugin...`);
        const mod = isCubism4
          ? await import("pixi-live2d-display/cubism4")
          : await import("pixi-live2d-display/cubism2");
        const { Live2DModel } = mod;
        log("Step 4: Plugin OK");

        if (cancelled || !canvasRef.current) return;

        log("Step 5: Creating PIXI app (WebGL)...");
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
        appRef.current = app;

        const rendererType = (app.renderer as any).type;
        log(`Step 6: PIXI renderer type = ${rendererType} (1=WebGL, 2=Canvas)`);
        if (rendererType !== 1) {
          log("FAIL: WebGL not available");
          onLoadError();
          return;
        }

        log(`Step 7: Loading model: ${modelPath}...`);
        try {
          const model = await Live2DModel.from(modelPath);
          if (cancelled) { model.destroy?.(); return; }
          log("Step 8: Model loaded OK");

          modelRef.current = model;
          model.anchor.set(0.5, 0.5);
          model.x = 150;
          model.y = 160;
          model.scale.set(0.07);
          app.stage.addChild(model);
          log("Step 9: Model added to stage");

          // Set up action scheduler
          const scheduler = new ActionScheduler(model, () => stateRef.current);
          registerBasicActions(scheduler, model, () => stateRef.current);
          scheduler.start();
          schedulerRef.current = scheduler;
          log("Scheduler started");

          // Breathing on ticker
          app.ticker.add(() => {
            scheduler.tickBreath();
          });

          // Play initial idle motion (one-shot, then scheduler takes over)
          const motion = findMotion(model, "idle");
          if (motion) model.motion?.(motion);

          log("SUCCESS");
          onStatus("");
        } catch (err) {
          log(`FAIL: Model load error - ${err}`);
          modelRef.current = null;
          onLoadError();
        }
      } catch (err) {
        log(`FAIL: Init error - ${err}`);
        onLoadError();
      }
    }

    init();

    return () => {
      cancelled = true;
      schedulerRef.current?.stop();
      schedulerRef.current = null;
      if (modelRef.current) {
        try { (modelRef.current as any).destroy?.(); } catch { /* */ }
        modelRef.current = null;
      }
      if (appRef.current) {
        try {
          (appRef.current as any).destroy?.(true, { children: true, texture: true, baseTexture: true });
        } catch { /* */ }
        appRef.current = null;
      }
    };
  }, [modelPath, onLoadError, onStatus]);

  // State transition — one-shot motion, then scheduler auto-adjusts pacing
  useEffect(() => {
    const model = modelRef.current as any;
    if (!model) return;
    const motion = findMotion(model, state);
    if (motion) {
      try { model.motion?.(motion); } catch { /* */ }
    }
  }, [state, findMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="live2d-canvas"
      width={300}
      height={300}
    />
  );
}
