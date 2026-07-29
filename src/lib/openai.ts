import OpenAI from "openai";
import type { ChatMessage } from "./types";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return client;
}

const SYSTEM_PROMPT = `You are SupportAgent. Your job is to collect relevant details from the user to create a support ticket. Always ask for missing required fields in separate clarifying turns. Required ticket fields: title, description, priority (low/medium/high), customer_email, product_id (optional), attachments (optional).

When ALL required fields are collected, output ONLY a JSON object on its own line starting with "ACTION:" like this:
ACTION:{"action":"create_ticket","ticket":{"title":"...","description":"...","priority":"high","customer_email":"...","product_id":"...","attachments":"..."}}

After outputting the JSON, summarize the ticket to the user and ask for confirmation before creation. Do not output the JSON until all required fields are collected. If user requests immediate escalation, set priority to high and ask confirmation. Do not call external APIs directly—your backend will handle the webhook after you output the JSON.`;

export async function generateReply(
  messages: ChatMessage[]
): Promise<string> {
  const response = await getClient().chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    max_tokens: 300,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((m) => ({ role: m.role as "user" | "assistant" | "system", content: m.content })),
    ],
  });

  return response.choices[0]?.message?.content ?? "I'm sorry, I couldn't process that.";
}
