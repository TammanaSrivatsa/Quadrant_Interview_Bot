"""
main.py — FastAPI application entrypoint for Interview Bot backend.

FIXES applied:
  1. ensure_schema() migrates all new columns added to models.py
     (hr_decision, hr_final_score, hr_behavioral_score, hr_communication_score,
      hr_notes, hr_red_flags on results; llm_eval_status on interview_sessions;
      education_requirement + experience_requirement on job_descriptions)
  2. @app.on_event("startup") pre-loads the SentenceTransformer model so the
     first resume upload does not have a 10-second cold-start delay.
  3. GROQ_API_KEY is checked at startup — a clear warning is printed if it is
     missing so engineers catch it immediately instead of seeing 500 errors
     during interviews.
"""
from __future__ import annotations
from dotenv import load_dotenv
load_dotenv(override=True)
import logging
import os
import threading
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from starlette.middleware.sessions import SessionMiddleware

from database import SessionLocal, engine
from models import Base, Candidate
from routes.api_routes import api_router
from routes.common import ensure_candidate_profile



logger = logging.getLogger(__name__)

app = FastAPI(title="Interview Bot API", version="1.0.0")

# Keep startup table creation for local/dev environments.
Base.metadata.create_all(bind=engine)


# ── LLM provider startup checks ─────────────────────────────────────────────

# Dynamically handle LLM provider and model
_llm_provider = (os.getenv("LLM_PROVIDER") or "cohere").strip().lower()
_llm_model = (os.getenv("LLM_STANDARD_MODEL") or "command-r").strip()

if _llm_provider == "groq":
    _groq_key = os.getenv("GROQ_API_KEY", "")
    logger.info("LLM provider is groq with model=%s", _llm_model)
    if not _groq_key:
        logger.warning(
            "GROQ_API_KEY is not set. "
            "Voice transcription and LLM answer scoring may be unavailable. "
            "Set GROQ_API_KEY in .env when using LLM_PROVIDER=groq."
        )
elif _llm_provider == "ollama":
    logger.info("LLM provider is ollama with model=%s", _llm_model)
elif _llm_provider == "cohere":
    _cohere_key = os.getenv("COHERE_API_KEY", "")
    logger.info("LLM provider is cohere with model=%s", _llm_model)
    if not _cohere_key:
        logger.warning(
            "COHERE_API_KEY is not set. "
            "LLM answer generation may be unavailable. "
            "Set COHERE_API_KEY in .env when using LLM_PROVIDER=cohere."
        )
else:
    logger.warning("Unknown LLM_PROVIDER=%s. Expected one of: ollama, groq, cohere", _llm_provider)


# ── FIX: Pre-load SentenceTransformer on startup ────────────────────────────
# Without this the first resume upload triggers a ~10s model load during the
# request, causing a timeout-like experience for the candidate.
@app.on_event("startup")
async def _preload_ml_model() -> None:
    """Warm up the SentenceTransformer model without blocking backend startup."""
    def _load_model() -> None:
        try:
            from ai_engine.phase1.matching import _get_model, SEMANTIC_SEARCH_ENABLED
            if not SEMANTIC_SEARCH_ENABLED:
                logger.info("Lite Mode: Skipping SentenceTransformer preload.")
                return
            _get_model()
            logger.info("✅  SentenceTransformer model loaded and ready.")
        except Exception as exc:
            logger.warning("SentenceTransformer preload failed (non-fatal): %s", exc)

    threading.Thread(target=_load_model, name="st-model-preload", daemon=True).start()


# ── Environment & Production Safety ──────────────────────────────────────────
IS_PROD = os.getenv("ENV", "development").strip().lower() == "production"
logger.info(f"STARTUP: mode={'PRODUCTION' if IS_PROD else 'DEVELOPMENT'}")

_secret_key = os.getenv("SECRET_KEY")
if not _secret_key:
    if IS_PROD:
        raise RuntimeError("SECRET_KEY MUST be set in production via environment variables.")
    else:
        logger.warning("SECRET_KEY not set. Using insecure default for local development.")
        _secret_key = "dev-secret-key-12345"

app.add_middleware(
    SessionMiddleware,
    secret_key=_secret_key,
    same_site="none",
    https_only=True,
    session_cookie="interview_bot_sid",
)

# ── CORS Configuration ───────────────────────────────────────────────────────
# In production, ONLY allow your Vercel URL. In dev, allow localhost.
DEFAULT_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"
raw_origins = os.getenv("CORS_ORIGINS", DEFAULT_ORIGINS)
allow_origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

uploads_dir = Path("uploads")
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")
# NOTE: Mount the aggregate API router exactly once. Double-registration creates
# duplicate/conflicting route entries and can surface as incorrect 404/405 behavior.
app.include_router(api_router)


# NOTE: Lightweight health endpoints for local startup verification.
@app.get("/")
def root() -> dict[str, str]:
    return {"ok": "true", "service": "interview-bot-api"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
