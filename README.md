# AI Interview Platform

End-to-end AI-assisted interview workflow with a FastAPI backend, a React 19 + Vite frontend, and a provider-based LLM layer for resume screening, question generation, live interviews, HR review, and reporting.

## Overview

- Session-cookie authentication for candidate and HR users
- HR-managed job descriptions with per-role cutoffs, skill weights, question counts, and final-score weights
- Resume upload, text extraction, resume parsing, and deterministic resume scoring with explainable breakdowns
- LLM-first question generation with deterministic fallbacks
- Timed live interview flow with webcam proctoring and speech-to-text transcription
- Post-interview evaluation, HR finalization, PDF export, candidate comparison, and local backup utilities

## Current Stack

### Backend

- FastAPI
- SQLAlchemy ORM
- Pydantic request validation
- Starlette `SessionMiddleware`
- SQLite or PostgreSQL via `DATABASE_URL`

### Frontend

- React 19
- Vite
- Axios
- Tailwind CSS
- Lucide React
- Recharts

### AI and Runtime Services

- Provider-based LLM client in `services/llm/client.py`
  - Supported providers: `openai`, `gemini`, `groq`, `cerebras`, `ollama`
- Speech-to-text helper in `utils/stt_whisper.py`
  - Supports OpenAI Whisper, Groq Whisper, and Gemini fallback
- Resume semantic matching in `ai_engine/phase1/matching.py`
  - Attempts `sentence-transformers` + `scikit-learn`
  - Falls back to lightweight keyword overlap when optional semantic dependencies are unavailable
- OpenCV-based proctoring in `utils/proctoring_cv.py`

## Repo Layout

- `main.py` - FastAPI entrypoint, middleware setup, startup migrations, static mounts
- `models.py` - SQLAlchemy models for candidates, HR users, jobs, results, sessions, answers, proctoring, and feedback
- `database.py` - engine and session wiring
- `routes/api_routes.py` - aggregates all API routers under `/api`
- `routes/auth/sessions.py` - auth, profile, password reset, preferences, avatar upload, health routes
- `routes/candidate/workflow.py` - candidate dashboard, JD selection, resume upload, skill match, interview scheduling, practice kit
- `routes/hr/management.py` - JD CRUD, candidate listing, stage updates, comparisons, dashboard analytics, exports
- `routes/hr/interview_review.py` - interview list, interview detail, HR finalization, re-evaluation, PDF report
- `routes/interview/runtime.py` - interview access, session start, answers, transcription, proctoring events
- `routes/interview/evaluation.py` - post-interview evaluation pipeline
- `ai_engine/phase1/` - resume matching and scoring
- `ai_engine/phase2/` - question planning and question generation helpers
- `ai_engine/phase3/` - runtime question flow and timing logic
- `services/` - scoring, practice, resume advice, dashboard aggregation, exports, PDF generation, LLM helpers
- `interview-frontend/` - React frontend

## Core Data Flow

1. HR creates or uploads a JD and sets skill weights, cutoffs, and question settings.
2. Candidate selects a JD and uploads a resume.
3. Backend extracts resume text, computes a resume scorecard, and stores the explanation.
4. A question bundle is generated and attached to the application result.
5. Shortlisted candidates schedule interviews and access the pre-check and live interview flow.
6. Answers are captured, transcribed, scored, and summarized.
7. HR reviews the session, finalizes the decision, and can export a PDF report.

## Scoring Model

### Phase 1: Resume Scorecard

Implemented in `ai_engine/phase1/scoring.py`.

- Weighted skill score: 50%
- Semantic score: 15%
- Experience score: 15%
- Education score: 10%
- Academic cutoff score: 5%
- Resume quality score: 5%

Resume screening bands:

- `strong_shortlist` - score >= 80
- `review_shortlist` - score >= 65 and < 80
- `reject` - score < 65

### Per-Answer Scorecard

Implemented in `ai_engine/phase1/scoring.py`.

- Relevance: 40%
- Completeness: 25%
- Clarity: 20%
- Time fit: 15%

### Final Application Score

Implemented in `services/scoring.py`.

Default weights:

- Resume: 35%
- Skills match: 25%
- Interview performance: 25%
- Communication: 15%

Default recommendation bands:

- `Strong Hire` - score >= 80
- `Hire` - score >= 65 and < 80
- `Weak` - score >= 50 and < 65
- `Reject` - score < 50

Per-JD custom weights are supported through `score_weights_json`.

## Environment Variables

`DATABASE_URL` is required. The backend will not start without it.

Example local `.env`:

```env
# Security
SECRET_KEY=replace_with_a_long_random_secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=120
ENV=development

# Database
DATABASE_URL=sqlite:///./app.db

# LLM provider runtime
LLM_PROVIDER=openai
LLM_API_KEY=your_provider_api_key
LLM_MODEL_PRIMARY=gpt-4o-mini
LLM_MODEL_FALLBACK=gpt-4o-mini
LLM_BASE_URL=

# Optional provider-specific settings
OLLAMA_CHAT_URL=http://localhost:11434/api/chat
OLLAMA_MODEL=qwen2.5-coder:3b
GROQ_API_KEY=
GEMINI_API_KEY=
OPENAI_API_KEY=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback

# Email
EMAIL_ADDRESS=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587

# Frontend and CORS
FRONTEND_URL=http://localhost:5173
VITE_API_BASE_URL=http://127.0.0.1:8000/api
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Proctoring and storage
PROCTOR_PAUSE_ENABLED=false
LAMBDA_S3_URL=
S3_PROCTOR_PREFIX=proctoring
S3_REPORT_PREFIX=reports
```

Notes:

- `LLM_PROVIDER` controls question generation and evaluation provider selection.
- The transcription helper can use `OPENAI_API_KEY`, `GROQ_API_KEY`, or `GEMINI_API_KEY`.
- `FRONTEND_URL` is used when generating interview entry links and reset-password links.
- `PROCTOR_PAUSE_ENABLED=true` enables enforced pauses after repeated warnings.

## Quick Start

### Backend

```bash
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```

Health check:

- `http://127.0.0.1:8000/health`

### Frontend

```bash
cd interview-frontend
npm install
npm run dev
```

Frontend URL:

- `http://localhost:5173`

### Optional Semantic Mode Dependencies

The repo currently degrades gracefully if semantic dependencies are missing. To enable semantic matching and the preferred PDF extractor path, install:

```bash
pip install sentence-transformers scikit-learn pymupdf
```

## API Highlights

All application routers are mounted under `/api`.

### Auth and Profile

- `GET /api/health`
- `GET /api/health/groq`
- `GET /api/health/llm`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PUT /api/auth/profile`
- `POST /api/auth/change-password`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/preferences`
- `POST /api/auth/preferences`
- `POST /api/auth/avatar`

### Candidate

- `GET /api/candidate/dashboard`
- `GET /api/candidate/jds`
- `POST /api/candidate/select-jd`
- `GET /api/candidate/skill-match/{job_id}`
- `POST /api/candidate/upload-resume`
- `POST /api/candidate/upload-resume-s3`
- `POST /api/candidate/select-interview-date`
- `GET /api/candidate/practice-kit`

### HR and JD Management

- `GET /api/hr/dashboard`
- `GET /api/hr/dashboard/calendar`
- `GET /api/hr/candidates`
- `GET /api/hr/candidates/ranked`
- `GET /api/hr/applications`
- `GET /api/hr/candidates/{candidate_uid}`
- `POST /api/hr/candidates/batch-details`
- `POST /api/hr/candidates/compare`
- `GET /api/hr/candidates/{candidate_uid}/skill-gap`
- `POST /api/hr/results/{result_id}/notes`
- `POST /api/hr/results/{result_id}/stage`
- `POST /api/hr/upload-jd`
- `POST /api/hr/confirm-jd`
- `POST /api/hr/update-skill-weights`
- `GET /api/hr/local-backup`
- `GET /api/hr/interviews/{session_id}/export-pdf`

JD configuration routes:

- `POST /api/hr/jds`
- `GET /api/hr/jds`
- `GET /api/hr/jds/{jd_id}`
- `PUT /api/hr/jds/{jd_id}`
- `POST /api/hr/jds/{jd_id}/toggle-active`
- `DELETE /api/hr/jds/{jd_id}`

### Interview Runtime and Review

- `GET /api/interview/{result_id}/access`
- `POST /api/interview/start`
- `POST /api/interview/answer`
- `POST /api/interview/transcribe`
- `GET /api/interview/session/{session_id}/summary`
- `POST /api/interview/{session_id}/evaluate`
- `POST /api/proctor/frame`
- `POST /api/interview/{token}/event`
- `POST /api/interview/{session_id}/event`
- `POST /api/interview/{session_id}/feedback`
- `GET /api/hr/proctoring/{session_id}`
- `GET /api/hr/interviews`
- `GET /api/hr/interviews/{interview_id}`
- `POST /api/hr/interviews/{interview_id}/finalize`
- `POST /api/hr/interviews/{interview_id}/re-evaluate`
- `POST /api/hr/interviews/{interview_id}/send-feedback`
- `GET /api/hr/interviews/{session_id}/report`

## Interview Access Rules

Interview access is derived from `routes/common.py`:

- Candidate must be shortlisted
- Candidate must have an `interview_date`
- Existing in-progress sessions can resume
- Completed, selected, or rejected sessions are locked from restart

Interview entry links are generated from `FRONTEND_URL`:

- Hash-route deployments such as Vercel or CloudFront use `/#/interview/{result_id}`
- Other deployments use `/interview/{result_id}`

## Operational Notes

- `main.py` performs startup table creation plus lightweight backfill migrations for a few newer columns and tables.
- Uploaded files are stored locally under `uploads/` unless you wire in external storage.
- Resume text is persisted in the database and is treated as the source of truth for later analysis.
- LLM question generation and answer evaluation both include fallback paths so interview flow can still complete during provider failures.
- Proctoring analysis stores flagged events and can optionally pause sessions when `PROCTOR_PAUSE_ENABLED=true`.

## Known Caveats

- The `/api/health/llm` route currently has explicit deep checks for `ollama` and `groq`; other configured providers return an unsupported-status payload.
- Local uploads are ephemeral on platforms that do not provide persistent disk storage.
- Semantic resume matching depends on optional libraries that are not pinned in `requirements.txt` yet.
- PDF extraction prefers PyMuPDF when available and falls back to PyPDF2.

## Recommended Submission Positioning

If you are showing this project in a report or viva:

- Describe it as a provider-based AI interview platform, not as a single-provider product.
- State clearly which provider and model were used for the version you actually ran.
- Separate implemented features from planned enhancements.
- Keep architecture, routes, scoring weights, and environment variables aligned with this README and the codebase.
