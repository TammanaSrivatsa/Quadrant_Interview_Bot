"""HR dashboard aggregation helpers."""

from __future__ import annotations

from collections import Counter
from datetime import datetime

from sqlalchemy.orm import Session, joinedload

from models import JobDescription, Result
from services.pipeline import normalize_stage, stage_payload


def latest_session(result: Result | None):
    if not result or not result.sessions:
        return None
    return max(result.sessions, key=lambda item: (item.started_at or datetime.min, item.id or 0))


def status_key(result: Result | None, latest_session_row) -> str:
    if not result:
        return "applied"
    stage = normalize_stage(result.stage)
    if latest_session_row:
        session_status = (latest_session_row.status or "").strip().lower()
        if session_status in {"selected", "rejected"}:
            return session_status
        if latest_session_row.ended_at or session_status == "completed":
            return "interview_completed"
        if result.interview_date:
            return "interview_scheduled"
    return stage


def status_payload(result: Result | None, latest_session_row) -> dict[str, str]:
    return stage_payload(status_key(result, latest_session_row))


def build_hr_dashboard_analytics(
    db: Session,
    *,
    hr_id: int,
    selected_job_id: int | None = None,
) -> dict[str, object]:
    jobs = (
        db.query(JobDescription)
        .filter(JobDescription.company_id == hr_id)
        .order_by(JobDescription.id.desc())
        .all()
    )
    results = (
        db.query(Result)
        .join(JobDescription, Result.job_id == JobDescription.id)
        .options(joinedload(Result.sessions), joinedload(Result.candidate))
        .filter(JobDescription.company_id == hr_id)
        .order_by(Result.id.desc())
        .all()
    )

    selected_results = [result for result in results if not selected_job_id or result.job_id == selected_job_id]
    pipeline_counter: Counter[str] = Counter()
    missing_counter: Counter[str] = Counter()
    matched_counter: Counter[str] = Counter()
    score_values: list[float] = []
    candidate_ids: set[int] = set()
    shortlisted_count = 0

    for result in selected_results:
        latest = latest_session(result)
        pipeline_counter[status_key(result, latest)] += 1
        if result.candidate_id is not None:
            candidate_ids.add(int(result.candidate_id))
        if result.shortlisted:
            shortlisted_count += 1
        if result.score is not None:
            score_values.append(float(result.score))
        explanation = result.explanation or {}
        for skill in explanation.get("missing_skills") or []:
            key = str(skill or "").strip().lower()
            if key:
                missing_counter[key] += 1
        for skill in explanation.get("matched_skills") or []:
            key = str(skill or "").strip().lower()
            if key:
                matched_counter[key] += 1

    completed = pipeline_counter.get("interview_completed", 0)
    scheduled = pipeline_counter.get("interview_scheduled", 0)
    total_results = len(selected_results)
    avg_score = round(sum(score_values) / len(score_values), 2) if score_values else 0.0
    avg_resume_score = round(
        sum(float((result.explanation or {}).get("final_resume_score") or result.score or 0) for result in selected_results) / total_results,
        2,
    ) if total_results else 0.0
    shortlist_rate = round((shortlisted_count / total_results) * 100, 2) if total_results else 0.0
    completion_rate = round((completed / (completed + scheduled)) * 100, 2) if (completed + scheduled) else 0.0
    selection_rate = round((pipeline_counter.get("selected", 0) / total_results) * 100, 2) if total_results else 0.0
    top_ranked = sorted(selected_results, key=lambda item: float(item.final_score or item.score or 0), reverse=True)[:5]

    return {
        "overview": {
            "total_jobs": len(jobs),
            "total_applications": total_results,
            "active_candidates": len(candidate_ids),
            "total_candidates": len(candidate_ids),
            "completed_interviews": completed,
            "shortlisted_count": pipeline_counter.get("shortlisted", 0),
            "rejected_count": pipeline_counter.get("rejected", 0),
            "avg_resume_score": avg_resume_score,
            "avg_interview_score": avg_score,
            "shortlist_rate": shortlist_rate,
            "selection_rate": selection_rate,
            "interview_completion_rate": completion_rate,
        },
        "pipeline": [
            {
                **stage_payload(key),
                "count": pipeline_counter.get(key, 0),
            }
            for key in ("applied", "screening", "shortlisted", "interview_scheduled", "interview_completed", "selected", "rejected")
        ],
        "top_missing_skills": [{"skill": skill, "count": count} for skill, count in missing_counter.most_common(5)],
        "top_matched_skills": [{"skill": skill, "count": count} for skill, count in matched_counter.most_common(5)],
        "top_ranked_candidates": [
            {
                "result_id": row.id,
                "application_id": row.application_id,
                "candidate_uid": row.candidate.candidate_uid if row.candidate else None,
                "candidate_name": row.candidate.name if row.candidate else None,
                "final_score": float(row.final_score or row.score or 0),
                "recommendation": row.recommendation,
            }
            for row in top_ranked
        ],
        "stage_wise_candidate_count": dict(pipeline_counter),
    }
