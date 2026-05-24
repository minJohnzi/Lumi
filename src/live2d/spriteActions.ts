import type { PetState } from "../types";
import type { ActionScheduler } from "./ActionScheduler";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Register Sprite actions on the scheduler.
 *
 * bodySprite  — used for position-based actions (tilt, shift)
 * faceSprite  — used for texture-swap actions (blink, look, smile)
 *               In V1 flat mode, both point to the same sprite.
 * blinkTexKey — override blink texture key (V2 uses layer.blink; V1 uses "blink_soft.png")
 */
export function registerSpriteActions(
  scheduler: ActionScheduler,
  bodySprite: any,
  faceSprite: any,
  textures: Record<string, any>,
  getConfig: () => { blinkStyle?: string; blinkDuration?: number } | null,
  _getState: () => PetState,
  getFaceStateTexture: () => string,
  blinkTexKey?: string,
) {
  const blinkStyle = () => getConfig()?.blinkStyle ?? "opacity";
  const blinkMs = () => getConfig()?.blinkDuration ?? 80;
  // Resolve blink texture: explicit override → blink_soft.png → opacity fallback
  const blinkTex = () =>
    (blinkTexKey ? textures[blinkTexKey] : null) ?? textures["blink_soft.png"] ?? null;
  const restoreFaceTexture = (fallback: any) => {
    const stateTexKey = getFaceStateTexture();
    if (textures[stateTexKey]) faceSprite.texture = textures[stateTexKey];
    else faceSprite.texture = fallback;
  };
  const withTexture = async (keys: string[], duration: number) => {
    const texKey = keys.find((key) => textures[key]);
    if (!texKey) return false;
    const prevTex = faceSprite.texture;
    faceSprite.texture = textures[texKey];
    await sleep(duration);
    restoreFaceTexture(prevTex);
    return true;
  };
  const pulseScale = async (factor: number, steps = 8) => {
    const sx = bodySprite.scale?.x ?? 1;
    const sy = bodySprite.scale?.y ?? 1;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const ease = t * t * (3 - 2 * t);
      bodySprite.scale?.set?.(sx * (1 + (factor - 1) * ease), sy * (1 + (factor - 1) * ease));
      await sleep(18);
    }
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const ease = t * t * (3 - 2 * t);
      bodySprite.scale?.set?.(sx * (factor + (1 - factor) * ease), sy * (factor + (1 - factor) * ease));
      await sleep(22);
    }
  };

  // ── blink_soft ─────────────────────────────────────
  scheduler.register({
    name: "blink",
    cooldown: [2500, 6000],
    restAfter: 1500,
    execute: async () => {
      const bt = blinkTex();
      if (blinkStyle() === "texture" && bt) {
        const prev = faceSprite.texture;
        faceSprite.texture = bt;
        await sleep(blinkMs());
        restoreFaceTexture(prev);
      } else {
        faceSprite.alpha = 0.2;
        await sleep(blinkMs());
        faceSprite.alpha = 1;
      }
    },
  });

  // ── idle_shift — subtle weight shift ───────────────
  scheduler.register({
    name: "idle_shift",
    cooldown: [10000, 22000],
    restAfter: 4000,
    states: ["idle"],
    execute: async () => {
      const origX = bodySprite.x;
      const origY = bodySprite.y;
      const dx = (Math.random() - 0.5) * 6;
      const dy = (Math.random() - 0.5) * 4;
      for (let i = 1; i <= 20; i++) {
        const t = i / 20;
        const ease = t * t * (3 - 2 * t);
        bodySprite.x = origX + dx * ease;
        bodySprite.y = origY + dy * ease;
        await sleep(80);
      }
    },
  });

  // ── look_left ───────────────────────────────────────
  scheduler.register({
    name: "look_away",
    cooldown: [22000, 45000],
    restAfter: 5000,
    states: ["idle", "talking"],
    execute: async () => {
      if (textures["look_left.png"]) {
        const prevTex = faceSprite.texture;
        faceSprite.texture = textures["look_left.png"];
        await sleep(1800 + Math.random() * 1200);
        restoreFaceTexture(prevTex);
      } else {
        const d = -0.03;
        bodySprite.rotation += d;
        await sleep(2000);
        bodySprite.rotation -= d;
      }
    },
  });

  // ── look_right ──────────────────────────────────────
  scheduler.register({
    name: "look_away",
    cooldown: [22000, 45000],
    restAfter: 5000,
    states: ["idle", "talking"],
    execute: async () => {
      if (textures["look_right.png"]) {
        const prevTex = faceSprite.texture;
        faceSprite.texture = textures["look_right.png"];
        await sleep(1800 + Math.random() * 1200);
        restoreFaceTexture(prevTex);
      } else {
        const d = 0.03;
        bodySprite.rotation += d;
        await sleep(2000);
        bodySprite.rotation -= d;
      }
    },
  });

  // ── distant_stare ───────────────────────────────────
  scheduler.register({
    name: "look_away",
    cooldown: [35000, 70000],
    restAfter: 6000,
    states: ["idle", "sleepy"],
    execute: async () => {
      if (textures["distant_stare.png"]) {
        const prevTex = faceSprite.texture;
        faceSprite.texture = textures["distant_stare.png"];
        await sleep(4000 + Math.random() * 4000);
        restoreFaceTexture(prevTex);
      }
    },
  });

  // ── soft_smile ──────────────────────────────────────
  scheduler.register({
    name: "head_tilt",
    cooldown: [30000, 90000],
    restAfter: 5000,
    states: ["idle", "happy"],
    execute: async () => {
      if (textures["soft_smile.png"]) {
        const prevTex = faceSprite.texture;
        faceSprite.texture = textures["soft_smile.png"];
        await sleep(3000 + Math.random() * 3000);
        restoreFaceTexture(prevTex);
      }
    },
  });

  // ── sleepy_blink ────────────────────────────────────
  scheduler.register({
    name: "blink",
    cooldown: [5000, 12000],
    restAfter: 2000,
    states: ["sleepy"],
    execute: async () => {
      if (textures["sleepy_blink.png"]) {
        const prevTex = faceSprite.texture;
        faceSprite.texture = textures["sleepy_blink.png"];
        await sleep(200 + Math.random() * 100);
        restoreFaceTexture(prevTex);
      } else {
        faceSprite.alpha = 0.15;
        await sleep(250);
        faceSprite.alpha = 1;
      }
    },
  });

  // ── half_blink ──────────────────────────────────────
  scheduler.register({
    name: "blink",
    cooldown: [4000, 10000],
    restAfter: 1500,
    states: ["idle"],
    execute: async () => {
      if (textures["half_blink.png"]) {
        const prevTex = faceSprite.texture;
        faceSprite.texture = textures["half_blink.png"];
        await sleep(50 + Math.random() * 40);
        restoreFaceTexture(prevTex);
      } else {
        faceSprite.alpha = 0.5;
        await sleep(50);
        faceSprite.alpha = 1;
      }
    },
  });

  // ── hover_notice ───────────────────────────────────
  scheduler.register({
    name: "hover_notice",
    trigger: "hover",
    cooldown: [600, 1200],
    execute: async () => {
      if (await withTexture(["hover_notice.png", "hover_notice_variant.png"], 600)) return;
      await pulseScale(1.02, 6);
    },
  });

  // ── click_response ─────────────────────────────────
  scheduler.register({
    name: "click_response",
    trigger: "click",
    cooldown: [500, 1000],
    execute: async () => {
      await pulseScale(0.98, 5);
      const bt = blinkTex();
      if (bt) {
        const prev = faceSprite.texture;
        faceSprite.texture = bt;
        await sleep(blinkMs());
        restoreFaceTexture(prev);
      }
    },
  });

  // ── attention_enter ────────────────────────────────
  scheduler.register({
    name: "attention_enter",
    trigger: "chat_start",
    cooldown: [1000, 1600],
    execute: async () => {
      if (await withTexture(["attention.png", "attention_variant.png"], 900)) return;
      await pulseScale(1.03, 8);
    },
  });

  // ── thinking ───────────────────────────────────────
  scheduler.register({
    name: "thinking",
    trigger: "user_typing",
    cooldown: [900, 1400],
    states: ["thinking"],
    execute: async () => {
      if (await withTexture(["thinking.png"], 1200)) return;
      bodySprite.alpha = 0.82;
      await sleep(800);
      bodySprite.alpha = 1;
    },
  });

  // ── talking_soft ───────────────────────────────────
  scheduler.register({
    name: "talking_soft",
    trigger: "chat_end",
    cooldown: [900, 1400],
    states: ["talking"],
    execute: async () => {
      if (await withTexture(["talking_soft.png", "talking.png"], 1000)) return;
      await pulseScale(1.01, 6);
    },
  });

  // ── chat_end_return ────────────────────────────────
  scheduler.register({
    name: "chat_end_return",
    trigger: "hover_end",
    cooldown: [300, 600],
    execute: () => {
      restoreFaceTexture(faceSprite.texture);
    },
  });
}
