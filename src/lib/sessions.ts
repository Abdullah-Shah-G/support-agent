import type { Session, ChatMessage } from "./types";

const sessions = new Map<string, Session>();

export function getOrCreateSession(sessionId: string): Session {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      id: sessionId,
      messages: [],
      ticket: {},
      stage: "collecting",
    });
  }
  return sessions.get(sessionId)!;
}

export function addMessage(sessionId: string, message: ChatMessage): void {
  const session = getOrCreateSession(sessionId);
  session.messages.push(message);
}

export function getMessages(sessionId: string): ChatMessage[] {
  return getOrCreateSession(sessionId).messages;
}

export function setStage(sessionId: string, stage: Session["stage"]): void {
  getOrCreateSession(sessionId).stage = stage;
}

export function setTicket(sessionId: string, ticket: Partial<Session["ticket"]>): void {
  getOrCreateSession(sessionId).ticket = ticket;
}

export function setTicketId(sessionId: string, ticketId: string): void {
  getOrCreateSession(sessionId).ticketId = ticketId;
}

export function getCollectedFields(sessionId: string): string[] {
  const t = getOrCreateSession(sessionId).ticket;
  return Object.entries(t)
    .filter(([_, v]) => v !== undefined && v !== "")
    .map(([k]) => k);
}

const REQUIRED_FIELDS = ["title", "description", "priority", "customer_email"];

export function allRequiredCollected(sessionId: string): boolean {
  const t = getOrCreateSession(sessionId).ticket;
  return REQUIRED_FIELDS.every((f) => t[f as keyof typeof t] !== undefined && String(t[f as keyof typeof t]).trim() !== "");
}
