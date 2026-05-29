import type { PetState } from "../types";
import type { Live2DModelLike, MotionGroupDefinitions } from "./live2dTypes";

const STATE_MOTION_HINTS: Record<PetState, { groups: string[]; keys: string[] }> = {
  idle: { groups: ["Idle"], keys: ["idle"] },
  talking: { groups: ["Tap", "Talk"], keys: ["talk", "tap"] },
  thinking: { groups: ["Tap"], keys: ["think", "doubt", "look"] },
  happy: { groups: ["Tap"], keys: ["happy", "surprise", "cheer"] },
  sleepy: { groups: ["Idle"], keys: ["sleep", "yawn", "tired"] },
};

export function findMotion(model: Live2DModelLike, petState: PetState): string | null {
  const hints = STATE_MOTION_HINTS[petState];
  const defs = model.internalModel?.motionManager?.definitions;
  if (!hints || !defs) return null;

  for (const group of hints.groups) {
    if (defs[group]) return group;
  }

  const keys = hints.keys.map((k) => k.toLowerCase());
  for (const [groupName, groupDef] of Object.entries(defs as MotionGroupDefinitions)) {
    const motions = (groupDef ?? []).map((m) => m?.File?.toLowerCase?.() ?? "");
    for (const key of keys) {
      if (motions.some((m) => m.includes(key))) return groupName;
    }
  }

  return Object.keys(defs)[0] ?? null;
}
