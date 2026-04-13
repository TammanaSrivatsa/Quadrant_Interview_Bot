import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables once at startup
load_dotenv()

class Config:
    # Security
    SECRET_KEY = os.getenv("SECRET_KEY", "2e7c1b7e8a9f4c2d8b1a6e5f3c4d7a8b9e0f1c2b3a4d5e6f7b8c9d0e1f2a3b4c")
    ALGORITHM = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))

    # Google OAuth
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
    GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback")

    # Communication (Email)
    EMAIL_ADDRESS = os.getenv("EMAIL_ADDRESS")
    EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
    SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))

    # LLM Provider Configuration
    # Supported providers: openai, gemini, groq, cerebras, ollama
    LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai").strip().lower()
    LLM_BASE_URL = os.getenv("LLM_BASE_URL", "").strip()
    LLM_API_KEY = os.getenv("LLM_API_KEY", "").strip()
    LLM_MODEL_PRIMARY = os.getenv("LLM_MODEL_PRIMARY", "").strip()
    LLM_MODEL_FALLBACK = os.getenv("LLM_MODEL_FALLBACK", "").strip()
    
    # Specific Health Check / Provider settings
    OLLAMA_CHAT_URL = os.getenv("OLLAMA_CHAT_URL", "http://localhost:11434/api/chat").strip()
    OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5-coder:3b").strip()
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()

    # Environment and CORS
    ENV = os.getenv("ENV", "development").strip().lower()
    DEFAULT_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173,https://dfuwgnqei5yls.cloudfront.net"
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", DEFAULT_ORIGINS)

    # Database
    DATABASE_URL = os.getenv("DATABASE_URL")

    # Frontend Integration
    # Standardizing cleanup of URLs (fixing potential typos like 'https ://')
    raw_frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").strip()
    FRONTEND_URL = raw_frontend_url.replace(" ", "") if "https" in raw_frontend_url else raw_frontend_url

    # ElevenLabs TTS Configuration (disabled - using browser TTS fallback)
    # ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "").strip()

    # Supabase
    SUPABASE_URL = os.getenv("SUPABASE_URL", "https://qgrslwklddrutxpnkgpy.supabase.co")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY", "sb_publishable_XZKe_FBZHOtuJJQdMU23WA_NcdkNZSb")

    # Paths
    BASE_DIR = Path(__file__).resolve().parent.parent
    UPLOAD_DIR = BASE_DIR / "uploads"

# Instantiate for global use
config = Config()
