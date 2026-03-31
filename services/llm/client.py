"""LLM client helpers used strictly by .env configuration."""
from __future__ import annotations

import json
import logging
import os
import re
from functools import lru_cache
from types import SimpleNamespace
from typing import Any

import requests
from dotenv import load_dotenv

load_dotenv(override=True)

logger = logging.getLogger(__name__)

def _clean_json(raw: str) -> str:
    return re.sub(r"```(?:json)?", "", raw or "").strip().strip("`")

@lru_cache(maxsize=1)
def _resolve_llm_config() -> dict[str, Any]:
    """Single source of truth for LLM configuration from .env only."""
    provider = (os.getenv("LLM_PROVIDER") or "gemini").strip().lower()
    
    # Generic model names from .env
    standard_model = os.getenv("LLM_STANDARD_MODEL", "").strip()
    premium_model = os.getenv("LLM_PREMIUM_MODEL", "").strip()
    
    # Provider specific defaults if not in .env
    if not standard_model:
        if provider == "gemini": standard_model = "gemini-1.5-flash"
        elif provider == "groq": standard_model = "llama-3.1-8b-instant"
        elif provider == "cohere": standard_model = "command-r"
        elif provider == "ollama": standard_model = os.getenv("OLLAMA_MODEL", "qwen2.5-coder:3b")

    if not premium_model:
        if provider == "gemini": premium_model = "gemini-1.5-pro"
        elif provider == "groq": premium_model = "llama-3.3-70b-versatile"
        elif provider == "cohere": premium_model = "command-r-plus"
        elif provider == "ollama": premium_model = standard_model

    # Keys from .env only
    config = {
        "provider": provider,
        "standard_model": standard_model,
        "premium_model": premium_model,
        "gemini_api_key": os.getenv("GEMINI_API_KEY", "").strip(),
        "groq_api_key": os.getenv("GROQ_API_KEY", "").strip(),
        "cohere_api_key": os.getenv("COHERE_API_KEY", "").strip(),
        "ollama_url": os.getenv("OLLAMA_CHAT_URL", "http://localhost:11434/api/chat").strip(),
    }
    return config

class _CohereAdapter:
    def __init__(self, model: str, api_key: str):
        self.model = model
        self.api_key = api_key
        self.url = "https://api.cohere.ai/v1/chat"

    def create(self, messages: list[dict[str, Any]], temperature: float, max_tokens: int, **kwargs):
        model = kwargs.get("model") or self.model
        prompt = "\n".join([f"{m['role']}: {m['content']}" for m in messages])
        payload = {"model": model, "message": prompt, "temperature": temperature, "max_tokens": max_tokens}
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        resp = requests.post(self.url, json=payload, headers=headers, timeout=60)
        resp.raise_for_status()
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=resp.json().get("text", "")))])

class _GroqAdapter:
    def __init__(self, model: str, api_key: str):
        self.model = model
        self.api_key = api_key
        self.url = "https://api.groq.com/openai/v1/chat/completions"

    def create(self, messages: list[dict[str, Any]], temperature: float, max_tokens: int, **kwargs):
        model = kwargs.get("model") or self.model
        payload = {"model": model, "messages": messages, "temperature": temperature, "max_tokens": max_tokens}
        if kwargs.get("response_format"): payload["response_format"] = kwargs["response_format"]
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        resp = requests.post(self.url, json=payload, headers=headers, timeout=60)
        resp.raise_for_status()
        content = resp.json().get("choices", [{}])[0].get("message", {}).get("content", "")
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))])

class _GeminiAdapter:
    def __init__(self, model: str, api_key: str):
        self.model = model
        self.api_key = api_key

    def create(self, messages: list[dict[str, Any]], temperature: float, max_tokens: int, **kwargs):
        model = kwargs.get("model") or self.model
        if model.startswith("models/"): model = model[len("models/"):]
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.api_key}"
        prompt = "\n".join([m['content'] for m in messages])
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": temperature, "maxOutputTokens": max_tokens}
        }
        resp = requests.post(url, json=payload, timeout=120)
        resp.raise_for_status()
        data = resp.json()
        content = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))])

class _OllamaAdapter:
    def __init__(self, model: str, url: str):
        self.model = model
        self.url = url

    def create(self, messages: list[dict[str, Any]], temperature: float, max_tokens: int, **kwargs):
        model = kwargs.get("model") or self.model
        payload = {"model": model, "messages": messages, "stream": False, "options": {"temperature": temperature, "num_predict": max_tokens}}
        resp = requests.post(self.url, json=payload, timeout=120)
        resp.raise_for_status()
        content = resp.json().get("message", {}).get("content", "")
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))])

class _LLMClient:
    def __init__(self, config: dict[str, Any]):
        self.config = config
        p = config["provider"]
        if p == "gemini": self.adapter = _GeminiAdapter(config["standard_model"], config["gemini_api_key"])
        elif p == "groq": self.adapter = _GroqAdapter(config["standard_model"], config["groq_api_key"])
        elif p == "cohere": self.adapter = _CohereAdapter(config["standard_model"], config["cohere_api_key"])
        elif p == "ollama": self.adapter = _OllamaAdapter(config["standard_model"], config["ollama_url"])
        else: raise RuntimeError(f"Unsupported provider: {p}")
        
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self.create))

    def create(self, **kwargs):
        return self.adapter.create(
            messages=kwargs.get("messages", []),
            temperature=kwargs.get("temperature", 0.2),
            max_tokens=kwargs.get("max_tokens", 800),
            model=kwargs.get("model"),
            response_format=kwargs.get("response_format")
        )

@lru_cache(maxsize=1)
def _get_client() -> _LLMClient:
    return _LLMClient(_resolve_llm_config())

def _llm_provider() -> str: return _resolve_llm_config()["provider"]
def _llm_model() -> str: return _resolve_llm_config()["standard_model"]
def _llm_premium_model() -> str: return _resolve_llm_config()["premium_model"]

def extract_skills(jd_text: str) -> dict[str, int]:
    prompt = f"Extract technical skills as JSON {{skill: weight}} from:\n{jd_text[:4000]}"
    try:
        resp = _get_client().create(messages=[{"role": "user", "content": prompt}], temperature=0.1, max_tokens=300)
        return json.loads(_clean_json(resp.choices[0].message.content))
    except Exception as e:
        logger.error(f"extract_skills failed: {e}")
        return {}

def evaluate_answer_detailed(**kwargs) -> dict[str, Any]:
    # Simplified evaluation call using the configured provider
    prompt = f"Evaluate answer for question: {kwargs.get('question')}\nAnswer: {kwargs.get('answer')}\nReturn JSON with score (0-100) and feedback."
    try:
        resp = _get_client().create(messages=[{"role": "user", "content": prompt}], temperature=0.2, max_tokens=500)
        return json.loads(_clean_json(resp.choices[0].message.content))
    except Exception as e:
        logger.error(f"evaluation failed: {e}")
        return {"score": 50, "feedback": "Evaluation failed."}

def score_answer(question: str, answer: str) -> dict[str, Any]:
    eval_res = evaluate_answer_detailed(question=question, answer=answer)
    return {"score": eval_res.get("score", 0), "feedback": eval_res.get("feedback", "")}
