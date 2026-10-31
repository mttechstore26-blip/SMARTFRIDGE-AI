# SmartFridge offline speech recognition (private VPS)

This service is separate from the existing snapshot synchronization service. Do not replace or restart it.

It accepts an authenticated short audio clip, transcribes it locally with faster-whisper, and deletes the temporary recording. No audio is sent to a third-party API.

## Setup on VPS

Use a Python 3.11+ virtual environment:
```sh
python3 -m venv /opt/smartfridge-voice/.venv
/opt/smartfridge-voice/.venv/bin/pip install -r server/voice-requirements.txt
```

Copy `server/voice_transcribe.py` to `/opt/smartfridge-voice/voice_transcribe.py`.
Set `SMARTFRIDGE_TOKEN` to the SAME bearer token as the existing sync service, privately via the server environment file. Never add credentials to GitHub.

Run only on loopback:
```sh
cd /opt/smartfridge-voice
/opt/smartfridge-voice/.venv/bin/uvicorn voice_transcribe:app --host 127.0.0.1 --port 8766
```

Add an exact `location = /api/transcribe` inside the existing `smartfridge-sync` HTTPS server block:
```nginx
location = /api/transcribe {
    client_max_body_size 3m;
    proxy_pass http://127.0.0.1:8766/api/transcribe;
    proxy_read_timeout 35s;
}
```
Make sure the response includes the required CORS origin for `https://mttechstore26-blip.github.io`, including on proxy errors. The service itself supplies CORS headers on handled requests. The existing `/api/snapshot` route and Nginx configuration MUST remain untouched.

For unattended operation use a dedicated systemd service, unprivileged user, and the private env file. Confirm proper auth, audio formats, and idle memory/CPU before enabling.

## Limits

The web app's MediaRecorder captures up to 10 seconds, then sends the recording. iPadOS 15 may encode audio as MP4; the VPS must have ffmpeg installed. The initial tiny ASR model trades accuracy for CPU use, and can be replaced with base or small later. No transcript is executed if no readable text is returned. Never open the ASR port to the internet.
