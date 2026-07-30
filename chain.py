import os
import re
import json
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

load_dotenv()

llm = ChatGoogleGenerativeAI(
    model="gemini-3.1-flash-lite",
    api_key=os.getenv("GEMINI_API_KEY"),
    max_output_tokens=300,
    temperature=0.2,
)

SYSTEM_PROMPT = """You are SupportAgent. Your job is to collect relevant details from the user to create a support ticket. Always ask for missing required fields in separate clarifying turns. Required ticket fields: title, description, priority (low/medium/high), customer_email, product_id (optional), attachments (optional).

When ALL required fields are collected, output ONLY a JSON object on its own line starting with "ACTION:" like this:
ACTION:{"action":"create_ticket","ticket":{"title":"...","description":"...","priority":"high","customer_email":"...","product_id":"...","attachments":"..."}}

After outputting the JSON, summarize the ticket to the user and ask for confirmation before creation. Do not output the JSON until all required fields are collected. If user requests immediate escalation, set priority to high and ask confirmation. Do not call external APIs directly—your backend will handle the webhook after you output the JSON."""


async def generate_reply(messages: list[dict]) -> str:
    langchain_messages = [SystemMessage(content=SYSTEM_PROMPT)]

    for msg in messages:
        if msg["role"] == "user":
            langchain_messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            langchain_messages.append(AIMessage(content=msg["content"]))

    result = await llm.ainvoke(langchain_messages)
    content = result.content
    if isinstance(content, list):
        content = "".join(c.get("text", "") for c in content)
    return content.strip() or "I'm sorry, I couldn't process that."
