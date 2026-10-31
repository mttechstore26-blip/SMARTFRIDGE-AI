#!/usr/bin/env bash
set -Eeuo pipefail
# SmartFridge sync isolated installation for existing Contabo VPS.
HOST="smartfridge-sync.207-180-244-108.sslip.io"
REPO="https://github.com/mttechstore26-blip/SMARTFRIDGE-AI.git"
APP="/opt/smartfridge-ai"
ENVFILE="/etc/smartfridge-sync.env"
SERVICE="smartfridge-sync"
if [[ ${EUID} -ne 0 ]]; then echo "Esegui come root sulla VPS."; exit 1; fi
for command in git python3 nginx systemctl openssl certbot curl; do
  command -v "$command" >/dev/null || { echo "Manca: $command (non modifico il sistema)."; exit 1; }
done
if [[ -e "/etc/nginx/sites-enabled/$SERVICE" || -e "/etc/systemd/system/$SERVICE.service" ]]; then
  echo "SmartFridge risulta già configurato: interrompo per evitare modifiche accidentali."; exit 1
fi
if [[ -e "$APP" ]]; then echo "$APP esiste già: interrompo."; exit 1; fi
if ss -ltn | grep -qE '127\\.0\\.0\\.1:8765[[:space:]]'; then echo "Porta 8765 già occupata."; exit 1; fi
echo "Verifica risoluzione sslip.io..."
RESOLVED=$(getent ahostsv4 "$HOST" | awk 'NR==1{print $1}')
if [[ "$RESOLVED" != "207.180.244.108" ]]; then echo "DNS inatteso: $RESOLVED. Interrompo."; exit 1; fi
echo "Clono il repository..."
git clone --depth 1 "$REPO" "$APP"
if ! id -u smartfridgesync >/dev/null 2>&1; then
  useradd --system --home-dir /var/lib/smartfridge --shell /usr/sbin/nologin smartfridgesync
fi
install -d -m 700 -o smartfridgesync -g smartfridgesync /var/lib/smartfridge
TOKEN=$(openssl rand -hex 32)
umask 077
cat > "$ENVFILE" <<EOF
SMARTFRIDGE_SYNC_TOKEN=$TOKEN
SMARTFRIDGE_ALLOWED_ORIGIN=https://mttechstore26-blip.github.io
SMARTFRIDGE_DB_PATH=/var/lib/smartfridge/sync.sqlite3
EOF
chown root:smartfridgesync "$ENVFILE"
chmod 640 "$ENVFILE"
cat > "/etc/systemd/system/$SERVICE.service" <<EOF
[Unit]
Description=SmartFridge AI private sync
After=network.target

[Service]
Type=simple
User=smartfridgesync
Group=smartfridgesync
WorkingDirectory=$APP
EnvironmentFile=$ENVFILE
ExecStart=/usr/bin/python3 $APP/sync-server/server.py
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/smartfridge

[Install]
WantedBy=multi-user.target
EOF
cat > "/etc/nginx/sites-available/$SERVICE" <<EOF
server {
    listen 80;
    server_name $HOST;
    client_max_body_size 5m;
    location /api/ {
        proxy_pass http://127.0.0.1:8765;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_read_timeout 20s;
    }
    location / { return 404; }
}
EOF
ln -s "/etc/nginx/sites-available/$SERVICE" "/etc/nginx/sites-enabled/$SERVICE"
nginx -t
systemctl daemon-reload
systemctl enable --now "$SERVICE"
systemctl reload nginx
certbot --nginx -d "$HOST" --non-interactive --agree-tos --register-unsafely-without-email --redirect
echo
echo "=== RISULTATO ==="
systemctl is-active "$SERVICE"
curl -fsS -o /dev/null -w "HTTPS status: %{http_code}\\n" "https://$HOST/api/snapshot" || true
echo "URL: https://$HOST"
echo "La chiave privata NON viene mostrata. Per visualizzarla localmente: sudo sed -n 's/^SMARTFRIDGE_SYNC_TOKEN=//p' $ENVFILE"
echo "Non incollare la chiave nella chat."
