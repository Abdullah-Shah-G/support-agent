import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ChatMessage } from "./types";

let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  }
  return genAI;
}

const SYSTEM_PROMPT = `You are SupportAgent. Your job is to collect relevant details from the user to create a support ticket. Always ask for missing required fields in separate clarifying turns. Required ticket fields: title, description, priority (low/medium/high), customer_email, product_id (optional), attachments (optional).

When ALL required fields are collected, output ONLY a JSON object on its own line starting with "ACTION:" like this:
ACTION:{"action":"create_ticket","ticket":{"title":"...","description":"...","priority":"high","customer_email":"...","product_id":"...","attachments":"..."}}

After outputting the JSON, summarize the ticket to the user and ask for confirmation before creation. Do not output the JSON until all required fields are collected. If user requests immediate escalation, set priority to high and ask confirmation. Do not call external APIs directly—your backend will handle the webhook after you output the JSON.`;

export async function generateReply(
  messages: ChatMessage[]
): Promise<string> {
  const history = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user" as "user" | "model",
    parts: [{ text: m.content }],
  }));

  const lastMsg = history.pop();
  const model = getClient().getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: { maxOutputTokens: 300, temperature: 0.2 },
  });

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(lastMsg?.parts[0].text || "");
  return result.response.text() || "I'm sorry, I couldn't process that.";
}
