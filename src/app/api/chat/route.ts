import { NextResponse } from "next/server";
import { generateReply } from "@/lib/openai";
import {
  addMessage,
  getMessages,
  getOrCreateSession,
  setStage,
  setTicket,
  setTicketId,
  getCollectedFields,
  allRequiredCollected,
} from "@/lib/sessions";
import { validateEmail } from "@/lib/validation";
import type { ChatRequest, ChatResponse, Ticket } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body: ChatRequest = await request.json();
    const { session_id, message } = body;

    if (!message || !session_id) {
      return NextResponse.json(
        { error: "session_id and message are required" },
        { status: 400 }
      );
    }

    addMessage(session_id, { role: "user", content: message });
    const messages = getMessages(session_id);
    const reply = await generateReply(messages);

    addMessage(session_id, { role: "assistant", content: reply });

    const actionMatch = reply.match(/ACTION:\s*(\{.*\})/s);
    if (actionMatch) {
      try {
        const parsed = JSON.parse(actionMatch[1]);
        const ticket: Ticket = parsed.ticket;

        if (!validateEmail(ticket.customer_email)) {
          const errorReply = `The email "${ticket.customer_email}" doesn't look valid. Could you provide a valid email address?`;
          addMessage(session_id, { role: "assistant", content: errorReply });
          setStage(session_id, "collecting");

          const response: ChatResponse = {
            reply: errorReply,
            session_id,
            stage: "collecting",
            collected_fields: getCollectedFields(session_id),
          };
          return NextResponse.json(response);
        }

        setTicket(session_id, ticket);
        setStage(session_id, "confirming");

        const ticketPreview = reply.replace(/ACTION:\s*\{.*\}/s, "").trim();

        const response: ChatResponse = {
          reply: ticketPreview || `I'm ready to create this support ticket. Shall I go ahead?`,
          session_id,
          stage: "confirming",
          collected_fields: getCollectedFields(session_id),
          ticket_preview: ticket,
        };
        return NextResponse.json(response);
      } catch {
        const response: ChatResponse = {
          reply: reply.replace(/ACTION:\s*\{.*\}/s, "").trim() || reply,
          session_id,
          stage: "collecting",
          collected_fields: getCollectedFields(session_id),
        };
        return NextResponse.json(response);
      }
    }

    const isConfirming = allRequiredCollected(session_id);
    const response: ChatResponse = {
      reply,
      session_id,
      stage: isConfirming ? "confirming" : "collecting",
      collected_fields: getCollectedFields(session_id),
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Chat error:", error);
    const msg = error?.message || error?.toString() || "";
    const isQuota = msg.includes("quota") || msg.includes("429") || msg.includes("insufficient_quota");
    return NextResponse.json(
      { error: isQuota ? "API quota exceeded. Check your Gemini API billing at https://aistudio.google.com." : "Internal server error" },
      { status: isQuota ? 503 : 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { session_id, confirmed } = body;

    if (!session_id) {
      return NextResponse.json({ error: "session_id is required" }, { status: 400 });
    }

    const session = getOrCreateSession(session_id);

    if (confirmed) {
      const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/webhooks/tickets`;
      const webhookRes = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket_json: session.ticket }),
      });

      const webhookData = await webhookRes.json();
      setTicketId(session_id, webhookData.ticket_id);
      setStage(session_id, "done");

      return NextResponse.json({
        reply: `Ticket #${webhookData.ticket_id} has been created successfully. We'll follow up at ${session.ticket.customer_email}.`,
        session_id,
        stage: "done",
        collected_fields: getCollectedFields(session_id),
        ticket_id: webhookData.ticket_id,
      });
    } else {
      setStage(session_id, "collecting");
      return NextResponse.json({
        reply: "No problem! Let me know what you'd like to change.",
        session_id,
        stage: "collecting",
        collected_fields: getCollectedFields(session_id),
      });
    }
  } catch (error: any) {
    console.error("Confirmation error:", error);
    const msg = error?.message || error?.toString() || "";
    const isQuota = error?.status === 429 || error?.code === "insufficient_quota" || msg.includes("quota") || msg.includes("429");
    return NextResponse.json(
      { error: isQuota ? "API quota exceeded. Check your Gemini billing at https://aistudio.google.com." : "Failed to process confirmation" },
      { status: isQuota ? 503 : 500 }
    );
  }
}
