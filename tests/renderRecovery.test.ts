import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_RENDERER_RECOVERY_PAUSE_MS,
  isLongRendererPause,
} from "../src/hooks/renderRecovery.js";

test("renderer recovery ignores ordinary frame gaps", () => {
  assert.equal(isLongRendererPause(16), false);
  assert.equal(isLongRendererPause(5_000), false);
  assert.equal(isLongRendererPause(DEFAULT_RENDERER_RECOVERY_PAUSE_MS - 1), false);
});

test("renderer recovery detects long pauses from sleep or suspension", () => {
  assert.equal(isLongRendererPause(DEFAULT_RENDERER_RECOVERY_PAUSE_MS), true);
  assert.equal(isLongRendererPause(120_000), true);
});

test("renderer recovery rejects non-finite gaps", () => {
  assert.equal(isLongRendererPause(Number.NaN), false);
  assert.equal(isLongRendererPause(Number.POSITIVE_INFINITY), false);
});
