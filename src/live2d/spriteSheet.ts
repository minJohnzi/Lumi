import type { SpriteConfigV3 } from "../types";
import { modelAssetUrl } from "../services/modelPaths";

export function isSpriteConfigV3(cfg: unknown): cfg is SpriteConfigV3 {
  if (typeof cfg !== "object" || cfg === null) return false;
  const config = cfg as Partial<SpriteConfigV3>;

  return (
    config.type === "sprite" &&
    typeof config.sheet === "string" &&
    config.sheet.length > 0 &&
    typeof config.frameW === "number" &&
    Number.isFinite(config.frameW) &&
    config.frameW > 0 &&
    typeof config.frameH === "number" &&
    Number.isFinite(config.frameH) &&
    config.frameH > 0 &&
    typeof config.states === "object" &&
    config.states !== null &&
    Object.keys(config.states).length > 0
  );
}

export function getSpriteSheetUrls(cleanPath: string, config: SpriteConfigV3): string[] {
  return config.layers?.length
    ? config.layers.map((layer) => modelAssetUrl(cleanPath, layer.sheet))
    : [modelAssetUrl(cleanPath, config.sheet)];
}

export function buildFrameRects(
  PIXI: any,
  states: SpriteConfigV3["states"],
  frameW: number,
  frameH: number,
) {
  const frameRects: Record<string, any[]> = {};
  for (const [stateId, stateCfg] of Object.entries(states)) {
    frameRects[stateId] = [];
    for (let frame = 0; frame < stateCfg.frames; frame++) {
      frameRects[stateId].push(
        new PIXI.Rectangle(frame * frameW, stateCfg.row * frameH, frameW, frameH),
      );
    }
  }
  return frameRects;
}
