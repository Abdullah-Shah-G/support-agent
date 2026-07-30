import re
import json
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, HTMLResponse
from pydantic import BaseModel

from chain import generate_reply
from sessions import (
    add_message, get_messages, get_stage, set_stage,
    set_ticket, get_collected_fields, all_required_collected,
    create_ticket, list_tickets,
)

app = FastAPI(title="Support Agent")
TEMPLATES_DIR = Path("templates")


def render(name: str) -> str:
    return (TEMPLATES_DIR / name).read_text(encoding="utf-8")


class ChatRequest(BaseModel):
    session_id: str
    message: str


class ConfirmRequest(BaseModel):
    session_id: str
    confirmed: bool


@app.get("/")
async def index():
    return HTMLResponse(render("index.html"))


@app.post("/api/chat")
async def chat(req: ChatRequest):
    add_message(req.session_id, "user", req.message)
    messages = get_messages(req.session_id)
    reply = await generate_reply(messages)

    add_message(req.session_id, "assistant", reply)
    stage = "collecting"
    ticket_preview = None
    ticket_id = None

    action_match = re.search(r"ACTION:\s*(\{.*\})", reply, re.DOTALL)
    if action_match:
        try:
            parsed = json.loads(action_match.group(1))
            ticket = parsed.get("ticket", {})

            import re as email_re
            email = ticket.get("customer_email", "")
            if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
                error_reply = f'The email "{email}" doesn\'t look valid. Could you provide a valid email address?'
                add_message(req.session_id, "assistant", error_reply)
                return JSONResponse({
                    "reply": error_reply,
                    "session_id": req.session_id,
                    "stage": "collecting",
                    "collected_fields": get_collected_fields(req.session_id),
                })

            set_ticket(req.session_id, ticket)
            set_stage(req.session_id, "confirming")
            stage = "confirming"
            ticket_preview = ticket
            reply = re.sub(r"ACTION:\s*\{.*\}", "", reply).strip() or "I'm ready to create this support ticket. Shall I go ahead?"
        except json.JSONDecodeError:
            reply = re.sub(r"ACTION:\s*\{.*\}", "", reply).strip() or reply
    else:
        if all_required_collected(req.session_id):
            stage = "confirming"

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
        webhook_url = f"http://localhost:8000/api/webhooks/tickets"
        import httpx
        async with httpx.AsyncClient() as client:
            webhook_res = await client.post(webhook_url, json={"ticket_json": session["ticket"]})
            webhook_data = webhook_res.json()

        ticket_id = webhook_data.get("ticket_id")
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
        set_stage(req.session_id, "collecting")
        return JSONResponse({
            "reply": "No problem! Let me know what you'd like to change.",
            "session_id": req.session_id,
            "stage": "collecting",
            "collected_fields": get_collected_fields(req.session_id),
        })


@app.post("/api/webhooks/tickets")
async def webhook_create(request: Request):
    body = await request.json()
    ticket = body.get("ticket_json", {})

    required = ["title", "description", "customer_email"]
    for field in required:
        if not ticket.get(field):
            return JSONResponse({"error": f"Missing required field: {field}"}, status_code=400)

    ticket_id = create_ticket(ticket)
    return JSONResponse({"ticket_id": ticket_id, "status": "created"}, status_code=201)


@app.get("/api/tickets")
async def get_tickets():
    return JSONResponse({"tickets": list_tickets(), "count": len(list_tickets())})
