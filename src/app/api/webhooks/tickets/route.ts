import { NextResponse } from "next/server";
import crypto from "crypto";
import type { WebhookResponse, Ticket } from "@/lib/types";
import { validateEmail } from "@/lib/validation";

const tickets = new Map<string, Ticket>();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ticket: Ticket = body.ticket_json;

    if (!ticket.title || !ticket.description || !ticket.customer_email) {
      return NextResponse.json(
        { error: "Missing required fields: title, description, customer_email" },
        { status: 400 }
      );
    }

    if (!validateEmail(ticket.customer_email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const ticketId = `TKT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    tickets.set(ticketId, { ...ticket });

    const response: WebhookResponse = {
      ticket_id: ticketId,
      status: "created",
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Failed to create ticket" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const allTickets = Array.from(tickets.entries()).map(([id, ticket]) => ({
    ticket_id: id,
    ...ticket,
  }));

  return NextResponse.json({ tickets: allTickets, count: allTickets.length });
}
