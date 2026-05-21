import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { UserPreferences } from "../types";
import { loadPrefs, savePrefs } from "../utils/prefs";

interface SettingsPanelProps {
  onClose: () => void;
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [prefs, setPrefs] = useState<UserPreferences>(() => loadPrefs());

  async function save() {
    savePrefs(prefs);
    try {
      await invoke("toggle_screenshot_detect", { enabled: prefs.screenshot_hide });
    } catch { /* ignore */ }
    onClose();
  }

  function update(key: keyof UserPreferences, value: string | boolean) {
    setPrefs((p) => ({ ...p, [key]: value }));
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <span>设置</span>
          <button className="chat-close" onClick={onClose}>✕</button>
        </div>

        <div className="settings-body">
          <label>
            宠物名字
            <input
              value={prefs.pet_name}
              onChange={(e) => update("pet_name", e.target.value)}
            />
          </label>

          <label>
            LLM 服务商
            <select
              value={prefs.llm_provider}
              onChange={(e) => update("llm_provider", e.target.value)}
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="deepseek">DeepSeek</option>
              <option value="local">Local (Ollama)</option>
            </select>
          </label>

          <label>
            API Key
            <input
              type="password"
              value={prefs.llm_api_key}
              onChange={(e) => update("llm_api_key", e.target.value)}
              placeholder="sk-..."
            />
          </label>

          <label>
            模型
            <input
              value={prefs.llm_model}
              onChange={(e) => update("llm_model", e.target.value)}
            />
          </label>

          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={prefs.screenshot_hide}
              onChange={(e) => update("screenshot_hide", e.target.checked)}
            />
            截图时自动隐藏
          </label>

          <hr className="settings-divider" />

          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={prefs.live2d_enabled}
              onChange={(e) => update("live2d_enabled", e.target.checked)}
            />
            启用 Live2D
          </label>

          {prefs.live2d_enabled && (
            <label>
              Live2D 模型路径
              <input
                value={prefs.model_path}
                onChange={(e) => update("model_path", e.target.value)}
                placeholder="models/xxx.model3.json"
              />
            </label>
          )}
        </div>

        <div className="settings-footer">
          <button onClick={save}>保存</button>
        </div>
      </div>
    </div>
  );
}
