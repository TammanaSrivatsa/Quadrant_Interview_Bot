"""Structured resume parsing helpers for ATS views and scoring."""

from __future__ import annotations

import re
from collections import OrderedDict

from ai_engine.phase1.matching import extract_text_from_file
from ai_engine.phase1.scoring import SKILL_ALIASES

SECTION_HEADERS = (
    "summary",
    "experience",
    "education",
    "skills",
    "projects",
    "certifications",
)

EMAIL_RE = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.I)
PHONE_RE = re.compile(r"(?:\+?\d[\d\s().-]{7,}\d)")


def _clean(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _split_lines(text: str) -> list[str]:
    return [_clean(line) for line in (text or "").splitlines() if _clean(line)]


def _detect_name(lines: list[str], email: str | None) -> str | None:
    for line in lines[:6]:
        if email and email.lower() in line.lower():
            continue
        if len(line.split()) in {2, 3, 4} and not re.search(r"\d", line):
            return line.title()
    return None


def _parse_sections(lines: list[str]) -> dict[str, list[str]]:
    sections: dict[str, list[str]] = {key: [] for key in SECTION_HEADERS}
    current = "summary"
    for line in lines:
        lowered = line.lower().strip(":")
        if lowered in SECTION_HEADERS:
            current = lowered
            continue
        sections.setdefault(current, []).append(line)
    return sections


def _extract_skills(text: str) -> list[str]:
    detected: list[str] = []
    lowered = (text or "").lower()
    for canonical, aliases in SKILL_ALIASES.items():
        if any(re.search(rf"(?<!\w){re.escape(alias.lower())}(?!\w)", lowered) for alias in aliases):
            detected.append(canonical)
    return sorted(OrderedDict.fromkeys(detected))


def _bullets(lines: list[str], max_items: int = 6) -> list[str]:
    items: list[str] = []
    for line in lines:
        bullet = re.sub(r"^[\-\*•\d\.)\(\s]+", "", line).strip()
        if bullet:
            items.append(bullet)
        if len(items) >= max_items:
            break
    return items


def parse_resume_text(text: str) -> dict[str, object]:
    raw_text = text or ""
    lines = _split_lines(raw_text)
    email_match = EMAIL_RE.search(raw_text)
    phone_match = PHONE_RE.search(raw_text)
    sections = _parse_sections(lines)
    summary_lines = sections.get("summary") or lines[:4]

    return {
        "full_name": _detect_name(lines, email_match.group(0) if email_match else None),
        "email": email_match.group(0) if email_match else None,
        "phone": _clean(phone_match.group(0)) if phone_match else None,
        "summary": " ".join(summary_lines[:3]).strip() or None,
        "skills": _extract_skills(raw_text),
        "education": _bullets(sections.get("education") or [], max_items=5),
        "projects": _bullets(sections.get("projects") or [], max_items=6),
        "experience": _bullets(sections.get("experience") or [], max_items=8),
        "certifications": _bullets(sections.get("certifications") or [], max_items=5),
        "raw_text_available": bool(raw_text.strip()),
    }


def parse_resume_file(file_path: str) -> tuple[str, dict[str, object]]:
    text = extract_text_from_file(file_path)
    return text, parse_resume_text(text)
