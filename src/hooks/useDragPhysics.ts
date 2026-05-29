import { useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

const TICK_MS = 16;
const FRICTION = 0.88;
const MIN_VELOCITY = 65;
const MAX_THROW_VELOCITY = 2200;
const MAX_THROW_DURATION = 900;
const SAMPLE_WINDOW_MS = 100;

interface VelocitySample {
  x: number;
  y: number;
  t: number;
}

interface ClampResult {
  x: number;
  y: number;
  hit_left: boolean;
  hit_right: boolean;
  hit_top: boolean;
  hit_bottom: boolean;
}

function shouldIgnorePointer(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      "button, input, select, textarea, a, .context-menu, .chat-panel, .settings-panel, .settings-overlay",
    ),
  );
}

function limitVelocity(value: number) {
  return Math.max(-MAX_THROW_VELOCITY, Math.min(MAX_THROW_VELOCITY, value));
}

export function useDragPhysics() {
  const dragging = useRef(false);
  const samples = useRef<VelocitySample[]>([]);
  const lastScreenX = useRef(0);
  const lastScreenY = useRef(0);
  const momentumTimer = useRef<number | null>(null);
  const isThrowing = useRef(false);
  const pendingDx = useRef(0);
  const pendingDy = useRef(0);
  const rafScheduled = useRef(false);
  const activePointerId = useRef<number | null>(null);

  const isDragging = () => dragging.current || isThrowing.current;

  const stopMomentum = useCallback(() => {
    if (momentumTimer.current) {
      clearTimeout(momentumTimer.current);
      momentumTimer.current = null;
    }
    isThrowing.current = false;
  }, []);

  const recordSample = useCallback((screenX: number, screenY: number) => {
    const now = performance.now();
    samples.current.push({ x: screenX, y: screenY, t: now });
    samples.current = samples.current.filter((s) => now - s.t < SAMPLE_WINDOW_MS);
  }, []);

  const computeVelocity = useCallback((): { x: number; y: number } | null => {
    const list = samples.current;
    if (list.length < 2) return null;
    const last = list[list.length - 1];
    const first = list.find((s) => last.t - s.t > 16);
    if (!first) return null;
    const dt = (last.t - first.t) / 1000;
    if (dt <= 0) return null;
    return {
      x: (last.x - first.x) / dt,
      y: (last.y - first.y) / dt,
    };
  }, []);

  const moveClamped = useCallback(async (dx: number, dy: number) => {
    if (dx === 0 && dy === 0) {
      return { x: 0, y: 0, hit_left: false, hit_right: false, hit_top: false, hit_bottom: false };
    }

    try {
      return await invoke<ClampResult>("clamp_window_to_visible_frame", { dx, dy });
    } catch {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const { LogicalPosition } = await import("@tauri-apps/api/dpi");
      const win = getCurrentWindow();
      const pos = await win.outerPosition();
      await win.setPosition(new LogicalPosition(pos.x + Math.round(dx), pos.y + Math.round(dy)));
      return {
        x: pos.x + dx,
        y: pos.y + dy,
        hit_left: false,
        hit_right: false,
        hit_top: false,
        hit_bottom: false,
      };
    }
  }, []);

  const startMomentumThrow = useCallback((vx: number, vy: number) => {
    stopMomentum();

    let velX = limitVelocity(vx);
    let velY = limitVelocity(vy);
    const startTime = performance.now();
    isThrowing.current = true;

    const tick = async () => {
      const elapsed = performance.now() - startTime;
      const speed = Math.hypot(velX, velY);

      if (elapsed > MAX_THROW_DURATION || speed < MIN_VELOCITY) {
        momentumTimer.current = null;
        isThrowing.current = false;
        return;
      }

      const dx = velX * (TICK_MS / 1000);
      const dy = velY * (TICK_MS / 1000);
      const result = await moveClamped(dx, dy);

      if (result.hit_left || result.hit_right) velX = 0;
      if (result.hit_top || result.hit_bottom) velY = 0;

      velX *= FRICTION;
      velY *= FRICTION;

      momentumTimer.current = window.setTimeout(tick, TICK_MS);
    };

    momentumTimer.current = window.setTimeout(tick, TICK_MS);
  }, [moveClamped, stopMomentum]);

  const handleDragStart = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0 || shouldIgnorePointer(e.target)) return;

    stopMomentum();
    dragging.current = true;
    activePointerId.current = e.pointerId;
    lastScreenX.current = e.screenX;
    lastScreenY.current = e.screenY;
    samples.current = [];
    pendingDx.current = 0;
    pendingDy.current = 0;
    recordSample(e.screenX, e.screenY);
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [recordSample, stopMomentum]);

  const handleDragMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || activePointerId.current !== e.pointerId) return;

    const dx = e.screenX - lastScreenX.current;
    const dy = e.screenY - lastScreenY.current;
    if (dx === 0 && dy === 0) return;

    lastScreenX.current = e.screenX;
    lastScreenY.current = e.screenY;
    recordSample(e.screenX, e.screenY);

    pendingDx.current += dx;
    pendingDy.current += dy;

    if (!rafScheduled.current) {
      rafScheduled.current = true;
      requestAnimationFrame(() => {
        rafScheduled.current = false;
        const ddx = pendingDx.current;
        const ddy = pendingDy.current;
        pendingDx.current = 0;
        pendingDy.current = 0;
        void moveClamped(ddx, ddy);
      });
    }
  }, [recordSample, moveClamped]);

  const handleDragEnd = useCallback((e?: React.PointerEvent) => {
    if (e && activePointerId.current !== e.pointerId) return;

    dragging.current = false;
    activePointerId.current = null;
    pendingDx.current = 0;
    pendingDy.current = 0;

    const velocity = computeVelocity();
    if (velocity && (Math.abs(velocity.x) > MIN_VELOCITY || Math.abs(velocity.y) > MIN_VELOCITY)) {
      startMomentumThrow(velocity.x, velocity.y);
    }
  }, [computeVelocity, startMomentumThrow]);

  const cleanup = useCallback(() => {
    dragging.current = false;
    activePointerId.current = null;
    stopMomentum();
    samples.current = [];
    pendingDx.current = 0;
    pendingDy.current = 0;
  }, [stopMomentum]);

  return {
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    cleanup,
    isDragging,
  };
}
