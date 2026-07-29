# SupportAgent — AI Customer Support Assistant

An AI-powered support agent that converses with users, extracts structured ticket data, and creates tickets via a webhook.

## Features

- **Conversational Intake** — Natural conversation to collect issue details
- **Field Tracking** — Progress bar shows collected ticket fields in real time
- **Smart Extraction** — LLM extracts structured data (title, description, priority, email)
- **Confirmation Step** — Review and confirm ticket before creation
- **Mock Webhook** — Simulated ticket creation endpoint with validation
- **Email Validation** — Server-side email format checking

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **LLM**: OpenAI `gpt-4o-mini` (temp=0.2, max_tokens=300)
- **Session**: In-memory conversation storage

## Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Edit .env.local and add your OpenAI API key
# OPENAI_API_KEY=sk-...

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API Endpoints

### POST /api/chat
Send a message in a support conversation.

**Request:**
```json
{ "session_id": "uuid", "message": "My app crashes when I open settings" }
```

**Response (collecting):**
```json
{
  "reply": "Sorry to hear that. Can you tell me your email?",
  "session_id": "uuid",
  "stage": "collecting",
  "collected_fields": ["title", "description", "priority"]
}
```

**Response (confirming):**
```json
{
  "reply": "I'm ready to create this ticket...",
  "session_id": "uuid",
  "stage": "confirming",
  "collected_fields": ["title","description","priority","customer_email"],
  "ticket_preview": { "title": "...", "description": "...", "priority": "high", "customer_email": "..." }
}
```

### PUT /api/chat
Confirm or cancel ticket creation.

**Request:**
```json
{ "session_id": "uuid", "confirmed": true }
```

**Response:**
```json
{
  "reply": "Ticket #TKT-ABC12345 has been created successfully...",
  "session_id": "uuid",
  "stage": "done",
  "ticket_id": "TKT-ABC12345"
}
```

### POST /api/webhooks/tickets
Mock ticket creation endpoint.

**Request:**
```json
{ "ticket_json": { "title": "...", "description": "...", "priority": "high", "customer_email": "..." } }
```

**Response:**
```json
{ "ticket_id": "TKT-ABC12345", "status": "created" }
```

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts              # Main conversation + ticket creation
│   │   └── webhooks/tickets/route.ts  # Mock ticket webhook
│   ├── page.tsx                       # Chat UI
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── chat-interface.tsx             # Full chat UI with state management
│   ├── progress-bar.tsx               # Field collection progress
│   └── confirmation.tsx              # Ticket confirmation card
└── lib/
    ├── types.ts                       # TypeScript types
    ├── sessions.ts                    # In-memory session management
    ├── openai.ts                      # LLM integration with system prompt
    └── validation.ts                  # Email and priority validation
```

## Agent Flow

1. User describes issue → LLM asks clarifying questions
2. Fields collected one by one: title → description → priority → email
3. When all required fields collected, LLM outputs `ACTION:{...}` JSON
4. Backend validates email, shows confirmation to user
5. User confirms → webhook called → ticket ID returned
6. User can create another ticket

## Safety & PII

- Email validated server-side before ticket creation
- Session data kept in memory only (no persistence)
- System prompt instructs agent to minimize PII retention

## Evaluation Metrics

- Ticket completeness (% of required fields collected)
- Average turns to collect required fields
- Time to ticket creation
- Manual QA of ticket correctness
