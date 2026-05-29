import { convertFileSrc } from "@tauri-apps/api/core";

export function normalizeModelPath(path: string): string {
  return path.trim().replace(/\\/g, "/").replace(/\/+$/, "");
}

export function isExternalModelPath(path: string): boolean {
  const normalized = normalizeModelPath(path);
  return /^[A-Za-z]:\//.test(normalized) || normalized.startsWith("//") || normalized.startsWith("/");
}

export function bundledModelPath(path: string): string {
  return normalizeModelPath(path).replace(/^\/+/, "");
}

export function modelAssetUrl(modelPath: string, childPath?: string): string {
  const normalized = normalizeModelPath(modelPath);
  if (isExternalModelPath(normalized)) {
    const target = childPath ? `${normalized}/${childPath.replace(/^\/+/, "")}` : normalized;
    return convertFileSrc(target);
  }

  const target = childPath
    ? `${bundledModelPath(normalized)}/${childPath.replace(/^\/+/, "")}`
    : bundledModelPath(normalized);
  return `/${target}`;
}

export function live2dModelUrl(modelPath: string): string {
  const normalized = normalizeModelPath(modelPath);
  return isExternalModelPath(normalized) ? convertFileSrc(normalized) : bundledModelPath(normalized);
}

export function modelDirectoryPath(modelPath: string): string {
  const normalized = normalizeModelPath(modelPath);
  if (!normalized.includes("/")) return normalized;
  return normalized.slice(0, normalized.lastIndexOf("/"));
}
