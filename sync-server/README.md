# SmartFridge AI — servizio VPS Contabo

Questo servizio è **opzionale**. La PWA continua a funzionare offline anche se non è installato.

## Requisiti
- Python 3.10+, systemd e Nginx già installati
- Dominio o sottodominio HTTPS per il servizio, ad esempio `sync.example.com`
- Porta applicativa 8765 **solo su 127.0.0.1**
- Chiave casuale privata lunga almeno 32 byte, **mai committata su GitHub**

## Installazione (amministratore VPS)

Clonare il repository in `/opt/smartfridge-ai`, creare `/var/lib/smartfridge` con permessi riservati all'utente del servizio e creare un file di ambiente leggibile solo dall'amministratore:

```ini
SMARTFRIDGE_SYNC_TOKEN=<chiave_casuale_lunga>
SMARTFRIDGE_ALLOWED_ORIGIN=https://mttechstore26-blip.github.io
SMARTFRIDGE_DB_PATH=/var/lib/smartfridge/sync.sqlite3
```

Creare un servizio systemd con `ExecStart=/usr/bin/python3 /opt/smartfridge-ai/sync-server/server.py`, `EnvironmentFile` puntato al file privato, `User` dedicato senza privilegi, `Restart=on-failure`, `WorkingDirectory=/opt/smartfridge-ai`. Verificare permessi di scrittura sulla directory SQLite.

Configurare Nginx sul sottodominio HTTPS scelto con `proxy_pass http://127.0.0.1:8765;` e certificato TLS valido. Non esporre la porta 8765 direttamente. Aggiungere rate limiting e limiti di dimensione delle richieste al reverse proxy.

## Collegamento dell'app
Aprire **Impostazioni → Tablet e smartphone** nella PWA, inserire l'indirizzo HTTPS e la chiave. Premere **Salva collegamento**. Per il primo dispositivo, esportare prima il backup JSON e poi scegliere **Invia inventario alla VPS**. Sul secondo dispositivo scegliere **Scarica inventario dalla VPS**, dopo aver salvato un backup locale.

**Importante:** questa è una sincronizzazione manuale di snapshot completi, non una sincronizzazione automatica multi-dispositivo. Ogni download sostituisce l'archivio locale. Il server protegge dai conflitti con revisioni, ma non unisce modifiche offline contemporanee. Per la sincronizzazione automatica serviranno autenticazione per dispositivo, un registro delle modifiche e una strategia di riconciliazione. Non presentare questo MVP come pronto per la sincronizzazione continua.
