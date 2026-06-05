export const DEFAULT_RENDERER_RECOVERY_PAUSE_MS = 30_000;

export function isLongRendererPause(gapMs: number, thresholdMs = DEFAULT_RENDERER_RECOVERY_PAUSE_MS) {
  return Number.isFinite(gapMs) && gapMs >= thresholdMs;
}
