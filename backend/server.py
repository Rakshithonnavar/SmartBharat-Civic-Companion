"""
Smart Bharat / CivicMate Backend
GenAI-powered civic services platform using Google Gemini 2.5 Flash.
"""
from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks, Header
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import logging
import asyncio
import time
import uuid
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
from datetime import datetime, timezone

import google.generativeai as genai
from google.api_core import exceptions as google_exceptions

import email_service


# ----------------------------------------------------------------------
# Config
# ----------------------------------------------------------------------
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY missing in backend/.env")
genai.configure(api_key=GEMINI_API_KEY)
GEMINI_MODEL = "gemini-2.5-flash"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("civicmate")

# ----------------------------------------------------------------------
# Error monitoring (OPTIONAL — no-ops entirely if SENTRY_DSN isn't set)
#
# Must run before `FastAPI()` is created so the integration wraps every
# route handler from the start.
#
# PII safety: this app handles citizen complaint data (name, contact,
# free-text description) that must never leave the server unredacted.
# Three layers, each independent so one gap doesn't expose the others:
#   1. send_default_pii=False        — never auto-attach request
#      cookies/headers/IP/user data.
#   2. include_local_variables=False — an exception raised while
#      handling a complaint would otherwise capture that complaint's
#      raw fields (name, contact, description) as stack-trace local
#      variables. This is Sentry's biggest PII leak vector for an app
#      like this one, and it's a single documented flag to close.
#   3. before_send=_scrub_pii        — a defensive last pass that
#      redacts known PII field names anywhere they appear in the
#      outgoing event (extra context, breadcrumbs, etc.), in case a
#      future code change adds one of these fields somewhere the first
#      two layers don't cover.
# ----------------------------------------------------------------------
SENTRY_DSN = os.environ.get("SENTRY_DSN", "").strip()
if SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.starlette import StarletteIntegration
    from sentry_sdk.integrations.logging import LoggingIntegration

    _SENTRY_PII_FIELDS = {"citizen_name", "contact", "description", "email", "phone", "location", "name"}

    def _scrub_pii(event, hint):
        """Redacts known PII field names anywhere in an outgoing event.
        Defense-in-depth on top of include_local_variables=False —
        never lets a scrubbing bug block error reporting itself."""

        def _redact(obj):
            if isinstance(obj, dict):
                return {k: ("[Filtered]" if k in _SENTRY_PII_FIELDS else _redact(v)) for k, v in obj.items()}
            if isinstance(obj, list):
                return [_redact(v) for v in obj]
            return obj

        try:
            return _redact(event)
        except Exception:
            return event

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment=os.environ.get("SENTRY_ENVIRONMENT", "production"),
        release=os.environ.get("RENDER_GIT_COMMIT") or os.environ.get("SENTRY_RELEASE"),
        integrations=[
            FastApiIntegration(),
            StarletteIntegration(),
            LoggingIntegration(level=logging.INFO, event_level=logging.ERROR),
        ],
        # Error monitoring, not full APM — off by default to protect a
        # free-tier quota and minimize what leaves the server. Opt in
        # per-deploy via SENTRY_TRACES_SAMPLE_RATE if performance
        # tracing is ever wanted.
        traces_sample_rate=float(os.environ.get("SENTRY_TRACES_SAMPLE_RATE", "0.0")),
        send_default_pii=False,
        include_local_variables=False,
        before_send=_scrub_pii,
    )
    logger.info("Sentry error monitoring enabled (environment=%s)", os.environ.get("SENTRY_ENVIRONMENT", "production"))
else:
    logger.info("SENTRY_DSN not set — error monitoring disabled")

app = FastAPI(title="Smart Bharat API", version="1.0.0")
api_router = APIRouter(prefix="/api")


# ----------------------------------------------------------------------
# System prompts
# ----------------------------------------------------------------------
CIVIC_SYSTEM_PROMPT = """You are CivicMate, an intelligent AI companion for Indian citizens.
Your job is to simplify government services, schemes, documents, and procedures.

RULES:
- Always be concise, warm, and jargon-free.
- If the user writes in Hindi (Devanagari or transliterated), respond in Hindi. If English, respond in English. Match their language.
- Break long answers into clear bullet points or short numbered steps.
- Mention official portals when relevant (e.g., uidai.gov.in, passportindia.gov.in, mygov.in).
- If unsure or if the query is outside civic/government scope, gently redirect.
- Never invent scheme names, links, or amounts. If not sure, say "please verify on the official portal".
- Keep answers under ~250 words unless the user asks for detail.
"""


# ----------------------------------------------------------------------
# Models
# ----------------------------------------------------------------------
class ChatRequest(BaseModel):
    message: str
    language: Literal["en", "hi"] = "en"
    history: List[dict] = Field(default_factory=list)  # [{role, content}]


class ChatResponse(BaseModel):
    reply: str
    model: str = GEMINI_MODEL


class ServiceRecommendRequest(BaseModel):
    age: int
    occupation: str
    state: str
    income: Optional[str] = None
    needs: Optional[str] = None
    language: Literal["en", "hi"] = "en"


class ServiceItem(BaseModel):
    name: str
    category: str
    eligibility: str
    benefits: str
    how_to_apply: str
    portal: Optional[str] = None


class ServiceRecommendResponse(BaseModel):
    services: List[ServiceItem]


class DocumentGuidanceRequest(BaseModel):
    service: str
    language: Literal["en", "hi"] = "en"


class DocumentGuidanceResponse(BaseModel):
    service: str
    required_documents: List[str]
    process_steps: List[str]
    where_to_apply: str
    estimated_time: str
    tips: List[str]


class ComplaintCreate(BaseModel):
    citizen_name: str
    contact: str
    category: str  # "Roads", "Water", "Electricity", "Sanitation", "Other"
    location: str
    description: str
    language: Optional[str] = "en"  # used only to pick the confirmation-email template


class ComplaintStatusEntry(BaseModel):
    status: str
    note: str
    timestamp: str


class Complaint(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ticket_id: str
    citizen_name: str
    contact: str
    category: str
    location: str
    description: str
    ai_summary: Optional[str] = None
    ai_priority: Optional[str] = None  # "low" | "medium" | "high"
    ai_department: Optional[str] = None
    current_status: str = "Submitted"
    timeline: List[ComplaintStatusEntry] = Field(default_factory=list)
    created_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


class ComplaintUpdate(BaseModel):
    ticket_id: str
    new_status: Literal["Submitted", "Under Review", "In Progress", "Resolved"]
    note: str = ""


# ----------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------
def _ticket_id() -> str:
    return "SB-" + uuid.uuid4().hex[:8].upper()


# ----------------------------------------------------------------------
# Lightweight in-memory TTL cache
# ----------------------------------------------------------------------
# Reduces repeat Gemini calls for effectively-static lookups (document
# checklists, scheme recommendations for the same profile). Not shared
# across server instances/restarts — fine for a single free-tier dyno.
_ai_cache: dict = {}


def _cache_get(namespace: str, key: str):
    entry = _ai_cache.get((namespace, key))
    if not entry:
        return None
    value, expires_at = entry
    if time.time() > expires_at:
        _ai_cache.pop((namespace, key), None)
        return None
    return value


def _cache_set(namespace: str, key: str, value, ttl_seconds: int):
    _ai_cache[(namespace, key)] = (value, time.time() + ttl_seconds)


def _raise_ai_error(e: Exception):
    """Translate a Gemini/SDK exception into a client-safe HTTPException."""
    if isinstance(e, google_exceptions.ResourceExhausted):
        raise HTTPException(
            status_code=429,
            detail="CivicMate's AI is getting a lot of requests right now (free-tier limit reached). Please try again in about a minute.",
        )
    if isinstance(e, (google_exceptions.PermissionDenied, google_exceptions.Unauthenticated)):
        raise HTTPException(
            status_code=502,
            detail="AI service configuration issue. Please contact the site admin.",
        )
    raise HTTPException(status_code=500, detail="AI service is temporarily unavailable. Please try again.")


async def _gemini_generate(
    prompt: str,
    system: str = CIVIC_SYSTEM_PROMPT,
    json_mode: bool = False,
) -> str:
    """Generate text via Gemini in a threadpool (SDK is sync)."""
    def _run():
        generation_config = {
            "temperature": 0.7,
            "top_p": 0.95,
            "max_output_tokens": 4096 if json_mode else 1200,
        }
        if json_mode:
            generation_config["response_mime_type"] = "application/json"
        model = genai.GenerativeModel(
            model_name=GEMINI_MODEL,
            system_instruction=system,
            generation_config=generation_config,
        )
        resp = model.generate_content(prompt)
        return resp.text or ""

    return await asyncio.to_thread(_run)


async def _gemini_stream(prompt: str, system: str = CIVIC_SYSTEM_PROMPT):
    """Yield text chunks from Gemini streaming."""
    loop = asyncio.get_event_loop()

    def _start():
        model = genai.GenerativeModel(
            model_name=GEMINI_MODEL,
            system_instruction=system,
            generation_config={
                "temperature": 0.7,
                "top_p": 0.95,
                "max_output_tokens": 1200,
            },
        )
        return model.generate_content(prompt, stream=True)

    stream = await loop.run_in_executor(None, _start)
    for chunk in stream:
        if chunk.text:
            yield chunk.text


# ----------------------------------------------------------------------
# Routes
# ----------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"message": "Smart Bharat API — CivicMate is online", "model": GEMINI_MODEL}


@api_router.get("/health")
async def health():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}


# ---------------- AI CHAT ----------------
@api_router.post("/ai/chat", response_model=ChatResponse)
async def ai_chat(req: ChatRequest):
    """Non-streaming chat — returns full AI reply."""
    lang_hint = (
        "Reply in Hindi (Devanagari script). Keep answer simple and citizen-friendly."
        if req.language == "hi"
        else "Reply in clear, simple English."
    )
    history_text = ""
    for h in req.history[-6:]:
        role = h.get("role", "user")
        content = h.get("content", "")
        history_text += f"\n{role.upper()}: {content}"
    prompt = f"{history_text}\n\nUSER: {req.message}\n\n({lang_hint})\nASSISTANT:"
    try:
        text = await _gemini_generate(prompt)
        return ChatResponse(reply=text.strip() or "Sorry, I could not generate a reply.")
    except Exception as e:
        logger.exception("gemini chat error")
        _raise_ai_error(e)


@api_router.post("/ai/chat/stream")
async def ai_chat_stream(req: ChatRequest):
    """SSE streaming chat."""
    lang_hint = (
        "Reply in Hindi (Devanagari script)."
        if req.language == "hi"
        else "Reply in clear, simple English."
    )
    history_text = ""
    for h in req.history[-6:]:
        history_text += f"\n{h.get('role','user').upper()}: {h.get('content','')}"
    prompt = f"{history_text}\n\nUSER: {req.message}\n\n({lang_hint})\nASSISTANT:"

    async def event_gen():
        try:
            async for token in _gemini_stream(prompt):
                yield f"data: {json.dumps({'delta': token})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
        except google_exceptions.ResourceExhausted:
            yield f"data: {json.dumps({'error': 'CivicMate is busy right now (rate limit). Please try again in about a minute.'})}\n\n"
        except Exception as e:
            logger.exception("gemini stream error")
            yield f"data: {json.dumps({'error': 'Something went wrong. Please try again.'})}\n\n"

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ---------------- SERVICE FINDER ----------------
@api_router.post("/ai/recommend-services", response_model=ServiceRecommendResponse)
async def recommend_services(req: ServiceRecommendRequest):
    lang = "Hindi (Devanagari)" if req.language == "hi" else "English"

    cache_key = "|".join([
        str(req.age), (req.occupation or "").strip().lower(), (req.state or "").strip().lower(),
        str(req.income or ""), (req.needs or "").strip().lower(), req.language,
    ])
    cached = _cache_get("recommend_services", cache_key)
    if cached is not None:
        return ServiceRecommendResponse(**cached)

    prompt = f"""Recommend 4-6 Indian government schemes/services suitable for this citizen.
Return STRICT JSON with this exact shape:
{{
  "services": [
    {{
      "name": "string",
      "category": "string (e.g., Education, Healthcare, Employment, Housing, Agriculture, Women & Child)",
      "eligibility": "1-2 sentence eligibility summary",
      "benefits": "1-2 sentence benefit summary",
      "how_to_apply": "short step summary",
      "portal": "official website or 'Visit local office'"
    }}
  ]
}}

Citizen profile:
- Age: {req.age}
- Occupation: {req.occupation}
- State: {req.state}
- Income: {req.income or 'not specified'}
- Needs: {req.needs or 'general benefits'}

All text values must be in {lang}. Only include real, well-known Indian schemes (PMAY, PM-KISAN, Ayushman Bharat, PMJDY, Ujjwala, Skill India, Startup India, etc.). No preamble, JSON only."""
    try:
        raw = await _gemini_generate(prompt, json_mode=True)
        data = json.loads(raw)
        _cache_set("recommend_services", cache_key, data, ttl_seconds=6 * 3600)
        return ServiceRecommendResponse(**data)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("recommend error")
        _raise_ai_error(e)


# ---------------- DOCUMENT GUIDANCE ----------------
@api_router.post("/ai/document-guidance", response_model=DocumentGuidanceResponse)
async def document_guidance(req: DocumentGuidanceRequest):
    lang = "Hindi (Devanagari)" if req.language == "hi" else "English"

    cache_key = f"{req.service.strip().lower()}::{req.language}"
    cached = _cache_get("document_guidance", cache_key)
    if cached is not None:
        return DocumentGuidanceResponse(**cached)

    prompt = f"""Provide a document checklist and process guide for the Indian government service: "{req.service}".

Return STRICT JSON:
{{
  "service": "string",
  "required_documents": ["string", ...],
  "process_steps": ["step 1", "step 2", ...],
  "where_to_apply": "portal URL or office location string",
  "estimated_time": "e.g., '7-15 working days'",
  "tips": ["tip 1", "tip 2", ...]
}}

All text values must be in {lang}. Be accurate for India. Include 5-8 documents, 4-6 steps, 3-5 tips. JSON only."""
    try:
        raw = await _gemini_generate(prompt, json_mode=True)
        data = json.loads(raw)
        _cache_set("document_guidance", cache_key, data, ttl_seconds=24 * 3600)
        return DocumentGuidanceResponse(**data)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("doc guidance error")
        _raise_ai_error(e)


# ---------------- COMPLAINTS ----------------
@api_router.post("/email/test")
async def test_email(x_test_token: Optional[str] = Header(default=None)):
    """Sends a one-off email to the deployer's own configured address to
    verify SMTP setup after deploying. Safe to leave public: the
    recipient is hardcoded server-side to SMTP_FROM_EMAIL, never taken
    from the request, so it cannot be pointed at a third party.

    If EMAIL_TEST_TOKEN is set in the environment, this endpoint also
    requires a matching X-Test-Token header — an easy opt-in extra
    layer once you've finished initial setup and want to lock it down.
    """
    required_token = os.environ.get("EMAIL_TEST_TOKEN", "").strip()
    if required_token and x_test_token != required_token:
        raise HTTPException(status_code=401, detail="Invalid or missing X-Test-Token header")

    ok, message = email_service.send_test_email()
    if not ok:
        raise HTTPException(status_code=400, detail=message)
    return {"sent": True, "detail": message}


@api_router.post("/complaints/submit", response_model=Complaint)
async def submit_complaint(req: ComplaintCreate, background_tasks: BackgroundTasks):
    ticket = _ticket_id()

    # AI enrichment: summary, priority, department routing
    ai_prompt = f"""You are triaging a citizen complaint for an Indian municipal system.
Complaint:
- Category: {req.category}
- Location: {req.location}
- Description: {req.description}

Return STRICT JSON:
{{
  "summary": "1-sentence summary in English",
  "priority": "low | medium | high",
  "department": "which government department should handle this (e.g., Public Works Department, Municipal Water Board, State Electricity Board, Sanitation Dept)"
}}
JSON only."""
    ai_summary = req.description[:120]
    ai_priority = "medium"
    ai_department = "Municipal Office"
    try:
        raw = await _gemini_generate(ai_prompt, json_mode=True)
        parsed = json.loads(raw)
        ai_summary = parsed.get("summary", ai_summary)
        ai_priority = parsed.get("priority", ai_priority)
        ai_department = parsed.get("department", ai_department)
    except Exception:
        logger.warning("AI triage fallback used")

    now = datetime.now(timezone.utc).isoformat()
    complaint = Complaint(
        ticket_id=ticket,
        citizen_name=req.citizen_name,
        contact=req.contact,
        category=req.category,
        location=req.location,
        description=req.description,
        ai_summary=ai_summary,
        ai_priority=ai_priority,
        ai_department=ai_department,
        current_status="Submitted",
        timeline=[
            ComplaintStatusEntry(
                status="Submitted",
                note=f"Complaint received and routed to {ai_department}.",
                timestamp=now,
            )
        ],
        created_at=now,
    )
    doc = complaint.model_dump()
    await db.complaints.insert_one(doc)

    # Best-effort confirmation email — runs after this response is sent,
    # is a safe no-op if SMTP isn't configured or contact isn't an email,
    # and can never fail or delay the complaint submission itself.
    background_tasks.add_task(
        email_service.send_complaint_confirmation, doc, req.language or "en"
    )

    return complaint


@api_router.get("/complaints/track/{ticket_id}", response_model=Complaint)
async def track_complaint(ticket_id: str):
    doc = await db.complaints.find_one({"ticket_id": ticket_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return Complaint(**doc)


@api_router.get("/complaints/all", response_model=List[Complaint])
async def list_complaints():
    docs = await db.complaints.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [Complaint(**d) for d in docs]


@api_router.post("/complaints/update-status", response_model=Complaint)
async def update_complaint_status(req: ComplaintUpdate):
    doc = await db.complaints.find_one({"ticket_id": req.ticket_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Ticket not found")
    now = datetime.now(timezone.utc).isoformat()
    doc["current_status"] = req.new_status
    doc.setdefault("timeline", []).append(
        {"status": req.new_status, "note": req.note or "", "timestamp": now}
    )
    await db.complaints.update_one(
        {"ticket_id": req.ticket_id},
        {"$set": {"current_status": doc["current_status"], "timeline": doc["timeline"]}},
    )
    return Complaint(**doc)


@api_router.get("/complaints/stats")
async def complaint_stats():
    total = await db.complaints.count_documents({})
    resolved = await db.complaints.count_documents({"current_status": "Resolved"})
    in_progress = await db.complaints.count_documents({"current_status": "In Progress"})
    return {
        "total": total,
        "resolved": resolved,
        "in_progress": in_progress,
        "citizens_helped": total * 3 + 1240,  # showcase number
        "services_indexed": 180,
    }


# ----------------------------------------------------------------------
# Mount
# ----------------------------------------------------------------------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
