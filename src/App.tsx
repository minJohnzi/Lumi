import { useState, useEffect } from "react";
import DesktopPet from "./components/DesktopPet";
import ChatPanel from "./components/ChatPanel";
import { usePetState } from "./hooks/usePetState";
import { loadPrefs } from "./utils/prefs";
import { Icon } from "@iconify/react";

function App() {
  const { state, transition, wakeUp } = usePetState("idle");
  const [showChat, setShowChat] = useState(false);

  // Apply saved screenshot protection on startup
  useEffect(() => {
    const prefs = loadPrefs();
    import("@tauri-apps/api/core").then(({ invoke }) => {
      invoke("toggle_screenshot_detect", { enabled: prefs.screenshot_hide }).catch(() => {});
    });
  }, []);

  return (
    <>
      <div className={`app-layout${showChat ? " has-chat" : ""}`}>
        {showChat && (
          <div className="chat-wrapper">
            <ChatPanel
              onClose={() => setShowChat(false)}
              onStateChange={transition}
            />
          </div>
        )}

        <div className={`pet-area${showChat ? " with-chat" : ""}`} data-tauri-drag-region>
          <DesktopPet state={state} />

          <button
            className="chat-toggle-btn"
            onClick={() => {
              setShowChat(!showChat);
              if (!showChat) wakeUp();
            }}
            title="对话"
          >
            <Icon icon="mage:message-round" width={22} height={22} />
          </button>
        </div>
      </div>
    </>
  );
}

export default App;
