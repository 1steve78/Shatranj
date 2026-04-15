import { useState, useRef, useEffect } from "react";

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp?: Date;
}

interface ChatBoxProps {
    messages: ChatMessage[];
    onSendMessage: (content: string) => void;
    isLoading?: boolean;
    placeholder?: string;
}

function TypingDots() {
    return (
        <div className="typing-dots">
            <span /><span /><span />
        </div>
    );
}

export default function ChatBox({
    messages,
    onSendMessage,
    isLoading = false,
    placeholder = "Ask about this position…",
}: ChatBoxProps) {
    const [input, setInput] = useState("");
    const bottomRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    const handleSend = () => {
        const trimmed = input.trim();
        if (!trimmed || isLoading) return;
        onSendMessage(trimmed);
        setInput("");
        if (textareaRef.current) textareaRef.current.style.height = "auto";
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        e.target.style.height = "auto";
        e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
    };

    const formatTime = (d?: Date) => {
        if (!d) return "";
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Crimson+Pro:ital,wght@0,400;0,600;1,400&family=JetBrains+Mono:wght@400&display=swap');

        .chat-header {
          padding: 12px 16px;
          border-bottom: 1px solid #2a2018;
          font-family: 'Rajdhani', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #8b7355;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .chat-online-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #4ade80;
          box-shadow: 0 0 6px #4ade80;
          animation: pulse-dot 2s infinite;
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          scrollbar-width: thin;
          scrollbar-color: #3a3028 transparent;
        }
        .chat-messages::-webkit-scrollbar { width: 4px; }
        .chat-messages::-webkit-scrollbar-thumb { background: #3a3028; border-radius: 2px; }

        .chat-bubble-wrap {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .chat-bubble-wrap.user { align-items: flex-end; }
        .chat-bubble-wrap.assistant { align-items: flex-start; }

        .chat-role-label {
          font-family: 'Rajdhani', sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 0 4px;
        }
        .chat-role-label.user { color: #c8a020; }
        .chat-role-label.assistant { color: #8b7355; }

        .chat-bubble {
          max-width: 88%;
          padding: 10px 14px;
          border-radius: 2px;
          font-family: 'Crimson Pro', serif;
          font-size: 15px;
          line-height: 1.6;
          white-space: pre-wrap;
        }
        .chat-bubble.user {
          background: #c8a020;
          color: #0d0b08;
          border-radius: 8px 8px 2px 8px;
          font-weight: 600;
        }
        .chat-bubble.assistant {
          background: #1e1a14;
          color: #c8b896;
          border: 1px solid #2a2018;
          border-radius: 8px 8px 8px 2px;
        }

        .chat-time {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: #4a4030;
          padding: 0 4px;
        }

        .typing-dots {
          display: flex;
          gap: 4px;
          align-items: center;
          padding: 4px 0;
        }
        .typing-dots span {
          width: 6px; height: 6px;
          background: #8b7355;
          border-radius: 50%;
          animation: bounce-dot 1.2s infinite;
        }
        .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
        .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce-dot {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-5px); opacity: 1; }
        }

        .chat-input-area {
          border-top: 1px solid #2a2018;
          padding: 12px;
          display: flex;
          gap: 8px;
          align-items: flex-end;
          background: #120f0a;
        }
        .chat-textarea {
          flex: 1;
          background: #1e1a14;
          border: 1px solid #3a3028;
          border-radius: 6px;
          padding: 10px 12px;
          color: #c8b896;
          font-family: 'Crimson Pro', serif;
          font-size: 15px;
          resize: none;
          outline: none;
          min-height: 40px;
          max-height: 120px;
          line-height: 1.5;
          transition: border-color 0.2s;
        }
        .chat-textarea::placeholder { color: #4a4030; }
        .chat-textarea:focus { border-color: #c8a020; }

        .chat-send-btn {
          width: 40px; height: 40px;
          background: #c8a020;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
          flex-shrink: 0;
          color: #0d0b08;
        }
        .chat-send-btn:hover:not(:disabled) { background: #d4ac28; transform: translateY(-1px); }
        .chat-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .chat-empty {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: #4a4030;
          font-family: 'Rajdhani', sans-serif;
          text-align: center;
        }
        .chat-empty-icon { font-size: 32px; opacity: 0.4; }
        .chat-empty-title { font-size: 14px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
        .chat-empty-sub { font-size: 12px; max-width: 180px; line-height: 1.5; }
      `}</style>

            <div className="chat-header">
                <div className="chat-online-dot" />
                AI Analysis
            </div>

            <div className="chat-messages">
                {messages.length === 0 && !isLoading ? (
                    <div className="chat-empty">
                        <div className="chat-empty-icon">♟</div>
                        <div className="chat-empty-title">Chess Engine Ready</div>
                        <div className="chat-empty-sub">Ask about the position, best moves, or strategy.</div>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className={`chat-bubble-wrap ${msg.role}`}>
                            <div className="chat-role-label" style={{ color: msg.role === "user" ? "#c8a020" : "#8b7355" }}>
                                {msg.role === "user" ? "You" : "Engine"}
                            </div>
                            <div className={`chat-bubble ${msg.role}`}>{msg.content}</div>
                            {msg.timestamp && (
                                <div className="chat-time">{formatTime(msg.timestamp)}</div>
                            )}
                        </div>
                    ))
                )}

                {isLoading && (
                    <div className="chat-bubble-wrap assistant">
                        <div className="chat-role-label" style={{ color: "#8b7355" }}>Engine</div>
                        <div className="chat-bubble assistant">
                            <TypingDots />
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            <div className="chat-input-area">
                <textarea
                    ref={textareaRef}
                    className="chat-textarea"
                    placeholder={placeholder}
                    value={input}
                    onChange={autoResize}
                    onKeyDown={handleKeyDown}
                    rows={1}
                />
                <button
                    className="chat-send-btn"
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    title="Send (Enter)"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                </button>
            </div>
        </div>
    );
}