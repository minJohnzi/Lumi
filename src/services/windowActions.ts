import { invoke } from "@tauri-apps/api/core";
import { LogicalSize, PhysicalPosition } from "@tauri-apps/api/dpi";
import { availableMonitors, getCurrentWindow } from "@tauri-apps/api/window";

export type Point = { x: number; y: number };

const PET_BASE_WIDTH = 400;
const PET_BASE_HEIGHT = 380;
const CHAT_WIDTH = 216;
export const MIN_PET_SCALE = 0.6;
export const MAX_PET_SCALE = 1.8;

export interface WindowFitMetrics {
  width: number;
  height: number;
}

export function clampPetScale(scale: number): number {
  if (!Number.isFinite(scale)) return 1;
  return Math.min(MAX_PET_SCALE, Math.max(MIN_PET_SCALE, Math.round(scale * 100) / 100));
}

export async function setAlwaysOnTop(next: boolean): Promise<void> {
  await getCurrentWindow().setAlwaysOnTop(next);
}

export async function hideCurrentWindow(): Promise<void> {
  await getCurrentWindow().hide();
}

export async function exitApp(): Promise<void> {
  await invoke("exit_app").catch(() => {});
}

export async function openSettings(): Promise<void> {
  await invoke("open_settings").catch((e) => console.error("open_settings failed:", e));
}

export async function setScreenshotDetect(enabled: boolean): Promise<void> {
  await invoke("toggle_screenshot_detect", { enabled }).catch(() => {});
}

export async function snapWindowToEdge(): Promise<Point | null> {
  const win = getCurrentWindow();
  const pos = await win.outerPosition();
  const size = await win.outerSize();
  const monitors = await availableMonitors();
  if (monitors.length === 0) return null;

  const monitor = monitors.find((m) => {
    const cx = pos.x + size.width / 2;
    const cy = pos.y + size.height / 2;
    return cx >= m.position.x && cx <= m.position.x + m.size.width
      && cy >= m.position.y && cy <= m.position.y + m.size.height;
  }) ?? monitors[0];

  const mLeft = monitor.position.x;
  const mRight = monitor.position.x + monitor.size.width;
  const distLeft = pos.x - mLeft;
  const distRight = mRight - (pos.x + size.width);
  const maxX = mRight - size.width;
  const leftX = mLeft;
  const rightX = Math.max(mLeft, maxX);

  const nextPrevious = { x: pos.x, y: pos.y };
  if (distLeft <= distRight) {
    await win.setPosition(new PhysicalPosition(leftX, pos.y));
  } else {
    await win.setPosition(new PhysicalPosition(rightX, pos.y));
  }
  return nextPrevious;
}

export async function restoreWindowPosition(position: Point | null): Promise<void> {
  if (!position) return;
  await getCurrentWindow().setPosition(new PhysicalPosition(position.x, position.y));
}

export async function setWindowSize(width: number, height: number): Promise<void> {
  await getCurrentWindow().setSize(new LogicalSize(width, height));
}

export async function clampCurrentWindowToVisibleFrame(): Promise<void> {
  await invoke("clamp_window_to_visible_frame", { dx: 0, dy: 0 }).catch(() => {});
}

export async function applyPetWindowScale(
  scale: number,
  hasChat = false,
  fit?: WindowFitMetrics | null,
): Promise<number> {
  const next = clampPetScale(scale);
  const baseWidth = fit?.width ?? PET_BASE_WIDTH;
  const baseHeight = fit?.height ?? PET_BASE_HEIGHT;
  const width = Math.round(baseWidth * next + (hasChat ? CHAT_WIDTH : 0));
  const height = Math.round(baseHeight * next);
  await setWindowSize(width, height);
  await clampCurrentWindowToVisibleFrame();
  return next;
}
