import type { PetState, SpriteConfigV3 } from "../types";
import type { ModelFitResult } from "../services/modelBounds";
import { SpriteAnimator } from "./SpriteAnimator";
import { buildFrameRects, getSpriteSheetUrls } from "./spriteSheet";

type SpriteLayerConfig = NonNullable<SpriteConfigV3["layers"]>[number];

export type SheetLayerRuntime = {
  sprite: any;
  layerCfg: SpriteLayerConfig;
  baseX: number;
  baseY: number;
  animator: SpriteAnimator;
  frameRects: Record<string, any[]>;
};

export type SpriteSheetRuntime = {
  animators: SpriteAnimator[];
  frameRects: Record<string, any[]>;
  layers: SheetLayerRuntime[];
};

interface RenderParams {
  app: any;
  PIXI: any;
  config: SpriteConfigV3;
  fit: ModelFitResult;
  originalSize: [number, number];
  scale: number;
  anchor: [number, number];
  cleanPath: string;
  getState: () => PetState;
  isReducedMotion: () => boolean;
  shouldCancel: () => boolean;
}

function resolveSpritePosition(
  config: SpriteConfigV3,
  fit: ModelFitResult,
  originalSize: [number, number],
  scale: number,
  anchor: [number, number],
) {
  const originalCx = originalSize[0] / 2;
  const originalCy = originalSize[1] / 2;
  const frameAnchorX = anchor[0] * config.frameW;
  const frameAnchorY = anchor[1] * config.frameH;
  const contentLeft = originalCx + (fit.bounds.x - frameAnchorX) * scale;
  const contentTop = originalCy + (fit.bounds.y - frameAnchorY) * scale;

  return {
    x: originalCx - contentLeft + fit.paddingX,
    y: originalCy - contentTop + fit.paddingY,
  };
}

async function loadBaseTextures(
  PIXI: any,
  cleanPath: string,
  config: SpriteConfigV3,
  shouldCancel: () => boolean,
) {
  const baseTextures: any[] = [];
  for (const url of getSpriteSheetUrls(cleanPath, config)) {
    if (shouldCancel()) return baseTextures;
    const texture = await PIXI.Texture.fromURL(url);
    const bt = texture?.baseTexture ?? null;
    if (!bt) throw new Error(`Failed to load: ${url}`);
    baseTextures.push(bt);
  }
  return baseTextures;
}

export async function renderSpriteSheet(params: RenderParams): Promise<SpriteSheetRuntime | null> {
  const baseTextures = await loadBaseTextures(params.PIXI, params.cleanPath, params.config, params.shouldCancel);
  if (params.shouldCancel()) return null;

  return params.config.layers?.length
    ? renderLayeredSheet(params, baseTextures)
    : renderSingleSheet(params, baseTextures[0]);
}

function renderSingleSheet(params: RenderParams, bt: any): SpriteSheetRuntime {
  const { app, PIXI, config, fit, originalSize, scale, anchor, getState, isReducedMotion, shouldCancel } = params;
  if (!bt) throw new Error("No sprite sheet texture loaded");

  const position = resolveSpritePosition(config, fit, originalSize, scale, anchor);
  const frameRects = buildFrameRects(PIXI, config.states, config.frameW, config.frameH);
  const idleCfg = config.states.idle ?? Object.values(config.states)[0];
  if (!idleCfg) throw new Error("No states defined");
  const firstRect = frameRects.idle?.[0];
  if (!firstRect) throw new Error("No idle frame found");

  const tex = new PIXI.Texture(bt, firstRect);
  const sprite = new PIXI.Sprite(tex);
  sprite.anchor.set(anchor[0], anchor[1]);
  sprite.x = position.x;
  sprite.y = position.y;
  sprite.scale.set(scale);
  app.stage.addChild(sprite);

  const shadow = new PIXI.Sprite(tex);
  shadow.anchor.set(anchor[0], anchor[1]);
  shadow.x = sprite.x + 4;
  shadow.y = sprite.y + 5;
  shadow.scale.set(scale);
  shadow.alpha = 0.12;
  shadow.tint = 0x000000;
  app.stage.addChild(shadow);

  const animator = new SpriteAnimator(idleCfg.frames, idleCfg.durationMs);
  if (isReducedMotion()) animator.setPaused(true);

  let lastTilt = 0;
  app.ticker.add(() => {
    if (shouldCancel()) return;
    const t = performance.now();
    const fi = animator.tick(t);
    const st = getState();
    const rects = frameRects[st] ?? frameRects.idle;
    if (rects?.[fi]) sprite.texture.frame = rects[fi];

    const breathScale = Math.sin((t / 1000) * 0.8) * scale * 0.008;
    const s = scale + breathScale;
    sprite.scale.set(s);
    shadow.scale.set(s);
    shadow.x = sprite.x + 4;
    shadow.y = sprite.y + 5;

    const tiltTarget = Math.sin((t / 1000) * 0.25) * 0.015;
    const tiltDelta = tiltTarget - lastTilt;
    lastTilt = tiltTarget;
    sprite.rotation += tiltDelta;
    shadow.rotation = sprite.rotation;
  });

  return { animators: [animator], frameRects, layers: [] };
}

function renderLayeredSheet(params: RenderParams, baseTextures: any[]): SpriteSheetRuntime {
  const { app, PIXI, config, fit, originalSize, scale, anchor, getState, isReducedMotion, shouldCancel } = params;
  const position = resolveSpritePosition(config, fit, originalSize, scale, anchor);
  const sortedLayers = [...config.layers!].sort((a, b) => a.zIndex - b.zIndex);
  const layerEntries = sortedLayers.map((layer, index) => ({
    layer,
    bt: baseTextures[index],
  }));
  const runtimes: SheetLayerRuntime[] = [];

  const bodyLayer = layerEntries[0]?.layer;
  const bodyBt = layerEntries[0]?.bt;
  if (!bodyLayer || !bodyBt) throw new Error("No layered textures found");
  const bodyState = bodyLayer.states[getState()] ?? bodyLayer.states.idle;
  let shadow: any = null;
  if (bodyState && bodyBt) {
    const rect = new PIXI.Rectangle(0, bodyState.row * config.frameH, config.frameW, config.frameH);
    const tex = new PIXI.Texture(bodyBt, rect);
    shadow = new PIXI.Sprite(tex);
    shadow.anchor.set(anchor[0], anchor[1]);
    shadow.x = position.x + 4;
    shadow.y = position.y + 5;
    shadow.scale.set(scale);
    shadow.alpha = 0.12;
    shadow.tint = 0x000000;
    app.stage.addChild(shadow);
  }

  for (const { layer: layerCfg, bt } of layerEntries) {
    const stateCfg = layerCfg.states[getState()] ?? layerCfg.states.idle;
    if (!stateCfg || !bt) continue;

    const frameRects = buildFrameRects(PIXI, layerCfg.states, config.frameW, config.frameH);
    const firstRect = frameRects[getState()]?.[0];
    if (!firstRect) continue;

    const tex = new PIXI.Texture(bt, firstRect);
    const sprite = new PIXI.Sprite(tex);
    sprite.anchor.set(anchor[0], anchor[1]);
    sprite.x = position.x;
    sprite.y = position.y;
    sprite.scale.set(scale);
    app.stage.addChild(sprite);

    const animator = new SpriteAnimator(stateCfg.frames, stateCfg.durationMs);
    if (isReducedMotion()) animator.setPaused(true);
    runtimes.push({ sprite, layerCfg, baseX: sprite.x, baseY: sprite.y, animator, frameRects });
  }

  let lastTilt = 0;
  app.ticker.add(() => {
    if (shouldCancel()) return;
    const t = performance.now();
    const breathY = Math.sin((t / 1000) * 0.8) * 3;
    const breathScale = Math.sin((t / 1000) * 0.8) * scale * 0.008;
    const s = scale + breathScale;
    const tiltTarget = Math.sin((t / 1000) * 0.25) * 0.015;
    const tiltDelta = tiltTarget - lastTilt;
    lastTilt = tiltTarget;

    for (const r of runtimes) {
      const fi = r.animator.tick(t);
      const st = getState();
      const rects = r.frameRects[st] ?? r.frameRects.idle;
      if (rects?.[fi]) r.sprite.texture.frame = rects[fi];

      const p = r.layerCfg.parallax;
      r.sprite.y = r.baseY + breathY * (1 + p * 1.5);
      r.sprite.x = r.baseX + Math.sin((t / 1000) * 0.15 + p * Math.PI) * p * 2;
      r.sprite.scale.set(s);
      r.sprite.rotation += tiltDelta;
    }

    if (shadow && runtimes[0]) {
      shadow.x = runtimes[0].sprite.x + 4;
      shadow.y = runtimes[0].sprite.y + 5;
      shadow.scale.set(s);
      shadow.rotation = runtimes[0].sprite.rotation;
    }
  });

  return {
    animators: runtimes.map((r) => r.animator),
    frameRects: {},
    layers: runtimes,
  };
}
