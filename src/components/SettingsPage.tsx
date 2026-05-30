import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Icon } from "@iconify/react";
import type { UserPreferences } from "../types";
import { bootstrapPrefs, loadApiKey, savePrefs, DEFAULT_PREFS } from "../utils/prefs";
import { MAX_PET_SCALE, MIN_PET_SCALE, clampPetScale, setScreenshotDetect } from "../services/windowActions";
import { useModelCatalog, type ModelEntry } from "../hooks/useModelCatalog";

type Tab = "appearance" | "ai" | "privacy";
type Lang = "zh" | "en";

type SettingsCopy = {
  desktopSettings: string;
  appearance: string;
  ai: string;
  privacy: string;
  currentModel: string;
  appearanceTitle: string;
  appearanceSubtitle: string;
  languageTitle: string;
  languageSubtitle: string;
  languageLabel: string;
  languageZh: string;
  languageEn: string;
  modelsTitle: string;
  modelsSubtitle: string;
  refreshModelList: string;
  noModels: string;
  retry: string;
  importNewModel: string;
  importModelTitle: string;
  importModelDesc: string;
  importModelPath: string;
  importModelHint: string;
  cancel: string;
  addModel: string;
  adding: string;
  sizeTitle: string;
  sizeSubtitle: string;
  scale: string;
  currentModelTitle: string;
  enableModel: string;
  displayName: string;
  modelType: string;
  modelPath: string;
  live2d: string;
  sprite: string;
  spritePng: string;
  external: string;
  aiTitle: string;
  aiSubtitle: string;
  characterName: string;
  provider: string;
  model: string;
  apiKey: string;
  privacyTitle: string;
  privacySubtitle: string;
  hideInScreenshots: string;
  privacyNote: string;
  currentModelFallback: string;
  saveSettings: string;
  saved: string;
  refreshModels: string;
  unselected: string;
  unsupportedError: string;
  enterPathError: string;
};

const COPY: Record<Lang, SettingsCopy> = {
  zh: {
    desktopSettings: "桌面设置",
    appearance: "外观",
    ai: "AI",
    privacy: "隐私",
    currentModel: "当前模型",
    appearanceTitle: "外观",
    appearanceSubtitle: "调整模型、显示方式和本地路径",
    languageTitle: "语言",
    languageSubtitle: "切换设置界面的显示语言",
    languageLabel: "界面语言",
    languageZh: "中文",
    languageEn: "English",
    modelsTitle: "模型",
    modelsSubtitle: "选择桌面上显示的 Live2D 或 Sprite 角色",
    refreshModelList: "刷新模型列表",
    noModels: "未找到模型。",
    retry: "重试",
    importNewModel: "导入新模型",
    importModelTitle: "导入新模型",
    importModelDesc: "输入一个本地模型路径。Lumi 会校验它并把路径存进 SQLite。",
    importModelPath: "模型路径",
    importModelHint: "支持：包含 `sprite.json` 的文件夹、包含 Live2D 模型文件的文件夹，或直接的 `.model3.json` / `.model.json` 文件路径。",
    cancel: "取消",
    addModel: "添加模型",
    adding: "添加中...",
    sizeTitle: "大小",
    sizeSubtitle: "设置桌宠尺寸，主窗口会随之调整。",
    scale: "缩放",
    currentModelTitle: "当前模型",
    enableModel: "启用模型",
    displayName: "显示名称",
    modelType: "模型类型",
    modelPath: "模型路径",
    live2d: "Live2D",
    sprite: "Sprite",
    spritePng: "PNG Sprite",
    external: "外部",
    aiTitle: "AI",
    aiSubtitle: "配置聊天提供商、模型和密钥",
    characterName: "角色名称",
    provider: "提供商",
    model: "模型",
    apiKey: "API Key",
    privacyTitle: "隐私",
    privacySubtitle: "控制是否在截图时隐藏窗口",
    hideInScreenshots: "截图时隐藏",
    privacyNote: "启用后，Lumi 会尝试在 Windows 截图时隐藏主窗口。",
    currentModelFallback: "未选择",
    saveSettings: "保存设置",
    saved: "已保存",
    refreshModels: "刷新模型",
    unselected: "未选择",
    unsupportedError: "请输入一个模型文件夹或模型文件路径。",
    enterPathError: "请先输入模型路径。",
  },
  en: {
    desktopSettings: "Desktop Settings",
    appearance: "Appearance",
    ai: "AI",
    privacy: "Privacy",
    currentModel: "Current model",
    appearanceTitle: "Appearance",
    appearanceSubtitle: "Adjust models, display mode, and local paths",
    languageTitle: "Language",
    languageSubtitle: "Switch the settings UI language",
    languageLabel: "UI language",
    languageZh: "中文",
    languageEn: "English",
    modelsTitle: "Models",
    modelsSubtitle: "Choose the Live2D or Sprite character shown on the desktop",
    refreshModelList: "Refresh model list",
    noModels: "No models found.",
    retry: "Retry",
    importNewModel: "Import new model",
    importModelTitle: "Import new model",
    importModelDesc: "Enter a local model path. Lumi will validate it and store the path in SQLite.",
    importModelPath: "Model path",
    importModelHint: "Supported: a folder containing `sprite.json`, a folder containing a Live2D model file, or a direct `.model3.json` / `.model.json` path.",
    cancel: "Cancel",
    addModel: "Add model",
    adding: "Adding...",
    sizeTitle: "Size",
    sizeSubtitle: "Set the desktop pet size. The main window will resize with it.",
    scale: "Scale",
    currentModelTitle: "Current model",
    enableModel: "Enable model",
    displayName: "Display name",
    modelType: "Model type",
    modelPath: "Model path",
    live2d: "Live2D",
    sprite: "Sprite",
    spritePng: "PNG Sprite",
    external: "External",
    aiTitle: "AI",
    aiSubtitle: "Configure the chat provider, model, and key",
    characterName: "Character name",
    provider: "Provider",
    model: "Model",
    apiKey: "API key",
    privacyTitle: "Privacy",
    privacySubtitle: "Control whether the window is hidden during screenshots",
    hideInScreenshots: "Hide in screenshots",
    privacyNote: "When enabled, Lumi will try to hide the main window during Windows screenshots.",
    currentModelFallback: "Unselected",
    saveSettings: "Save settings",
    saved: "Saved",
    refreshModels: "Refresh models",
    unselected: "Unselected",
    unsupportedError: "Enter a model folder or model file path.",
    enterPathError: "Enter a model path first.",
  },
};

function ModelCard({
  m,
  isActive,
  onSelect,
  onRemove,
  ui,
}: {
  m: ModelEntry;
  isActive: boolean;
  onSelect: (model: ModelEntry) => void;
  onRemove?: (model: ModelEntry) => void;
  ui: SettingsCopy;
}) {
  return (
    <div className="model-card-shell">
      <button
        type="button"
        className={`model-card${isActive ? " selected" : ""}`}
        onClick={() => onSelect(m)}
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
          <span className="model-card-badges">
            <span className={`model-card-tag tag-${m.model_type}`}>
              {m.model_type === "live2d" ? ui.live2d : ui.sprite}
            </span>
            {m.source === "external" && <span className="model-card-source">{ui.external}</span>}
          </span>
        </div>
      </button>
      {m.source === "external" && onRemove && (
        <button
          type="button"
          className="model-card-remove"
          title="Remove imported model"
          onClick={() => onRemove(m)}
        >
          <Icon icon="mage:trash" width={13} height={13} />
        </button>
      )}
    </div>
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
  importModelFromPath,
  removeImportedModel,
  onSelectModel,
  onImportModel,
  onUpdate,
  ui,
}: {
  models: ModelEntry[];
  modelError: string;
  loadModels: () => void;
  selected: ModelEntry | undefined;
  prefs: UserPreferences;
  selectedModel: string | null;
  importModal: boolean;
  setImportModal: (v: boolean) => void;
  importModelFromPath: (path: string) => Promise<ModelEntry>;
  removeImportedModel: (id: string) => Promise<void>;
  onSelectModel: (model: ModelEntry) => void;
  onImportModel: (model: ModelEntry) => Promise<void>;
  onUpdate: (key: keyof UserPreferences, value: string | boolean | number) => void;
  ui: SettingsCopy;
}) {
  const [importPath, setImportPath] = useState("");
  const [importError, setImportError] = useState("");
  const [importBusy, setImportBusy] = useState(false);

  const submitImport = async () => {
    const path = importPath.trim();
    if (!path) {
      setImportError(ui.enterPathError);
      return;
    }
    setImportBusy(true);
    setImportError("");
    try {
      const model = await importModelFromPath(path);
      await onImportModel(model);
      setImportPath("");
      setImportModal(false);
    } catch (err) {
      setImportError(String(err));
    } finally {
      setImportBusy(false);
    }
  };

  return (
    <div className="settings-tab-content">
      <section className="settings-section">
        <SectionHead
          title={ui.languageTitle}
          subtitle={ui.languageSubtitle}
          compact
          action={
            <label className="settings-toggle inline">
              <span className="toggle-label">{ui.languageLabel}</span>
              <select
                value={prefs.ui_language}
                onChange={(e) => onUpdate("ui_language", e.target.value)}
                className="settings-language-select"
              >
                <option value="zh">{ui.languageZh}</option>
                <option value="en">{ui.languageEn}</option>
              </select>
            </label>
          }
        />
      </section>

      <section className="settings-section">
        <SectionHead
          title={ui.modelsTitle}
          subtitle={ui.modelsSubtitle}
          action={
            <button className="icon-button" onClick={loadModels} title={ui.refreshModelList} type="button">
              <Icon icon="mage:reload" width={16} height={16} />
            </button>
          }
        />

        {modelError && (
          <div className="model-error">
            {modelError}
            <button className="model-error-retry" onClick={loadModels} type="button">
              {ui.retry}
            </button>
          </div>
        )}

        <div className="model-grid">
          {models.map((m) => (
            <ModelCard
              key={m.id}
              m={m}
              isActive={selectedModel === m.path}
              onSelect={onSelectModel}
              onRemove={m.source === "external" ? (model) => void removeImportedModel(model.id) : undefined}
              ui={ui}
            />
          ))}
          <div className="model-card-shell">
            <button className="model-card model-card-import" onClick={() => setImportModal(true)} type="button">
              <div className="model-card-preview">
                <div className="model-card-placeholder">
                  <Icon icon="mage:plus" width={28} height={28} />
                </div>
              </div>
              <div className="model-card-meta">
                <span className="model-card-name">{ui.importNewModel}</span>
              </div>
            </button>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <SectionHead
          title={ui.sizeTitle}
          subtitle={ui.sizeSubtitle}
          compact
        />
        <label>
          {ui.scale}: {prefs.pet_scale.toFixed(1)}x
          <input
            type="range"
            min={MIN_PET_SCALE}
            max={MAX_PET_SCALE}
            step={0.1}
            value={prefs.pet_scale}
            onChange={(e) => onUpdate("pet_scale", clampPetScale(Number(e.target.value)))}
          />
        </label>
      </section>

      {selected && (
        <section className="settings-section">
          <SectionHead
            title={ui.currentModelTitle}
            subtitle={`${selected.name} - ${selected.model_type === "live2d" ? ui.live2d : ui.spritePng}`}
            compact
            action={
              <label className="settings-toggle inline">
                <span className="toggle-label">{ui.enableModel}</span>
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
              {ui.displayName}
              <input
                value={prefs.model_name}
                onChange={(e) => onUpdate("model_name", e.target.value)}
                placeholder={selected.name}
              />
            </label>
            <label>
              {ui.modelType}
              <select value={prefs.model_type} onChange={(e) => onUpdate("model_type", e.target.value)}>
                <option value="live2d">{ui.live2d}</option>
                <option value="sprite">{ui.spritePng}</option>
              </select>
            </label>
          </div>
          <label>
            {ui.modelPath}
            <input value={prefs.model_path} onChange={(e) => onUpdate("model_path", e.target.value)} />
          </label>
        </section>
      )}

      {importModal && (
        <div className="import-overlay" onClick={() => setImportModal(false)}>
          <div className="import-modal" onClick={(e) => e.stopPropagation()}>
            <div className="import-modal-title">{ui.importModelTitle}</div>
            <p>{ui.importModelDesc}</p>
            <label>
              {ui.importModelPath}
              <input
                value={importPath}
                onChange={(e) => setImportPath(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void submitImport()}
                placeholder="E:\\Lumi\\public\\models\\Luffy"
                autoFocus
              />
            </label>
            <div className="settings-note">
              {ui.importModelHint}
            </div>
            {importError && <div className="model-error import-error">{importError}</div>}
            <div className="import-actions">
              <button className="btn-secondary" onClick={() => setImportModal(false)} type="button">
                {ui.cancel}
              </button>
              <button className="btn-primary" onClick={() => void submitImport()} disabled={importBusy} type="button">
                {importBusy ? ui.adding : ui.addModel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AITab({
  prefs,
  onUpdate,
  ui,
}: {
  prefs: UserPreferences;
  onUpdate: (key: keyof UserPreferences, value: string | boolean | number) => void;
  ui: SettingsCopy;
}) {
  return (
    <div className="settings-tab-content">
      <section className="settings-section">
        <SectionHead title={ui.aiTitle} subtitle={ui.aiSubtitle} />
        <label>
          {ui.characterName}
          <input value={prefs.pet_name} onChange={(e) => onUpdate("pet_name", e.target.value)} />
        </label>
        <div className="settings-form-grid">
          <label>
            {ui.provider}
            <select value={prefs.llm_provider} onChange={(e) => onUpdate("llm_provider", e.target.value)}>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="deepseek">DeepSeek</option>
              <option value="local">Local (Ollama)</option>
            </select>
          </label>
          <label>
            {ui.model}
            <input value={prefs.llm_model} onChange={(e) => onUpdate("llm_model", e.target.value)} />
          </label>
        </div>
        <label>
          {ui.apiKey}
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
  ui,
}: {
  prefs: UserPreferences;
  onUpdate: (key: keyof UserPreferences, value: string | boolean | number) => void;
  ui: SettingsCopy;
}) {
  return (
    <div className="settings-tab-content">
      <section className="settings-section">
        <SectionHead
          title={ui.privacyTitle}
          subtitle={ui.privacySubtitle}
          compact
          action={
            <label className="settings-toggle inline">
              <span className="toggle-label">{ui.hideInScreenshots}</span>
              <button
                className={`toggle-switch${prefs.screenshot_hide ? " on" : ""}`}
                onClick={() => onUpdate("screenshot_hide", !prefs.screenshot_hide)}
                type="button"
              />
            </label>
          }
        />
        <div className="settings-note">
          {ui.privacyNote}
        </div>
      </section>
    </div>
  );
}

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<UserPreferences>(() => ({ ...DEFAULT_PREFS }));
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<Tab>("appearance");
  const savedTimerRef = useRef<number | null>(null);
  const ui = COPY[prefs.ui_language === "en" ? "en" : "zh"];
  const {
    models,
    modelError,
    selected,
    defaultModelId,
    selectedModel,
    importModal,
    setImportModal,
    setSelectedModel,
    importModelFromPath,
    removeImportedModel,
    loadModels,
  } = useModelCatalog(prefs.model_path);

  useEffect(() => {
    void bootstrapPrefs().then((loaded) => {
      setPrefs(loaded);
      setSelectedModel(loaded.model_path);
    });
  }, [setSelectedModel]);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current !== null) {
        clearTimeout(savedTimerRef.current);
      }
    };
  }, []);

  const defaultModel = useMemo(
    () => models.find((m) => m.id === defaultModelId) ?? models[0],
    [defaultModelId, models],
  );

  const activeModel = useMemo(
    () => models.find((m) => m.id === prefs.model_id || m.path === prefs.model_path),
    [models, prefs.model_id, prefs.model_path],
  );

  const selectModel = useCallback((model: ModelEntry) => {
    setSelectedModel(model.path);
    setPrefs((p) => ({
      ...p,
      model_id: model.id,
      model_path: model.path,
      model_type: model.model_type,
      model_name: model.name,
    }));
  }, [setSelectedModel]);

  const applyModelAndSave = useCallback(async (model: ModelEntry) => {
    const nextPrefs: UserPreferences = {
      ...prefs,
      model_id: model.id,
      model_path: model.path,
      model_type: model.model_type,
      model_name: model.name,
    };
    setSelectedModel(model.path);
    setPrefs(nextPrefs);
    await savePrefs(nextPrefs);
  }, [prefs, setSelectedModel]);

  useEffect(() => {
    if (!models.length || activeModel || !defaultModel) return;
    const current = prefs.model_path;
    if (current === defaultModel.path && prefs.model_id === defaultModel.id) return;
    void applyModelAndSave(defaultModel);
  }, [activeModel, applyModelAndSave, defaultModel, models.length, prefs.model_id, prefs.model_path]);

  const update = useCallback((key: keyof UserPreferences, value: string | boolean | number) => {
    if (key === "llm_provider" && typeof value === "string") {
      setPrefs((p) => ({ ...p, llm_provider: value, llm_api_key: "" }));
      void loadApiKey(value).then((apiKey) => {
        setPrefs((p) => ({ ...p, llm_provider: value, llm_api_key: apiKey }));
      });
      return;
    }

    setPrefs((p) => {
      const next = { ...p, [key]: value } as UserPreferences;
      if (key === "ui_language") {
        void savePrefs(next);
      }
      return next;
    });
  }, []);

  const flashSaved = useCallback(() => {
    setSaved(true);
    if (savedTimerRef.current !== null) {
      clearTimeout(savedTimerRef.current);
    }
    savedTimerRef.current = window.setTimeout(() => {
      savedTimerRef.current = null;
      setSaved(false);
    }, 1500);
  }, []);

  const refreshModel = useCallback(async () => {
    try {
      const { emit } = await import("@tauri-apps/api/event");
      await emit("refresh-model");
      flashSaved();
    } catch {
      // ignore
    }
  }, [flashSaved]);

  const save = useCallback(async () => {
    await savePrefs(prefs);
    try {
      await setScreenshotDetect(prefs.screenshot_hide);
      const { emit } = await import("@tauri-apps/api/event");
      await emit("refresh-model");
    } catch {
      // ignore
    }
    flashSaved();
  }, [flashSaved, prefs]);

  const title = tab === "appearance" ? ui.appearance : tab === "ai" ? ui.ai : ui.privacy;
  const subtitle =
    tab === "appearance"
      ? ui.appearanceSubtitle
      : tab === "ai"
        ? ui.aiSubtitle
        : ui.privacySubtitle;

  return (
    <div className="settings-window">
      <aside className="settings-sidebar">
        <div className="settings-brand">
          <div className="settings-brand-icon">L</div>
          <div>
            <div className="settings-brand-title">Lumi</div>
            <div className="settings-brand-subtitle">{ui.desktopSettings}</div>
          </div>
        </div>

        <nav className="settings-nav">
          <button className={`settings-nav-item${tab === "appearance" ? " active" : ""}`} onClick={() => setTab("appearance")} type="button">
            <Icon icon="solar:stars-bold-duotone" width={18} height={18} />
            <span>{ui.appearance}</span>
          </button>
          <button className={`settings-nav-item${tab === "ai" ? " active" : ""}`} onClick={() => setTab("ai")} type="button">
            <Icon icon="solar:chat-round-like-bold-duotone" width={18} height={18} />
            <span>{ui.ai}</span>
          </button>
          <button className={`settings-nav-item${tab === "privacy" ? " active" : ""}`} onClick={() => setTab("privacy")} type="button">
            <Icon icon="solar:shield-check-bold-duotone" width={18} height={18} />
            <span>{ui.privacy}</span>
          </button>
        </nav>

        <div className="settings-summary">
          <span>{ui.currentModel}</span>
          <strong>{activeModel?.name ?? (prefs.model_name || ui.unselected)}</strong>
          <em>{prefs.model_type === "live2d" ? ui.live2d : ui.spritePng}</em>
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
            importModelFromPath={importModelFromPath}
            removeImportedModel={removeImportedModel}
            onSelectModel={selectModel}
            onImportModel={applyModelAndSave}
            onUpdate={update}
            ui={ui}
          />
        ) : tab === "ai" ? (
          <AITab prefs={prefs} onUpdate={update} ui={ui} />
        ) : (
          <PrivacyTab prefs={prefs} onUpdate={update} ui={ui} />
        )}

        <div className="settings-window-footer">
          <button className="btn-secondary" onClick={refreshModel} type="button">
            <Icon icon="mage:reload" width={15} height={15} />
            {ui.refreshModels}
          </button>
          <button className="btn-primary" onClick={save} type="button">
            <Icon icon={saved ? "mage:check" : "mage:save"} width={15} height={15} />
            {saved ? ui.saved : ui.saveSettings}
          </button>
        </div>
      </main>
    </div>
  );
}
