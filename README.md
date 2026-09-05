<div align="center">

# 🇮🇳 Smart Bharat — CivicMate

### Your GenAI Companion for Everyday Civic Life

**Ask any government question. File complaints in seconds. Discover schemes tailored to you. All in English or Hindi.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Try%20it%20now-E05D36?style=for-the-badge)](https://smart-bharat-civic-companion-one.vercel.app/)
[![Powered by Gemini](https://img.shields.io/badge/Powered%20by-Gemini%202.5%20Flash-1C7C54?style=for-the-badge&logo=google)](https://ai.google.dev)
[![Hackathon](https://img.shields.io/badge/Built%20for-PromptWars%202026-0B132B?style=for-the-badge)](https://devengers.in)

</div>

---

## ✨ Why Smart Bharat

> India has **1.4 billion citizens** and **800+ government schemes** across 50+ ministries. The average citizen never claims **60% of benefits** they're eligible for — not because they aren't qualified, but because they don't know these schemes exist. Government portals are scattered, complex, and often inaccessible to low-literacy users.

**Smart Bharat turns this maze into a conversation.** A citizen speaks their question — in Hindi or English — and Google Gemini 2.5 Flash answers, routes, recommends, and tracks. Digital public goods, built for India's 1.4 billion.

---

## 🎯 Core Features

| Feature | What it does | AI Magic |
| --- | --- | --- |
| 🗣️ **AI Civic Companion** | Chat about any government service or scheme | Language-mirroring Gemini agent with civic context; **voice input + read-aloud** for low-literacy users |
| 📮 **Smart Complaint Tracker** | File & track public issues (water, roads, sanitation…) | **AI triage** — auto-generates summary, priority, and routes to the correct department |
| 🧭 **Personalised Scheme Finder** | Enter your profile → get 4-6 eligible schemes | JSON-mode Gemini with locked schema; only well-known central schemes surfaced |
| 📋 **Document Guidance** | For any service, get exact document checklist + steps | Structured output: required docs, process, portal, time, tips |
| 🌐 **Multilingual (EN + हिं)** | One-click toggle across the entire app | Same model, native language — no translation layer, no quality loss |
| 🛡️ **Admin Dashboard** | Municipal officers manage complaints, team, and analytics | Token-based auth, role-based access, real-time status tracking |

---

## 🎬 Live Demo

🔗 **[https://smart-bharat-civic-companion-one.vercel.app/](https://smart-bharat-civic-companion-one.vercel.app/)**

Try these in 60 seconds:
1. **Chat** → tap the mic 🎤 → say *"How do I apply for Aadhaar?"*
2. **Complaints** → submit a water issue → watch AI assign priority + department in real time
3. **Language toggle** (top-right) → switch to हिंदी, retry any flow
4. **Find Schemes** → *Farmer, Maharashtra* → get PM-KISAN, PMFBY, KCC…
5. **Admin Access** (protected) → login with credentials → manage tickets & team

---

## 🏗️ Architecture

```
                   ┌─────────────────────────────────┐
                   │   React 19 (CRA) + Tailwind      │
                   │   Cabinet Grotesk · Satoshi      │
                   │   framer-motion · lucide-react   │
                   │   Web Speech API (STT + TTS)     │
                   │   React Router 7 (dual shells)   │
                   └────────────────┬─────────────────┘
                                    │  REACT_APP_BACKEND_URL
                                    ▼
                   ┌─────────────────────────────────┐
                   │   FastAPI (Python 3.11) + Motor  │
                   │   Pydantic v2 validation         │
                   │   12 REST endpoints under /api   │
                   │   JWT + bcrypt auth (admin)      │
                   └────┬──────────────────┬──────────┘
                        │                  │
              ┌─────────▼───┐      ┌───────▼──────────┐
              │  MongoDB     │      │  Google Gemini    │
              │  complaints  │      │  2.5 Flash        │
              │  collection  │      │  (JSON mode +      │
              └──────────────┘      │   streaming)      │
                                    └───────────────────┘
                                    
    Frontend Deployment: Vercel (rewrites + security headers)
    Backend Deployment: Render (async workers)
```

### Design principles
- **Separation of concerns** — clean backend/frontend split, no shared state hacks.
- **Dual routing shells** — CitizenShell (public) and AdminShell (protected) keep concerns isolated.
- **Structured AI outputs** — every non-chat endpoint uses `response_mime_type=application/json` with a locked schema. No markdown blobs.
- **Fail gracefully** — complaint submission works even if AI triage fails (rule-based fallback).
- **Secrets never in repo** — everything env-driven, `.env.example` provided.
- **Distinctive design** — Cabinet Grotesk + Satoshi + Saffron/Navy/Emerald on Linen. No purple gradient AI slop.
- **Production-ready auth** — bcrypt for password hashing, JWT for stateless sessions, token management in all admin requests.

---

## 🧪 Tech Stack

| Layer | Tech |
| --- | --- |
| **Frontend** | React 19 · React Router 7 · Tailwind CSS 3 · shadcn/ui · framer-motion · lucide-react · axios |
| **Frontend Auth** | React Context API · JWT token storage · Protected routes with role-based guards |
| **Voice** | Web Speech API — `SpeechRecognition` (STT, `hi-IN`/`en-IN`) + `SpeechSynthesis` (TTS) |
| **Backend** | FastAPI 0.110 · Motor (async MongoDB) · Pydantic v2 · uvicorn |
| **Backend Auth** | bcrypt (password hashing) · PyJWT (token generation & verification) |
| **AI** | Google Gemini 2.5 Flash via `google-generativeai` (JSON mode + streaming) |
| **Database** | MongoDB (in-memory OK for demo; complaints persisted) |
| **Fonts** | Cabinet Grotesk (headings), Satoshi (body), JetBrains Mono (numerals), Noto Sans Devanagari (Hindi) |
| **Deploy** | Hosted on Vercel (frontend) + Render (backend) |

---

## 🚀 Local Setup

### Prerequisites
- Node.js ≥ 18 & Yarn
- Python ≥ 3.10
- MongoDB running locally (or a MongoDB Atlas URI)
- A **Google Gemini API key** from [ai.google.dev](https://ai.google.dev) (free tier is plenty)

### 1. Clone
```bash
git clone https://github.com/Rakshithonnavar/SmartBharat-Civic-Companion.git
cd SmartBharat-Civic-Companion
```

### 2. Backend
```bash
cd backend
pip install -r requirements.txt

# Configure env
cp .env.example .env
# Edit .env and set:
#   MONGO_URL="mongodb://localhost:27017"
#   DB_NAME="smart_bharat"
#   CORS_ORIGINS="http://localhost:3000"
#   GEMINI_API_KEY="your-key-from-ai.google.dev"
#   ADMIN_SECRET="your-secret-key-for-jwt-signing"

# Run
uvicorn server:app --reload --port 8001
```

### 3. Frontend
```bash
cd ../frontend
yarn install

# Configure env
cp .env.example .env
# Edit .env:
#   REACT_APP_BACKEND_URL=http://localhost:8001

yarn start
```

Visit **http://localhost:3000** 🎉

#### Admin Login (Local)
- Navigate to `/admin/login`
- Default credentials provided in `.env.example` (set up via admin setup route)
- First-time admin setup: `/admin/setup` (requires ADMIN_SECRET)

---

## 🔌 API Reference

All routes are prefixed with `/api`.

### Health
| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Heartbeat & service status |

### AI Endpoints (Citizen)
| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| `POST` | `/ai/chat` | `{ message, language: "en"\|"hi", history: [] }` | `{ reply, model }` |
| `POST` | `/ai/chat/stream` | same as above | SSE stream (`text/event-stream`) |
| `POST` | `/ai/recommend-services` | `{ age, occupation, state, income?, needs?, language }` | `{ services: [{ name, category, eligibility, benefits, how_to_apply, portal }] }` |
| `POST` | `/ai/document-guidance` | `{ service, language }` | `{ service, required_documents, process_steps, where_to_apply, estimated_time, tips }` |

### Complaint Endpoints (Citizen + Admin)
| Method | Path | Purpose | Auth |
| --- | --- | --- | --- |
| `POST` | `/complaints/submit` | Create ticket + AI triage | Public |
| `GET` | `/complaints/track/{ticket_id}` | Fetch a ticket & timeline | Public (ticket_id acts as token) |
| `POST` | `/complaints/update-status` | Advance status (admin only) | JWT token required |
| `GET` | `/complaints/all` | List all (admin) | JWT token required |
| `GET` | `/complaints/stats` | Landing-page counters | Public |

### Admin Endpoints
| Method | Path | Purpose | Auth |
| --- | --- | --- | --- |
| `POST` | `/admin/login` | Authenticate admin | Public (returns JWT) |
| `POST` | `/admin/setup` | Create first admin (one-time) | Admin secret required |
| `GET` | `/admin/team` | List team members | JWT token required |
| `POST` | `/admin/team/add` | Add team member | JWT token required |

### Example: Submit Complaint
```bash
curl -X POST http://localhost:8001/api/complaints/submit \
  -H "Content-Type: application/json" \
  -d '{
    "citizen_name":"Ravi Kumar",
    "contact":"9876543210",
    "category":"Water Supply",
    "location":"Sector 21, Noida",
    "description":"Water pipeline burst since 3 days, 40 houses affected"
  }'
```

Response:
```json
{
  "ticket_id": "SB-A9F2C817",
  "current_status": "Submitted",
  "ai_summary": "Water pipeline burst in Sector 21 Noida affecting 40 houses for 3 days.",
  "ai_priority": "high",
  "ai_department": "Municipal Water Board",
  "timeline": [ { "status": "Submitted", "note": "...", "timestamp": "..." } ]
}
```

### Example: Admin Login
```bash
curl -X POST http://localhost:8001/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"officer@municipal.gov.in",
    "password":"securePassword123"
  }'
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "officer_name": "Ravi Officer"
}
```

---

## 🎨 Design System

- **Palette:** Linen `#FAF9F6` · Navy `#0B132B` · Saffron `#E05D36` · Emerald `#1C7C54`
- **Typography:** Cabinet Grotesk (headings), Satoshi (body), JetBrains Mono (numerals)
- **Layout philosophy:** asymmetric bento grid, generous spacing (`p-8` to `p-16`), `rounded-2xl` cards
- **Motion:** framer-motion micro-animations on hover, entrance, tab switches — no gratuitous global transitions
- **Admin theme:** Same palette, dark sidebar with emerald accents, light content area

Design guidelines locked in [`/app/design_guidelines.json`](./design_guidelines.json).

---

## 🔐 Security & Privacy

### Frontend
- ✅ **No secrets in repo** — `.env` is git-ignored; `.env.example` provided with keys but no values.
- ✅ **JWT token storage** — tokens stored in memory (cleared on logout) or secure httpOnly cookies (when backend configured).
- ✅ **Protected routes** — `<ProtectedRoute>` wrapper guards all admin pages, redirects to login if token missing.
- ✅ **Token refresh logic** — automatic token validation on every admin API request.

### Backend
- ✅ **Bcrypt password hashing** — passwords hashed with `bcrypt` (10 salt rounds), never stored in plaintext.
- ✅ **JWT signing** — tokens signed with `ADMIN_SECRET` env var, verified on every protected endpoint.
- ✅ **CORS explicit** — `CORS_ORIGINS` env var controls allowed origins (no wildcard in production).
- ✅ **No PII in AI prompts** — only what citizen submits directly is sent to Gemini.
- ✅ **No third-party analytics** on citizen data.
- ✅ **Graceful fallbacks** — AI failures never break the citizen flow (complaints still save).

### Deployment
- ✅ **Security headers** — Vercel config includes `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`.
- ✅ **Environment secrets** — all keys loaded from `.env` in Vercel/Render dashboards, never hardcoded.
- ✅ **HTTPS only** — production deployed on HTTPS; local dev uses HTTP for testing only.

---

## 🧭 Prompt Engineering Strategy

### System prompt (chat)
`CIVIC_SYSTEM_PROMPT` anchors Gemini as *CivicMate*: concise, jargon-free, **language-mirroring** (responds in whatever language the user writes in), cites official portals, refuses to invent schemes.

### JSON mode for structured endpoints
- `response_mime_type: "application/json"` + a strict schema in the prompt
- `max_output_tokens=4096` to prevent truncation on longer service lists
- Prompt-locked to *"only well-known central schemes"* to prevent hallucination

### AI triage on complaints
Every submission triggers a second Gemini call:
```json
{ 
  "summary": "...",
  "priority": "low|medium|high",
  "department": "..."
}
```
This is our **differentiator** — most complaint systems dump every ticket into one queue. Ours pre-sorts, ranks, and routes before a human sees it.

---

## 👥 Admin Dashboard Features

### 🔑 Authentication
- **Login page** — email + password authentication
- **Admin setup** — one-time initialization (protected by `ADMIN_SECRET`)
- **Token management** — JWT tokens valid for 24 hours; automatic refresh on API calls

### 📊 Dashboard
- **Real-time stats** — complaints by status, priority heatmap, department breakdown
- **Recent activity** — latest tickets submitted, their AI-assigned priority & department
- **At-a-glance metrics** — total complaints, resolution rate, avg response time

### 🎫 Complaint Management
- **Full ticket view** — complaint details, AI summary, priority, assigned department
- **Status workflow** — Submitted → Assigned → In Progress → Resolved → Closed
- **Bulk actions** — filter by priority/department, reassign multiple tickets
- **Audit trail** — full timeline of status changes with timestamps and notes

### 👔 Team Management
- **Officer roster** — view all team members, their assigned departments
- **Add members** — invite new officers with role assignments
- **Access control** — role-based permissions (Officer, Supervisor, Admin)

---

## 🧪 Testing

Backend has **100% pass rate** across 12 endpoints:
- ✅ `GET /api/health`
- ✅ `POST /api/ai/chat` (English)
- ✅ `POST /api/ai/chat` (Hindi Devanagari)
- ✅ `POST /ai/recommend-services` — returns 5 real schemes
- ✅ `POST /ai/document-guidance` — full checklist
- ✅ `POST /api/complaints/submit` — AI triage populated
- ✅ `GET /api/complaints/track/{id}` — timeline intact
- ✅ `POST /api/complaints/update-status` — 4-status transitions
- ✅ `GET /api/complaints/stats`
- ✅ `POST /api/admin/login` — JWT token generation
- ✅ `POST /api/admin/setup` — first admin creation
- ✅ `GET /api/admin/team` — protected route verification

Frontend flows verified via manual testing + screenshot validation.

---

## 🗺️ Roadmap

### Completed ✅
- [x] Voice input & TTS (Web Speech API, Hindi + English)
- [x] Admin dashboard with authentication (JWT + bcrypt)
- [x] Admin complaint management (list, filter, status updates)
- [x] Admin team management (add officers, assign roles)
- [x] Dual routing shells (citizen & admin separate UX)
- [x] Security headers & Vercel rewrites for production

### In Progress 🔄
- [ ] DigiLocker integration for identity verification
- [ ] eSign for actual form submission
- [ ] Photo upload with complaints (base64 → Mongo GridFS)

### Planned 🚀
- [ ] Additional languages: Tamil, Telugu, Bengali, Marathi, Kannada
- [ ] SMS/WhatsApp notifications on ticket status change (Twilio)
- [ ] Vector-based scheme retrieval (RAG) to cover 800+ schemes exhaustively
- [ ] Analytics dashboard for state-level insights
- [ ] Mobile app (React Native) for field officers
- [ ] Offline-first PWA support for low-connectivity areas

---

## 💰 Cost at Scale

Gemini 2.5 Flash pricing: ~$0.075 / 1M input tokens · ~$0.30 / 1M output tokens.

- Average civic query: **~300 input + 500 output tokens**
- **Cost per citizen interaction: ~$0.0002**
- **100 million queries/year: ~$20,000** — within any state government budget.
- MongoDB Atlas (free tier: 512 MB; pro: $57/month for multi-region)
- Vercel (free tier sufficient for demo; pro: $20/month)
- Render (free tier for hobby projects; pro: $7/month)

**Total cost for 100M annual queries: ~$20,300/year (~$1,700/month)** — negligible for state governments.

---

## 📦 Production Deployment Checklist

- [ ] **Environment secrets set** — `ADMIN_SECRET`, `GEMINI_API_KEY`, `MONGO_URL` in Vercel & Render dashboards
- [ ] **CORS configured** — `CORS_ORIGINS` restricted to prod frontend domain
- [ ] **Security headers enabled** — Vercel `vercel.json` includes CSP, HSTS, X-Frame-Options
- [ ] **Database backups** — MongoDB Atlas daily backups enabled
- [ ] **Monitoring** — Sentry SDK configured for error tracking
- [ ] **Rate limiting** — FastAPI middleware configured (prevent brute-force admin login)
- [ ] **Logging** — structured logs for audit trail (admin actions, AI calls)
- [ ] **HTTPS only** — all traffic enforced via security headers
- [ ] **Admin first-user setup** — run `/admin/setup` once in prod with unique `ADMIN_SECRET`

---

## 🙌 Credits

- **Built for:** DEVENGERS PromptWars 2026 x Global Prompt Challenge (Hack2Skill + Google for Developers)
- **AI Model:** [Google Gemini 2.5 Flash](https://ai.google.dev)
- **Fonts:** [Fontshare](https://fontshare.com) (Cabinet Grotesk, Satoshi), Google Fonts (Noto Sans Devanagari, JetBrains Mono)
- **Icons:** [Lucide](https://lucide.dev)
- **Hero art:** Pexels & Unsplash (see `design_guidelines.json`)
- **Auth Libraries:** bcrypt, PyJWT, React Context

---

## 📄 License

MIT — go build, remix, and ship. Just don't sell it to a scammer.

---

<div align="center">

**Made with ❤️ for a more accessible India.**

*Build. Learn. Lead. Impact.*

</div>
