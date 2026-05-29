import type { PetState } from "../types";
import type { Live2DModelLike } from "./live2dTypes";

export type ActionEvent =
  | "click"
  | "hover"
  | "hover_end"
  | "chat_start"
  | "chat_end"
  | "user_typing"
  | "user_return"
  | "idle_timeout_3m"
  | "idle_timeout_10m"
  | "time_morning"
  | "time_midnight";

type ActionName =
  | "blink"
  | "head_tilt"
  | "look_away"
  | "idle_shift"
  | "hover_notice"
  | "click_response"
  | "attention_enter"
  | "thinking"
  | "talking_soft"
  | "chat_end_return";

interface ScheduledAction {
  name: ActionName;
  /** [min, max] cooldown in ms */
  cooldown: [number, number];
  /** Execute the action, return duration in ms */
  execute: () => Promise<void> | void;
  /** Only run in these states (undefined = all) */
  states?: PetState[];
  /** Run only when this event is triggered. Undefined means automatic scheduling. */
  trigger?: ActionEvent;
  /** Additional guard before automatic or event execution. */
  condition?: () => boolean;
  /** Minimum idle time before this action can run (ms). */
  minIdleTime?: number;
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
  private model: Live2DModelLike;
  private running = false;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private getState: () => PetState;
  private cooldowns = new Map<ActionName, number>();
  private actions: ScheduledAction[] = [];
  private lastActionTime = 0;
  private minRestBetween = 3000; // minimum rest between discrete actions
  private executingEvent = false;

  // Breathing state — uses delta to avoid conflicting with position changes
  private breathStart = 0;
  private lastBreathOffset = 0;

  constructor(model: Live2DModelLike, getState: () => PetState) {
    this.model = model;
    this.getState = getState;
    this.breathStart = Date.now() / 1000;
  }

  /** Register an action that the scheduler can run */
  register(action: ScheduledAction) {
    this.actions.push(action);
  }

  /** Run event-bound actions immediately when interaction or chat events occur. */
  trigger(event: ActionEvent) {
    if (!this.running || this.executingEvent) return;

    const now = Date.now();
    const state = this.getState();
    const action = this.actions.find((a) => (
      a.trigger === event &&
      this.canRun(a, state, now)
    ));

    if (!action) return;

    this.executingEvent = true;
    void Promise.resolve(this.runAction(action, now))
      .finally(() => {
        this.executingEvent = false;
      });
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
    const eligible = this.actions.filter((a) => (
      !a.trigger && this.canRun(a, state, now)
    ));

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
      void this.runAction(action, Date.now());

      // Schedule next after the action's rest period
      const restMs = (action.restAfter ?? this.minRestBetween) * pace;
      const next = setTimeout(() => this.scheduleNext(), restMs);
      this.timers.push(next);
    }, delay);

    this.timers.push(t);
  }

  private canRun(action: ScheduledAction, state: PetState, now: number) {
    if (action.states && !action.states.includes(state)) return false;
    if (action.condition && !action.condition()) return false;
    if (action.minIdleTime && now - this.lastActionTime < action.minIdleTime) return false;
    const cooldownUntil = this.cooldowns.get(action.name) ?? 0;
    return now >= cooldownUntil;
  }

  private async runAction(action: ScheduledAction, now: number) {
    this.lastActionTime = now;
    const pace = STATE_PACING[this.getState()] ?? 1.0;
    const [minCd, maxCd] = action.cooldown;
    const cd = minCd + Math.random() * (maxCd - minCd);
    this.cooldowns.set(action.name, now + cd * pace);
    await action.execute();
  }
}
