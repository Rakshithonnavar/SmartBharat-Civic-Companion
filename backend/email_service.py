"""
Email notification service for Smart Bharat.

Sends a best-effort confirmation email when a citizen submits a complaint
and leaves a valid email address in the "Phone / Email" contact field.

Design principles:
- Optional by default: if SMTP env vars aren't set, every function here
  is a safe no-op. A deployment with no email configured behaves exactly
  as before — nothing breaks, nothing is required.
- Best-effort, never load-bearing: a failure to send must never affect
  the complaint record, which is already saved before this runs. Every
  public function catches its own exceptions and returns a bool instead
  of raising.
- Meant to be called from a FastAPI BackgroundTasks task, i.e. AFTER the
  HTTP response has already been sent to the client — so a slow SMTP
  server never adds latency to the complaint-submission request.

Security notes:
- Header injection: every value placed into an email header (Subject,
  To, From) is stripped of CR/LF and other control characters. Without
  this, a citizen typing a newline into a form field could inject
  arbitrary extra headers (e.g. a hidden Bcc) into the outgoing email.
- Body injection / broken markup: every value placed into the HTML body
  is passed through html.escape() before interpolation.
- Recipient validation: only sends when the contact field matches a
  strict email pattern. The "Phone / Email" field is often a phone
  number — those are silently skipped, not treated as errors.
- Abuse / spam relay: a public, unauthenticated endpoint that triggers
  outbound email is a classic spam-relay target (repeatedly submitting
  complaints with someone else's email as the "contact" field). A
  simple in-memory per-recipient rate limit throttles repeat sends to
  the same address. This assumes a single backend process, consistent
  with the existing in-memory AI-response cache elsewhere in this repo.
- Credentials: SMTP_PASSWORD is read from the environment and never
  logged, echoed, or included in any exception message we log.
"""

import html
import logging
import os
import re
import smtplib
import time
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from typing import Dict, Optional, Tuple

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------
# Configuration — all optional. Read once at import time, same pattern
# as the rest of server.py (GEMINI_API_KEY, MONGO_URL, etc.)
# ---------------------------------------------------------------------
SMTP_HOST = os.environ.get("SMTP_HOST", "").strip()
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587") or "587")
SMTP_USER = os.environ.get("SMTP_USER", "").strip()
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.environ.get("SMTP_FROM_EMAIL", "").strip() or SMTP_USER
SMTP_FROM_NAME = os.environ.get("SMTP_FROM_NAME", "Smart Bharat").strip()
# Optional — used to build a "track your complaint" link in the email.
APP_URL = os.environ.get("APP_URL", "").strip().rstrip("/")

_EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")
_CONTROL_CHARS_RE = re.compile(r"[\r\n\x00-\x08\x0b\x0c\x0e-\x1f]")

_RATE_LIMIT_SECONDS = 60
_last_sent_at: Dict[str, float] = {}


def is_configured() -> bool:
    """True only when the minimum SMTP settings are present."""
    return bool(SMTP_HOST and SMTP_USER and SMTP_PASSWORD and SMTP_FROM_EMAIL)


def is_valid_email(value: Optional[str]) -> bool:
    if not value:
        return False
    value = value.strip()
    if len(value) > 254 or _CONTROL_CHARS_RE.search(value):
        return False
    return bool(_EMAIL_RE.match(value))


def _sanitize_header(value: str) -> str:
    """Strip CR/LF/control chars so user input can never inject extra
    email headers (classic SMTP header-injection attack)."""
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


def _build_message(complaint: dict, language: str) -> MIMEMultipart:
    copy = _COPY.get(language, _COPY["en"])
    recipient = complaint["contact"].strip()

    ticket_id = _sanitize_header(str(complaint.get("ticket_id", "")))
    name = _sanitize_header(str(complaint.get("citizen_name", "")))[:100] or "Citizen"
    subject = _sanitize_header(copy["subject"].format(ticket_id=ticket_id))

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

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = formataddr((_sanitize_header(SMTP_FROM_NAME), SMTP_FROM_EMAIL))
    msg["To"] = recipient
    msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))
    return msg


def _dispatch(msg: MIMEMultipart, recipient: str) -> None:
    """Opens the SMTP connection and sends. Raises on failure — the
    caller (send_complaint_confirmation) is responsible for catching."""
    if SMTP_PORT == 465:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM_EMAIL, [recipient], msg.as_string())
    else:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM_EMAIL, [recipient], msg.as_string())


def send_complaint_confirmation(complaint: dict, language: str = "en") -> bool:
    """Best-effort confirmation email for a just-submitted complaint.

    Intended to be run via FastAPI's BackgroundTasks, after the HTTP
    response has already gone back to the client. Never raises.
    Returns True only if the message was successfully handed to SMTP.
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
        msg = _build_message(complaint, language if language in _COPY else "en")
        _dispatch(msg, recipient)
        logger.info("Confirmation email sent for ticket %s", ticket_id)
        return True
    except Exception as exc:
        # Never let an email failure affect the complaint that's already
        # saved — this endpoint's job is done regardless of this outcome.
        logger.warning("Failed to send confirmation email for ticket %s: %s", ticket_id, exc)
        return False


def send_test_email() -> Tuple[bool, str]:
    """Sends a one-off test email to verify SMTP setup after deploying.

    Deliberately hardcoded to send ONLY to SMTP_FROM_EMAIL — the mailbox
    the deployer themselves configured — never to a caller-supplied
    address. That's what makes it safe to expose as a public endpoint:
    there's no way to point it at a third party, so it can't become a
    spam-relay vector the way an arbitrary-recipient endpoint would.

    Returns (success, message) — message is a short human-readable
    explanation either way, safe to return directly in an HTTP response
    (it never includes SMTP_PASSWORD or any other secret).
    """
    if not is_configured():
        missing = [
            name
            for name, val in [
                ("SMTP_HOST", SMTP_HOST),
                ("SMTP_USER", SMTP_USER),
                ("SMTP_PASSWORD", SMTP_PASSWORD),
                ("SMTP_FROM_EMAIL", SMTP_FROM_EMAIL),
            ]
            if not val
        ]
        return False, f"Email is not configured. Missing: {', '.join(missing)}"

    if not is_valid_email(SMTP_FROM_EMAIL):
        return False, "SMTP_FROM_EMAIL is not a valid email address"

    test_key = f"test:{SMTP_FROM_EMAIL}"
    if _rate_limited(test_key):
        return False, f"Rate limited — please wait up to {_RATE_LIMIT_SECONDS}s between test emails"

    complaint = {
        "ticket_id": "SB-TESTEMAIL",
        "citizen_name": "Smart Bharat",
        "contact": SMTP_FROM_EMAIL,
        "category": "Email configuration test",
        "ai_priority": "n/a",
        "ai_department": "n/a",
        "ai_summary": "This is a test email confirming SMTP is configured correctly.",
    }

    try:
        msg = _build_message(complaint, "en")
        msg.replace_header(
            "Subject",
            _sanitize_header("Smart Bharat — test email (SMTP is working)"),
        )
        _dispatch(msg, SMTP_FROM_EMAIL)
        logger.info("Test email sent successfully to %s", SMTP_FROM_EMAIL)
        return True, f"Test email sent to {SMTP_FROM_EMAIL}"
    except smtplib.SMTPAuthenticationError:
        return False, "SMTP authentication failed — check SMTP_USER and SMTP_PASSWORD"
    except (smtplib.SMTPConnectError, OSError) as exc:
        return False, f"Could not connect to SMTP server: {exc}"
    except Exception as exc:
        logger.warning("Test email failed: %s", exc)
        return False, f"Failed to send: {exc}"
