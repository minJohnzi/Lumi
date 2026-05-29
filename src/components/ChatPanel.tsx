import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { ChatMessage, PetState } from "../types";
import type { UserPreferences } from "../types";
import { Icon } from "@iconify/react";

interface ChatPanelProps {
  onClose: () => void;
  onStateChange: (state: PetState) => void;
  prefs: UserPreferences;
}

export default function ChatPanel({ onClose, onStateChange, prefs }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    onStateChange("thinking");

    try {
      const result = await invoke<{ reply: string }>("send_message", {
        request: {
          message: text,
          provider: prefs.llm_provider,
          model: prefs.llm_model,
        },
      });

      const reply: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.reply,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, reply]);
      onStateChange("talking");
      setTimeout(() => onStateChange("happy"), 2000);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `出了点问题... ${String(err)}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      onStateChange("idle");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chat-panel">
      <button className="chat-panel-close" onClick={onClose}>
        <Icon icon="mage:x" width={14} height={14} />
      </button>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <Icon icon="mage:stars" width={20} height={20} />
            <span>说点什么吧...</span>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`chat-bubble chat-${m.role}`}>
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="chat-bubble chat-assistant chat-typing">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="..."
          disabled={loading}
        />
        <button
          className="chat-send-btn"
          onClick={sendMessage}
          disabled={loading || !input.trim()}
        >
          <Icon icon="mage:arrow-up" width={16} height={16} />
        </button>
      </div>
    </div>
  );
}
