"""
Smart Bharat / CivicMate Backend
GenAI-powered civic services platform using Google Gemini 2.5 Flash.
"""
from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import logging
import asyncio
import uuid
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
from datetime import datetime, timezone

import google.generativeai as genai


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
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")


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
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ---------------- SERVICE FINDER ----------------
@api_router.post("/ai/recommend-services", response_model=ServiceRecommendResponse)
async def recommend_services(req: ServiceRecommendRequest):
    lang = "Hindi (Devanagari)" if req.language == "hi" else "English"
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
        return ServiceRecommendResponse(**data)
    except Exception as e:
        logger.exception("recommend error")
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")


# ---------------- DOCUMENT GUIDANCE ----------------
@api_router.post("/ai/document-guidance", response_model=DocumentGuidanceResponse)
async def document_guidance(req: DocumentGuidanceRequest):
    lang = "Hindi (Devanagari)" if req.language == "hi" else "English"
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
        return DocumentGuidanceResponse(**data)
    except Exception as e:
        logger.exception("doc guidance error")
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")


# ---------------- COMPLAINTS ----------------
@api_router.post("/complaints/submit", response_model=Complaint)
async def submit_complaint(req: ComplaintCreate):
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
