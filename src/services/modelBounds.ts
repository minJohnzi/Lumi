import type { PetState, SpriteConfigV3 } from "../types";
import type { Live2DModelLike } from "../live2d/live2dTypes";
import { buildFrameRects, getSpriteSheetUrls } from "../live2d/spriteSheet";

export interface RectLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FitMetadata {
  paddingX?: number;
  paddingY?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface ModelFitResult {
  bounds: RectLike;
  width: number;
  height: number;
  paddingX: number;
  paddingY: number;
  source: "metadata" | "measured" | "fallback";
}

export interface SpriteWindowFit {
  width: number;
  height: number;
  contentBounds: RectLike;
}

const DEFAULT_PADDING_X = 28;
const DEFAULT_PADDING_Y = 32;

export function unionRect(base: RectLike | null, next: RectLike | null): RectLike | null {
  if (!base) return next;
  if (!next) return base;

  const minX = Math.min(base.x, next.x);
  const minY = Math.min(base.y, next.y);
  const maxX = Math.max(base.x + base.width, next.x + next.width);
  const maxY = Math.max(base.y + base.height, next.y + next.height);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function normalizeRect(rect: unknown): RectLike | null {
  if (!rect || typeof rect !== "object") return null;
  const next = rect as Partial<RectLike>;
  if (
    typeof next.x !== "number" ||
    typeof next.y !== "number" ||
    typeof next.width !== "number" ||
    typeof next.height !== "number" ||
    !Number.isFinite(next.x) ||
    !Number.isFinite(next.y) ||
    !Number.isFinite(next.width) ||
    !Number.isFinite(next.height)
  ) {
    return null;
  }
  if (next.width <= 0 || next.height <= 0) return null;
  return {
    x: next.x,
    y: next.y,
    width: next.width,
    height: next.height,
  };
}

export function fitRectToCanvas(rect: RectLike | null, meta?: FitMetadata | null): ModelFitResult {
  const paddingX = meta?.paddingX ?? DEFAULT_PADDING_X;
  const paddingY = meta?.paddingY ?? DEFAULT_PADDING_Y;
  const bounds = rect ?? { x: 0, y: 0, width: 1, height: 1 };
  const width = Math.max(meta?.minWidth ?? 1, Math.ceil(bounds.width + paddingX * 2));
  const height = Math.max(meta?.minHeight ?? 1, Math.ceil(bounds.height + paddingY * 2));
  return {
    bounds,
    width: meta?.maxWidth ? Math.min(meta.maxWidth, width) : width,
    height: meta?.maxHeight ? Math.min(meta.maxHeight, height) : height,
    paddingX,
    paddingY,
    source: rect ? "measured" : "fallback",
  };
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.decoding = "async";
  img.src = url;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
  });
  return img;
}

function measureOpaqueBounds(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  alphaThreshold = 8,
): RectLike | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = pixels[(y * width + x) * 4 + 3];
      if (alpha <= alphaThreshold) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) return null;
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

export async function measureSpriteFit(
  PIXI: any,
  config: SpriteConfigV3,
  cleanPath: string,
): Promise<ModelFitResult> {
  const meta = config.fit ?? null;
  const urls = getSpriteSheetUrls(cleanPath, config);
  const sheetBounds: RectLike[] = [];

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return fitRectToCanvas(null, meta);

  const sheets = await Promise.all(urls.map(async (url) => {
    const image = await loadImage(url);
    return { image, url };
  }));

  const inspectSheet = async (url: string, image: HTMLImageElement, states: SpriteConfigV3["states"]) => {
    const frameRects = buildFrameRects(PIXI, states, config.frameW, config.frameH);
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);

    let sheetRect: RectLike | null = null;
    for (const rects of Object.values(frameRects)) {
      for (const rect of rects) {
        const data = ctx.getImageData(rect.x, rect.y, rect.width, rect.height).data;
        const local = measureOpaqueBounds(data, rect.width, rect.height);
        if (!local) continue;
        sheetRect = unionRect(sheetRect, local);
      }
    }
    if (sheetRect) sheetBounds.push(sheetRect);
    return url;
  };

  if (config.layers?.length) {
    for (let i = 0; i < config.layers.length; i += 1) {
      const layer = config.layers[i];
      const entry = sheets[i];
      if (!entry) continue;
      await inspectSheet(entry.url, entry.image, layer.states);
    }
  } else {
    await inspectSheet(urls[0], sheets[0].image, config.states);
  }

  const union = sheetBounds.reduce<RectLike | null>(unionRect, null) ?? {
    x: 0,
    y: 0,
    width: config.size?.[0] ?? config.frameW,
    height: config.size?.[1] ?? config.frameH,
  };
  return fitRectToCanvas(union, meta);
}

export async function measureSpriteWindowFit(
  PIXI: any,
  config: SpriteConfigV3,
  cleanPath: string,
): Promise<SpriteWindowFit> {
  const scale = config.scale ?? 1;
  const size = config.size ?? [300, 300];
  const fit = await measureSpriteFit(PIXI, config, cleanPath);
  const paddingX = config.fit?.paddingX ?? 0;
  const paddingY = config.fit?.paddingY ?? 0;
  const width = Math.ceil(fit.bounds.width * scale + paddingX * 2);
  const height = Math.ceil(fit.bounds.height * scale + paddingY * 2);

  return {
    width: Math.max(config.fit?.minWidth ?? size[0], Math.min(config.fit?.maxWidth ?? Number.POSITIVE_INFINITY, width)),
    height: Math.max(config.fit?.minHeight ?? size[1], Math.min(config.fit?.maxHeight ?? Number.POSITIVE_INFINITY, height)),
    contentBounds: fit.bounds,
  };
}

async function nextFrame(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

export async function measureLive2DFit(
  model: Live2DModelLike,
  resolveMotion: (state: PetState) => string | null,
  meta?: FitMetadata | null,
): Promise<ModelFitResult> {
  const samples: RectLike[] = [];
  const readBounds = (): RectLike | null => {
    return normalizeRect(model.getBounds?.() ?? model.getLocalBounds?.() ?? null);
  };

  const record = () => {
    const rect = readBounds();
    if (rect) samples.push(rect);
  };

  record();
  for (const state of ["idle", "talking", "thinking", "happy", "sleepy"] as PetState[]) {
    const motion = resolveMotion(state);
    if (!motion) continue;
    try {
      await model.motion?.(motion);
    } catch {
      // ignore motion errors during measurement
    }
    await nextFrame();
    await nextFrame();
    record();
  }

  const union = samples.reduce<RectLike | null>(unionRect, null) ?? readBounds() ?? {
    x: 0,
    y: 0,
    width: model.width ?? model.originalWidth ?? 300,
    height: model.height ?? model.originalHeight ?? 300,
  };
  return fitRectToCanvas(union, meta);
}
