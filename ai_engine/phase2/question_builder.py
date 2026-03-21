"""Compatibility wrapper for the interview question planner.

REPLACE status:
- Old builder logic is intentionally replaced.
- This module remains as a compatibility import target so existing callers do not break.
- Single source of truth now lives in services/question_plan.py.
"""

from __future__ import annotations

import re
from collections.abc import Mapping

from services.question_plan import build_question_plan


def extract_projects_from_resume(
    resume_text: str,
    known_skills: dict[str, object] | None = None,
) -> list[str]:
    """Best-effort project extraction kept for backward compatibility.

    known_skills is accepted for compatibility with older callers, even if it
    is not strictly required by the new planner.
    """
    _ = known_skills

    if not resume_text:
        return []

    lines = [line.strip("•-* \t") for line in resume_text.splitlines()]
    projects: list[str] = []

    section_markers = {
        "project",
        "projects",
        "personal projects",
        "academic projects",
        "technical projects",
    }

    in_project_section = False

    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            continue

        lower = line.lower().rstrip(":")

        if lower in section_markers:
            in_project_section = True
            continue

        if in_project_section:
            if any(
                stop_word in lower
                for stop_word in (
                    "education",
                    "skills",
                    "certification",
                    "experience",
                    "achievements",
                    "summary",
                )
            ):
                in_project_section = False
                continue

            if len(line) > 3:
                projects.append(line)

    if not projects:
        for line in lines:
            lower = line.lower()
            if any(
                keyword in lower
                for keyword in (
                    "system",
                    "portal",
                    "app",
                    "application",
                    "dashboard",
                    "bot",
                    "platform",
                    "website",
                    "project",
                    "tool",
                )
            ):
                if len(line) > 3:
                    projects.append(line)

    seen = set()
    unique_projects: list[str] = []
    for project in projects:
        key = project.lower()
        if key not in seen:
            seen.add(key)
            unique_projects.append(project)

    return unique_projects


def build_questions(
    resume_text: str,
    jd_title: str | None,
    jd_skill_scores: Mapping[str, int] | None,
    question_count: int | None = None,
    project_ratio: float | None = None,
) -> dict[str, object]:
    """Compatibility wrapper for older callers."""
    _ = project_ratio
    return build_question_plan(
        resume_text=resume_text,
        jd_title=jd_title,
        jd_skill_scores=jd_skill_scores or {},
        question_count=question_count,
    )


def build_question_bundle(
    resume_text: str,
    jd_title: str | None,
    jd_skill_scores: Mapping[str, int] | None,
    question_count: int | None = None,
    project_ratio: float | None = None,
) -> dict[str, object]:
    """Backward-compatible alias expected by older imports."""
    return build_questions(
        resume_text=resume_text,
        jd_title=jd_title,
        jd_skill_scores=jd_skill_scores,
        question_count=question_count,
        project_ratio=project_ratio,
    )