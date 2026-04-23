"""
utils/stt_whisper.py

Dynamic transcription - uses whichever API provider is available:
1. Groq (has Whisper API) - preferred
2. OpenAI Whisper
3. Gemini (if GEMINI_API_KEY explicitly set)
"""
from __future__ import annotations

import base64
import io
import logging
import os
from pathlib import Path

import requests

try:
    from pydub import AudioSegment
    PYDUB_AVAILABLE = True
except ImportError:
    PYDUB_AVAILABLE = False

try:
    from scipy.io import wavfile
    import numpy as np
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False

logger = logging.getLogger(__name__)


def _convert_webm_to_wav(audio_bytes: bytes) -> bytes | None:
    """Convert webm audio to wav format for OpenAI compatibility.
    Tries scipy first (no ffmpeg needed), falls back to pydub.
    """
    if SCIPY_AVAILABLE:
        try:
            import wave
            with wave.open(io.BytesIO(), 'wb') as wf:
                pass
            sample_rate = 48000
            audio = AudioSegment.from_file(io.BytesIO(audio_bytes), format="webm")
            samples = np.array(audio.get_array_of_type()).astype(np.float32) / 32768.0
            if audio.channels == 2:
                samples = samples.reshape((-1, 2))
            wav_io = io.BytesIO()
            wavfile.write(wav_io, sample_rate, samples)
            logger.info("scipy conversion: webm %d bytes -> wav %d bytes", len(audio_bytes), len(wav_io.getvalue()))
            return wav_io.getvalue()
        except Exception as e:
            logger.warning("scipy conversion failed: %s", e)
    
    if PYDUB_AVAILABLE:
        try:
            audio = AudioSegment.from_file(io.BytesIO(audio_bytes), format="webm")
            wav_io = io.BytesIO()
            audio.export(wav_io, format="wav")
            logger.info("pydub conversion: webm %d bytes -> wav %d bytes", len(audio_bytes), len(wav_io.getvalue()))
            return wav_io.getvalue()
        except Exception as e:
            logger.warning("pydub conversion failed: %s", e)
    
    logger.warning("No audio conversion available (need scipy or pydub+ffmpeg)")
    return None


def _resolve_suffix(filename: str | None) -> str:
    if filename:
        s = Path(filename).suffix.strip().lower()
        if s in {".webm", ".wav", ".mp3", ".m4a", ".mp4", ".ogg", ".oga"}:
            return s
    return ".webm"


def _mime(suffix: str) -> str:
    return {
        ".webm": "audio/webm",
        ".wav":  "audio/wav",
        ".mp3":  "audio/mpeg",
        ".m4a":  "audio/mp4",
        ".mp4":  "audio/mp4",
        ".ogg":  "audio/ogg",
        ".oga":  "audio/ogg",
    }.get(suffix, "audio/webm")


def transcribe_audio_bytes(
    audio_bytes: bytes,
    language: str | None = None,
    *,
    filename: str | None = None,
    context_hint: str | None = None,
) -> dict[str, object]:
    """
    Transcribe audio using available API key dynamically.
    Priority: OpenAI > Groq > Gemini
    """
    if not audio_bytes:
        return {
            "text": "",
            "confidence": 0.0,
            "low_confidence": True,
            "language": language or "en",
        }

    openai_key = os.getenv("OPENAI_API_KEY", "") or os.getenv("LLM_API_KEY", "")
    groq_api_key = os.getenv("GROQ_API_KEY", "")
    gemini_api_key = os.getenv("GEMINI_API_KEY", "")
    
    logger.info("Using keys - OPENAI: %s, GROQ: %s", 
        "SET" if openai_key else "NOT SET",
        "SET" if groq_api_key else "NOT SET")
    
    suffix = _resolve_suffix(filename)
    mime_type = _mime(suffix)

    prompt = "Transcribe this interview answer to text clearly."

    # Convert webm to wav if needed for OpenAI compatibility
    audio_to_send = audio_bytes
    file_to_send = filename or "audio.webm"
    
    if suffix == ".webm" and openai_key:
        converted = _convert_webm_to_wav(audio_bytes)
        if converted:
            logger.info("Converted webm to wav: %d -> %d bytes", len(audio_bytes), len(converted))
            audio_to_send = converted
            file_to_send = "audio.wav"
            mime_type = "audio/wav"
        else:
            # If conversion failed, try with different format hint
            logger.warning("Conversion failed, trying with different approach")

    # Try OpenAI Whisper first
    if openai_key:
        try:
            logger.info("OpenAI Whisper: audio_size=%d, mime_type=%s, language=%s", len(audio_to_send), mime_type, language or "en")
            url = "https://api.openai.com/v1/audio/transcriptions"
            files = {"file": (file_to_send, audio_to_send, mime_type)}
            data = {"model": "whisper-1", "language": language or "en", "prompt": prompt}
            headers = {"Authorization": f"Bearer {openai_key}"}
            
            response = requests.post(url, files=files, data=data, headers=headers, timeout=60)
            logger.info("OpenAI Whisper response status: %d", response.status_code)
            
            if response.status_code != 200:
                logger.warning("OpenAI Whisper error response: %s", response.text)
                
            response.raise_for_status()
            result = response.json()
            text = result.get("text", "").strip() if result else ""
            
            logger.info("OpenAI Whisper raw result: '%s', word_count: %d", text, len(text.split()) if text else 0)

            # Post-process: check for hallucination patterns (only block if mostly URL)
            if text:
                lower_text = text.lower().strip()
                word_count = len(lower_text.split())
                # Count URL-like patterns
                url_count = sum(1 for p in ["www.", ".com", ".gov", ".org", ".net", "https://", "http://"] if p in lower_text)
                # Block only if it's purely URL-like (less than 3 words and contains URL)
                if word_count < 3 and url_count > 0:
                    logger.warning("Whisper returned potential hallucination: %s", text)
                    text = ""
                elif word_count == 1 and len(lower_text) > 30:
                    # Single word longer than 30 chars is suspicious
                    logger.warning("Whisper returned suspicious single word: %s", text)
                    text = ""

            return {
                "text": text,
                "confidence": 0.95 if text else 0.0,
                "low_confidence": not bool(text),
                "language": language or "en",
            }
        except Exception as exc:
            logger.warning("OpenAI transcription failed: %s", exc)

    # Try Groq second (they have Whisper API - same as OpenAI)
    if groq_api_key:
        try:
            url = "https://api.groq.com/openai/v1/audio/transcriptions"
            files = {"file": (filename or "audio.webm", audio_bytes, mime_type)}
            data = {"model": "whisper-large-v3", "language": language or "en", "prompt": prompt}
            headers = {"Authorization": f"Bearer {groq_api_key}"}
            
            response = requests.post(url, files=files, data=data, headers=headers, timeout=60)
            response.raise_for_status()
            result = response.json()
            text = result.get("text", "").strip() if result else ""
            
            logger.info("Groq transcription successful")
            return {
                "text": text,
                "confidence": 0.95 if text else 0.0,
                "low_confidence": not bool(text),
                "language": language or "en",
            }
        except Exception as exc:
            logger.warning("Groq transcription failed: %s", exc)

    # Try Gemini last (only if explicitly configured)
    if gemini_api_key:
        try:
            encoded_audio = base64.b64encode(audio_bytes).decode('utf-8')
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={gemini_api_key}"
            
            payload = {
                "contents": [{
                    "parts": [
                        {"text": prompt},
                        {"inlineData": {"mimeType": mime_type, "data": encoded_audio}}
                    ]
                }],
                "generationConfig": {"temperature": 0.1}
            }
            
            response = requests.post(url, json=payload, timeout=60)
            response.raise_for_status()
            response_data = response.json()
            
            text = ""
            candidates = response_data.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                if parts:
                    text = parts[0].get("text", "").strip()
            
            logger.info("Gemini transcription successful")
            return {
                "text": text,
                "confidence": 0.95 if text else 0.0,
                "low_confidence": not bool(text),
                "language": language or "en",
            }
        except Exception as exc:
            logger.warning("Gemini transcription failed: %s", exc)

    # No transcription service available
    raise RuntimeError(
        "No transcription service available. Set one of: "
        "GROQ_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY in .env"
    )