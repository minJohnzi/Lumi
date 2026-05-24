import type { UserPreferences } from "../types";

const DEFAULTS: UserPreferences = {
  pet_name: "Lumi",
  llm_provider: "openai",
  llm_api_key: "",
  llm_model: "gpt-4o-mini",
  screenshot_hide: false,
  live2d_enabled: true,
  model_type: "live2d",
  model_path: "models/haru_greeter_t03/haru_greeter_t03.model3.json",
  model_name: "Haru",
  pet_scale: 1.0,
  always_on_top: true,
};

export function loadPrefs(): UserPreferences {
  try {
    const saved = localStorage.getItem("lumi_prefs");
    if (saved) return { ...DEFAULTS, ...JSON.parse(saved) };
  } catch { /* ignore */ }
  return { ...DEFAULTS };
}

export function savePrefs(prefs: UserPreferences): void {
  localStorage.setItem("lumi_prefs", JSON.stringify(prefs));
}
