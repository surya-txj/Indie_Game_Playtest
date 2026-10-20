# Indie Game Playtest Intelligence

A MERN + local-AI workspace for indie studios running closed playtests. Testers submit structured
reports; developers see reports that describe the same problem in different words grouped together,
triage them into issues, and ask an investigation assistant questions with cited reports. All AI runs
locally through Ollama. **AI suggests; humans decide.**

- `server/`: Express 4 + Mongoose 8 + Zod + LangChain JS (`@langchain/ollama`)
- `client/`: React 18 + Vite 5 + React Router 6 + TanStack Query 5 + React Hook Form + Tailwind 3

## 1. Prerequisites

| Need | Notes |
| --- | --- |
| Node.js 20+ | ES modules throughout |
| MongoDB Atlas cluster (M0 is fine) | Any MongoDB 7+ works; Atlas is needed only for `$vectorSearch` (there is a Node fallback) |
| [Ollama](https://ollama.com) | `ollama pull nomic-embed-text` and `ollama pull llama3.2:3b` |

## 2. Setup

```bash
# API
cd server
cp .env.example .env          # fill MONGODB_URI and JWT_SECRET (32+ chars)
npm install
npm run vector-index          # creates reports_vector_index on Atlas (optional: see below)
npm run seed                  # resets the DB and prints logins + IDs
npm run dev                   # http://localhost:5000

# Web app (second terminal)
cd client
npm install
npm run dev                   # http://localhost:5173  (proxies /api to :5000)
```

Check `GET http://localhost:5000/api/health` → `{ status: "ok", db: "connected", ollama: "ready" }`.
`ollama: "missing-models"` means Ollama is up but a model has not been pulled.

### Seeded accounts (password `Playtest123!` for all)

| Role | Emails |
| --- | --- |
| Developer | `dev1@playtest.dev`, `dev2@playtest.dev`, `dev3@playtest.dev` |
| Coordinator | `coord1@playtest.dev`, `coord2@playtest.dev`, `coord3@playtest.dev` |
| Tester | `tester1@playtest.dev`, `tester2@playtest.dev`, `tester3@playtest.dev` |

Seed contents: studio *Lantern Fox Games*, games *Moss Run* (public) and *Ember Hollow* (private),
builds `0.9.0`, `1.0.0` and `0.3.0-alpha` (embargoed, only tester1 may see it), two active sessions,
29 reports (6 duplicate groups worded differently, 4 vague reports, 1 prompt-injection report),
one triaged issue with two linked (locked) reports, one pending clarification question for tester2,
and a pending invitation for `newtester@playtest.dev` (the seed prints its link).

Running `npm run seed` again gives the same clean state. It uses `deleteMany`, so the Atlas vector
index survives. If Ollama was down during seeding, run `npm run backfill` later.

### Atlas Vector Search index

`npm run vector-index` creates `reports_vector_index` on `reports` (768 dims, cosine; filters on
`studioId`, `gameId`, `buildId`, `sessionId`, `deletedAt`). You can also paste this into Atlas →
Atlas Search → Create Search Index → Vector Search → JSON editor:

```json
{
  "fields": [
    { "type": "vector", "path": "embedding", "numDimensions": 768, "similarity": "cosine" },
    { "type": "filter", "path": "studioId" },
    { "type": "filter", "path": "gameId" },
    { "type": "filter", "path": "buildId" },
    { "type": "filter", "path": "sessionId" },
    { "type": "filter", "path": "deletedAt" }
  ]
}
```

If `$vectorSearch` fails (no index yet, or not on Atlas), the server logs one warning and uses an
in-Node cosine search over the game's reports. Results use the same score scale.

## 3. Demo script

1. **Public**: open `/games` logged out → *Moss Run* → published summary. No builds, reports or testers are visible.
2. **Tester** (`tester1`): *Build overview* → *Submit report* on the Moss Run session. Describe the bridge
   fall in your own words → the response shows up to 3 *AI-suggested* possible duplicates. Open the report:
   *Original submission* is immutable; edit is allowed until the report is linked to an issue.
3. **Tester** (`tester2`): open *Game feels weird* → answer the follow-up question (re-embeds the report).
4. **Developer** (`dev1`): *Feedback clusters* → *Run triage agent* → clusters (about 6 with real embeddings; tune the threshold), each labelled
   “N similar reports, unverified”, plus vague reports with draft questions (sent only on approval).
   *Create issue from cluster* links the selected reports and locks them.
5. **Developer**: *Issue board* → only legal moves are offered (`open → triaged → confirmed → in progress →
   fixed (choose build 1.0.0) → verified → closed`). Illegal moves via the API return 409 with `allowed`.
6. **Developer/Coordinator**: *Investigation assistant* → ask “What are testers saying about the bridge?” →
   the answer cites real report IDs; invented IDs are dropped server-side. The prompt-injection report is treated as data.
7. **Coordinator** (`coord1`): open a session → invite emails (one-time links are printed and logged),
   change status, publish a sanitized summary (HTML, emails, URLs and tester names are stripped), remove an abusive report
   (soft delete), or set an embargo allow-list on a build from *Build overview*.

## 4. API (36 routes under `/api`)

Errors always look like `{ "error": { "code", "message", "details?" } }`. Codes: `VALIDATION_ERROR` 400,
`UNAUTHENTICATED` 401, `FORBIDDEN` 403, `NOT_FOUND` 404 (also for other studios' data, embargoed or
uninvited resources), `CONFLICT` 409, `GONE` 410, `LOCKED` 423, `RATE_LIMITED` 429, `AI_UNAVAILABLE` 503.

| Method + path | Who | Source |
| --- | --- | --- |
| `GET /health` | Public | Ext |
| `POST /auth/register`, `POST /auth/login`, `GET /auth/me` | Public / any | Ext |
| `GET /workspace` | Any logged in | Ext |
| `POST /studios`, `POST /studios/:id/members` | Developer | Ext |
| `GET /games` | Public | **Spec** |
| `GET /games/:slug/playtests` | Public | **Spec** |
| `POST /games` | Developer of studio | Ext |
| `POST /builds` | Developer of studio | **Spec** |
| `PATCH /builds/:id/embargo` | Coordinator of studio | Ext |
| `POST /sessions`, `GET /sessions/:id`, `GET /sessions/:id/reports`, `PATCH /sessions/:id/status` | Coordinator / member or invited tester | Ext |
| `POST /sessions/:id/invitations` | Coordinator of studio | **Spec** |
| `POST /invitations/accept` | Tester | Ext |
| `PATCH /sessions/:id/publish` | Coordinator of studio | Ext |
| `POST /sessions/:id/reports` (multipart) | Invited tester | **Spec** |
| `GET /reports/:id` | Owner tester or member | **Spec** |
| `PATCH /reports/:id`, `DELETE /reports/:id` | Owner tester / coordinator | Ext |
| `GET /reports/:id/screenshots/:file`, `GET /reports/:id/duplicates` | Owner or member / member | Ext |
| `POST /reports/:id/clarification-requests` | Developer of studio | Ext |
| `POST /reports/:id/clarifications` | Owner tester | **Spec** |
| `GET /issues`, `GET /issues/:id` | Studio member | Ext |
| `POST /issues` | Developer of studio | **Spec** |
| `POST /issues/:id/report-links` | Developer of studio | **Spec** |
| `PATCH /issues/:id/status` | Developer of studio | **Spec** |
| `PATCH /issues/:id/assignee` | Developer of studio | Ext |
| `POST /triage-agent`, `GET /triage-runs/latest` | Developer or coordinator of studio | **Spec** / Ext |
| `POST /playtest-chat` | Developer or coordinator of studio | **Spec** |

Rate limits: `/auth/*` 10 per 15 min per IP in production (100 in development); AI routes 20 per minute per user.

## 5. Design decisions

- **Similarity scale.** Atlas reports `vectorSearchScore = (1 + cosine) / 2`; the Node fallback and the
  clustering use the same scale, so one `DUPLICATE_SIMILARITY_THRESHOLD` (default 0.82 ≈ cosine 0.64) works
  everywhere. Tune it on the seed data.
- **Sessions accept reports while `scheduled` or `active`** (the SRS left this to us; `draft`/`closed` return 403).
- **Studio role must match the account role** when adding members (a developer account joins as developer).
- **Graceful AI degradation.** Report submission always saves; without Ollama `aiStatus` stays `pending`
  and `npm run backfill` embeds later. Triage with Ollama down still clusters already-embedded reports and
  uses rule-based summaries (`fallbackUsed: true`); with no embeddings at all it returns 503. Chat returns 503.
- **LLM output** is requested with `withStructuredOutput(zodSchema)`, re-validated with Zod, retried once with
  a correction message, then replaced by heuristics. Tester text is wrapped in `<report id>` blocks and
  any `</report>` it contains is neutralised.
- **No `controllers/` folder.** Route handlers are thin and call services directly.
- **`bcryptjs`** instead of `bcrypt` (same API, no native build).

## 6. Tests

```bash
cd server && npm test     # Vitest: state machine, clustering, cosine, sanitizer, schemas, API error shapes
```
