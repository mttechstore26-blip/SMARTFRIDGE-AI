"""SmartFridge private sync API. Run behind HTTPS reverse proxy; never expose port 8765 publicly."""
import hmac
import json
import os
import sqlite3
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

TOKEN = os.environ["SMARTFRIDGE_SYNC_TOKEN"]
ORIGIN = os.environ.get("SMARTFRIDGE_ALLOWED_ORIGIN", "https://mttechstore26-blip.github.io")
DB_PATH = os.environ.get("SMARTFRIDGE_DB_PATH", "/var/lib/smartfridge/sync.sqlite3")
MAX_BYTES = 5 * 1024 * 1024
os.makedirs(os.path.dirname(os.path.abspath(DB_PATH)), exist_ok=True)

def connect():
    db = sqlite3.connect(DB_PATH, timeout=10)
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("CREATE TABLE IF NOT EXISTS snapshot (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL, payload TEXT NOT NULL)")
    db.commit()
    return db

class Handler(BaseHTTPRequestHandler):
    def headers(self, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", ORIGIN)
        self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, PUT, OPTIONS")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()

    def reply(self, status, value):
        self.headers(status)
        self.wfile.write(json.dumps(value).encode("utf-8"))

    def allowed(self):
        return self.headers.get("Origin") in (None, ORIGIN)

    def authorized(self):
        return hmac.compare_digest(self.headers.get("Authorization", ""), "Bearer " + TOKEN)

    def do_OPTIONS(self):
        if not self.allowed():
            return self.reply(403, {"error": "Origin not allowed"})
        self.headers(204)

    def do_GET(self):
        if self.path != "/api/snapshot" or not self.allowed():
            return self.reply(404, {"error": "Not found"})
        if not self.authorized():
            return self.reply(401, {"error": "Unauthorized"})
        with connect() as db:
            row = db.execute("SELECT revision, payload FROM snapshot WHERE id=1").fetchone()
        return self.reply(200, {"revision": row[0], "payload": json.loads(row[1])} if row else {"revision": 0, "payload": None})

    def do_PUT(self):
        if self.path != "/api/snapshot" or not self.allowed():
            return self.reply(404, {"error": "Not found"})
        if not self.authorized():
            return self.reply(401, {"error": "Unauthorized"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length < 1 or length > MAX_BYTES:
                return self.reply(413, {"error": "Invalid size"})
            body = json.loads(self.rfile.read(length))
            revision = body["revision"]
            payload = body["payload"]
            if not isinstance(revision, int) or revision < 0 or not isinstance(payload, dict) or payload.get("version") != 1:
                return self.reply(400, {"error": "Invalid snapshot"})
            encoded = json.dumps(payload, ensure_ascii=False)
            with connect() as db:
                db.execute("BEGIN IMMEDIATE")
                row = db.execute("SELECT revision FROM snapshot WHERE id=1").fetchone()
                current = row[0] if row else 0
                if revision != current:
                    db.rollback()
                    return self.reply(409, {"error": "Revision conflict", "revision": current})
                db.execute("INSERT INTO snapshot(id, revision, payload) VALUES(1, ?, ?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision, payload=excluded.payload", (current + 1, encoded))
                db.commit()
            return self.reply(200, {"revision": current + 1})
        except (ValueError, TypeError, KeyError, json.JSONDecodeError):
            return self.reply(400, {"error": "Invalid JSON"})

if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", 8765), Handler).serve_forever()
