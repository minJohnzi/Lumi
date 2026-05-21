import type { PetState } from "../types";

type ActionName = "blink" | "head_tilt" | "look_away" | "idle_shift";

interface ScheduledAction {
  name: ActionName;
  /** [min, max] cooldown in ms */
  cooldown: [number, number];
  /** Execute the action, return duration in ms */
  execute: () => Promise<void> | void;
  /** Only run in these states (undefined = all) */
  states?: PetState[];
  /** Minimum idle time after this action before next one (ms) */
  restAfter?: number;
}

/** State-dependent multipliers for action intervals */
const STATE_PACING: Partial<Record<PetState, number>> = {
  idle: 1.0,
  talking: 0.7,   // slightly more active when talking
  thinking: 0.8,
  happy: 0.6,     // more lively
  sleepy: 2.0,    // everything slows down
};

export class ActionScheduler {
  private model: any;
  private running = false;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private getState: () => PetState;
  private cooldowns = new Map<ActionName, number>();
  private actions: ScheduledAction[] = [];
  private lastActionTime = 0;
  private minRestBetween = 3000; // minimum rest between discrete actions

  // Breathing state — uses delta to avoid conflicting with position changes
  private breathStart = 0;
  private lastBreathOffset = 0;

  constructor(model: any, getState: () => PetState) {
    this.model = model;
    this.getState = getState;
    this.breathStart = Date.now() / 1000;
  }

  /** Register an action that the scheduler can run */
  register(action: ScheduledAction) {
    this.actions.push(action);
  }

  /** Start scheduling for the given state (called on state change) */
  start() {
    if (this.running) return;
    this.running = true;
    this.lastActionTime = Date.now();
    this.scheduleNext();
  }

  /** Stop all scheduling (cleanup) */
  stop() {
    this.running = false;
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
  }

  /** Apply breathing effect — call every frame from PIXI ticker. Uses delta so it doesn't fight with position changes. */
  tickBreath() {
    if (!this.model) return;
    const state = this.getState();
    const pace = STATE_PACING[state] ?? 1.0;
    const amp = (state === "sleepy" ? 0.4 : 1.2) * pace;
    const freq = state === "sleepy" ? 0.5 : 0.8;
    const t = Date.now() / 1000 - this.breathStart;
    const targetOffset = Math.sin(t * freq) * amp;

    // Smooth lerp: remove previous offset, apply new one
    const prev = this.lastBreathOffset;
    const next = prev + (targetOffset - prev) * 0.05; // slow lerp for natural feel
    this.lastBreathOffset = next;

    this.model.y += next - prev; // apply only the delta
  }

  // --- internal ---

  private scheduleNext() {
    if (!this.running) return;

    const state = this.getState();
    const pace = STATE_PACING[state] ?? 1.0;
    const now = Date.now();

    // Pick a random action that:
    // 1. Fits the current state
    // 2. Has its cooldown expired
    // 3. Has passed the minimum rest period
    const eligible = this.actions.filter((a) => {
      if (a.states && !a.states.includes(state)) return false;
      const last = this.cooldowns.get(a.name) ?? 0;
      const cd = a.cooldown[0] * pace;
      return now - last >= cd;
    });

    if (eligible.length === 0) {
      // No actions eligible — wait a bit and retry
      const t = setTimeout(() => this.scheduleNext(), 1000);
      this.timers.push(t);
      return;
    }

    // Favour actions that have waited longer
    const action = eligible[Math.floor(Math.random() * eligible.length)];

    // Ensure minimum rest between any two discrete actions
    const rest = this.minRestBetween * pace;
    const sinceLast = now - this.lastActionTime;
    const delay = Math.max(0, rest - sinceLast);

    const t = setTimeout(() => {
      this.lastActionTime = Date.now();
      const [minCd, maxCd] = action.cooldown;
      const cd = minCd + Math.random() * (maxCd - minCd);
      this.cooldowns.set(action.name, Date.now() + cd * pace);

      action.execute();

      // Schedule next after the action's rest period
      const restMs = (action.restAfter ?? this.minRestBetween) * pace;
      const next = setTimeout(() => this.scheduleNext(), restMs);
      this.timers.push(next);
    }, delay);

    this.timers.push(t);
  }
}
