"""Helpers for applying HR-mandated questions to runtime question banks."""

from __future__ import annotations

from typing import Any

from ai_engine.phase3.question_flow import normalize_result_questions


def normalize_custom_question_texts(raw_questions: object, *, limit: int = 50) -> list[str]:
    """Return clean, de-duplicated HR custom question text."""
    if not isinstance(raw_questions, list):
        return []

    cleaned: list[str] = []
    seen: set[str] = set()
    for item in raw_questions:
        text = str(item or "").strip()
        if not text:
            continue
        key = text.lower()
        if key in seen:
            continue
        seen.add(key)
        cleaned.append(text)
        if len(cleaned) >= limit:
            break
    return cleaned


def apply_custom_questions_to_bank(
    questions: object,
    custom_questions: object,
) -> tuple[list[dict[str, Any]], bool]:
    """Replace the mandatory-question section with the current JD custom questions."""
    normalized_bank = normalize_result_questions(questions)
    custom_texts = normalize_custom_question_texts(custom_questions)
    custom_keys = {text.lower() for text in custom_texts}

    retained: list[dict[str, Any]] = []
    for item in normalized_bank:
        category = str(item.get("category") or "").strip().lower()
        question_type = str(item.get("type") or "").strip().lower()
        text = str(item.get("text") or "").strip()
        if category == "mandatory" or question_type == "mandatory":
            continue
        if text and text.lower() in custom_keys:
            continue
        retained.append(item)

    mandatory_items = [
        {
            "text": text,
            "difficulty": "medium",
            "topic": "mandatory",
            "type": "mandatory",
            "category": "mandatory",
            "intent": "Ask the HR-mandated JD-specific question exactly as configured.",
            "focus_skill": None,
            "project_name": None,
            "reference_answer": None,
            "priority_source": "hr_custom",
            "metadata": {
                "category": "mandatory",
                "priority_source": "hr_custom",
                "skill_or_topic": text,
            },
        }
        for text in custom_texts
    ]

    merged = mandatory_items + retained
    changed = merged != normalized_bank
    return merged, changed
