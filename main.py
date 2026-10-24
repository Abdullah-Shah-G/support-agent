import re
import json
import os
import secrets
from typing import Literal
from pathlib import Path
from fastapi import FastAPI, Depends, Header, HTTPException
from fastapi.responses import JSONResponse, HTMLResponse
from pydantic import BaseModel, Field, ValidationError

from chain import generate_reply
from sessions import (
    add_message, get_messages, get_stage, set_stage,
    set_ticket, get_collected_fields, all_required_collected,
    create_ticket, list_tickets,
)

app = FastAPI(title="Support Agent")
TEMPLATES_DIR = Path(__file__).resolve().parent / "templates"


def require_admin(authorization: str = Header(default="")):
    token = os.getenv("ADMIN_TOKEN")
    if not token or not secrets.compare_digest(authorization.encode(), f"Bearer {token}".encode()):
        raise HTTPException(401, "Valid admin token required")


class Ticket(BaseModel):
    title: str = Field(min_length=1, max_length=500, pattern=r"\S")
    description: str = Field(min_length=1, max_length=20000, pattern=r"\S")
    priority: Literal["low", "medium", "high"]
    customer_email: str = Field(max_length=320, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    product_id: str = ""
    attachments: str = ""


class WebhookRequest(BaseModel):
    ticket_json: Ticket


def render(name: str) -> str:
    return (TEMPLATES_DIR / name).read_text(encoding="utf-8")


class ChatRequest(BaseModel):
    session_id: str = Field(min_length=1, max_length=100)
    message: str = Field(min_length=1, max_length=8000, pattern=r"\S")


class ConfirmRequest(BaseModel):
    session_id: str = Field(min_length=1, max_length=100)
    confirmed: bool


@app.get("/")
async def index():
    return HTMLResponse(render("index.html"))


@app.post("/api/chat")
async def chat(req: ChatRequest):
    if get_stage(req.session_id) == "done":
        raise HTTPException(409, "This ticket is complete. Start a new session.")
    set_stage(req.session_id, "collecting")
    add_message(req.session_id, "user", req.message)
    messages = get_messages(req.session_id)
    try:
        reply = await generate_reply(messages)
    except Exception:
        raise HTTPException(503, "The support assistant is unavailable. Please try again.") from None

    add_message(req.session_id, "assistant", reply)
    stage = "collecting"
    ticket_preview = None
    ticket_id = None

    action_match = re.search(r"ACTION:\s*", reply)
    if action_match:
        try:
            parsed, end = json.JSONDecoder().raw_decode(reply[action_match.end():])
            if not isinstance(parsed, dict) or parsed.get("action") != "create_ticket":
                raise ValueError("Unsupported action")
            ticket = Ticket.model_validate(parsed.get("ticket")).model_dump()

            set_ticket(req.session_id, ticket)
            set_stage(req.session_id, "confirming")
            stage = "confirming"
            ticket_preview = ticket
            reply = (reply[:action_match.start()] + reply[action_match.end() + end:]).strip() or "I'm ready to create this support ticket. Shall I go ahead?"
        except (ValueError, ValidationError):
            reply = "I still need a valid title, description, priority (low/medium/high), and email before creating a ticket."

    return JSONResponse({
        "reply": reply,
        "session_id": req.session_id,
        "stage": stage,
        "collected_fields": get_collected_fields(req.session_id),
        "ticket_preview": ticket_preview,
        "ticket_id": ticket_id,
    })


@app.put("/api/chat")
async def confirm(req: ConfirmRequest):
    from sessions import get_or_create, set_stage, get_collected_fields
    session = get_or_create(req.session_id)

    if req.confirmed:
        if session["stage"] not in ("confirming", "done"):
            raise HTTPException(409, "No complete ticket is awaiting confirmation.")
        ticket = Ticket.model_validate(session["ticket"])
        ticket_id = session["ticket_id"] or create_ticket(ticket.model_dump())
        session["ticket_id"] = ticket_id
        set_stage(req.session_id, "done")
        email = session["ticket"].get("customer_email", "")

        return JSONResponse({
            "reply": f"Ticket #{ticket_id} has been created successfully. We'll follow up at {email}.",
            "session_id": req.session_id,
            "stage": "done",
            "collected_fields": get_collected_fields(req.session_id),
            "ticket_id": ticket_id,
        })
    else:
        if session["stage"] == "done":
            raise HTTPException(409, "The ticket has already been created.")
        set_stage(req.session_id, "collecting")
        return JSONResponse({
            "reply": "No problem! Let me know what you'd like to change.",
            "session_id": req.session_id,
            "stage": "collecting",
            "collected_fields": get_collected_fields(req.session_id),
        })


@app.post("/api/webhooks/tickets", dependencies=[Depends(require_admin)])
async def webhook_create(body: WebhookRequest):
    ticket_id = create_ticket(body.ticket_json.model_dump())
    return JSONResponse({"ticket_id": ticket_id, "status": "created"}, status_code=201)


@app.get("/api/tickets", dependencies=[Depends(require_admin)])
async def get_tickets():
    return JSONResponse({"tickets": list_tickets(), "count": len(list_tickets())})
