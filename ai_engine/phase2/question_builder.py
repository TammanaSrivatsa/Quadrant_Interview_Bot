"""Interview question generation — LLM-powered with deterministic fallback."""

from __future__ import annotations

import json
import logging
import re
from collections.abc import Mapping

logger = logging.getLogger(__name__)

SELF_INTRO_QUESTION = (
    "Please start with a brief introduction — your name, your background, "
    "and the one project or achievement you're most proud of."
)

PROJECT_QUESTIONS = [
    "Walk me through {project} from start to finish — what problem were you solving, "
    "how did you design it, and what role did {skill} play in that?",
    "What was the hardest technical challenge you faced while building {project}? "
    "Be specific about the {skill} decisions you made.",
    "Tell me about a real bug or failure you encountered in {project}. "
    "How did you find the root cause and what did you change?",
    "How did you test and validate the quality of {project}? "
    "What would you do differently now knowing what you know about {skill}?",
    "If you had to scale {project} to 10x the current load, "
    "what would break first and how would you fix it?",
    "What trade-offs did you make while building {project} — speed vs quality, "
    "simple vs flexible — and looking back, were they the right calls?",
    "Describe the deployment and release process for {project}. "
    "How did you handle rollbacks or hotfixes?",
    "How did {project} use {skill} specifically — "
    "and what alternatives did you consider before choosing that approach?",
]

HR_QUESTIONS = [
    "Tell me about a time you disagreed with a technical decision your team made. "
    "How did you handle it and what was the outcome?",
    "Describe a situation where you had to learn something completely new under a tight deadline. "
    "How did you approach it?",
    "Give me an example of a time you received critical feedback on your work. "
    "How did you respond and what did you change?",
    "Tell me about a project where things did not go as planned. "
    "What went wrong and what did you learn from it?",
    "Describe a time you had to work with someone whose style was very different from yours. "
    "How did you make it work?",
    "What does your ideal work environment look like, "
    "and how do you handle situations when things are unclear or ambiguous?",
    "Tell me about a time you went beyond your assigned scope to help a teammate or improve something. "
    "What drove you to do that?",
    "Where do you see yourself in two to three years, "
    "and how does this role fit into that picture?",
]

_SECTION_WORDS = {
    "experience", "education", "skills", "summary", "certifications",
    "achievements", "references", "objective", "profile", "projects",
    "project", "workshops", "workshop", "personal", "technical",
    "professional", "career", "academic", "qualifications",
    "responsibilities", "tools", "frameworks", "languages",
    "hobbies", "interests", "awards", "publications", "volunteer",
}

_ACTION_VERBS = {
    "developed", "built", "implemented", "created", "designed", "worked",
    "collaborated", "led", "managed", "maintained", "optimized", "improved",
    "tested", "debugged", "enhanced", "integrated", "deployed", "supported",
    "contributed", "delivered", "performed", "conducted", "analyzed",
    "resolved", "participated", "assisted", "responsible", "handled",
    "configured", "setup", "wrote", "reviewed", "provided", "used",
    "utilized", "applied", "ensured", "identified", "troubleshot",
}


def _normalize(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9+.# ]", " ", value or "")
    return re.sub(r"\s+", " ", cleaned).strip().lower()


def _clean_line(value: str) -> str:
    line = re.sub(r"^[\-\*\u2022\d\.\)\(]+\s*", "", (value or "").strip())
    return re.sub(r"\s+", " ", line).strip()


def _is_section_heading(line: str) -> bool:
    value = (line or "").strip()
    if not value or len(value) > 50:
        return False
    if value.lower().strip() in _SECTION_WORDS:
        return True
    if re.fullmatch(r"[A-Z][A-Z\s/&\-]+", value) and len(value) < 40:
        return True
    return False


def _starts_with_action_verb(line: str) -> bool:
    first_word = (line or "").strip().split()[0].lower().rstrip(".,;") if line.strip() else ""
    return first_word in _ACTION_VERBS


def _is_valid_project_title(title: str) -> bool:
    title = title.strip()
    if not title or len(title) < 3:
        return False
    if len(title) > 80:
        return False
    words = title.split()
    if len(words) > 8:
        return False
    if _starts_with_action_verb(title):
        return False
    if _is_section_heading(title):
        return False
    if title.lower().strip() in _SECTION_WORDS:
        return False
    return True


def _split_tech(raw: str) -> list[str]:
    values: list[str] = []
    for chunk in re.split(r"[,/|;]", raw or ""):
        skill = _normalize(chunk)
        if skill and skill not in values:
            values.append(skill)
    return values


def _extract_inline_tech(line: str, known_skills: set[str]) -> list[str]:
    lower = (line or "").lower()
    match = re.search(
        r"(tech(?:nolog(?:ies|y))?|stack|tools|built with|using)\s*[:\-]\s*(.+)$", lower
    )
    if match:
        values = _split_tech(match.group(2))
        if values:
            return values[:6]
    return [s for s in known_skills if s and re.search(rf"\b{re.escape(s)}\b", lower)][:6]


def extract_projects_from_resume(
    resume_text: str,
    *,
    known_skills: Mapping[str, int] | None = None,
    max_projects: int = 6,
) -> list[dict[str, object]]:
    text = resume_text or ""
    known_skill_set = {_normalize(s) for s in (known_skills or {}).keys() if _normalize(s)}
    lines = [_clean_line(ln) for ln in text.splitlines() if _clean_line(ln)]

    projects: list[dict[str, object]] = []
    seen: set[str] = set()

    # Strategy 1: Lines inside a PROJECTS section heading
    in_projects_section = False
    for i, line in enumerate(lines):
        lowered = line.lower().strip()
        if re.match(r"^projects?\s*$", lowered, re.IGNORECASE):
            in_projects_section = True
            continue
        if in_projects_section and _is_section_heading(line) and not re.match(r"^projects?\s*$", lowered, re.IGNORECASE):
            in_projects_section = False
            continue
        if not in_projects_section:
            continue
        if _starts_with_action_verb(line):
            continue
        if re.match(r"^(technologies|tech stack|tools|built with|stack)\s*[:\-]", line, re.IGNORECASE):
            continue
        if len(line) > 80:
            continue
        if _is_valid_project_title(line):
            key = line.lower()
            if key not in seen:
                seen.add(key)
                tech_stack = _extract_inline_tech(line, known_skill_set)
                for j in range(i + 1, min(i + 4, len(lines))):
                    nl = lines[j].lower()
                    if re.match(r"(technologies|tech|stack|tools|built with|using)\s*[:\-]", nl):
                        tech_stack = _split_tech(re.split(r"[:\-]", nl, 1)[1])[:8]
                        break
                    if _is_section_heading(lines[j]):
                        break
                projects.append({"title": line, "tech_stack": tech_stack, "summary": line})
                if len(projects) >= max_projects:
                    break

    # Strategy 2: Short capitalized standalone lines if no projects found yet
    if not projects:
        for line in lines:
            words = line.split()
            if 1 <= len(words) <= 5 and _is_valid_project_title(line):
                has_tech = any(s in line.lower() for s in known_skill_set)
                if has_tech or (words[0][0].isupper() and not _starts_with_action_verb(line)):
                    key = line.lower()
                    if key not in seen:
                        seen.add(key)
                        projects.append({
                            "title": line,
                            "tech_stack": _extract_inline_tech(line, known_skill_set),
                            "summary": line,
                        })
                        if len(projects) >= max_projects:
                            break

    # Fallback: generic placeholder
    if not projects:
        top_skills = [s for s, _ in sorted((known_skills or {}).items(), key=lambda x: -x[1])][:3]
        return [{"title": "your main project", "tech_stack": top_skills, "summary": "primary project"}]

    return projects


def _weighted_counts(weights: Mapping[str, float], total: int) -> dict[str, int]:
    if total <= 0:
        return {}
    normalized = {s: max(0.0, float(w)) for s, w in weights.items() if _normalize(s)}
    if not normalized:
        return {}
    total_weight = sum(normalized.values())
    if total_weight <= 0:
        base = max(1, total // len(normalized))
        allocation = {s: base for s in normalized}
        remainder = total - sum(allocation.values())
        for s in sorted(normalized)[:remainder]:
            allocation[s] += 1
        return allocation
    raw = {s: (w / total_weight) * total for s, w in normalized.items()}
    allocation = {s: int(v) for s, v in raw.items()}
    remainder = total - sum(allocation.values())
    ranked = sorted(normalized, key=lambda s: (raw[s] - int(raw[s]), normalized[s], s), reverse=True)
    for i in range(remainder):
        allocation[ranked[i % len(ranked)]] += 1
    return {s: c for s, c in allocation.items() if c > 0}


def _expand_skills(weighted_counts: Mapping[str, int]) -> list[str]:
    expanded: list[str] = []
    for skill, count in sorted(weighted_counts.items(), key=lambda x: (-x[1], x[0])):
        expanded.extend([skill] * max(0, int(count)))
    return expanded


def _build_llm_prompt(*, resume_text, jd_title, jd_skill_scores, projects,
                      question_count, project_count, hr_count) -> str:
    top_skills = sorted((jd_skill_scores or {}).items(), key=lambda x: -x[1])
    skills_str = ", ".join(f"{s} (weight {w}/10)" for s, w in top_skills[:10]) or "general technical skills"

    valid_projects = [p for p in projects if p["title"] != "your main project"]
    if valid_projects:
        projects_str = "\n".join(
            f"- {p['title']}" + (f" (stack: {', '.join(p['tech_stack'][:4])})" if p.get("tech_stack") else "")
            for p in valid_projects[:4]
        )
    else:
        projects_str = "No specifically named projects — base questions on their stated work experience."

    resume_snippet = re.sub(r"\s+", " ", (resume_text or "").strip())[:1200]

    return f"""You are a senior technical interviewer. Generate exactly {question_count} interview questions for a candidate applying for: **{jd_title or 'Software Developer'}**

CANDIDATE RESUME (first 1200 chars):
{resume_snippet}

REQUIRED JD SKILLS:
{skills_str}

CANDIDATE PROJECTS:
{projects_str}

GENERATE {question_count} QUESTIONS:
- Q1: Warm-up self-introduction (type: intro, difficulty: easy)
- Q2 to Q{1 + project_count}: {project_count} technical questions. Each must reference a specific project or work experience from the resume and probe a JD skill. Ask about real implementation, challenges, architecture, or debugging. Write as a direct question — do NOT start with "In ".
- Q{2 + project_count} to Q{question_count}: {hr_count} behavioural/HR questions (conflict, learning, feedback, teamwork, career goals).

Return ONLY a valid JSON array. No markdown. Each element:
{{"text": "question string ending with ?", "difficulty": "easy|medium|hard", "topic": "project:skill or hr:behavioural or intro:self_introduction", "type": "intro|project|hr"}}"""


def _call_llm_for_questions(*, resume_text, jd_title, jd_skill_scores, projects,
                             question_count, project_count, hr_count):
    try:
        import os
        from groq import Groq
        api_key = os.getenv("GROQ_API_KEY", "")
        if not api_key:
            return None
        client = Groq(api_key=api_key)
        model = os.getenv("GROQ_LLM_MODEL", "llama-3.1-8b-instant")
        prompt = _build_llm_prompt(
            resume_text=resume_text, jd_title=jd_title, jd_skill_scores=jd_skill_scores,
            projects=projects, question_count=question_count,
            project_count=project_count, hr_count=hr_count,
        )
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.65,
            max_tokens=2500,
        )
        raw = (response.choices[0].message.content or "").strip()
        raw = re.sub(r"```(?:json)?", "", raw).strip().strip("`").strip()
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        if match:
            raw = match.group(0)
        data = json.loads(raw)
        if not isinstance(data, list):
            return None
        questions = []
        for item in data:
            if not isinstance(item, dict):
                continue
            text = str(item.get("text") or "").strip()
            if not text or len(text) < 10:
                continue
            if not text.endswith(("?", ".", "!")):
                text += "?"
            questions.append({
                "text": text,
                "difficulty": str(item.get("difficulty") or "medium"),
                "topic": str(item.get("topic") or "general"),
                "type": str(item.get("type") or "project"),
            })
        if len(questions) < question_count:
            logger.warning("LLM returned %d/%d questions — falling back.", len(questions), question_count)
            return None
        logger.info("LLM generated %d questions for: %s", len(questions), jd_title)
        return questions[:question_count]
    except Exception as exc:
        logger.warning("LLM question generation failed (%s) — using fallback.", exc)
        return None


def _build_fallback_questions(*, projects, skill_pool, project_count, hr_count, total, jd_title=None):
    questions = []
    used: set[str] = set()

    questions.append({"text": SELF_INTRO_QUESTION, "difficulty": "easy",
                      "topic": "intro:self_introduction", "type": "intro"})
    used.add(SELF_INTRO_QUESTION.lower())

    for i in range(project_count):
        project = projects[i % len(projects)]
        skill = skill_pool[i % len(skill_pool)] if skill_pool else "your core stack"
        p_title = project["title"]
        if p_title == "your main project":
            p_title = f"your {jd_title or 'main'} project"
        template = PROJECT_QUESTIONS[i % len(PROJECT_QUESTIONS)]
        text = template.format(project=p_title, skill=skill)
        if text.lower() in used:
            for t in PROJECT_QUESTIONS:
                c = t.format(project=p_title, skill=skill)
                if c.lower() not in used:
                    text = c
                    break
        used.add(text.lower())
        questions.append({"text": text, "difficulty": "hard" if i % 3 == 2 else "medium",
                          "topic": f"project:{skill}", "type": "project"})

    hr_pool = list(HR_QUESTIONS)
    for i in range(hr_count):
        text = hr_pool[i % len(hr_pool)]
        if text.lower() in used:
            for q in hr_pool:
                if q.lower() not in used:
                    text = q
                    break
        used.add(text.lower())
        questions.append({"text": text, "difficulty": "medium",
                          "topic": "hr:behavioural", "type": "hr"})

    return questions[:total]


def build_question_bundle(
    *,
    resume_text: str,
    jd_title: str | None,
    jd_skill_scores: Mapping[str, int] | None,
    question_count: int = 8,
    project_ratio: float = 0.80,
) -> dict[str, object]:
    total = max(4, min(50, int(question_count or 8)))
    remaining = total - 1
    ratio = max(0.0, min(1.0, float(project_ratio or 0.8)))
    min_hr = 2 if remaining >= 5 else 1
    project_count = max(1, round(remaining * ratio))
    hr_count = max(min_hr, remaining - project_count)
    while project_count + hr_count + 1 > total:
        hr_count = max(1, hr_count - 1)

    projects = extract_projects_from_resume(resume_text, known_skills=jd_skill_scores)

    skill_weights = {
        _normalize(s): max(0.0, float(w))
        for s, w in (jd_skill_scores or {}).items() if _normalize(s)
    }
    weighted_meta = _weighted_counts(skill_weights, project_count)

    llm_questions = _call_llm_for_questions(
        resume_text=resume_text, jd_title=jd_title, jd_skill_scores=jd_skill_scores,
        projects=projects, question_count=total,
        project_count=project_count, hr_count=hr_count,
    )

    if llm_questions:
        questions = llm_questions
        generated_by = "llm"
    else:
        skill_pool = _expand_skills(weighted_meta) or ["your core stack"] * project_count
        questions = _build_fallback_questions(
            projects=projects, skill_pool=skill_pool,
            project_count=project_count, hr_count=hr_count,
            total=total, jd_title=jd_title,
        )
        generated_by = "fallback"

    return {
        "questions": questions[:total],
        "total_questions": total,
        "project_questions_count": project_count,
        "theory_questions_count": hr_count,
        "projects": projects,
        "theory_weight_distribution": {},
        "project_weight_distribution": weighted_meta,
        "generated_by": generated_by,
    }


def build_interview_question_bank(
    *,
    resume_text: str,
    jd_title: str | None,
    jd_skill_scores: Mapping[str, int] | None,
    question_count: int = 8,
    project_ratio: float = 0.80,
) -> list[dict[str, str]]:
    bundle = build_question_bundle(
        resume_text=resume_text, jd_title=jd_title,
        jd_skill_scores=jd_skill_scores,
        question_count=question_count, project_ratio=project_ratio,
    )
    return list(bundle["questions"])
