"""Central ATS scoring and ranking helpers.

This module keeps the practical weighted scoring model in one place so resume,
interview, ranking, analytics, and HR detail pages all use the same numbers.
"""

from __future__ import annotations

from statistics import mean

from ai_engine.phase1.scoring import _clamp_score, compute_answer_scorecard

STAGE_ORDER = {
    "applied": 1,
    "screening": 2,
    "shortlisted": 3,
    "interview_scheduled": 4,
    "interview_completed": 5,
    "selected": 6,
    "rejected": 0,
}


def recommendation_for_score(final_score: float) -> str:
    if final_score >= 80:
        return "Strong Hire"
    if final_score >= 65:
        return "Hire"
    if final_score >= 50:
        return "Weak"
    return "Reject"


# 1) What this does: evaluates one answer into HR-readable structured feedback.
# 2) Why needed: HR interview review needs more than a raw single score.
# 3) How it works: reuses local answer scoring and reshapes it into ATS-friendly dimensions.
def evaluate_answer(question: str, answer: str, *, allotted_seconds: int = 0, time_taken_seconds: int = 0, jd_skills=()):
    scorecard = compute_answer_scorecard(
        question,
        answer,
        allotted_seconds=allotted_seconds,
        time_taken_seconds=time_taken_seconds,
        jd_skills=jd_skills,
    )
    answer_text = (answer or "").strip()
    strengths: list[str] = []
    weaknesses: list[str] = []
    suggestions: list[str] = []

    if scorecard["relevance"] >= 70:
        strengths.append("Answer stayed relevant to the question.")
    else:
        weaknesses.append("Answer drifted away from the original question.")
        suggestions.append("Start by addressing the exact question directly.")

    if scorecard["completeness"] >= 70:
        strengths.append("Response included useful depth and substance.")
    else:
        weaknesses.append("Response lacked enough depth or examples.")
        suggestions.append("Add a concrete example, action, and outcome.")

    if scorecard["clarity"] >= 70:
        strengths.append("Explanation was clear and reasonably structured.")
    else:
        weaknesses.append("Explanation could be clearer and more structured.")
        suggestions.append("Use a simple structure: context, action, result.")

    confidence_score = _clamp_score((scorecard["clarity"] * 0.6) + (scorecard["time_fit"] * 0.4))
    technical_correctness = _clamp_score((scorecard["relevance"] * 0.7) + (scorecard["completeness"] * 0.3))
    overall_score = _clamp_score(
        (scorecard["relevance"] * 0.25)
        + (technical_correctness * 0.30)
        + (scorecard["clarity"] * 0.20)
        + (confidence_score * 0.15)
        + (scorecard["completeness"] * 0.10)
    )

    return {
        "relevance": scorecard["relevance"],
        "technical_correctness": technical_correctness,
        "clarity": scorecard["clarity"],
        "confidence_communication": confidence_score,
        "completeness": scorecard["completeness"],
        "overall_answer_score": overall_score,
        "strengths": strengths[:3],
        "weaknesses": weaknesses[:3],
        "improvement_suggestion": suggestions[0] if suggestions else "Keep using concrete examples and outcomes.",
        "score_breakdown": scorecard,
        "answer_present": bool(answer_text),
    }


# 1) What this does: builds a final weighted ATS score for one application.
# 2) Why needed: ranking should not depend on scattered score fields.
# 3) How it works: combines resume, skill, interview, and communication signals into one stable score.
def build_application_score(*, resume_score=0.0, skills_match_score=0.0, interview_score=0.0, communication_score=0.0):
    final_score = _clamp_score(
        (float(resume_score or 0.0) * 0.35)
        + (float(skills_match_score or 0.0) * 0.25)
        + (float(interview_score or 0.0) * 0.25)
        + (float(communication_score or 0.0) * 0.15)
    )
    return {
        "resume_jd_match_score": _clamp_score(resume_score),
        "skills_match_score": _clamp_score(skills_match_score),
        "interview_performance_score": _clamp_score(interview_score),
        "communication_behavior_score": _clamp_score(communication_score),
        "final_weighted_score": final_score,
        "recommendation": recommendation_for_score(final_score),
    }


def summarize_interview(answer_evaluations: list[dict[str, object]]):
    if not answer_evaluations:
        return {
            "overall_interview_score": 0.0,
            "communication_score": 0.0,
            "strengths_summary": [],
            "weaknesses_summary": ["No valid answers were captured."],
            "hiring_recommendation": "Reject",
        }

    interview_score = mean(float(item.get("overall_answer_score") or 0.0) for item in answer_evaluations)
    communication_score = mean(float(item.get("confidence_communication") or 0.0) for item in answer_evaluations)
    strengths = []
    weaknesses = []
    for item in answer_evaluations:
        strengths.extend(item.get("strengths") or [])
        weaknesses.extend(item.get("weaknesses") or [])

    return {
        "overall_interview_score": _clamp_score(interview_score),
        "communication_score": _clamp_score(communication_score),
        "strengths_summary": list(dict.fromkeys(strengths))[:5],
        "weaknesses_summary": list(dict.fromkeys(weaknesses))[:5],
        "hiring_recommendation": recommendation_for_score(interview_score),
    }
