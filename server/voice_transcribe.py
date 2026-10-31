"""Standalone local ASR endpoint for SmartFridge PWA.
Run behind the existing HTTPS Nginx vhost; do not expose this port publicly.
Environment: SMARTFRIDGE_TOKEN must match the existing sync bearer token.
"""
import hmac
import os
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel

MAX_BYTES = 3_000_000
TOKEN = os.environ.get("SMARTFRIDGE_TOKEN", "")
if not TOKEN:
    raise RuntimeError("SMARTFRIDGE_TOKEN must be set")
MODEL_NAME = os.environ.get("SMARTFRIDGE_ASR_MODEL", "tiny")
model = WhisperModel(MODEL_NAME, device="cpu", compute_type="int8")
app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://mttechstore26-blip.github.io"],
    allow_credentials=False,
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

@app.post("/api/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    authorization: str | None = Header(default=None),
):
    provided = (authorization or "").removeprefix("Bearer ").strip()
    if not hmac.compare_digest(provided, TOKEN):
        raise HTTPException(status_code=401, detail="Unauthorized")
    if audio.content_type not in {
        "audio/mp4", "audio/webm", "audio/webm;codecs=opus",
        "video/mp4", "application/octet-stream",
    }:
        raise HTTPException(status_code=415, detail="Audio format unsupported")
    data = await audio.read(MAX_BYTES + 1)
    if not data or len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="Audio size invalid")
    suffix = ".m4a" if "mp4" in (audio.content_type or "") else ".webm"
    filename = ""
    try:
        with tempfile.NamedTemporaryFile(prefix="smartfridge-", suffix=suffix, delete=False) as output:
            output.write(data)
            filename = output.name
        segments, _ = model.transcribe(filename, language="it", beam_size=3, vad_filter=True)
        text = " ".join(segment.text.strip() for segment in segments).strip()
        return {"text": text[:500]}
    finally:
        if filename:
            Path(filename).unlink(missing_ok=True)
