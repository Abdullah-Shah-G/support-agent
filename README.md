# Support Agent

Install `requirements.txt`, set `GEMINI_API_KEY` in the environment or `.env`, then run `uvicorn main:app --reload`. Open `/`, describe the issue, review the ticket details, and confirm creation.

Confirmation creates a ticket directly in the local store and repeated confirmation returns the same ticket ID. No external ticketing system is contacted. To use the demo webhook or list tickets, set `ADMIN_TOKEN` and supply `Authorization: Bearer <your token>`; use HTTPS when deployed.

Sessions and tickets are in memory and disappear on restart. Run one worker. This demo uses random session IDs, not authenticated user accounts; add ownership checks, persistent storage, rate limits and retention controls before production use.

Run `python -m unittest -v` with Node.js installed for offline tests of confirmation, malformed AI output, admin access, bounded history and browser script syntax. Tests make no live AI or webhook requests.
