"""Single source of truth for interview question planning.

This service replaces unclear multi-source question generation with one clean plan:
- Q1 is always self introduction
- Remaining questions follow an 80/20 project-vs-HR split
- Project questions prioritize candidate projects, claimed skills, JD skills, and practical work
- HR questions use natural behavioral prompts
"""

from __future__ import annotations

import math
import re
from collections import OrderedDict
from collections.abc import Mapping

from services.resume_parser import parse_resume_text

INTRO_QUESTION = {
    "text": "Please introduce yourself briefly, including your background and the project or experience you are most proud of.",
    "type": "intro",
    "topic": "self_intro",
    "intent": "Understand the candidate's background, strongest project context, and communication style.",
    "focus_skill": None,
    "project_name": None,
    "reference_answer": "A strong answer briefly covers background, one meaningful project or experience, the candidate's contribution, and what they learned.",
    "difficulty": "easy",
}

HR_QUESTIONS = [
    "Tell me about a time you had to learn something quickly to finish a project or task.",
    "How do you handle deadlines when multiple things are pending at the same time?",
    "Describe a situation where you had a disagreement with a teammate. How did you handle it?",
    "What is one professional weakness you are actively trying to improve, and what are you doing about it?",
    "Tell me about a time a project did not go as planned. How did you respond?",
    "How do you adapt when requirements change in the middle of implementation?",
    "Describe a time you solved a difficult problem under pressure.",
    "How do you make sure you collaborate effectively in a team environment?",
]


def _clean(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _dedupe(values: list[str], limit: int | None = None) -> list[str]:
    seen = OrderedDict()
    for value in values:
        cleaned = _clean(value)
        key = cleaned.lower()
        if cleaned and key not in seen:
            seen[key] = cleaned
        if limit and len(seen) >= limit:
            break
    return list(seen.values())


def _extract_projects_from_parsed_resume(parsed_resume: Mapping[str, object]) -> list[str]:
    projects = parsed_resume.get("projects") if isinstance(parsed_resume, Mapping) else []
    if not isinstance(projects, list):
        return []
    return _dedupe([str(item) for item in projects], limit=8)


def _extract_skills(parsed_resume: Mapping[str, object], jd_skill_scores: Mapping[str, int] | None) -> list[str]:
    parsed_skills = parsed_resume.get("skills") if isinstance(parsed_resume, Mapping) else []
    parsed_list = [str(item) for item in parsed_skills] if isinstance(parsed_skills, list) else []
    jd_list = [str(skill) for skill in (jd_skill_scores or {}).keys()]
    return _dedupe(parsed_list + jd_list, limit=12)


def _project_question_from_project(project: str, jd_title: str | None, index: int) -> dict[str, object]:
    variants = [
        f"In your project '{project}', what was the main problem you were solving, and what exactly did you implement?",
        f"Walk me through the architecture or flow of your project '{project}'. What were the most important technical decisions?",
        f"What was the toughest technical issue you faced in '{project}', and how did you debug or solve it?",
        f"If you had to improve '{project}' for a real production environment, what would you change and why?",
    ]
    text = variants[index % len(variants)]
    return {
        "text": text,
        "type": "project",
        "topic": f"project:{project}",
        "intent": f"Assess practical implementation depth and decision-making for the candidate's project relevant to {jd_title or 'the role'}.",
        "focus_skill": None,
        "project_name": project,
        "reference_answer": "A strong answer explains the problem, the candidate's contribution, the technical decisions, and the real lessons learned.",
        "difficulty": "medium",
    }


def _project_question_from_skill(skill: str, jd_title: str | None, index: int) -> dict[str, object]:
    variants = [
        f"You mentioned using {skill}. Tell me about a real feature or task where you used it in practice.",
        f"What kind of debugging or implementation challenges did you face while working with {skill}?",
        f"How did {skill} influence your design or implementation choices in one of your projects?",
        f"For a {jd_title or 'relevant'} role, where do you think {skill} adds the most value in a real system?",
    ]
    text = variants[index % len(variants)]
    return {
        "text": text,
        "type": "project",
        "topic": f"skill:{skill}",
        "intent": f"Assess whether the candidate can connect {skill} to concrete implementation decisions.",
        "focus_skill": skill,
        "project_name": None,
        "reference_answer": "A strong answer connects the skill to a real implementation, a challenge faced, and a practical design choice.",
        "difficulty": "medium",
    }


def _fallback_project_question(jd_title: str | None, jd_skill_scores: Mapping[str, int] | None, index: int) -> dict[str, object]:
    jd_skills = _dedupe([str(skill) for skill in (jd_skill_scores or {}).keys()], limit=8)
    if jd_skills:
        skill = jd_skills[index % len(jd_skills)]
        return {
            "text": f"For a {jd_title or 'technical'} role, how would you approach implementing or debugging a feature that relies heavily on {skill}?",
            "type": "project",
            "topic": f"jd_skill:{skill}",
            "intent": f"Assess practical thinking around a JD-required skill: {skill}.",
            "focus_skill": skill,
            "project_name": None,
            "reference_answer": "A strong answer explains a practical implementation approach, likely edge cases, and how the candidate would validate the solution.",
            "difficulty": "medium",
        }
    generic = [
        "Tell me about a technical problem you solved recently and how you approached it.",
        "How do you usually break down a feature before starting implementation?",
        "When a bug is hard to reproduce, how do you investigate it step by step?",
        "How do you decide between a quick fix and a cleaner long-term solution?",
    ]
    return {
        "text": generic[index % len(generic)],
        "type": "project",
        "topic": "project:fallback",
        "intent": "Assess practical engineering thinking when resume/JD context is limited.",
        "focus_skill": None,
        "project_name": None,
        "reference_answer": "A strong answer uses a clear troubleshooting or design process and explains trade-offs.",
        "difficulty": "medium",
    }


def _hr_question(index: int) -> dict[str, object]:
    text = HR_QUESTIONS[index % len(HR_QUESTIONS)]
    return {
        "text": text,
        "type": "hr",
        "topic": "behavioral",
        "intent": "Assess teamwork, adaptability, communication, and professional maturity.",
        "focus_skill": None,
        "project_name": None,
        "reference_answer": "A strong answer uses a real situation, explains the candidate's action, and shows reflection or learning.",
        "difficulty": "medium",
    }


def build_question_plan(
    *,
    resume_text: str,
    jd_title: str | None,
    jd_skill_scores: Mapping[str, int] | None,
    question_count: int | None = None,
) -> dict[str, object]:
    total_questions = max(2, min(20, int(question_count or 8)))
    parsed_resume = parse_resume_text(resume_text or "")
    projects = _extract_projects_from_parsed_resume(parsed_resume)
    skills = _extract_skills(parsed_resume, jd_skill_scores)

    remaining = max(0, total_questions - 1)
    if remaining == 0:
        return {"questions": [INTRO_QUESTION], "meta": {"total_questions": 1, "project_count": 0, "hr_count": 0}}

    project_count = math.floor(remaining * 0.8)
    hr_count = remaining - project_count
    if total_questions >= 3 and hr_count == 0:
        hr_count = 1
        project_count = max(0, remaining - hr_count)
    if project_count == 0 and remaining > 0:
        project_count = max(1, remaining - hr_count)
        hr_count = max(0, remaining - project_count)

    questions: list[dict[str, object]] = [dict(INTRO_QUESTION)]

    project_questions: list[dict[str, object]] = []
    for index, project in enumerate(projects):
        if len(project_questions) >= project_count:
            break
        project_questions.append(_project_question_from_project(project, jd_title, index))

    skill_index = 0
    while len(project_questions) < project_count and skill_index < len(skills):
        project_questions.append(_project_question_from_skill(skills[skill_index], jd_title, skill_index))
        skill_index += 1

    fallback_index = 0
    while len(project_questions) < project_count:
        project_questions.append(_fallback_project_question(jd_title, jd_skill_scores, fallback_index))
        fallback_index += 1

    hr_questions = [_hr_question(index) for index in range(hr_count)]
    questions.extend(project_questions[:project_count])
    questions.extend(hr_questions[:hr_count])

    return {
        "questions": questions[:total_questions],
        # Compatibility fields kept at top level because existing practice/runtime
        # helpers still read them directly.
        "total_questions": total_questions,
        "project_count": project_count,
        "hr_count": hr_count,
        "project_questions_count": project_count,
        "theory_questions_count": hr_count,
        "intro_count": 1,
        "projects": projects,
        "meta": {
            "total_questions": total_questions,
            "project_count": project_count,
            "hr_count": hr_count,
            "project_questions_count": project_count,
            "theory_questions_count": hr_count,
            "intro_count": 1,
            "projects": projects,
        },
    }
