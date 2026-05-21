import { useState, useCallback, useEffect } from "react";
import type { PetState } from "../types";
import { loadPrefs } from "../utils/prefs";
import Live2DPet from "./Live2DPet";

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
  const [live2dFailed, setLive2dFailed] = useState(false);
  const [live2dStatus, setLive2dStatus] = useState("");

  // Reset failed state when model path changes — allow retry on new model
  useEffect(() => {
    setLive2dFailed(false);
    setLive2dStatus("");
  }, [prefs.model_path]);

  const useLive2D = prefs.live2d_enabled && prefs.model_path && !live2dFailed;

  const handleLoadError = useCallback(() => setLive2dFailed(true), []);
  const handleStatus = useCallback((msg: string) => {
    if (msg === "") {
      setLive2dStatus("");
    } else {
      setLive2dStatus((prev) => prev + msg + "\n");
    }
  }, []);

  return (
    <div className="pet-container">
      {useLive2D ? (
        <Live2DPet
          key={prefs.model_path}
          state={state}
          modelPath={prefs.model_path}
          onLoadError={handleLoadError}
          onStatus={handleStatus}
        />
      ) : (
        <div className={`pet-avatar pet-${state}`}>
          <span className="pet-emoji">{stateEmoji[state] || stateEmoji.idle}</span>
        </div>
      )}
      <div className="pet-name">{prefs.pet_name}</div>
      {live2dStatus && (
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
          {live2dStatus}
        </div>
      )}
    </div>
  );
}
