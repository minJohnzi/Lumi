import { invoke } from "@tauri-apps/api/core";
import type { UserPreferences } from "../types";

export const DEFAULT_PREFS: UserPreferences = {
  pet_name: "Lumi",
  llm_provider: "openai",
  llm_api_key: "",
  llm_model: "gpt-4o-mini",
  ui_language: "zh",
  screenshot_hide: false,
  live2d_enabled: true,
  model_id: "haru",
  model_type: "live2d",
  model_path: "models/haru_greeter_t03/haru_greeter_t03.model3.json",
  model_name: "Haru",
  pet_scale: 1.0,
  always_on_top: true,
};

export type StoredPreferences = Omit<UserPreferences, "llm_api_key">;
type AppSettings = { prefs: StoredPreferences; llm_api_key: string };

let currentPrefs: UserPreferences = { ...DEFAULT_PREFS };
let bootstrapPromise: Promise<UserPreferences> | null = null;

function normalizePrefs(prefs: Partial<UserPreferences> | null | undefined): UserPreferences {
  return {
    ...DEFAULT_PREFS,
    ...(prefs ?? {}),
    llm_api_key: prefs?.llm_api_key ?? DEFAULT_PREFS.llm_api_key,
  };
}

function toStoredPrefs(prefs: UserPreferences): StoredPreferences {
  const { llm_api_key: _ignored, ...stored } = prefs;
  return stored;
}

async function readPrefsFromBackend(): Promise<UserPreferences> {
  const settings = await invoke<AppSettings>("get_app_settings");
  return normalizePrefs({
    ...settings.prefs,
    llm_api_key: settings.llm_api_key ?? "",
  });
}

async function writePrefsToBackend(prefs: UserPreferences): Promise<void> {
  await invoke("save_app_settings", {
    settings: {
      prefs: toStoredPrefs(prefs),
      llm_api_key: prefs.llm_api_key,
    },
  });
}

export function loadPrefs(): UserPreferences {
  return { ...currentPrefs };
}

export async function bootstrapPrefs(): Promise<UserPreferences> {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      await migrateLegacyPrefs();
      currentPrefs = await readPrefsFromBackend();
      return { ...currentPrefs };
    })();
  }
  currentPrefs = await bootstrapPromise;
  return { ...currentPrefs };
}

export async function reloadPrefs(): Promise<UserPreferences> {
  bootstrapPromise = null;
  currentPrefs = await readPrefsFromBackend();
  return { ...currentPrefs };
}

export async function loadApiKey(provider: string): Promise<string> {
  return await invoke<string | null>("get_api_key", { provider }).then((value) => value ?? "");
}

export async function saveApiKey(provider: string, apiKey: string): Promise<void> {
  await invoke("set_api_key", { provider, api_key: apiKey });
}

export async function savePrefs(prefs: UserPreferences): Promise<void> {
  currentPrefs = normalizePrefs(prefs);
  await writePrefsToBackend(currentPrefs);
}

export async function migrateLegacyPrefs(): Promise<boolean> {
  try {
    const saved = localStorage.getItem("lumi_prefs");
    if (!saved) {
      return false;
    }

    const legacy = normalizePrefs(JSON.parse(saved) as Partial<UserPreferences>);
    currentPrefs = legacy;
    await writePrefsToBackend(legacy);
    localStorage.removeItem("lumi_prefs");
    return true;
  } catch {
    return false;
  }
}
