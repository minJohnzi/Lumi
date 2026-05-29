import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { ModelType } from "../types";

export interface ModelEntry {
  id: string;
  name: string;
  path: string;
  model_type: ModelType;
  source: "bundled" | "external";
}

interface ModelManifest {
  defaultModelId?: string;
  models?: ModelEntry[];
}

let bundledDefaultModelId: string | null = null;

async function loadBundledModels(): Promise<ModelEntry[]> {
  const res = await fetch("/models/manifest.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`manifest.json returned ${res.status}`);
  const manifest = (await res.json()) as ModelManifest;
  bundledDefaultModelId = manifest.defaultModelId ?? null;
  return (manifest.models ?? []).map((model) => ({
    ...model,
    source: model.source ?? "bundled",
  }));
}

async function loadImportedModels(): Promise<ModelEntry[]> {
  try {
    return await invoke<ModelEntry[]>("list_imported_models");
  } catch {
    return [];
  }
}

export function useModelCatalog(initialSelectedPath: string | null = null) {
  const [models, setModels] = useState<ModelEntry[]>([]);
  const [modelError, setModelError] = useState("");
  const [selectedModel, setSelectedModel] = useState<string | null>(initialSelectedPath);
  const [importModal, setImportModal] = useState(false);

  const loadModels = useCallback(() => {
    setModelError("");
    Promise.all([loadBundledModels(), loadImportedModels()])
      .then(([bundled, imported]) => {
        const nextModels = [...bundled, ...imported];
        if (nextModels.length === 0) setModelError("No models found.");
        setModels(nextModels);
      })
      .catch((err) => {
        invoke<ModelEntry[]>("list_models")
          .then((fallbackModels) => setModels(fallbackModels))
          .catch(() => {
            setModelError(`Failed to load models: ${String(err).slice(0, 80)}`);
            setModels([]);
          });
      });
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const selectModel = useCallback((path: string) => {
    setSelectedModel(path);
  }, []);

  const selected = useMemo(
    () => models.find((m) => m.path === selectedModel),
    [models, selectedModel],
  );

  const importModelFromPath = useCallback(async (path: string) => {
    const model = await invoke<ModelEntry>("add_model_from_path", { path });
    setModels((prev) => {
      const withoutDuplicate = prev.filter((item) => item.id !== model.id);
      return [model, ...withoutDuplicate];
    });
    setSelectedModel(model.path);
    return model;
  }, []);

  const removeImportedModel = useCallback(async (id: string) => {
    await invoke("remove_imported_model", { id });
    setModels((prev) => prev.filter((item) => item.id !== id));
    setSelectedModel((current) => {
      const removed = models.find((item) => item.id === id);
      if (current !== removed?.path) return current;
      return null;
    });
  }, [models]);

  return {
    models,
    modelError,
    selected,
    defaultModelId: bundledDefaultModelId,
    selectedModel,
    importModal,
    setImportModal,
    setSelectedModel,
    selectModel,
    importModelFromPath,
    removeImportedModel,
    loadModels,
  };
}
