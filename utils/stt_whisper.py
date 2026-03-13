"""Server-side speech-to-text using faster-whisper."""

from __future__ import annotations

import math
import os
from pathlib import Path
from tempfile import NamedTemporaryFile
from threading import Lock

from faster_whisper import WhisperModel

_MODEL: WhisperModel | None = None
_MODEL_LOCK = Lock()


def _truthy(value: str | None, default: bool) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _clear_proxy_env_if_requested() -> None:
    if not _truthy(os.getenv("WHISPER_IGNORE_PROXY"), default=False):
        return
    for key in (
        "HTTP_PROXY",
        "HTTPS_PROXY",
        "ALL_PROXY",
        "http_proxy",
        "https_proxy",
        "all_proxy",
    ):
        os.environ.pop(key, None)


def _model_ref() -> str:
    model_path = (os.getenv("WHISPER_MODEL_PATH") or "").strip()
    if model_path:
        return model_path
    return os.getenv("WHISPER_MODEL_SIZE", "small")


def _get_model() -> WhisperModel:
    global _MODEL
    if _MODEL is not None:
        return _MODEL

    with _MODEL_LOCK:
        if _MODEL is None:
            _clear_proxy_env_if_requested()
            model_size = _model_ref()
            model_device = os.getenv("WHISPER_DEVICE", "cpu")
            compute_type = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
            try:
                _MODEL = WhisperModel(model_size, device=model_device, compute_type=compute_type)
            except Exception as exc:
                message = (
                    f"Unable to load Whisper model '{model_size}'. "
                    f"Set WHISPER_MODEL_PATH to a local model directory or verify internet/proxy settings. "
                    f"Original error: {exc}"
                )
                raise RuntimeError(message) from exc
    return _MODEL


def _resolve_input_suffix(filename: str | None = None) -> str:
    configured = (os.getenv("WHISPER_INPUT_SUFFIX") or ".webm").strip() or ".webm"
    if not filename:
        return configured if configured.startswith(".") else f".{configured}"

    suffix = Path(filename).suffix.strip().lower()
    if suffix in {".webm", ".wav", ".mp3", ".m4a", ".mp4", ".ogg", ".oga"}:
        return suffix
    return configured if configured.startswith(".") else f".{configured}"


def _collect_text(segments) -> tuple[str, float | None]:
    parts: list[str] = []
    confidence_samples: list[float] = []

    for segment in segments:
        text = str(getattr(segment, "text", "") or "").strip()
        if text:
            parts.append(text)

        avg_logprob = getattr(segment, "avg_logprob", None)
        if avg_logprob is not None:
            try:
                confidence_samples.append(max(0.0, min(1.0, math.exp(float(avg_logprob)))))
            except (TypeError, ValueError, OverflowError):
                continue

    transcript = " ".join(parts).strip()
    confidence = None
    if confidence_samples:
        confidence = sum(confidence_samples) / len(confidence_samples)
    return transcript, confidence


def transcribe_audio_bytes(
    audio_bytes: bytes,
    language: str | None = None,
    *,
    filename: str | None = None,
    context_hint: str | None = None,
) -> dict[str, object]:
    if not audio_bytes:
        return {
            "text": "",
            "confidence": 0.0,
            "low_confidence": True,
            "language": (language or "").strip() or None,
        }

    beam_size_raw = os.getenv("WHISPER_BEAM_SIZE", "1")
    try:
        beam_size = max(1, int(beam_size_raw))
    except ValueError:
        beam_size = 1
    vad_filter = _truthy(os.getenv("WHISPER_VAD_FILTER"), default=True)
    temp_suffix = _resolve_input_suffix(filename)

    with NamedTemporaryFile(delete=False, suffix=temp_suffix) as temp_file:
        temp_file.write(audio_bytes)
        temp_path = Path(temp_file.name)

    try:
        model = _get_model()
        segments, info = model.transcribe(
            str(temp_path),
            language=(language or "").strip() or None,
            beam_size=beam_size,
            vad_filter=vad_filter,
            condition_on_previous_text=False,
            initial_prompt=(context_hint or "").strip() or None,
        )
        transcript, transcript_confidence = _collect_text(segments)
        language_probability = getattr(info, "language_probability", None)

        confidence_candidates = [
            value
            for value in (transcript_confidence, language_probability)
            if isinstance(value, (int, float))
        ]
        confidence = (
            max(0.0, min(1.0, sum(confidence_candidates) / len(confidence_candidates)))
            if confidence_candidates
            else 0.0
        )

        return {
            "text": transcript,
            "confidence": round(confidence, 3),
            "low_confidence": not transcript or confidence < 0.45,
            "language": getattr(info, "language", None) or (language or "").strip() or None,
        }
    finally:
        temp_path.unlink(missing_ok=True)
