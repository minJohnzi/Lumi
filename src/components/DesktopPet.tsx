import { useState, useCallback, useEffect } from "react";
import type { PetState } from "../types";
import { loadPrefs } from "../utils/prefs";
import Live2DPet from "./Live2DPet";
import SpritePet from "./SpritePet";

interface DesktopPetProps {
  state: PetState;
}

const stateEmoji: Record<PetState, string> = {
  idle: "😊",
  talking: "🗣️",
  thinking: "🤔",
  happy: "😄",
  sleepy: "😴",
};

export default function DesktopPet({ state }: DesktopPetProps) {
  const prefs = loadPrefs();
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadStatus, setLoadStatus] = useState("");

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

  return (
    <div className="pet-container">
      {useModel ? (
        prefs.model_type === "sprite" ? (
          <SpritePet
            key={prefs.model_path}
            state={state}
            modelPath={prefs.model_path}
            onLoadError={handleLoadError}
            onStatus={handleStatus}
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
