# Smart Bharat / CivicMate — PRD

## Original Problem Statement
Hackathon submission for **DEVENGERS PromptWars 2026 x Global Prompt Challenge** (Hack2Skill + Google for Developers).

Build a GenAI-powered web platform that helps Indian citizens:
- Access government services
- Report public issues
- Receive personalized AI assistance
- Simplify complex government information
- Get document requirement guidance
- Track complaints
- Use in English + Hindi

Evaluation criteria: Code Quality, Security, Efficiency, Testing, Problem Statement Alignment.

## Architecture
- **Frontend:** React (CRA) + Tailwind + framer-motion + shadcn/ui
  - Cabinet Grotesk + Satoshi + JetBrains Mono fonts (custom, not Inter)
  - Palette: Linen `#FAF9F6`, Navy `#0B132B`, Saffron `#E05D36`, Emerald `#1C7C54`
  - Language toggle EN ↔ HI (top-right, global context)
- **Backend:** FastAPI + Motor (Mongo async)
  - MongoDB collection: `complaints`
- **AI:** Google Gemini 2.5 Flash via `google-generativeai` (user-provided API key in `backend/.env` as `GEMINI_API_KEY`)
- **All backend routes prefixed `/api`**; frontend uses `REACT_APP_BACKEND_URL` env var.

## User Personas
1. **Ravi (Farmer, 45, Bihar)** — needs crop insurance & PM-KISAN, prefers Hindi.
2. **Priya (Student, 22, Delhi)** — files municipal complaints, checks scholarship schemes.
3. **Kiran (Small business owner, 35, Bangalore)** — needs Startup India + document checklists.

## Core Requirements (Static)
- Multilingual (English + Hindi Devanagari)
- No secrets in repo — `.env` only
- All external APIs error-handled
- Judge-impressive design, no AI-slop aesthetic

## What's Been Implemented (2026-07-07)
### Backend (`/app/backend/server.py`)
- `GET /api/health` — heartbeat
- `POST /api/ai/chat` — non-streaming multilingual Gemini chat (EN/HI)
- `POST /api/ai/chat/stream` — SSE streaming chat (bonus)
- `POST /api/ai/recommend-services` — profile → 4-6 govt schemes (JSON mode)
- `POST /api/ai/document-guidance` — service → docs/steps/where/time/tips (JSON mode)
- `POST /api/complaints/submit` — creates ticket + **AI triage** (summary, priority, dept routing)
- `GET /api/complaints/track/{id}` — status timeline
- `POST /api/complaints/update-status` — advance status
- `GET /api/complaints/all` — admin list
- `GET /api/complaints/stats` — landing-page counters

### Frontend
- `/` Home — hero with bento grid, live-ticket + eligible-scheme preview cards, feature grid, stats strip
- `/chat` AI Companion — quick-prompt chips, bubble UI, typing dots, EN/HI aware
- `/complaints` — Tabbed (Submit | Track), AI-triaged ticket display, 4-step timeline stepper
- `/services` — Profile form → animated scheme grid
- `/documents` — Common service chips + checklist + steps + tips card

### Testing
- Testing agent iteration 1: **9/9 backend endpoints passed**
- UI verified via screenshots: home, chat, complaints, services, documents all render + interactive flows work end-to-end

## Backlog (P0/P1/P2)
### P0 — For hackathon polish
- [ ] Add voice input to chat (Web Speech API)
- [ ] Streaming SSE hook in ChatCompanion (endpoint exists, UI still uses non-stream)

### P1 — Impress judges more
- [ ] Complaint photo upload (base64 to Mongo)
- [ ] Admin dashboard at `/admin` to view all complaints + update status
- [ ] PDF export of Document Guidance checklist
- [ ] Nearby office / seva-kendra lookup

### P2 — Post-hackathon
- [ ] Auth (Emergent Google OAuth)
- [ ] Persist chat history per user
- [ ] SMS/WhatsApp notifications on ticket status change (Twilio)
- [ ] More Indian languages (Tamil, Telugu, Bengali, Marathi)

## Deployment Notes
- Frontend + backend already live on Emergent preview: `https://citizen-connect-46.preview.emergentagent.com`
- For final Vercel + Railway deploy (per hackathon requirement): push GitHub, add `GEMINI_API_KEY` to Railway env, add `VITE_API_URL` on Vercel.
