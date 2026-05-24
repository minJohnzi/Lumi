import { useEffect, useRef } from "react";
import type { PetState } from "../types";
import { ActionScheduler } from "../live2d/ActionScheduler";
import { registerSpriteActions } from "../live2d/spriteActions";

interface SpritePetProps {
  state: PetState;
  modelPath: string;
  onLoadError: () => void;
  onStatus: (msg: string) => void;
}

// ── V1: flat format (root-level states) ─────────────
interface SpriteConfigV1 {
  type: "sprite";
  name?: string;
  scale?: number;
  anchor?: [number, number];
  size?: [number, number];
  blinkStyle?: "texture" | "opacity";
  blinkDuration?: number;
  states: Partial<Record<PetState, { texture: string; blink?: string }>>;
}

// ── V2: layered format ───────────────────────────────
interface LayerConfig {
  id: string;
  zIndex: number;
  parallax: number;
  isFace?: boolean;
  blink?: string;
  states: Partial<Record<PetState, string>>;
}

interface SpriteConfigV2 {
  type: "sprite";
  name?: string;
  scale?: number;
  anchor?: [number, number];
  size?: [number, number];
  blinkDuration?: number;
  layers: LayerConfig[];
}

type SpriteConfig = SpriteConfigV1 | SpriteConfigV2;

function isV2(cfg: SpriteConfig): cfg is SpriteConfigV2 {
  return "layers" in cfg && Array.isArray((cfg as SpriteConfigV2).layers);
}

type LayerRuntime = {
  sprite: any;
  config: LayerConfig;
  baseX: number;
  baseY: number;
};

export default function SpritePet({ state, modelPath, onLoadError, onStatus }: SpritePetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<any>(null);
  const layersRef = useRef<LayerRuntime[]>([]);
  // V1 compat
  const spriteRef = useRef<any>(null);
  const texturesRef = useRef<Record<string, any>>({});
  const configRef = useRef<SpriteConfig | null>(null);
  const schedulerRef = useRef<ActionScheduler | null>(null);
  const stateRef = useRef<PetState>(state);
  const previousStateRef = useRef<PetState>(state);

  stateRef.current = state;

  const log = (msg: string) => {
    console.log("[Sprite]", msg);
    onStatus(msg);
  };

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    async function init() {
      try {
        log("Step 1: Loading sprite.json...");
        const cleanPath = modelPath.replace(/\\/g, "/").replace(/\/$/, "");
        const configUrl = `/${cleanPath}/sprite.json`;
        log(`  fetch: ${configUrl}`);
        const res = await fetch(configUrl);
        if (!res.ok) throw new Error(`Failed to fetch sprite.json (${res.status}): ${configUrl}`);
        const config: SpriteConfig = await res.json();
        if (config.type !== "sprite") throw new Error("Invalid sprite.json: type must be 'sprite'");
        configRef.current = config;
        log("Step 2: sprite.json OK");

        const anchor = config.anchor ?? [0.5, 0.5];
        const size = config.size ?? [300, 300];
        const scale = config.scale ?? 1.0;

        // ── Collect all texture keys ─────────────────
        log("Step 3: Loading textures...");
        const PIXI = await import("pixi.js");
        (window as any).PIXI = PIXI;

        let texKeys: string[] = [];
        if (isV2(config)) {
          texKeys = config.layers.flatMap((l) => [
            ...Object.values(l.states).filter(Boolean) as string[],
            l.blink,
          ].filter(Boolean) as string[]);
        } else {
          texKeys = Object.values(config.states).flatMap((s) =>
            [s?.texture, s?.blink].filter(Boolean)
          ) as string[];
        }
        const uniqueKeys = [...new Set(texKeys)];

        for (const key of uniqueKeys) {
          if (cancelled) return;
          const url = `/${cleanPath}/${key}`;
          try {
            texturesRef.current[key] = await PIXI.Texture.fromURL(url);
            if (!texturesRef.current[key]) throw new Error("null texture");
          } catch {
            log(`Texture missing: ${key}, will fallback`);
          }
        }
        log("Step 4: Textures loaded");

        if (cancelled || !canvasRef.current) return;

        // ── Create PIXI app ──────────────────────────
        log("Step 5: Creating PIXI app...");
        const app = new PIXI.Application({
          view: canvasRef.current,
          width: size[0],
          height: size[1],
          backgroundAlpha: 0,
          antialias: true,
          resolution: 1,
          preserveDrawingBuffer: true,
          powerPreference: "high-performance",
        });
        appRef.current = app;

        const rendererType = (app.renderer as any).type;
        if (rendererType !== 1) {
          log(`FAIL: WebGL not available (type=${rendererType})`);
          onLoadError();
          return;
        }

        if (isV2(config)) {
          await initLayered(app, PIXI, config, size, scale, anchor, cleanPath, cancelled);
        } else {
          await initFlat(app, PIXI, config, size, scale, anchor, cleanPath, cancelled);
        }

        if (!cancelled) {
          log("SUCCESS");
          onStatus("");
        }
      } catch (err) {
        log(`FAIL: ${err}`);
        onLoadError();
      }
    }

    // ── V2: layered init ─────────────────────────────
    async function initLayered(
      app: any, PIXI: any, config: SpriteConfigV2,
      size: [number, number], scale: number, anchor: [number, number],
      _cleanPath: string, cancelled: boolean,
    ) {
      const sorted = [...config.layers].sort((a, b) => a.zIndex - b.zIndex);
      const cx = size[0] / 2;
      const cy = size[1] / 2;
      const blinkMs = config.blinkDuration ?? 80;

      // Shadow (behind body)
      const bodyLayer = sorted[0];
      const bodyTexKey = bodyLayer?.states.idle ?? Object.values(bodyLayer?.states ?? {})[0];
      const bodyTex = bodyTexKey ? texturesRef.current[bodyTexKey] : null;
      let shadow: any = null;
      if (bodyTex) {
        shadow = new PIXI.Sprite(bodyTex);
        shadow.anchor.set(anchor[0], anchor[1]);
        shadow.x = cx + 4;
        shadow.y = cy + 5;
        shadow.scale.set(scale);
        shadow.alpha = 0.12;
        shadow.tint = 0x000000;
        app.stage.addChild(shadow);
      }

      // Build layer sprites
      const runtimeLayers: LayerRuntime[] = [];
      for (const layerCfg of sorted) {
        const texKey = layerCfg.states[stateRef.current] ?? layerCfg.states.idle;
        const tex = texKey ? texturesRef.current[texKey] : null;
        if (!tex) {
          log(`Layer '${layerCfg.id}': no texture for state '${stateRef.current}', skipping`);
          continue;
        }
        const sprite = new PIXI.Sprite(tex);
        sprite.anchor.set(anchor[0], anchor[1]);
        sprite.x = cx;
        sprite.y = cy;
        sprite.scale.set(scale);
        app.stage.addChild(sprite);
        runtimeLayers.push({ sprite, config: layerCfg, baseX: cx, baseY: cy });
      }
      layersRef.current = runtimeLayers;

      if (runtimeLayers.length === 0) {
        log("FAIL: No layers rendered");
        onLoadError();
        return;
      }

      // Face layer for blink/action targeting
      const faceRuntime = runtimeLayers.find((l) => l.config.isFace) ?? runtimeLayers[runtimeLayers.length - 1];

      // Scheduler for discrete actions (blink etc.)
      const scheduler = new ActionScheduler(faceRuntime.sprite, () => stateRef.current);

      const getFaceStateTexture = () => {
        const s = stateRef.current;
        return faceRuntime.config.states[s] ?? faceRuntime.config.states.idle ?? "";
      };

      registerSpriteActions(
        scheduler,
        faceRuntime.sprite,
        faceRuntime.sprite,
        texturesRef.current,
        () => ({ blinkStyle: "texture", blinkDuration: blinkMs }),
        () => stateRef.current,
        getFaceStateTexture,
        faceRuntime.config.blink,
      );

      // Ticker: parallax animation
      let lastTilt = 0;
      app.ticker.add(() => {
        if (cancelled) return;
        const t = Date.now() / 1000;
        const breathY = Math.sin(t * 0.8) * 3;
        const breathScale = Math.sin(t * 0.8) * scale * 0.008;
        const s = scale + breathScale;
        const tiltTarget = Math.sin(t * 0.25) * 0.015;
        const tiltDelta = tiltTarget - lastTilt;
        lastTilt = tiltTarget;

        for (const layer of layersRef.current) {
          const p = layer.config.parallax;
          layer.sprite.y = layer.baseY + breathY * (1 + p * 1.5);
          layer.sprite.x = layer.baseX + Math.sin(t * 0.15 + p * Math.PI) * p * 2;
          layer.sprite.scale.set(s);
          layer.sprite.rotation += tiltDelta;
        }

        if (shadow) {
          const bottom = layersRef.current[0];
          shadow.x = bottom.sprite.x + 4;
          shadow.y = bottom.sprite.y + 5;
          shadow.scale.set(s);
          shadow.rotation = layersRef.current[0].sprite.rotation;
        }
      });

      scheduler.start();
      schedulerRef.current = scheduler;
      log(`Layered init OK — ${runtimeLayers.length} layers`);
    }

    // ── V1: flat init (unchanged logic) ─────────────
    async function initFlat(
      app: any, PIXI: any, config: SpriteConfigV1,
      size: [number, number], scale: number, anchor: [number, number],
      _cleanPath: string, _cancelled: boolean,
    ) {
      const idleKey = config.states.idle?.texture ?? Object.values(config.states)[0]?.texture;
      const tex = idleKey ? texturesRef.current[idleKey] : null;
      if (!tex) {
        log("FAIL: No idle texture");
        onLoadError();
        return;
      }

      const shadow = new PIXI.Sprite(tex);
      shadow.anchor.set(anchor[0], anchor[1]);
      shadow.x = size[0] / 2 + 3;
      shadow.y = size[1] / 2 + 4;
      shadow.scale.set(scale);
      shadow.alpha = 0.15;
      shadow.tint = 0x000000;
      app.stage.addChild(shadow);

      const sprite = new PIXI.Sprite(tex);
      sprite.anchor.set(anchor[0], anchor[1]);
      sprite.x = size[0] / 2;
      sprite.y = size[1] / 2;
      sprite.scale.set(scale);
      app.stage.addChild(sprite);
      spriteRef.current = sprite;
      (sprite as any).__shadow = shadow;

      const scheduler = new ActionScheduler(sprite, () => stateRef.current);
      const baseScale = scale;

      const getStateTexture = () => {
        const s = stateRef.current;
        const cfg = config.states[s] ?? config.states.idle;
        return cfg?.texture ?? "";
      };

      registerSpriteActions(
        scheduler,
        sprite,
        sprite,
        texturesRef.current,
        () => config,
        () => stateRef.current,
        getStateTexture,
        undefined,
      );

      let lastTilt = 0;
      app.ticker.add(() => {
        scheduler.tickBreath();
        const breatheScale = Math.sin(Date.now() / 1000 * 0.8) * baseScale * 0.008;
        const s = baseScale + breatheScale;
        sprite.scale.set(s);
        shadow.scale.set(s);
        const targetTilt = Math.sin(Date.now() / 1000 * 0.25) * 0.015;
        const tiltDelta = targetTilt - lastTilt;
        lastTilt = targetTilt;
        sprite.rotation += tiltDelta;
        shadow.rotation = sprite.rotation;
        shadow.x = sprite.x + 3;
        shadow.y = sprite.y + 4;
      });

      scheduler.start();
      schedulerRef.current = scheduler;
      log("Flat init OK");
    }

    init();

    return () => {
      cancelled = true;
      schedulerRef.current?.stop();
      schedulerRef.current = null;
      layersRef.current = [];
      spriteRef.current = null;
      if (appRef.current) {
        try { appRef.current.destroy?.(true, { children: true, texture: true, baseTexture: true }); } catch { /* */ }
        appRef.current = null;
      }
    };
  }, [modelPath, onLoadError, onStatus]);

  // State → switch textures
  useEffect(() => {
    const config = configRef.current;
    if (!config) return;

    if (isV2(config)) {
      // V2: update each layer
      for (const layer of layersRef.current) {
        const texKey = layer.config.states[state] ?? layer.config.states.idle;
        if (texKey && texturesRef.current[texKey]) {
          layer.sprite.texture = texturesRef.current[texKey];
        }
      }
    } else {
      // V1: update single sprite
      const sprite = spriteRef.current;
      if (!sprite) return;
      const stateCfg = config.states[state] ?? config.states.idle;
      if (!stateCfg) return;
      const tex = texturesRef.current[stateCfg.texture];
      if (tex) sprite.texture = tex;
    }

    const previous = previousStateRef.current;
    if (state === "thinking" && previous !== "thinking") {
      schedulerRef.current?.trigger("chat_start");
      schedulerRef.current?.trigger("user_typing");
    } else if (state === "talking" && previous !== "talking") {
      schedulerRef.current?.trigger("chat_end");
    }
    previousStateRef.current = state;
  }, [state]);

  return (
    <canvas
      ref={canvasRef}
      className="live2d-canvas"
      width={300}
      height={300}
      onPointerEnter={() => schedulerRef.current?.trigger("hover")}
      onPointerLeave={() => schedulerRef.current?.trigger("hover_end")}
      onPointerDown={() => schedulerRef.current?.trigger("click")}
    />
  );
}
