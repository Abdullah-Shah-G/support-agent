import uuid

sessions: dict[str, dict] = {}


def get_or_create(session_id: str) -> dict:
    if session_id not in sessions:
        sessions[session_id] = {
            "messages": [],
            "ticket": {},
            "stage": "collecting",
            "ticket_id": None,
        }
    return sessions[session_id]


def add_message(session_id: str, role: str, content: str):
    sess = get_or_create(session_id)
    sess["messages"].append({"role": role, "content": content})


def get_messages(session_id: str) -> list[dict]:
    return get_or_create(session_id)["messages"][-10:]


def set_stage(session_id: str, stage: str):
    sess = get_or_create(session_id)
    sess["stage"] = stage


def set_ticket(session_id: str, ticket: dict):
    sess = get_or_create(session_id)
    sess["ticket"] = ticket


def set_ticket_id(session_id: str, ticket_id: str):
    sess = get_or_create(session_id)
    sess["ticket_id"] = ticket_id


def get_collected_fields(session_id: str) -> list[str]:
    ticket = get_or_create(session_id)["ticket"]
    return [k for k, v in ticket.items() if v]


def get_stage(session_id: str) -> str:
    return get_or_create(session_id)["stage"]


def all_required_collected(session_id: str) -> bool:
    ticket = get_or_create(session_id)["ticket"]
    required = ["title", "description", "priority", "customer_email"]
    return all(ticket.get(k) for k in required)


ticket_store: dict[str, dict] = {}


def create_ticket(ticket: dict) -> str:
    ticket_id = f"TKT-{uuid.uuid4().hex[:8].upper()}"
    ticket_store[ticket_id] = ticket
    return ticket_id


def list_tickets() -> list[dict]:
    return [{"ticket_id": tid, **t} for tid, t in ticket_store.items()]
