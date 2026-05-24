import { useState, useEffect, useCallback, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Icon } from "@iconify/react";
import type { UserPreferences, ModelType } from "../types";
import { loadPrefs, savePrefs } from "../utils/prefs";

interface ModelEntry {
  name: string;
  path: string;
  model_type: ModelType;
}

type Tab = "appearance" | "ai" | "privacy";

function ModelCard({
  m,
  isActive,
  onSelect,
}: {
  m: ModelEntry;
  isActive: boolean;
  onSelect: (path: string, type: ModelType, name: string) => void;
}) {
  return (
    <button
      type="button"
      className={`model-card${isActive ? " selected" : ""}`}
      onClick={() => onSelect(m.path, m.model_type, m.name)}
    >
      <div className="model-card-preview">
        <div className="model-card-placeholder">
          <Icon
            icon={m.model_type === "live2d" ? "solar:mask-happly-bold-duotone" : "solar:gallery-bold-duotone"}
            width={30}
            height={30}
          />
        </div>
        {isActive && (
          <span className="model-card-check">
            <Icon icon="mage:check" width={14} height={14} />
          </span>
        )}
      </div>
      <div className="model-card-meta">
        <span className="model-card-name">{m.name}</span>
        <span className={`model-card-tag tag-${m.model_type}`}>
          {m.model_type === "live2d" ? "Live2D" : "Sprite"}
        </span>
      </div>
    </button>
  );
}

function SectionHead({
  title,
  subtitle,
  action,
  compact = false,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`settings-section-head${compact ? " compact" : ""}`}>
      <div>
        <div className="settings-section-title">{title}</div>
        <div className="settings-section-subtitle">{subtitle}</div>
      </div>
      {action}
    </div>
  );
}

function AppearanceTab({
  models,
  modelError,
  loadModels,
  selected,
  prefs,
  selectedModel,
  importModal,
  setImportModal,
  onSelectModel,
  onUpdate,
}: {
  models: ModelEntry[];
  modelError: string;
  loadModels: () => void;
  selected: ModelEntry | undefined;
  prefs: UserPreferences;
  selectedModel: string | null;
  importModal: boolean;
  setImportModal: (v: boolean) => void;
  onSelectModel: (path: string, type: ModelType, name: string) => void;
  onUpdate: (key: keyof UserPreferences, value: string | boolean) => void;
}) {
  return (
    <div className="settings-tab-content">
      <section className="settings-section">
        <SectionHead
          title="角色模型"
          subtitle="选择桌面上显示的 Live2D 或 Sprite 角色"
          action={
            <button className="icon-button" onClick={loadModels} title="刷新模型列表" type="button">
              <Icon icon="mage:reload" width={16} height={16} />
            </button>
          }
        />

        {modelError && (
          <div className="model-error">
            {modelError}
            <button className="model-error-retry" onClick={loadModels} type="button">重试</button>
          </div>
        )}

        <div className="model-grid">
          {models.map((m) => (
            <ModelCard key={m.path} m={m} isActive={selectedModel === m.path} onSelect={onSelectModel} />
          ))}
          <button className="model-card model-card-import" onClick={() => setImportModal(true)} type="button">
            <div className="model-card-preview">
              <div className="model-card-placeholder">
                <Icon icon="mage:plus" width={28} height={28} />
              </div>
            </div>
            <div className="model-card-meta">
              <span className="model-card-name">导入新角色</span>
            </div>
          </button>
        </div>
      </section>

      {selected && (
        <section className="settings-section">
          <SectionHead
            title="当前角色"
            subtitle={`${selected.name} · ${selected.model_type === "live2d" ? "Live2D" : "PNG Sprite"}`}
            compact
            action={
              <label className="settings-toggle inline">
                <span className="toggle-label">启用模型</span>
                <button
                  className={`toggle-switch${prefs.live2d_enabled ? " on" : ""}`}
                  onClick={() => onUpdate("live2d_enabled", !prefs.live2d_enabled)}
                  type="button"
                />
              </label>
            }
          />
          <div className="settings-form-grid">
            <label>
              自定义命名
              <input
                value={prefs.model_name}
                onChange={(e) => onUpdate("model_name", e.target.value)}
                placeholder={selected.name}
              />
            </label>
            <label>
              模型类型
              <select value={prefs.model_type} onChange={(e) => onUpdate("model_type", e.target.value)}>
                <option value="live2d">Live2D (Cubism)</option>
                <option value="sprite">PNG Sprite</option>
              </select>
            </label>
          </div>
          <label>
            存储路径
            <input value={prefs.model_path} onChange={(e) => onUpdate("model_path", e.target.value)} />
          </label>
        </section>
      )}

      {importModal && (
        <div className="import-overlay" onClick={() => setImportModal(false)}>
          <div className="import-modal" onClick={(e) => e.stopPropagation()}>
            <div className="import-modal-title">导入新角色</div>
            <p>将模型文件夹放入以下目录：</p>
            <code>public/models/</code>
            <p>支持的格式：</p>
            <ul>
              <li>Live2D: 包含 <code>.model3.json</code> 或 <code>.model.json</code></li>
              <li>PNG Sprite: 包含 <code>sprite.json</code> + 贴图文件</li>
            </ul>
            <button className="btn-primary" onClick={() => { setImportModal(false); loadModels(); }} type="button">
              已放入，刷新列表
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AITab({
  prefs,
  onUpdate,
}: {
  prefs: UserPreferences;
  onUpdate: (key: keyof UserPreferences, value: string | boolean) => void;
}) {
  return (
    <div className="settings-tab-content">
      <section className="settings-section">
        <SectionHead title="AI 大脑" subtitle="配置 Lumi 回复时使用的服务商与模型" />
        <label>
          角色名称
          <input value={prefs.pet_name} onChange={(e) => onUpdate("pet_name", e.target.value)} />
        </label>
        <div className="settings-form-grid">
          <label>
            LLM 服务商
            <select value={prefs.llm_provider} onChange={(e) => onUpdate("llm_provider", e.target.value)}>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="deepseek">DeepSeek</option>
              <option value="local">Local (Ollama)</option>
            </select>
          </label>
          <label>
            模型
            <input value={prefs.llm_model} onChange={(e) => onUpdate("llm_model", e.target.value)} />
          </label>
        </div>
        <label>
          API Key
          <input
            type="password"
            value={prefs.llm_api_key}
            onChange={(e) => onUpdate("llm_api_key", e.target.value)}
            placeholder="sk-..."
          />
        </label>
      </section>
    </div>
  );
}

function PrivacyTab({
  prefs,
  onUpdate,
}: {
  prefs: UserPreferences;
  onUpdate: (key: keyof UserPreferences, value: string | boolean) => void;
}) {
  return (
    <div className="settings-tab-content">
      <section className="settings-section">
        <SectionHead
          title="屏幕隐私"
          subtitle="控制 Lumi 在系统截图流程中的表现"
          compact
          action={
            <label className="settings-toggle inline">
              <span className="toggle-label">截图隐藏</span>
              <button
                className={`toggle-switch${prefs.screenshot_hide ? " on" : ""}`}
                onClick={() => onUpdate("screenshot_hide", !prefs.screenshot_hide)}
                type="button"
              />
            </label>
          }
        />
        <div className="settings-note">
          开启后，Windows 截图时会尽量隐藏 Lumi 主窗口。
        </div>
      </section>
    </div>
  );
}

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<UserPreferences>(() => loadPrefs());
  const [saved, setSaved] = useState(false);
  const [models, setModels] = useState<ModelEntry[]>([]);
  const [modelError, setModelError] = useState("");
  const [tab, setTab] = useState<Tab>("appearance");
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [importModal, setImportModal] = useState(false);

  const loadModels = useCallback(() => {
    setModelError("");
    invoke<ModelEntry[]>("list_models")
      .then((m) => {
        if (m.length === 0) setModelError("未找到模型 (list_models 返回空)");
        setModels(m);
      })
      .catch((err) => {
        setModelError(`加载失败: ${String(err).slice(0, 80)}`);
        setModels([]);
      });
  }, []);

  useEffect(() => { loadModels(); }, [loadModels]);

  useEffect(() => {
    if (prefs.model_path && !selectedModel) {
      setSelectedModel(prefs.model_path);
    }
  }, [prefs.model_path, models, selectedModel]);

  const selected = models.find((m) => m.path === selectedModel);
  const activeModel = models.find((m) => m.path === prefs.model_path);

  
  const selectModel = useCallback((path: string, modelType: ModelType, name: string) => {
    setSelectedModel(path);
    setPrefs((p) => ({ ...p, model_path: path, model_type: modelType, model_name: p.model_name || name }));
  }, []);

  const update = (key: keyof UserPreferences, value: string | boolean) => {
    setPrefs((p) => ({ ...p, [key]: value }));
  };

  const flashSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 1500); };

  const refreshModel = async () => {
    try {
      const { emit } = await import("@tauri-apps/api/event");
      await emit("refresh-model");
      flashSaved();
    } catch { /* ignore */ }
  };

  const save = async () => {
    savePrefs(prefs);
    try {
      await invoke("toggle_screenshot_detect", { enabled: prefs.screenshot_hide });
      const { emit } = await import("@tauri-apps/api/event");
      await emit("refresh-model");
    } catch { /* ignore */ }
    flashSaved();
  };

  const title = tab === "appearance" ? "角色与外观" : tab === "ai" ? "AI 大脑" : "隐私";
  const subtitle = tab === "appearance"
    ? "调整角色模型、显示方式和本地路径"
    : tab === "ai"
      ? "管理对话服务、模型名称和密钥"
      : "管理桌面显示与截图保护";

  return (
    <div className="settings-window">
      <aside className="settings-sidebar">
        <div className="settings-brand">
          <div className="settings-brand-icon">L</div>
          <div>
            <div className="settings-brand-title">Lumi</div>
            <div className="settings-brand-subtitle">桌宠设置</div>
          </div>
        </div>

        <nav className="settings-nav">
          <button className={`settings-nav-item${tab === "appearance" ? " active" : ""}`} onClick={() => setTab("appearance")} type="button">
            <Icon icon="solar:stars-bold-duotone" width={18} height={18} />
            <span>角色与外观</span>
          </button>
          <button className={`settings-nav-item${tab === "ai" ? " active" : ""}`} onClick={() => setTab("ai")} type="button">
            <Icon icon="solar:chat-round-like-bold-duotone" width={18} height={18} />
            <span>AI 大脑</span>
          </button>
          <button className={`settings-nav-item${tab === "privacy" ? " active" : ""}`} onClick={() => setTab("privacy")} type="button">
            <Icon icon="solar:shield-check-bold-duotone" width={18} height={18} />
            <span>隐私</span>
          </button>
        </nav>

        <div className="settings-summary">
          <span>当前模型</span>
          <strong>{activeModel?.name ?? (prefs.model_name || "未选择")}</strong>
          <em>{prefs.model_type === "live2d" ? "Live2D" : "PNG Sprite"}</em>
        </div>
      </aside>

      <main className="settings-main">
        <header className="settings-window-header">
          <div>
            <span>{title}</span>
            <p>{subtitle}</p>
          </div>
        </header>

        {tab === "appearance" ? (
          <AppearanceTab
            models={models}
            modelError={modelError}
            loadModels={loadModels}
            selected={selected}
            prefs={prefs}
            selectedModel={selectedModel}
            importModal={importModal}
            setImportModal={setImportModal}
            onSelectModel={selectModel}
            onUpdate={update}
          />
        ) : tab === "ai" ? (
          <AITab prefs={prefs} onUpdate={update} />
        ) : (
          <PrivacyTab prefs={prefs} onUpdate={update} />
        )}

        <div className="settings-window-footer">
          <button className="btn-secondary" onClick={refreshModel} type="button">
            <Icon icon="mage:reload" width={15} height={15} />
            刷新模型
          </button>
          <button className="btn-primary" onClick={save} type="button">
            <Icon icon={saved ? "mage:check" : "mage:save"} width={15} height={15} />
            {saved ? "已保存" : "保存设置"}
          </button>
        </div>
      </main>
    </div>
  );
}
