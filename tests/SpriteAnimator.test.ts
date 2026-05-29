import assert from "node:assert/strict";
import test from "node:test";
import { SpriteAnimator } from "../src/live2d/SpriteAnimator.js";

test("advances frames on elapsed intervals and loops", () => {
  const animator = new SpriteAnimator(4, 400);

  assert.equal(animator.currentFrame, 0);
  assert.equal(animator.tick(0), 0);
  assert.equal(animator.tick(99), 0);
  assert.equal(animator.tick(100), 1);
  assert.equal(animator.tick(199), 1);
  assert.equal(animator.tick(200), 2);
  assert.equal(animator.tick(300), 3);
  assert.equal(animator.tick(400), 0);
});

test("pause keeps the current frame and resume restarts timing", () => {
  const animator = new SpriteAnimator(3, 300);

  assert.equal(animator.tick(100), 1);
  animator.setPaused(true);
  assert.equal(animator.tick(250), 1);
  animator.setPaused(false);
  assert.equal(animator.tick(260), 1);
  assert.equal(animator.tick(360), 2);
});

test("reset restores the first frame and new timing parameters", () => {
  const animator = new SpriteAnimator(2, 200);

  animator.tick(100);
  animator.reset(5, 500);

  assert.equal(animator.currentFrame, 0);
  assert.equal(animator.tick(99), 0);
  assert.equal(animator.tick(100), 1);
});
