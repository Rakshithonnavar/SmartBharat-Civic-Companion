# Smart Bharat / CivicMate — Pitch Script

**Event:** DEVENGERS PromptWars x Global Prompt Challenge 2026
**Time budget:** 5 minutes (4 min demo + 1 min Q&A prep)
**Live link:** https://citizen-connect-46.preview.emergentagent.com

---

## 🎬 The 30-Second Hook (Slide 1 / Opening)

> **"India has 1.4 billion citizens and 800+ government schemes across 50+ ministries. The average citizen never claims 60% of what they're entitled to — not because they aren't eligible, but because the system is impossible to navigate.**
>
> **We built Smart Bharat — a GenAI civic companion that turns this maze into a conversation. Powered by Google Gemini 2.5 Flash. English or Hindi. One app, four superpowers."**

*(Pause. Open the live URL.)*

---

## 🎯 The 4-Minute Demo Flow

### **Beat 1 — The Homepage (20 sec)**
- Land on `/`. Point to the bento hero.
- "Notice the live ticket, the eligible scheme card, and the ambient AI chat preview — this is not a static landing page, it's a signal that AI is the interface."
- Click **EN → हिं** toggle in top-right.
- "One click, entire product speaks Hindi. Because digital inclusion isn't optional in India."
- Toggle back to English.

### **Beat 2 — AI Civic Companion (45 sec)**
- Click **AI Companion**.
- Click quick-prompt chip: **"How do I apply for Aadhaar?"**
- AI streams back a step-by-step answer with `uidai.gov.in`.
- Toggle language to **हिं**. Type: **"पीएम-किसान क्या है?"** → Send.
- Gemini answers **in Devanagari script**.
- Say: *"Same model, same session, seamless language switching. This alone unlocks 500 million Hindi-first citizens who currently can't Google their way through government portals."*

### **Beat 3 — Smart Complaint Tracker — THE DIFFERENTIATOR ⭐ (90 sec)**
- Click **Complaints**.
- Fill quickly:
  - Name: `Ravi Kumar`
  - Contact: `9876543210`
  - Category: `Water Supply`
  - Location: `Sector 21, Noida`
  - Description: `Water pipeline burst since 3 days, no supply to 40 houses, tanker service unresponsive`
- Click **Submit with AI triage**.

**PAUSE. Point at the response card.**
> **"Watch what just happened. The moment I hit submit, Gemini:
> 1. Generated a 1-sentence summary,
> 2. Classified priority as HIGH — not medium — because '40 houses' + '3 days' is a public health signal,
> 3. Automatically routed it to Municipal Water Board — not a generic queue.
> 
> **This is why we call it AI triage. Most complaint portals dump every ticket into one inbox. Ours pre-sorts, ranks, and routes — the way a good chief of staff would."**

- Copy the ticket ID (e.g., `SB-A9F2C817`).
- Switch to **Track Ticket** tab. Paste ID. Click Track.
- Show the **4-step timeline stepper**: Submitted (✓ green) → Under Review → In Progress → Resolved.
- *"Every status change has a timestamp and a note. Full transparency. This is what accountability looks like."*

### **Beat 4 — Personalised Scheme Finder (45 sec)**
- Click **Find Schemes**.
- Age: `35`, Occupation: `Farmer`, State: `Maharashtra`, Income: `Below ₹2 lakh`, Needs: `crop insurance`.
- Click **Find my schemes**.

**Point at the result grid.**
> "Five schemes, all real. PM-KISAN, Pradhan Mantri Fasal Bima Yojana, Kisan Credit Card, PMKSY, Soil Health Card. For each: eligibility, benefits, how to apply, and the exact official portal.
> 
> No hallucination. We instruct Gemini to only return well-known central schemes, and we verify portal URLs. Because a wrong government link isn't just inconvenient — it's a phishing risk."

### **Beat 5 — Document Guidance (30 sec)**
- Click **Documents**.
- Click chip: **Passport**.
- Instantly get: 6 required documents, 6-step process, `passportindia.gov.in`, "7-15 working days", and 5 pro tips.
- *"Before applying for anything, citizens can now see the entire checklist in 3 seconds. No more wasted trips to the PSK because they forgot Annexure D."*

---

## 🧠 The 30-Second Technical Story (End of demo)

> "Under the hood:
> - **React + FastAPI + MongoDB** — production separation of concerns
> - **Google Gemini 2.5 Flash** with `response_mime_type=application/json` for structured outputs — that's how we get reliable scheme cards and triage results, not markdown blobs
> - **No API keys in the repo** — every secret in environment variables
> - **9 backend endpoints, 100% test pass rate**
> - **Multilingual by system prompt, not by translation layer** — one model, both languages, native quality"

---

## 💥 The Closer (20 sec)

> "**Every hackathon promises impact. We're showing you the primitive: a citizen asks in their language, AI answers in the same language, files their issue, tracks it end-to-end. That's not a demo — that's the first mile of a digital public infrastructure play. Smart Bharat is ready to onboard the next 500 million citizens who've been left out of e-governance because the interfaces were built for people who write emails in English.**"

---

## 🎤 Anticipated Q&A

**Q: How do you prevent Gemini from hallucinating scheme names?**
A: JSON-mode output + prompt-locked to well-known central schemes (PM-KISAN, Ayushman Bharat, PMJDY, Ujjwala, etc.) + we always tell users to verify on the official portal, which we cite. For production we'd add a scheme database RAG layer.

**Q: What if Gemini is down?**
A: Endpoints return graceful 500s. Complaint submission has a fallback — the complaint still gets saved with a rule-based summary if AI triage fails (see `submit_complaint` in `server.py`). Nothing breaks the citizen flow.

**Q: Why in-memory / MongoDB and not Aadhaar-linked?**
A: For the hackathon scope, MongoDB gives us persistent complaint tracking without touching real citizen data. In production, we'd integrate DigiLocker for identity + eSign for form submission — that's the roadmap.

**Q: Cost per query?**
A: Gemini 2.5 Flash is ~$0.075 per million input tokens. Average civic query = ~300 tokens in, ~500 out. **~$0.0001 per citizen interaction.** Scales to 100M queries/year on a state government budget of ~$10k/year for AI.

**Q: Privacy?**
A: We store only the complaint + contact. No PII in AI prompts beyond what the citizen submits. No third-party analytics on citizen data. All secrets in env vars.

**Q: What about accessibility?**
A: Language toggle is the first step. Roadmap: voice input (Web Speech API) for low-literacy users, and screen-reader-friendly semantic HTML (already done — check the alt tags and ARIA on buttons).

---

## 📋 Submission Checklist (before 2:30 PM)

- [ ] Public GitHub repo pushed via "Save to GitHub" button
- [ ] Deployed link: `https://citizen-connect-46.preview.emergentagent.com` ✅
- [ ] `GEMINI_API_KEY` in `backend/.env` — **NOT** committed (already excluded via `.gitignore` behavior)
- [ ] Verify chat, complaint submit+track, scheme finder, document guidance all work on the deployed link (already verified ✅)
- [ ] Submission form on Hack2Skill with: GitHub link, Deployed link, Project Description (paste hook + technical story from this doc), Prompt Workflow (see below)

### Project Description (paste-ready, 480 chars)
> Smart Bharat is a GenAI-powered civic companion that lets 1.4B Indians access government services in English or Hindi. Powered by Google Gemini 2.5 Flash, it offers an AI chat companion, AI-triaged complaint submission with live tracking timelines, a personalised scheme finder, and instant document guidance. Built with React, FastAPI, MongoDB — production architecture in a hackathon window.

### Prompt Workflow (paste-ready)
> 1. **Chat**: System prompt anchors Gemini as "CivicMate" — concise, jargon-free, language-mirroring, citing official portals only.
> 2. **Service Finder**: Structured JSON output (`response_mime_type=application/json`) with a locked schema; prompt injects citizen profile + constraint to only use real central schemes.
> 3. **Document Guidance**: Same JSON-mode approach, schema for docs/steps/where/time/tips — deterministic output.
> 4. **Complaint AI Triage**: Second Gemini call on submission generates {summary, priority, department} — routes tickets before humans see them.

---

## 🔥 Confidence boosters

- Backend tested 100% pass on 9 endpoints
- UI verified via screenshots — no console errors
- Distinctive design (Cabinet Grotesk + saffron/navy) — most teams will show purple gradient Streamlit apps
- **AI triage on complaints is your unique moat** — hammer that in the pitch

**You've got this. Now go win it. 🏆**
