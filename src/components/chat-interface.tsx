"use client";

import { useState, useRef, useEffect } from "react";
import type { ChatResponse, Ticket } from "@/lib/types";
import ProgressBar from "./progress-bar";
import Confirmation from "./confirmation";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function ChatInterface() {
  const [sessionId] = useState(() => crypto.randomUUID());
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! I'm SupportAgent. Tell me what issue you're experiencing, and I'll help create a support ticket.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<"collecting" | "confirming" | "done">("collecting");
  const [collectedFields, setCollectedFields] = useState<string[]>([]);
  const [ticketPreview, setTicketPreview] = useState<Partial<Ticket> | undefined>();
  const [ticketId, setTicketId] = useState<string | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, message: userMsg.content }),
      });

      if (!res.ok) throw new Error("API error");
      const data: ChatResponse = await res.json();

      setStage(data.stage);
      setCollectedFields(data.collected_fields);
      setTicketPreview(data.ticket_preview);
      setTicketId(data.ticket_id);

      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: data.reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, confirmed: true }),
      });

      if (!res.ok) throw new Error("API error");
      const data: ChatResponse = await res.json();

      setStage(data.stage);
      setTicketId(data.ticket_id);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: data.reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: "Failed to create ticket. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    setStage("collecting");
    setTicketPreview(undefined);
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "assistant", content: "No problem! Let me know what you'd like to change." },
    ]);
  }

  function handleRestart() {
    setMessages([
      { id: "welcome2", role: "assistant", content: "Hi again! Tell me about your next issue." },
    ]);
    setStage("collecting");
    setCollectedFields([]);
    setTicketPreview(undefined);
    setTicketId(undefined);
  }

  return (
    <div className="chat-container">
      <header className="chat-header">
        <h1>SupportAgent</h1>
        <span className="header-badge">AI Support</span>
      </header>

      {stage !== "done" && <ProgressBar collected={collectedFields} />}

      <div className="messages-area">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.role}`}>
            <div className="message-content">
              <p>{msg.content}</p>
            </div>
          </div>
        ))}

        {loading && stage !== "confirming" && (
          <div className="message assistant">
            <div className="message-content">
              <p className="typing">Thinking...</p>
            </div>
          </div>
        )}

        {stage === "confirming" && ticketPreview && (
          <Confirmation
            ticket={ticketPreview}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            loading={loading}
          />
        )}

        {stage === "done" && ticketId && (
          <div className="ticket-created">
            <div className="ticket-icon">✓</div>
            <p className="ticket-id-label">Ticket Created</p>
            <p className="ticket-id-value">{ticketId}</p>
            <button className="new-ticket-btn" onClick={handleRestart}>
              Create Another Ticket
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {stage !== "done" && (
        <form className="input-area" onSubmit={handleSend}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={stage === "confirming" ? "Type 'yes' to confirm or revise..." : "Describe your issue..."}
            disabled={loading}
          />
          <button type="submit" disabled={loading || !input.trim()}>
            {loading ? "..." : "Send"}
          </button>
        </form>
      )}
    </div>
  );
}
