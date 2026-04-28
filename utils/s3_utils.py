import requests
import logging
from pathlib import Path
from core.config import config

logger = logging.getLogger(__name__)

def upload_to_s3_via_lambda(file_bytes: bytes, key: str, content_type: str = "image/jpeg") -> str:
    """Upload to S3 using Lambda-generated presigned URL."""
    try:
        resp = requests.get(
            config.LAMBDA_S3_URL,
            params={"fileName": key.split("/")[-1], "fileType": content_type},
            timeout=30
        )
        resp.raise_for_status()
        data = resp.json()
        upload_url = data["uploadUrl"]
        file_url = data["fileUrl"]

        put_resp = requests.put(upload_url, data=file_bytes, headers={"Content-Type": content_type}, timeout=60)
        put_resp.raise_for_status()

        logger.info(f"Uploaded to S3 via Lambda: {key}")
        return file_url
    except Exception as e:
        logger.error(f"S3 upload via Lambda failed for {key}: {e}")
        raise

def upload_proctor_image(session_id: int, image_bytes: bytes, timestamp: str) -> str:
    """Upload proctoring frame to S3."""
    key = f"{config.S3_PROCTOR_PREFIX}/session_{session_id}/{timestamp}.jpg"
    return upload_to_s3_via_lambda(image_bytes, key, "image/jpeg")

def upload_pdf_report(session_id: int, pdf_bytes: bytes, filename: str) -> str:
    """Upload PDF report to S3."""
    key = f"{config.S3_REPORT_PREFIX}/session_{session_id}/{filename}"
    return upload_to_s3_via_lambda(pdf_bytes, key, "application/pdf")

# ---------------------------------------------------------------------------
# Async upload helper for proctoring frames
# ---------------------------------------------------------------------------
import httpx
from typing import Any

async def async_upload_proctor_image(session_id: int, image_bytes: bytes, timestamp: str) -> str:
    """Upload a proctoring frame to S3 asynchronously.
    Uses same Lambda params as the working sync version.
    Returns the public URL of the uploaded image.
    Falls back gracefully if S3 upload fails."""
    try:
        key = f"{config.S3_PROCTOR_PREFIX}/session_{session_id}/{timestamp}.jpg"
        # Get presigned URL using correct Lambda params (same as sync version)
        resp = requests.get(
            config.LAMBDA_S3_URL,
            params={"fileName": key.split("/")[-1], "fileType": "image/jpeg"},
            timeout=30
        )
        resp.raise_for_status()
        data = resp.json()
        upload_url = data["uploadUrl"]
        file_url = data["fileUrl"]

        # Upload to S3 asynchronously
        async with httpx.AsyncClient() as client:
            put_resp = await client.put(upload_url, content=image_bytes, headers={"Content-Type": "image/jpeg"}, timeout=60)
            put_resp.raise_for_status()

        return file_url
    except Exception as e:
        logger.warning(f"Proctor image upload failed (non-fatal): {e}")
        return f"proctor-fallback://session_{session_id}/{timestamp}"
