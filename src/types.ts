export type PetState = "idle" | "talking" | "thinking" | "happy" | "sleepy";

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
  screenshot_hide: boolean;
  live2d_enabled: boolean;
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
