from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.question_customization import apply_custom_questions_to_bank


def test_apply_custom_questions_replaces_old_mandatory_questions():
    existing = [
        {"text": "Old mandatory question?", "category": "mandatory", "type": "mandatory"},
        {"text": "Walk me through your project.", "category": "project", "type": "project"},
    ]

    merged, changed = apply_custom_questions_to_bank(existing, ["New mandatory question?"])

    assert changed is True
    assert [item["text"] for item in merged] == [
        "New mandatory question?",
        "Walk me through your project.",
    ]


def test_apply_custom_questions_removes_mandatory_when_cleared():
    existing = [
        {"text": "Old mandatory question?", "category": "mandatory", "type": "mandatory"},
        {"text": "Walk me through your project.", "category": "project", "type": "project"},
    ]

    merged, changed = apply_custom_questions_to_bank(existing, [])

    assert changed is True
    assert [item["text"] for item in merged] == ["Walk me through your project."]
