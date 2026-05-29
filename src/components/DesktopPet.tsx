import { useState, useCallback, useEffect, useRef } from "react";
import type { PetState, UserPreferences } from "../types";
import Live2DPet from "./Live2DPet";
import SpritePet from "./SpritePet";
import type { WindowFitMetrics } from "../services/windowActions";

interface DesktopPetProps {
  state: PetState;
  prefs: UserPreferences;
  onFitChange: (fit: WindowFitMetrics) => void;
}

const stateEmoji: Record<PetState, string> = {
  idle: "😊",
  talking: "🗣️",
  thinking: "🤔",
  happy: "😄",
  sleepy: "😴",
};

export default function DesktopPet({ state, prefs, onFitChange }: DesktopPetProps) {
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadStatus, setLoadStatus] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const lastFitRef = useRef<WindowFitMetrics | null>(null);

  // Reset failed state when model path or type changes
  useEffect(() => {
    setLoadFailed(false);
    setLoadStatus("");
  }, [prefs.model_path, prefs.model_type]);

  const useModel = prefs.live2d_enabled && prefs.model_path && !loadFailed;

  const handleLoadError = useCallback(() => setLoadFailed(true), []);
  const handleStatus = useCallback((msg: string) => {
    if (msg === "") {
      setLoadStatus("");
    } else {
      setLoadStatus((prev) => prev + msg + "\n");
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const readSize = (rect: Pick<DOMRectReadOnly, "width" | "height">) => ({
      width: Math.max(1, Math.ceil(rect.width)),
      height: Math.max(1, Math.ceil(rect.height)),
    });
    if (typeof ResizeObserver === "undefined") {
      onFitChange(readSize({
        width: el.clientWidth || el.offsetWidth || 1,
        height: el.clientHeight || el.offsetHeight || 1,
      }));
      return;
    }

    let raf = 0;
    const pushFit = (rect: Pick<DOMRectReadOnly, "width" | "height">) => {
      if (raf) window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        const next = readSize(rect);
        const prev = lastFitRef.current;
        if (!prev || prev.width !== next.width || prev.height !== next.height) {
          lastFitRef.current = next;
          onFitChange(next);
        }
      });
    };

    pushFit({
      width: el.clientWidth || el.offsetWidth || 1,
      height: el.clientHeight || el.offsetHeight || 1,
    });
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect ?? {
        width: el.clientWidth || el.offsetWidth || 1,
        height: el.clientHeight || el.offsetHeight || 1,
      };
      pushFit(rect);
    });
    observer.observe(el);

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [onFitChange, loadFailed, prefs.model_path, prefs.model_type, prefs.pet_name]);

  return (
    <div className="pet-container" ref={containerRef}>
      {useModel ? (
        prefs.model_type === "sprite" ? (
          <SpritePet
            key={prefs.model_path}
            state={state}
            modelPath={prefs.model_path}
            onLoadError={handleLoadError}
            onStatus={handleStatus}
            onFitChange={onFitChange}
          />
        ) : (
          <Live2DPet
            key={prefs.model_path}
            state={state}
            modelPath={prefs.model_path}
            onLoadError={handleLoadError}
            onStatus={handleStatus}
          />
        )
      ) : (
        <div className={`pet-avatar pet-${state}`}>
          <span className="pet-emoji">{stateEmoji[state] || stateEmoji.idle}</span>
        </div>
      )}
      <div className="pet-name">{prefs.pet_name}</div>
      {loadStatus && (
        <div
          style={{
            fontSize: 9,
            color: "#f88",
            background: "rgba(0,0,0,0.75)",
            padding: "4px 8px",
            borderRadius: 4,
            maxWidth: 300,
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            marginTop: 4,
          }}
        >
          {loadStatus}
        </div>
      )}
    </div>
  );
}
