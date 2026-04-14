"""Supabase storage service for proctoring images and resumes."""

import logging
import uuid
from pathlib import Path

from fastapi import UploadFile
from core.config import config

BUCKET_NAME = "interview-assets"

def get_storage():
    from services.supabase_client import get_supabase
    return get_supabase().storage

def upload_proctoring_image(session_id: int, file: UploadFile) -> dict:
    """Upload proctoring frame to Supabase Storage."""
    sb = get_storage()
    
    file_bytes = file.file.read()
    file_ext = ".jpg"
    file_path = f"proctoring/{session_id}/{uuid.uuid4().hex}{file_ext}"
    
    try:
        res = sb.from_(BUCKET_NAME).upload(file_path, file_bytes, {"content-type": "image/jpeg"})
        public_url = sb.from_(BUCKET_NAME).get_public_url(file_path)
        return {
            "ok": True,
            "url": public_url,
            "path": file_path,
        }
    except Exception as e:
        logging.error(f"Supabase proctoring upload failed: {e}")
        raise

def upload_resume(candidate_id: int, file: UploadFile) -> dict:
    """Upload resume to Supabase Storage."""
    sb = get_storage()
    
    file.file.seek(0)
    file_bytes = file.file.read()
    file.file.seek(0)
    safe_filename = Path(file.filename or "resume.pdf").name
    file_ext = Path(safe_filename).suffix.lower() or ".pdf"
    file_path = f"resumes/{candidate_id}/{uuid.uuid4().hex}_{safe_filename}"
    
    content_type = "application/pdf"
    if file_ext == ".docx":
        content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif file_ext == ".txt":
        content_type = "text/plain"
    
    try:
        res = sb.from_(BUCKET_NAME).upload(file_path, file_bytes, {"content-type": content_type})
        public_url = sb.from_(BUCKET_NAME).get_public_url(file_path)
        return {
            "ok": True,
            "url": public_url,
            "path": file_path,
        }
    except Exception as e:
        logging.error(f"Supabase resume upload failed: {e}")
        raise
