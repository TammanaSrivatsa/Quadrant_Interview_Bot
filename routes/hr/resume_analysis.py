"""Resume Analysis routes for the HR dashboard."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy.orm import Session

from database import get_db
from routes.dependencies import SessionUser, require_role
from services.resume_analysis import get_candidate_detail, list_ranked_resumes, upload_resumes

router = APIRouter(prefix="/hr/resume-analysis", tags=["hr-resume-analysis"])


@router.get("/{jd_id}/candidates")
def resume_analysis_candidates(
    jd_id: int,
    search: str = "",
    sort: str = Query("score", pattern="^(score|experience|skills|education)$"),
    min_score: float | None = Query(default=None, ge=0, le=100),
    current_user: SessionUser = Depends(require_role("hr")),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    _ = current_user
    return {"ok": True, **list_ranked_resumes(db=db, jd_id=jd_id, search=search, sort=sort, min_score=min_score)}


@router.post("/{jd_id}/resumes")
def upload_resume_analysis_files(
    jd_id: int,
    resumes: list[UploadFile] = File(...),
    current_user: SessionUser = Depends(require_role("hr")),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    return {"ok": True, **upload_resumes(db=db, files=resumes, jd_id=jd_id, user_id=current_user.user_id)}


@router.get("/candidates/{candidate_uid}")
def resume_analysis_candidate_detail(
    candidate_uid: str,
    jd_id: int | None = None,
    current_user: SessionUser = Depends(require_role("hr")),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    _ = current_user
    return {"ok": True, "candidate": get_candidate_detail(db, candidate_uid, jd_id)}
