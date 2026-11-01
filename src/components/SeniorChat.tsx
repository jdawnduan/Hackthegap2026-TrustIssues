import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "../shared/types";

interface Props {
  chat: ChatMessage[];
  busy: boolean;
  source: "claude" | "offline" | null;
  onSend: (text: string) => void;
  onHint: () => void;
}

export function SeniorChat({ chat, busy, source, onSend, onHint }: Props) {
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.length, busy]);

  const send = () => {
    const t = text.trim();
    if (!t || busy) return;
    onSend(t);
    setText("");
  };

  return (
    <div>
      <div className="row between" style={{ marginBottom: 6 }}>
        <h3 style={{ margin: 0 }}>Senior trader <span className="pill senior">AI coach</span></h3>
        {source && <small className="muted">{source === "claude" ? "live" : "offline script"}</small>}
      </div>
      <div className="chat">
        {chat.length === 0 && <small className="muted">The senior stays quiet until you ask. Type a question, or ask for a hint. They will challenge your reasoning but never give you the answer. Hints are counted.</small>}
        {chat.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {m.role === "senior" && <span className="tag">Senior{m.hintLevel ? ` · hint ${m.hintLevel}` : ""}</span>}
            {m.text}
          </div>
        ))}
        {busy && <div className="bubble senior muted">…</div>}
        <div ref={endRef} />
      </div>
      <div className="chat-input">
        <input
          type="text"
          placeholder="Talk through your reasoning…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          disabled={busy}
        />
        <button className="btn" onClick={send} disabled={busy || !text.trim()}>Send</button>
        <button className="btn hint" onClick={onHint} disabled={busy} title="Ask the senior for a hint (counted in your score)">Hint</button>
      </div>
    </div>
  );
}
