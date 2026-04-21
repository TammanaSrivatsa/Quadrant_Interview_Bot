"""Amazon Polly TTS service for interview questions."""

import base64
import logging
from typing import Any

import boto3
from botocore.config import Config

from core.config import config

logger = logging.getLogger(__name__)

POLLY_VOICES = {
    "kajal": "Kajal",
}

POLLY_ENGINES = {
    "kajal": "neural",
}

POLLY_LANGUAGE_CODES = {
    "kajal": "en-IN",
}


def _get_polly_client():
    """Create a Polly client with proper configuration."""
    try:
        aws_config = Config(
            region_name=config.AWS_REGION or "us-east-1",
            signature_version="v4",
            retries={"max_attempts": 3, "mode": "standard"},
        )
        client = boto3.client(
            "polly",
            aws_access_key_id=config.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=config.AWS_SECRET_ACCESS_KEY,
            config=aws_config,
        )
        return client
    except Exception as exc:
        logger.error("Failed to create Polly client: %s", exc)
        raise


def synthesize_speech(
    text: str,
    voice_id: str = "kajal",
    output_format: str = "mp3",
) -> dict[str, Any]:
    """Synthesize speech using Amazon Polly.

    Args:
        text: The text to convert to speech
        voice_id: Voice to use (currently only 'kajal' supported)
        output_format: Output format (mp3, ogg_vorbis, etc.)

    Returns:
        dict with 'audio_base64' and 'content_type'
    """
    if not text:
        raise ValueError("Text cannot be empty")

    voice_key = voice_id.lower()
    if voice_key not in POLLY_VOICES:
        raise ValueError(f"Unsupported voice: {voice_id}. Available: {list(POLLY_VOICES.keys())}")

    actual_voice = POLLY_VOICES[voice_key]
    engine = POLLY_ENGINES.get(voice_key, "neural")
    language_code = POLLY_LANGUAGE_CODES.get(voice_key, "en-IN")

    try:
        client = _get_polly_client()

        response = client.synthesize_speech(
            Text=text,
            OutputFormat=output_format,
            VoiceId=actual_voice,
            Engine=engine,
            LanguageCode=language_code,
        )

        audio_stream = response.get("AudioStream")
        if not audio_stream:
            raise ValueError("No audio stream returned from Polly")

        audio_bytes = audio_stream.read()
        audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")

        content_type = response.get("ContentType", "audio/mpeg")

        logger.info(
            "polly_synthesize_success voice=%s engine=%s text_len=%d audio_size=%d",
            actual_voice,
            engine,
            len(text),
            len(audio_bytes),
        )

        return {
            "audio_base64": audio_base64,
            "content_type": content_type,
            "voice_id": actual_voice,
            "engine": engine,
        }

    except Exception as exc:
        logger.error("Polly synthesis failed: %s", exc)
        raise


def synthesize_speech_url(
    text: str,
    voice_id: str = "kajal",
) -> dict[str, Any]:
    """Synthesize and return data URL for easy frontend playback.

    Returns:
        dict with 'audio_url' (data URL)
    """
    result = synthesize_speech(text, voice_id)
    audio_url = f"data:{result['content_type']};base64,{result['audio_base64']}"
    return {"audio_url": audio_url, "voice_id": result["voice_id"]}