import { useState, useCallback, useRef, useEffect } from "react";
import type { PetState } from "../types";

const IDLE_TIMEOUT = 45_000;  // 45s idle â†?sleepy
const HAPPY_TIMEOUT = 6_000;  // happy lasts 6s then â†?idle
const TALKING_TIMEOUT = 8_000; // after 8s of silence, back to idle

function isNightHours(): boolean {
  const hour = new Date().getHours();
  return hour >= 22 || hour < 7;
}

export function usePetState(initial: PetState = "idle") {
  const [state, setState] = useState<PetState>(initial);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const happyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const talkingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeCheckTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (happyTimer.current) clearTimeout(happyTimer.current);
    if (talkingTimer.current) clearTimeout(talkingTimer.current);
  }, []);

  const resetIdle = useCallback(() => {
    clearTimers();
    // If it's night, go sleepy faster
    const timeout = isNightHours() ? IDLE_TIMEOUT / 2 : IDLE_TIMEOUT;
    idleTimer.current = setTimeout(() => {
      setState("sleepy");
    }, timeout);
  }, [clearTimers]);

  const transition = useCallback(
    (next: PetState) => {
      clearTimers();

      switch (next) {
        case "talking":
          setState("talking");
          talkingTimer.current = setTimeout(() => {
            setState("idle");
            resetIdle();
          }, TALKING_TIMEOUT);
          break;
        case "thinking":
          setState("thinking");
          break;
        case "happy":
          setState("happy");
          happyTimer.current = setTimeout(() => {
            setState("idle");
            resetIdle();
          }, HAPPY_TIMEOUT);
          break;
        case "sleepy":
          setState("sleepy");
          break;
        case "idle":
        default:
          setState("idle");
          resetIdle();
          break;
      }
    },
    [clearTimers, resetIdle],
  );

  // Wake up from sleepy on interaction
  const wakeUp = useCallback(() => {
    setState((prev) => (prev === "sleepy" ? "idle" : prev));
    resetIdle();
  }, [resetIdle]);

  // Start idle timer on mount
  useEffect(() => {
    resetIdle();
    return clearTimers;
  }, [resetIdle, clearTimers]);

  // Night mode only shortens idle timeout; it should not force a freshly
  // opened or interacted pet into sleepy.
  useEffect(() => {
    timeCheckTimer.current = setInterval(() => {
      if (isNightHours()) {
        resetIdle();
      }
    }, 60_000); // Check every minute
    return () => {
      if (timeCheckTimer.current) clearInterval(timeCheckTimer.current);
    };
  }, [resetIdle]);
  return { state, transition, resetIdle, wakeUp };
}

