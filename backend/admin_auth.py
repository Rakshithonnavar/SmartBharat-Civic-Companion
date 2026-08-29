"""
Admin authentication for Smart Bharat's admin dashboard.

Design decisions (read before changing anything here):

1. NO OPEN PUBLIC SIGNUP. The admin dashboard exposes every citizen's
   name, contact, and complaint text — an unauthenticated or
   self-service-open signup would let anyone grant themselves access
   to that data. Instead:
     - The FIRST admin account is created via a one-time "bootstrap"
       signup that's only reachable while zero admins exist in the
       database (see `is_bootstrap_available`).
     - Every admin account after that can only be created by an
       already-authenticated admin (invite-style) — never by an
       anonymous caller.
   This is the standard pattern for internal admin tools (it's how
   Django admin works too: no public signup, ever).

2. Passwords are hashed with bcrypt (cost factor 12) — a slow,
   purpose-built password hash, never a fast general-purpose hash like
   SHA-256. Never logged, never stored in plaintext, never returned in
   any API response.

3. Sessions are stateless JWTs (HS256), sent as `Authorization: Bearer
   <token>` and verified on every protected request — no server-side
   session store needed. Trade-off, stated plainly: a stolen token
   stays valid until it expires (default 12h) since there's no
   revocation list. For this app's threat model (a handful of trusted
   municipal-officer accounts, not a bank), short-lived tokens + rate
   limiting + bcrypt is the right amount of complexity. A refresh-token
   + revocation-list scheme would add real value at a larger org's
   scale, and is a reasonable next step, not something skipped by
   oversight.

4. Login attempts are rate-limited per email (in-memory, same pattern
   as the existing AI-response cache and email rate limiter elsewhere
   in this codebase — correct for Render's single-worker free-tier
   deployment, and documented as such rather than silently assumed).
"""

import logging
import os
import re
import time
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

import bcrypt
import jwt
from fastapi import Header, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field, field_validator

logger = logging.getLogger("civicmate.admin_auth")

# ---------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------
JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "").strip()
if not JWT_SECRET_KEY:
    raise RuntimeError(
        "JWT_SECRET_KEY missing in backend/.env — required for admin auth. "
        "Generate one with: python3 -c \"import secrets; print(secrets.token_hex(32))\""
    )
if len(JWT_SECRET_KEY) < 32:
    # A short/weak secret makes HS256 tokens forgeable — fail loudly
    # rather than silently run an insecure admin login.
    raise RuntimeError(
        "JWT_SECRET_KEY is too short (must be at least 32 characters) — "
        "generate one with: python3 -c \"import secrets; print(secrets.token_hex(32))\""
    )

JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = int(os.environ.get("JWT_EXPIRY_HOURS", "12"))

_BCRYPT_ROUNDS = 12
_MIN_PASSWORD_LENGTH = 8

# A precomputed, valid bcrypt hash of an unguessable value that no real
# password will ever equal. Used as the comparison target when a login
# email doesn't exist, so `verify_password` still does real bcrypt work
# either way — otherwise a "does this email exist" check that
# short-circuits before hashing would leak account existence via
# response timing (a fast rejection = unknown email, a slow one = wrong
# password for a real account).
_DUMMY_HASH = bcrypt.hashpw(b"smart-bharat-dummy-hash-never-matches", bcrypt.gensalt(rounds=_BCRYPT_ROUNDS)).decode("utf-8")

_LOGIN_MAX_ATTEMPTS = 5
_LOGIN_WINDOW_SECONDS = 15 * 60  # 15 minutes

_EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")


# ---------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------
class AdminSignup(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: str
    password: str = Field(min_length=_MIN_PASSWORD_LENGTH, max_length=128)

    @field_validator("email")
    @classmethod
    def _validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if len(v) > 254 or not _EMAIL_RE.match(v):
            raise ValueError("Enter a valid email address")
        return v

    @field_validator("password")
    @classmethod
    def _check_password_strength(cls, v: str) -> str:
        # Minimum bar beyond just length — catches the most common weak
        # passwords without being so strict it frustrates legitimate
        # municipal-officer users setting up an account quickly.
        if v.isdigit() or v.isalpha():
            raise ValueError("Password must contain a mix of letters and numbers")
        return v


class AdminLogin(BaseModel):
    email: str
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def _validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if len(v) > 254 or not _EMAIL_RE.match(v):
            raise ValueError("Enter a valid email address")
        return v


class AdminPublic(BaseModel):
    """Admin fields safe to return in an API response — never includes
    password_hash."""

    id: str
    name: str
    email: str
    created_at: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_hours: int
    admin: AdminPublic


# ---------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=_BCRYPT_ROUNDS)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        # Malformed hash in the DB — never let this crash the login
        # endpoint or leak details; just treat as a failed match.
        return False


# ---------------------------------------------------------------------
# JWT issuance / verification
# ---------------------------------------------------------------------
def create_access_token(admin_id: str, email: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": admin_id,
        "email": email,
        "iat": now,
        "exp": now + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Raises HTTPException(401) on any invalid/expired/malformed token —
    callers don't need their own try/except."""
    try:
        return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired — please log in again")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid authentication token")


# ---------------------------------------------------------------------
# Login rate limiting (in-memory — single-worker deployment, see
# module docstring point 4)
# ---------------------------------------------------------------------
_login_attempts: Dict[str, List[float]] = {}


def _prune_old_attempts(timestamps: List[float], now: float) -> List[float]:
    cutoff = now - _LOGIN_WINDOW_SECONDS
    return [t for t in timestamps if t > cutoff]


def is_login_rate_limited(email: str) -> Tuple[bool, int]:
    """Returns (limited, seconds_until_retry)."""
    now = time.time()
    attempts = _prune_old_attempts(_login_attempts.get(email, []), now)
    _login_attempts[email] = attempts
    if len(attempts) >= _LOGIN_MAX_ATTEMPTS:
        oldest = min(attempts)
        retry_after = int(oldest + _LOGIN_WINDOW_SECONDS - now)
        return True, max(retry_after, 1)
    return False, 0


def record_failed_login(email: str) -> None:
    now = time.time()
    attempts = _prune_old_attempts(_login_attempts.get(email, []), now)
    attempts.append(now)
    _login_attempts[email] = attempts


def clear_login_attempts(email: str) -> None:
    _login_attempts.pop(email, None)


# ---------------------------------------------------------------------
# DB-backed helpers (each takes `db` explicitly — no module-level DB
# handle here, consistent with this module having no import-time
# dependency on server.py's Motor client)
# ---------------------------------------------------------------------
async def ensure_indexes(db: AsyncIOMotorDatabase) -> None:
    """Unique index on admins.email — the real, race-proof guarantee
    against duplicate accounts (an application-level "does this email
    exist" check alone has a TOCTOU race under concurrent signups).
    Idempotent — safe to call on every startup."""
    await db.admins.create_index("email", unique=True)


async def is_bootstrap_available(db: AsyncIOMotorDatabase) -> bool:
    """True only when there are zero admin accounts — the narrow
    window in which unauthenticated signup is allowed at all."""
    count = await db.admins.count_documents({}, limit=1)
    return count == 0


async def get_admin_by_email(db: AsyncIOMotorDatabase, email: str) -> Optional[dict]:
    return await db.admins.find_one({"email": email.strip().lower()})


async def get_admin_by_id(db: AsyncIOMotorDatabase, admin_id: str) -> Optional[dict]:
    return await db.admins.find_one({"id": admin_id})


def to_public(admin_doc: dict) -> AdminPublic:
    return AdminPublic(
        id=admin_doc["id"],
        name=admin_doc["name"],
        email=admin_doc["email"],
        created_at=admin_doc["created_at"],
    )


# ---------------------------------------------------------------------
# FastAPI dependency — attach with Depends(get_current_admin) on any
# route that needs an authenticated admin.
# ---------------------------------------------------------------------
def make_get_current_admin(db: AsyncIOMotorDatabase):
    """Factory so this dependency can close over the app's actual `db`
    handle without a module-level import-time dependency on server.py."""

    async def get_current_admin(authorization: Optional[str] = Header(default=None)) -> dict:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")
        token = authorization[len("Bearer "):].strip()
        if not token:
            raise HTTPException(status_code=401, detail="Missing bearer token")

        payload = decode_access_token(token)
        admin_id = payload.get("sub")
        if not admin_id:
            raise HTTPException(status_code=401, detail="Invalid authentication token")

        admin = await get_admin_by_id(db, admin_id)
        if not admin:
            # Token is well-formed but the account no longer exists
            # (e.g. deleted) — treat exactly like any other invalid token.
            raise HTTPException(status_code=401, detail="Invalid authentication token")

        return admin

    return get_current_admin
