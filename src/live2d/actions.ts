import type { PetState } from "../types";
import type { ActionScheduler } from "./ActionScheduler";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Register all basic life actions on the scheduler.
 * These are the "70% idle micro-variations" — subtle, slow, natural.
 */
export function registerBasicActions(scheduler: ActionScheduler, model: any, getState: () => PetState) {
  // ── Blink ─────────────────────────────────────────────
  scheduler.register({
    name: "blink",
    cooldown: [2500, 6000], // 2.5~6s between blinks
    restAfter: 1500,
    execute: () => {
      try {
        model.setParamFloat?.("ParamEyeLOpen", 0);
        model.setParamFloat?.("ParamEyeROpen", 0);
        setTimeout(() => {
          try {
            model.setParamFloat?.("ParamEyeLOpen", 1);
            model.setParamFloat?.("ParamEyeROpen", 1);
          } catch { /* ignore */ }
        }, 80 + Math.random() * 40); // 80~120ms close
      } catch { /* ignore */ }
    },
  });

  // ── Head tilt (subtle) ────────────────────────────────
  scheduler.register({
    name: "head_tilt",
    cooldown: [18000, 40000], // 18~40s
    restAfter: 5000,
    states: ["idle", "happy"],
    execute: async () => {
      try {
        // Play a random idle motion — short, subtle
        const defs = model.internalModel?.motionManager?.definitions;
        if (!defs?.["Idle"]) return;
        const motions = defs["Idle"];
        const idx = Math.floor(Math.random() * motions.length);
        await model.motion?.("Idle", idx);
      } catch { /* ignore */ }
    },
  });

  // ── Look away ──────────────────────────────────────────
  scheduler.register({
    name: "look_away",
    cooldown: [12000, 25000], // 12~25s
    restAfter: 4000,
    states: ["idle", "sleepy", "thinking"],
    execute: () => {
      try {
        // Focus at a random point off-center — like gazing into distance
        const x = 100 + Math.random() * 100;  // 100~200 (center is 150)
        const y = 50 + Math.random() * 200;    // 50~250
        model.focus?.(x, y, false);

        // Return gaze to center after 2~5s
        const gazeDuration = 2000 + Math.random() * 3000;
        setTimeout(() => {
          try {
            model.focus?.(150, 160, false);
          } catch { /* ignore */ }
        }, gazeDuration);
      } catch { /* ignore */ }
    },
  });

  // ── Idle shift (micro-movement) ───────────────────────
  scheduler.register({
    name: "idle_shift",
    cooldown: [8000, 18000], // 8~18s
    restAfter: 3000,
    states: ["idle"],
    execute: async () => {
      try {
        // Slightly nudge position — like adjusting posture
        const origX = model.x;
        const origY = model.y;
        const dx = (Math.random() - 0.5) * 8; // ±4px
        const dy = (Math.random() - 0.5) * 6; // ±3px

        // Smooth over ~2s
        const steps = 20;
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const ease = t * t * (3 - 2 * t); // smoothstep
          model.x = origX + dx * ease;
          model.y = origY + dy * ease;
          await sleep(100);
        }
      } catch { /* ignore */ }
    },
  });

  // ── Double-blink (occasional) ──────────────────────────
  scheduler.register({
    name: "blink",
    cooldown: [8000, 20000], // 8~20s (separate registration = independent cooldown)
    restAfter: 2000,
    states: ["idle", "happy"],
    execute: async () => {
      try {
        // Quick double blink
        for (let i = 0; i < 2; i++) {
          model.setParamFloat?.("ParamEyeLOpen", 0);
          model.setParamFloat?.("ParamEyeROpen", 0);
          await sleep(70);
          model.setParamFloat?.("ParamEyeLOpen", 1);
          model.setParamFloat?.("ParamEyeROpen", 1);
          if (i === 0) await sleep(100); // brief pause between blinks
        }
      } catch { /* ignore */ }
    },
  });
}
