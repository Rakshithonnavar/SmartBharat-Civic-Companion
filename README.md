<div align="center">

# 🇮🇳 Smart Bharat — CivicMate

### Your GenAI Companion for Everyday Civic Life

**Ask any government question. File complaints in seconds. Discover schemes tailored to you. All in English or Hindi.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Try%20it%20now-E05D36?style=for-the-badge)](https://citizen-connect-46.preview.emergentagent.com)
[![Powered by Gemini](https://img.shields.io/badge/Powered%20by-Gemini%202.5%20Flash-1C7C54?style=for-the-badge&logo=google)](https://ai.google.dev)
[![Hackathon](https://img.shields.io/badge/Built%20for-PromptWars%202026-0B132B?style=for-the-badge)](https://devengers.in)

</div>

---

## ✨ Why Smart Bharat

> India has **1.4 billion citizens** and **800+ government schemes** across 50+ ministries. The average citizen never claims **60% of benefits** they're eligible for — not because they aren't qualified, but because the system is impossible to navigate.

**Smart Bharat turns this maze into a conversation.** A citizen speaks their question — in Hindi or English — and Google Gemini 2.5 Flash answers, routes, recommends, and tracks. Digital public infrastructure, reimagined for the *next* 500 million users.

---

## 🎯 Core Features

| Feature | What it does | AI Magic |
| --- | --- | --- |
| 🗣️ **AI Civic Companion** | Chat about any government service or scheme | Language-mirroring Gemini agent with civic context; **voice input + read-aloud** for low-literacy users |
| 📮 **Smart Complaint Tracker** | File & track public issues (water, roads, sanitation…) | **AI triage** — auto-generates summary, priority, and routes to the correct department |
| 🧭 **Personalised Scheme Finder** | Enter your profile → get 4-6 eligible schemes | JSON-mode Gemini with locked schema; only well-known central schemes surfaced |
| 📋 **Document Guidance** | For any service, get exact document checklist + steps | Structured output: required docs, process, portal, time, tips |
| 🌐 **Multilingual (EN + हिं)** | One-click toggle across the entire app | Same model, native language — no translation layer, no quality loss |

---

## 🎬 Live Demo

🔗 **[https://citizen-connect-46.preview.emergentagent.com](https://citizen-connect-46.preview.emergentagent.com)**

Try these in 60 seconds:
1. **Chat** → tap the mic 🎤 → say *"How do I apply for Aadhaar?"*
2. **Complaints** → submit a water issue → watch AI assign priority + department in real time
3. **Language toggle** (top-right) → switch to हिंदी, retry any flow
4. **Find Schemes** → *Farmer, Maharashtra* → get PM-KISAN, PMFBY, KCC…

---

## 🏗️ Architecture

```
                  ┌─────────────────────────────────┐
                  │   React 19 (CRA) + Tailwind      │
                  │   Cabinet Grotesk · Satoshi      │
                  │   framer-motion · lucide-react   │
                  │   Web Speech API (STT + TTS)     │
                  └────────────────┬─────────────────┘
                                   │  REACT_APP_BACKEND_URL
                                   ▼
                  ┌─────────────────────────────────┐
                  │   FastAPI (Python 3.11) + Motor  │
                  │   9 REST endpoints under /api    │
                  └────┬──────────────────┬──────────┘
                       │                  │
             ┌─────────▼───┐      ┌───────▼──────────┐
             │  MongoDB     │      │  Google Gemini    │
             │  complaints  │      │  2.5 Flash        │
             │  collection  │      │  (JSON mode +      │
             └──────────────┘      │   streaming)      │
                                   └───────────────────┘
```

### Design principles
- **Separation of concerns** — clean backend/frontend split, no shared state hacks.
- **Structured AI outputs** — every non-chat endpoint uses `response_mime_type=application/json` with a locked schema. No markdown blobs.
- **Fail gracefully** — complaint submission works even if AI triage fails (rule-based fallback).
- **Secrets never in repo** — everything env-driven, `.env.example` provided.
- **Distinctive design** — Cabinet Grotesk + Satoshi + Saffron/Navy/Emerald on Linen. No purple gradient AI slop.

---

## 🧪 Tech Stack

| Layer | Tech |
| --- | --- |
| **Frontend** | React 19 · React Router 7 · Tailwind CSS 3 · shadcn/ui · framer-motion · lucide-react · axios |
| **Voice** | Web Speech API — `SpeechRecognition` (STT, `hi-IN`/`en-IN`) + `SpeechSynthesis` (TTS) |
| **Backend** | FastAPI 0.110 · Motor (async MongoDB) · Pydantic v2 · uvicorn |
| **AI** | Google Gemini 2.5 Flash via `google-generativeai` (JSON mode + streaming) |
| **Database** | MongoDB (in-memory OK for demo; complaints persisted) |
| **Fonts** | Cabinet Grotesk (headings), Satoshi (body), JetBrains Mono (numerals), Noto Sans Devanagari (Hindi) |
| **Deploy** | Emergent Preview · (portable to Vercel + Railway) |

---

## 🚀 Local Setup

### Prerequisites
- Node.js ≥ 18 & Yarn
- Python ≥ 3.10
- MongoDB running locally (or a MongoDB Atlas URI)
- A **Google Gemini API key** from [ai.google.dev](https://ai.google.dev) (free tier is plenty)

### 1. Clone
```bash
git clone https://github.com/<your-username>/smart-bharat.git
cd smart-bharat
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
#   CORS_ORIGINS="*"
#   GEMINI_API_KEY="your-key-from-ai.google.dev"

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

---

## 🔌 API Reference

All routes are prefixed with `/api`.

### Health
| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Heartbeat |

### AI
| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| `POST` | `/ai/chat` | `{ message, language: "en"\|"hi", history: [] }` | `{ reply, model }` |
| `POST` | `/ai/chat/stream` | same as above | SSE stream (`text/event-stream`) |
| `POST` | `/ai/recommend-services` | `{ age, occupation, state, income?, needs?, language }` | `{ services: [{ name, category, eligibility, benefits, how_to_apply, portal }] }` |
| `POST` | `/ai/document-guidance` | `{ service, language }` | `{ service, required_documents, process_steps, where_to_apply, estimated_time, tips }` |

### Complaints
| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/complaints/submit` | Create ticket + AI triage (summary, priority, department) |
| `GET` | `/complaints/track/{ticket_id}` | Fetch a ticket & timeline |
| `POST` | `/complaints/update-status` | Advance status |
| `GET` | `/complaints/all` | List all (admin) |
| `GET` | `/complaints/stats` | Landing-page counters |

### Example
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

---

## 🎨 Design System

- **Palette:** Linen `#FAF9F6` · Navy `#0B132B` · Saffron `#E05D36` · Emerald `#1C7C54`
- **Typography:** Cabinet Grotesk (headings), Satoshi (body), JetBrains Mono (numerals)
- **Layout philosophy:** asymmetric bento grid, generous spacing (`p-8` to `p-16`), `rounded-2xl` cards
- **Motion:** framer-motion micro-animations on hover, entrance, tab switches — no gratuitous global transitions

Design guidelines locked in [`/app/design_guidelines.json`](./design_guidelines.json).

---

## 🔐 Security & Privacy

- ✅ **No secrets in repo** — `.env` is git-ignored; `.env.example` is committed with keys but no values.
- ✅ **API keys via environment variables only** — never hard-coded, never sent to frontend.
- ✅ **CORS explicit** via `CORS_ORIGINS` env var.
- ✅ **No PII in AI prompts** beyond what citizen submits directly.
- ✅ **No third-party analytics** on citizen data.
- ✅ **Graceful fallbacks** — AI failures never break the citizen flow (complaints still save).

---

## 🧭 Prompt Engineering Strategy

### System prompt (chat)
`CIVIC_SYSTEM_PROMPT` anchors Gemini as *CivicMate*: concise, jargon-free, **language-mirroring** (responds in whatever language the user writes in), cites official portals, refuses to invent scheme names.

### JSON mode for structured endpoints
- `response_mime_type: "application/json"` + a strict schema in the prompt
- `max_output_tokens=4096` to prevent truncation on longer service lists
- Prompt-locked to *"only well-known central schemes"* to prevent hallucination

### AI triage on complaints
Every submission triggers a second Gemini call:
```
{ summary, priority: "low|medium|high", department }
```
This is our **differentiator** — most complaint systems dump every ticket into one queue. Ours pre-sorts, ranks, and routes before a human sees it.

---

## 🧪 Testing

Backend has **100% pass rate** across 9 endpoints (see `/app/test_reports/iteration_1.json`):
- ✅ `GET /api/health`
- ✅ `POST /api/ai/chat` (English)
- ✅ `POST /api/ai/chat` (Hindi Devanagari)
- ✅ `POST /api/ai/recommend-services` — returns 5 real schemes
- ✅ `POST /api/ai/document-guidance` — full checklist
- ✅ `POST /api/complaints/submit` — AI triage populated
- ✅ `GET /api/complaints/track/{id}` — timeline intact
- ✅ `POST /api/complaints/update-status` — 4-status transitions
- ✅ `GET /api/complaints/stats`

Frontend flows verified via Playwright + screenshot.

---

## 🗺️ Roadmap

- [x] Voice input & TTS (Web Speech API, Hindi + English) ✅
- [ ] DigiLocker integration for identity verification
- [ ] eSign for actual form submission
- [ ] Admin dashboard for municipal officers
- [ ] Photo upload with complaints (base64 → Mongo GridFS)
- [ ] Additional languages: Tamil, Telugu, Bengali, Marathi, Kannada
- [ ] SMS/WhatsApp notifications on ticket status change (Twilio)
- [ ] Vector-based scheme retrieval (RAG) to cover 800+ schemes exhaustively

---

## 💰 Cost at Scale

Gemini 2.5 Flash pricing: ~$0.075 / 1M input tokens · ~$0.30 / 1M output tokens.

- Average civic query: **~300 input + 500 output tokens**
- **Cost per citizen interaction: ~$0.0002**
- **100 million queries/year: ~$20,000** — within any state government budget.

---

## 🙌 Credits

- **Built for:** DEVENGERS PromptWars 2026 x Global Prompt Challenge (Hack2Skill + Google for Developers)
- **AI Model:** [Google Gemini 2.5 Flash](https://ai.google.dev)
- **Fonts:** [Fontshare](https://fontshare.com) (Cabinet Grotesk, Satoshi), Google Fonts (Noto Sans Devanagari, JetBrains Mono)
- **Icons:** [Lucide](https://lucide.dev)
- **Hero art:** Pexels & Unsplash (see `design_guidelines.json`)

---

## 📄 License

MIT — go build, remix, and ship. Just don't sell it to a scammer.

---

<div align="center">

**Made with ❤️ for a more accessible India.**

*Build. Learn. Lead. Impact.*

</div>
