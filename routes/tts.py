"""TTS (Text-to-Speech) routes using Bark for South Indian accent."""

import io
import numpy as np
from functools import lru_cache

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

try:
    from bark import generate_audio
    from bark import preload_models
    BARK_AVAILABLE = True
except ImportError:
    BARK_AVAILABLE = False
    print("Warning: bark not installed. TTS will be unavailable. Install with: pip install git+https://github.com/suno-ai/bark.git")

router = APIRouter(prefix="/api/tts", tags=["tts"])

VOICES = {
    "male": "v2/en_speaker_6",
    "female": "v2/en_speaker_9",
}

class TTSRequest(BaseModel):
    question: str
    voice: str = "male"


def _generate_tts(text: str, voice_preset: str) -> bytes:
    """Generate TTS audio using Bark."""
    if not BARK_AVAILABLE:
        raise HTTPException(status_code=503, detail="TTS service not available. Install bark-speech-synthesis.")
    
    try:
        audio_array = generate_audio(
            text=text,
            history_prompt=voice_preset,
            text_temp=0.7,
            waveform_temp=0.7,
        )
        
        audio_bytes = (audio_array * 32767).astype(np.int16).tobytes()
        return audio_bytes
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")


@router.post("/generate")
async def generate_tts(request: TTSRequest):
    """Generate TTS audio for a question."""
    voice_preset = VOICES.get(request.voice, VOICES["male"])
    
    audio_bytes = _generate_tts(request.question, voice_preset)
    
    return io.BytesIO(audio_bytes)


@router.get("/voices")
async def get_voices():
    """Get available voice options."""
    return {
        "voices": [
            {"id": "male", "label": "Male (South Indian)"},
            {"id": "female", "label": "Female (South Indian)"},
        ]
    }


@router.on_event("startup")
async def startup_event():
    """Preload Bark models on startup."""
    if BARK_AVAILABLE:
        try:
            preload_models()
            print("Bark models preloaded successfully")
        except Exception as e:
            print(f"Warning: Failed to preload Bark models: {e}")
