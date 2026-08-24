"""
Email notification service for Smart Bharat — sends via Brevo's HTTPS
Transactional Email API (https://api.brevo.com/v3/smtp/email).

Why HTTP instead of SMTP: many free-tier hosts (Render's free plan
included) block or silently drop outbound SMTP on ports 587/465, since
those ports are a common spam vector. Port 443 (plain HTTPS) is never
blocked — it's the same port every web page and API call already uses.
Brevo's API sends the exact same email an SMTP connection would, just
over HTTPS instead, which is why this swap fixes deliverability without
changing anything about what the recipient sees.

Design principles (unchanged from the SMTP version):
- Optional by default: if BREVO_API_KEY isn't set, every function here
  is a safe no-op. A deployment with no email configured behaves
  exactly as before — nothing breaks, nothing is required.
- Best-effort, never load-bearing: a failure to send must never affect
  the complaint record, which is already saved before this runs. Every
  public function catches its own exceptions and returns a bool
  instead of raising.
- Meant to be called from a FastAPI BackgroundTasks task, i.e. AFTER
  the HTTP response has already been sent to the client — so a slow
  API call never adds latency to the complaint-submission request.

Security notes:
- Body injection / broken markup: every value placed into the HTML
  body is passed through html.escape() before interpolation.
- JSON injection: the request body is built as a Python dict and
  serialized by `requests` itself (json= parameter) — user content
  can never break out of its field the way it could with hand-built
  MIME headers, since JSON string encoding handles escaping for us.
- Recipient validation: only sends when the contact field matches a
  strict email pattern. The "Phone / Email" field is often a phone
  number — those are silently skipped, not treated as errors.
- Abuse / spam relay: a public, unauthenticated endpoint that triggers
  outbound email is a classic spam-relay target (repeatedly submitting
  complaints with someone else's email as the "contact" field). A
  simple in-memory per-recipient rate limit throttles repeat sends to
  the same address. This assumes a single backend process, consistent
  with the existing in-memory AI-response cache elsewhere in this repo.
- Credentials: BREVO_API_KEY is read from the environment and never
  logged, echoed, or included in any exception message we log or
  return to a caller.
"""

import html
import logging
import os
import re
import time
from typing import Dict, Optional, Tuple

import requests

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------
# Configuration — all optional. Read once at import time, same pattern
# as the rest of server.py (GEMINI_API_KEY, MONGO_URL, etc.)
# ---------------------------------------------------------------------
BREVO_API_KEY = os.environ.get("BREVO_API_KEY", "").strip()
BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"

# The sender address must be a verified sender in your Brevo account
# (Settings -> Senders, domains, IPs -> Senders).
EMAIL_FROM_ADDRESS = os.environ.get("EMAIL_FROM_ADDRESS", "").strip()
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "Smart Bharat").strip()
# Optional — used to build a "track your complaint" link in the email.
APP_URL = os.environ.get("APP_URL", "").strip().rstrip("/")

_EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")
_CONTROL_CHARS_RE = re.compile(r"[\r\n\x00-\x08\x0b\x0c\x0e-\x1f]")

_RATE_LIMIT_SECONDS = 60
_last_sent_at: Dict[str, float] = {}

_REQUEST_TIMEOUT_SECONDS = 10


def is_configured() -> bool:
    """True only when the minimum settings are present."""
    return bool(BREVO_API_KEY and EMAIL_FROM_ADDRESS)


def is_valid_email(value: Optional[str]) -> bool:
    if not value:
        return False
    value = value.strip()
    if len(value) > 254 or _CONTROL_CHARS_RE.search(value):
        return False
    return bool(_EMAIL_RE.match(value))


def _sanitize(value: str) -> str:
    """Strip CR/LF/control chars — defense in depth. The Brevo API body
    is JSON, so this isn't needed to prevent header injection the way
    it was for raw SMTP, but it still keeps display fields (names,
    subjects) from containing stray control characters."""
    return _CONTROL_CHARS_RE.sub("", value or "").strip()


def _rate_limited(recipient: str) -> bool:
    """True if we sent this recipient an email too recently. Keeps a
    small in-memory map; opportunistically trims old entries so it
    can't grow unbounded on a long-running process."""
    now = time.time()
    last = _last_sent_at.get(recipient)
    if last is not None and (now - last) < _RATE_LIMIT_SECONDS:
        return True
    _last_sent_at[recipient] = now
    if len(_last_sent_at) > 5000:
        cutoff = now - _RATE_LIMIT_SECONDS
        for k in [k for k, v in _last_sent_at.items() if v < cutoff]:
            _last_sent_at.pop(k, None)
    return False


_COPY = {
    "en": {
        "subject": "Your complaint has been received — Ticket {ticket_id}",
        "heading": "Complaint received",
        "greeting": "Namaste {name},",
        "body": "Your complaint has been submitted to Smart Bharat and is now being reviewed.",
        "ticket_label": "Ticket ID",
        "category_label": "Category",
        "priority_label": "AI Priority",
        "department_label": "Routed to",
        "summary_label": "AI Summary",
        "track_note": "Save this ticket ID — you can check its live status anytime on the Track Ticket tab.",
        "footer": "This is an automated confirmation from Smart Bharat. Please do not reply to this email.",
    },
    "hi": {
        "subject": "आपकी शिकायत प्राप्त हुई — टिकट {ticket_id}",
        "heading": "शिकायत प्राप्त हुई",
        "greeting": "नमस्ते {name},",
        "body": "आपकी शिकायत स्मार्ट भारत को सफलतापूर्वक भेज दी गई है और अब समीक्षा में है।",
        "ticket_label": "टिकट आईडी",
        "category_label": "श्रेणी",
        "priority_label": "एआई प्राथमिकता",
        "department_label": "भेजा गया",
        "summary_label": "एआई सारांश",
        "track_note": "इस टिकट आईडी को सुरक्षित रखें — आप 'ट्रैक टिकट' टैब में कभी भी स्थिति देख सकते हैं।",
        "footer": "यह स्मार्ट भारत की एक स्वचालित पुष्टि है। कृपया इस ईमेल का उत्तर न दें।",
    },
}


def _build_payload(complaint: dict, language: str, recipient: str) -> dict:
    """Builds the JSON body for Brevo's /v3/smtp/email endpoint."""
    copy = _COPY.get(language, _COPY["en"])

    ticket_id = _sanitize(str(complaint.get("ticket_id", "")))
    name = _sanitize(str(complaint.get("citizen_name", "")))[:100] or "Citizen"
    subject = _sanitize(copy["subject"].format(ticket_id=ticket_id))

    # Every value below is user-influenced (directly or via the AI triage
    # of user text), so it's HTML-escaped before going into the HTML body.
    safe_name = html.escape(name)
    safe_ticket = html.escape(ticket_id)
    safe_category = html.escape(str(complaint.get("category", "")))
    safe_priority = html.escape(str(complaint.get("ai_priority") or "—"))
    safe_department = html.escape(str(complaint.get("ai_department") or "—"))
    safe_summary = html.escape(str(complaint.get("ai_summary") or ""))

    track_url = f"{APP_URL}/complaints" if APP_URL else ""

    summary_line = f"{copy['summary_label']}: {complaint.get('ai_summary')}\n" if complaint.get("ai_summary") else ""
    text_body = (
        f"{copy['greeting'].format(name=name)}\n\n"
        f"{copy['body']}\n\n"
        f"{copy['ticket_label']}: {ticket_id}\n"
        f"{copy['category_label']}: {complaint.get('category', '')}\n"
        f"{copy['priority_label']}: {complaint.get('ai_priority') or '-'}\n"
        f"{copy['department_label']}: {complaint.get('ai_department') or '-'}\n"
        f"{summary_line}\n"
        f"{copy['track_note']}\n"
        + (f"{track_url}\n\n" if track_url else "\n")
        + copy["footer"]
    )

    summary_row = (
        f'<div style="margin-top:8px;"><strong>{html.escape(copy["summary_label"])}:</strong> {safe_summary}</div>'
        if safe_summary
        else ""
    )
    link_row = (
        f'<p><a href="{html.escape(track_url)}" style="color:#E05D36;">{html.escape(track_url)}</a></p>'
        if track_url
        else ""
    )

    html_body = f"""\
<html><body style="font-family:Arial,sans-serif;color:#0B132B;background:#FAF7F0;padding:24px;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #eee;">
    <h2 style="margin:0 0 16px;">{html.escape(copy['heading'])}</h2>
    <p>{html.escape(copy['greeting'].format(name=name))}</p>
    <p>{html.escape(copy['body'])}</p>
    <div style="background:#FAF7F0;border-radius:12px;padding:16px;margin:20px 0;font-size:14px;line-height:1.8;">
      <div><strong>{html.escape(copy['ticket_label'])}:</strong> <span style="font-family:monospace;">{safe_ticket}</span></div>
      <div><strong>{html.escape(copy['category_label'])}:</strong> {safe_category}</div>
      <div><strong>{html.escape(copy['priority_label'])}:</strong> {safe_priority}</div>
      <div><strong>{html.escape(copy['department_label'])}:</strong> {safe_department}</div>
      {summary_row}
    </div>
    <p style="font-size:13px;color:#555;">{html.escape(copy['track_note'])}</p>
    {link_row}
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
    <p style="font-size:11px;color:#999;">{html.escape(copy['footer'])}</p>
  </div>
</body></html>"""

    return {
        "sender": {"name": _sanitize(EMAIL_FROM_NAME), "email": EMAIL_FROM_ADDRESS},
        "to": [{"email": recipient, "name": name}],
        "subject": subject,
        "htmlContent": html_body,
        "textContent": text_body,
    }


def _dispatch(payload: dict) -> None:
    """POSTs to Brevo's API over HTTPS (port 443 — never blocked by
    host firewalls the way SMTP ports 587/465 sometimes are). Raises
    on failure; callers are responsible for catching."""
    resp = requests.post(
        BREVO_API_URL,
        json=payload,
        headers={
            "accept": "application/json",
            "content-type": "application/json",
            "api-key": BREVO_API_KEY,
        },
        timeout=_REQUEST_TIMEOUT_SECONDS,
    )
    resp.raise_for_status()


def send_complaint_confirmation(complaint: dict, language: str = "en") -> bool:
    """Best-effort confirmation email for a just-submitted complaint.

    Intended to be run via FastAPI's BackgroundTasks, after the HTTP
    response has already gone back to the client. Never raises.
    Returns True only if Brevo accepted the message.
    """
    if not is_configured():
        logger.debug("Email not configured — skipping confirmation email")
        return False

    recipient = (complaint.get("contact") or "").strip()
    if not is_valid_email(recipient):
        # contact was a phone number or otherwise not an email — nothing to send
        return False

    ticket_id = complaint.get("ticket_id", "")

    if _rate_limited(recipient):
        logger.info("Skipped duplicate confirmation email (rate-limited) for ticket %s", ticket_id)
        return False

    try:
        payload = _build_payload(complaint, language if language in _COPY else "en", recipient)
        _dispatch(payload)
        logger.info("Confirmation email sent for ticket %s", ticket_id)
        return True
    except Exception as exc:
        # Never let an email failure affect the complaint that's already
        # saved — this endpoint's job is done regardless of this outcome.
        logger.warning("Failed to send confirmation email for ticket %s: %s", ticket_id, exc)
        return False


def send_test_email() -> Tuple[bool, str]:
    """Sends a one-off test email to verify the Brevo API key + verified
    sender are set up correctly after deploying.

    Deliberately hardcoded to send ONLY to EMAIL_FROM_ADDRESS — the
    mailbox the deployer themselves configured — never to a
    caller-supplied address. That's what makes it safe to expose as a
    public endpoint: there's no way to point it at a third party, so it
    can't become a spam-relay vector the way an arbitrary-recipient
    endpoint would.

    Returns (success, message) — message is a short human-readable
    explanation either way, safe to return directly in an HTTP response
    (it never includes BREVO_API_KEY or any other secret).
    """
    if not is_configured():
        missing = [
            name
            for name, val in [
                ("BREVO_API_KEY", BREVO_API_KEY),
                ("EMAIL_FROM_ADDRESS", EMAIL_FROM_ADDRESS),
            ]
            if not val
        ]
        return False, f"Email is not configured. Missing: {', '.join(missing)}"

    if not is_valid_email(EMAIL_FROM_ADDRESS):
        return False, "EMAIL_FROM_ADDRESS is not a valid email address"

    test_key = f"test:{EMAIL_FROM_ADDRESS}"
    if _rate_limited(test_key):
        return False, f"Rate limited — please wait up to {_RATE_LIMIT_SECONDS}s between test emails"

    complaint = {
        "ticket_id": "SB-TESTEMAIL",
        "citizen_name": "Smart Bharat",
        "contact": EMAIL_FROM_ADDRESS,
        "category": "Email configuration test",
        "ai_priority": "n/a",
        "ai_department": "n/a",
        "ai_summary": "This is a test email confirming the Brevo API integration is working.",
    }

    try:
        payload = _build_payload(complaint, "en", EMAIL_FROM_ADDRESS)
        payload["subject"] = _sanitize("Smart Bharat — test email (Brevo API is working)")
        _dispatch(payload)
        logger.info("Test email sent successfully to %s", EMAIL_FROM_ADDRESS)
        return True, f"Test email sent to {EMAIL_FROM_ADDRESS}"
    except requests.exceptions.HTTPError as exc:
        status = exc.response.status_code if exc.response is not None else "unknown"
        if status == 401:
            return False, "Brevo rejected the API key (401 Unauthorized) — check BREVO_API_KEY"
        if status == 400:
            # Most common cause: EMAIL_FROM_ADDRESS isn't a verified sender in Brevo
            detail = ""
            try:
                detail = exc.response.json().get("message", "")
            except Exception:
                pass
            return False, f"Brevo rejected the request (400): {detail or 'check that EMAIL_FROM_ADDRESS is a verified sender in Brevo'}"
        return False, f"Brevo API returned an error (status {status})"
    except requests.exceptions.Timeout:
        return False, "Timed out connecting to Brevo's API"
    except requests.exceptions.ConnectionError as exc:
        return False, f"Could not connect to Brevo's API: {exc}"
    except Exception as exc:
        logger.warning("Test email failed: %s", exc)
        return False, f"Failed to send: {exc}"
