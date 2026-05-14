"""HR resume analysis service built on the existing Candidate/Result models."""

from __future__ import annotations

import shutil
import uuid
from collections import Counter
from pathlib import Path
from typing import Iterable

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session, joinedload

from ai_engine.phase1.matching import extract_text_from_file
from models import Candidate, JobDescription, Result
from routes.common import UPLOAD_DIR, ensure_candidate_profile, evaluate_resume_for_job, upsert_result
from services.resume_parser import parse_resume_text

ALLOWED_RESUME_EXTENSIONS = {".pdf", ".docx", ".doc"}
MAX_RESUME_SIZE_MB = 10


def _safe_file_name(filename: str | None) -> str:
    clean = Path(filename or "resume").name
    return clean.replace("\x00", "").strip() or "resume"


def _candidate_name(parsed: dict[str, object], fallback: str) -> str:
    name = str(parsed.get("full_name") or "").strip()
    if name:
        return name[:100]
    stem = Path(fallback).stem.replace("_", " ").replace("-", " ").strip()
    return (stem.title() or "Resume Candidate")[:100]


def _candidate_email(parsed: dict[str, object], file_id: str) -> str:
    email = str(parsed.get("email") or "").strip().lower()
    if email:
        return email[:120]
    return f"resume-{file_id[:12]}@resume-analysis.local"


def _load_jd_or_404(db: Session, jd_id: int) -> JobDescription:
    jd = db.query(JobDescription).filter(JobDescription.id == jd_id).first()
    if not jd:
        raise HTTPException(status_code=404, detail="JD not found")
    return jd


def save_and_analyze_resume(
    *,
    db: Session,
    file: UploadFile,
    jd_id: int,
    user_id: int | None,
) -> dict[str, object]:
    jd = _load_jd_or_404(db, jd_id)
    filename = _safe_file_name(file.filename)
    extension = Path(filename).suffix.lower()
    if extension not in ALLOWED_RESUME_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"{filename}: only PDF, DOC, and DOCX resumes are supported")

    file.file.seek(0, 2)
    size_bytes = file.file.tell()
    file.file.seek(0)
    if size_bytes <= 0:
        raise HTTPException(status_code=400, detail=f"{filename}: empty files cannot be analyzed")
    if size_bytes > MAX_RESUME_SIZE_MB * 1_000_000:
        raise HTTPException(status_code=400, detail=f"{filename}: resume exceeds {MAX_RESUME_SIZE_MB}MB")

    file_id = uuid.uuid4().hex
    target = UPLOAD_DIR / f"resume_analysis_{user_id or 'hr'}_{file_id}_{filename}"
    with target.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    resume_text = extract_text_from_file(str(target))
    parsed = parse_resume_text(resume_text)
    email = _candidate_email(parsed, file_id)
    candidate = db.query(Candidate).filter(Candidate.email == email).first()
    if not candidate:
        candidate = Candidate(email=email, name=_candidate_name(parsed, filename), gender="Not specified")
        db.add(candidate)
        db.flush()

    candidate.name = _candidate_name(parsed, filename)
    candidate.resume_path = str(target)
    candidate.resume_text = resume_text
    candidate.parsed_resume_json = parsed
    candidate.selected_jd_id = jd.id
    ensure_candidate_profile(candidate, db)
    db.commit()
    db.refresh(candidate)

    score, explanation, questions = evaluate_resume_for_job(candidate, jd)
    result = upsert_result(
        db,
        candidate.id,
        jd.id,
        score,
        explanation,
        questions,
        cutoff_score=float(jd.qualify_score if jd.qualify_score is not None else 65.0),
        job=jd,
    )
    return serialize_analysis_candidate(candidate, result, jd)


def upload_resumes(
    *,
    db: Session,
    files: Iterable[UploadFile],
    jd_id: int,
    user_id: int | None,
) -> dict[str, object]:
    analyzed: list[dict[str, object]] = []
    errors: list[dict[str, str]] = []
    for file in files:
        try:
            analyzed.append(save_and_analyze_resume(db=db, file=file, jd_id=jd_id, user_id=user_id))
        except HTTPException as exc:
            errors.append({"file": file.filename or "resume", "error": str(exc.detail)})
        except Exception as exc:
            errors.append({"file": file.filename or "resume", "error": f"Unable to analyze resume: {exc}"})
    return {"uploaded": analyzed, "errors": errors, "summary": build_resume_analysis_summary(db, jd_id)}


def serialize_analysis_candidate(candidate: Candidate, result: Result | None, jd: JobDescription | None = None) -> dict[str, object]:
    parsed = candidate.parsed_resume_json or {}
    explanation = (result.explanation if result else {}) or {}
    score = float(result.score if result and result.score is not None else explanation.get("final_resume_score") or 0)
    matched = explanation.get("matched_skills") or []
    missing = explanation.get("missing_skills") or []
    experience_years = explanation.get("detected_experience_years", explanation.get("total_experience_detected", 0))
    total_skills = len(matched) + len(missing)
    recommendation = result.recommendation if result else None
    if not recommendation:
        recommendation = "Select" if score >= 75 else "Shortlist" if score >= 45 else "Weak"

    return {
        "candidate_uid": candidate.candidate_uid,
        "candidate_id": candidate.id,
        "result_id": result.id if result else None,
        "name": parsed.get("full_name") or candidate.name or "Candidate",
        "email": parsed.get("email") or candidate.email,
        "phone": parsed.get("phone"),
        "resume_path": candidate.resume_path,
        "resume_filename": Path(candidate.resume_path or "").name,
        "summary": parsed.get("summary"),
        "skills": parsed.get("skills") or [],
        "experience": parsed.get("experience") or [],
        "experience_years": int(experience_years or 0),
        "education": parsed.get("education") or [],
        "certifications": parsed.get("certifications") or [],
        "projects": parsed.get("projects") or [],
        "score": round(score, 2),
        "match_percentage": round(float(explanation.get("matched_percentage") or 0), 2),
        "skill_match": round(float(explanation.get("weighted_skill_score") or explanation.get("skill_score") or 0), 2),
        "experience_match": round(float(explanation.get("experience_score") or 0), 2),
        "education_match": round(float(explanation.get("education_score") or 0), 2),
        "matched_skills": matched,
        "missing_skills": missing,
        "total_required_skills": total_skills,
        "strengths": matched[:6] or (parsed.get("skills") or [])[:6],
        "weaknesses": missing[:6] or [reason for reason in explanation.get("reasons", []) if "missing" in str(reason).lower()][:3],
        "recommendation": recommendation,
        "reasons": explanation.get("reasons") or [],
        "job": {"id": jd.id, "title": jd.title or jd.jd_title} if jd else None,
    }


def list_ranked_resumes(
    *,
    db: Session,
    jd_id: int,
    search: str = "",
    sort: str = "score",
    min_score: float | None = None,
) -> dict[str, object]:
    jd = _load_jd_or_404(db, jd_id)
    query = (
        db.query(Result)
        .options(joinedload(Result.candidate), joinedload(Result.job))
        .filter(Result.job_id == jd_id)
    )
    rows = [row for row in query.all() if row.candidate]
    candidates = [serialize_analysis_candidate(row.candidate, row, jd) for row in rows]

    q = search.strip().lower()
    if q:
        candidates = [
            item for item in candidates
            if q in str(item.get("name") or "").lower()
            or q in str(item.get("email") or "").lower()
            or any(q in str(skill).lower() for skill in item.get("skills") or [])
        ]
    if min_score is not None:
        candidates = [item for item in candidates if float(item.get("score") or 0) >= float(min_score)]

    sorters = {
        "score": lambda item: float(item.get("score") or 0),
        "experience": lambda item: float(item.get("experience_years") or 0),
        "skills": lambda item: len(item.get("matched_skills") or []),
        "education": lambda item: float(item.get("education_match") or 0),
    }
    candidates.sort(key=sorters.get(sort, sorters["score"]), reverse=True)
    for index, item in enumerate(candidates, start=1):
        item["rank"] = index

    return {"jd": serialize_jd(jd), "candidates": candidates, "summary": build_resume_analysis_summary(db, jd_id)}


def build_resume_analysis_summary(db: Session, jd_id: int) -> dict[str, object]:
    jd = _load_jd_or_404(db, jd_id)
    rows = (
        db.query(Result)
        .options(joinedload(Result.candidate))
        .filter(Result.job_id == jd_id)
        .all()
    )
    items = [serialize_analysis_candidate(row.candidate, row, jd) for row in rows if row.candidate]
    total = len(items)
    avg_score = round(sum(float(item["score"]) for item in items) / total, 2) if total else 0
    skill_counts = Counter(skill for item in items for skill in (item.get("skills") or []))
    experience_distribution = Counter(
        "0 yrs" if int(item.get("experience_years") or 0) == 0
        else "1-2 yrs" if int(item.get("experience_years") or 0) <= 2
        else "3-5 yrs" if int(item.get("experience_years") or 0) <= 5
        else "5+ yrs"
        for item in items
    )
    score_distribution = Counter(
        "75-100" if float(item.get("score") or 0) >= 75
        else "45-74" if float(item.get("score") or 0) >= 45
        else "0-44"
        for item in items
    )
    return {
        "total_resumes": total,
        "average_score": avg_score,
        "top_candidates": sorted(items, key=lambda item: float(item["score"]), reverse=True)[:3],
        "skills_distribution": [{"name": key, "value": value} for key, value in skill_counts.most_common(8)],
        "experience_distribution": [{"name": key, "value": value} for key, value in experience_distribution.items()],
        "score_distribution": [{"name": key, "value": value} for key, value in score_distribution.items()],
    }


def get_candidate_detail(db: Session, candidate_uid: str, jd_id: int | None = None) -> dict[str, object]:
    candidate = db.query(Candidate).filter(Candidate.candidate_uid == candidate_uid).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    query = db.query(Result).filter(Result.candidate_id == candidate.id)
    if jd_id:
        query = query.filter(Result.job_id == jd_id)
    result = query.order_by(Result.id.desc()).first()
    jd = result.job if result else None
    return serialize_analysis_candidate(candidate, result, jd)


def serialize_jd(jd: JobDescription) -> dict[str, object]:
    skills = jd.weights_json or jd.skill_scores or {}
    return {
        "id": jd.id,
        "title": jd.title or jd.jd_title or "Untitled Role",
        "qualify_score": float(jd.qualify_score if jd.qualify_score is not None else 65.0),
        "experience_requirement": int(jd.experience_requirement or 0),
        "education_requirement": jd.education_requirement,
        "skills": list(skills.keys()) if isinstance(skills, dict) else [],
        "weights_json": skills,
        "is_active": bool(jd.is_active),
    }
