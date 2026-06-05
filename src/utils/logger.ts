export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogScope =
  | "app"
  | "prefs"
  | "chat"
  | "memory"
  | "model-catalog"
  | "model-path"
  | "renderer"
  | "live2d"
  | "sprite"
  | "window"
  | "system"
  | "db"
  | "preview";

type LogMeta = Record<string, unknown>;

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const SENSITIVE_KEY_PATTERN = /api[_-]?key|token|authorization|secret|password/i;
const WINDOWS_PATH_PATTERN = /^[a-zA-Z]:[\\/]/;
const WINDOWS_PATH_IN_TEXT_PATTERN = /[a-zA-Z]:[\\/][^\s]+/g;
const UNIX_PATH_IN_TEXT_PATTERN = /\/(?:[^/\s]+\/)+[^/\s]+/g;

function readEnvFlag(name: string): boolean {
  const meta = import.meta as ImportMeta & { env?: Record<string, string | boolean | undefined> };
  const value = meta.env?.[name];
  return value === true || value === "true" || value === "1";
}

function isDevMode(): boolean {
  const meta = import.meta as ImportMeta & { env?: Record<string, string | boolean | undefined> };
  return meta.env?.DEV === true || readEnvFlag("VITE_LUMI_DEBUG");
}

function minimumLevel(): LogLevel {
  return isDevMode() ? "debug" : "warn";
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[minimumLevel()];
}

export function redactPath(value: string): string {
  const separator = value.includes("\\") ? "\\" : "/";
  const isWindowsPath = WINDOWS_PATH_PATTERN.test(value);
  const isUnixPath = value.startsWith("/");
  if (!isWindowsPath && !isUnixPath) return value;

  const parts = value.split(/[\\/]+/).filter(Boolean);
  if (parts.length <= 2) return value;
  return `...${separator}${parts.slice(-2).join(separator)}`;
}

function sanitizeString(value: string): string {
  if (WINDOWS_PATH_PATTERN.test(value) || value.startsWith("/")) return redactPath(value);
  return value
    .replace(WINDOWS_PATH_IN_TEXT_PATTERN, (match) => redactPath(match))
    .replace(UNIX_PATH_IN_TEXT_PATTERN, (match) => redactPath(match));
}

export function sanitizeLogValue(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeString(value.message),
    };
  }

  if (typeof value === "string") return sanitizeString(value);
  if (typeof value !== "object" || value === null) return value;
  if (Array.isArray(value)) return value.map((item) => sanitizeLogValue(item));

  const safe: LogMeta = {};
  for (const [key, entry] of Object.entries(value as LogMeta)) {
    safe[key] = SENSITIVE_KEY_PATTERN.test(key) ? "[redacted]" : sanitizeLogValue(entry);
  }
  return safe;
}

function write(level: LogLevel, scope: LogScope, message: string, meta?: LogMeta): void {
  try {
    if (!shouldLog(level)) return;
    const prefix = `[${scope}] ${message}`;
    const safeMeta = meta ? sanitizeLogValue(meta) : undefined;
    const args = safeMeta === undefined ? [prefix] : [prefix, safeMeta];

    if (level === "debug") {
      console.debug(...args);
    } else if (level === "info") {
      console.info(...args);
    } else if (level === "warn") {
      console.warn(...args);
    } else {
      console.error(...args);
    }
  } catch {
    // Logging must never affect application behavior.
  }
}

export const logger = {
  debug: (scope: LogScope, message: string, meta?: LogMeta) => write("debug", scope, message, meta),
  info: (scope: LogScope, message: string, meta?: LogMeta) => write("info", scope, message, meta),
  warn: (scope: LogScope, message: string, meta?: LogMeta) => write("warn", scope, message, meta),
  error: (scope: LogScope, message: string, meta?: LogMeta) => write("error", scope, message, meta),
};
