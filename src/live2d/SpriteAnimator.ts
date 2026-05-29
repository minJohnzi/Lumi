/**
 * Lightweight frame-based sprite animator — separate from ActionScheduler.
 *
 * Designed for V3 sprite sheet rendering where each state is a row of frames.
 * Advances frame index based on elapsed time, supports pause/resume for
 * visibility-change and reduced-motion scenarios.
 */
export class SpriteAnimator {
  private frameIndex = 0;
  private frameCount: number;
  private frameDuration: number; // ms per frame
  private lastAdvance = 0;
  private _paused = false;

  constructor(frameCount: number, totalDurationMs: number) {
    this.frameCount = Math.max(1, frameCount);
    this.frameDuration = totalDurationMs / this.frameCount;
  }

  /** Advance to the next frame if enough time has elapsed. Returns current frame index. */
  tick(now: number): number {
    if (this._paused || this.frameCount <= 1) return this.frameIndex;
    if (now - this.lastAdvance >= this.frameDuration) {
      this.lastAdvance = now;
      this.frameIndex = (this.frameIndex + 1) % this.frameCount;
    }
    return this.frameIndex;
  }

  /** Reset to frame 0 and restart timing */
  reset(frameCount?: number, totalDurationMs?: number) {
    this.frameIndex = 0;
    this.lastAdvance = 0;
    if (frameCount !== undefined) {
      this.frameCount = Math.max(1, frameCount);
    }
    if (totalDurationMs !== undefined) {
      this.frameDuration = totalDurationMs / this.frameCount;
    }
  }

  get paused() {
    return this._paused;
  }

  setPaused(p: boolean) {
    this._paused = p;
    if (!p) this.lastAdvance = typeof performance !== "undefined" ? performance.now() : 0;
  }

  get currentFrame() {
    return this.frameIndex;
  }
}
