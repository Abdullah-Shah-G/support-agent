export interface Ticket {
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  customer_email: string;
  product_id?: string;
  attachments?: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface Session {
  id: string;
  messages: ChatMessage[];
  ticket: Partial<Ticket>;
  stage: "collecting" | "confirming" | "done";
  ticketId?: string;
}

export interface ChatRequest {
  session_id: string;
  message: string;
}

export interface ChatResponse {
  reply: string;
  session_id: string;
  stage: "collecting" | "confirming" | "done";
  collected_fields: string[];
  ticket_preview?: Partial<Ticket>;
  ticket_id?: string;
}

export interface WebhookResponse {
  ticket_id: string;
  status: "created" | "error";
}
