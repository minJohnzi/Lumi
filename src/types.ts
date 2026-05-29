export type PetState = "idle" | "talking" | "thinking" | "happy" | "sleepy";

// ── Sprite configuration types ─────────────────────────

/** Current sprite sheet frame-based animation schema (inspired by Petdex).
 *  A single image contains all animation states as rows of frames.
 *  Each state maps to a row with N frames and a loop duration. */
export interface SpriteSheetState {
  row: number;
  frames: number;
  durationMs: number;
}

export interface SpriteConfigV3 {
  type: "sprite";
  name?: string;
  scale?: number;
  anchor?: [number, number];
  /** Canvas size [width, height], defaults to [300, 300] */
  size?: [number, number];
  /** Optional fit metadata used to auto-size the window around the model */
  fit?: {
    paddingX?: number;
    paddingY?: number;
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
  };
  /** Sprite sheet image path (single file containing all frames) */
  sheet: string;
  /** Width/height of each frame in the sheet (pixels) */
  frameW: number;
  frameH: number;
  /** Per-state animation config: row index, frame count, loop duration */
  states: Partial<Record<PetState, SpriteSheetState>>;
  /** Optional layered variant — each layer has its own sheet */
  layers?: {
    id: string;
    zIndex: number;
    parallax: number;
    sheet: string;
    isFace?: boolean;
    states: Partial<Record<PetState, SpriteSheetState>>;
  }[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export type ModelType = "live2d" | "sprite";

export interface UserPreferences {
  pet_name: string;
  llm_provider: string;
  llm_api_key: string;
  llm_model: string;
  ui_language: "zh" | "en";
  screenshot_hide: boolean;
  live2d_enabled: boolean;
  model_id: string;
  model_type: ModelType;
  model_path: string;
  model_name: string;
  pet_scale: number;
  always_on_top: boolean;
}

export interface SystemInfo {
  cpu_usage: number;
  memory_total_gb: number;
  memory_used_gb: number;
  disk_total_gb: number;
  disk_used_gb: number;
  uptime_minutes: number;
}
