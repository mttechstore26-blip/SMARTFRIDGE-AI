# SmartFridge AI

SmartFridge AI è una Progressive Web App offline-first per gestire l’inventario alimentare da un tablet Android montato sulla porta del frigorifero. Usa touchscreen, fotocamera, microfono e database locale: non richiede login, Raspberry Pi, sensori, API AI a pagamento o server per la prima versione.

## Avvio su PC

Richiede Node.js 20+. Dalla cartella del progetto:

```bash
npm install
npm run dev
```

Aprire l’indirizzo mostrato da Vite. Per verificare qualità e produzione:

```bash
npm run lint
npm run test
npm run build
npm run preview
```

## Uso

`ENTRATA` e `USCITA` aprono lo scanner reale. Se la fotocamera non è disponibile, usare il codice manuale; nella demo lo scanner simulato propone codici di esempio. I prodotti già registrati sono disponibili offline. Il microfono parte solo premendo il pulsante e il campo testuale è sempre un fallback.

La modalità “Prova la demo” è isolata e non contamina l’inventario personale. La lista della spesa suggerisce la differenza tra quantità obiettivo e disponibile. Backup JSON, ripristino validato ed esportazione CSV sono in Impostazioni.

## Installazione Android

Servire la build in HTTPS, aprirla con Chrome Android e scegliere “Installa app” dal menu del browser. Concedere fotocamera e microfono solo quando richiesti. Il browser può limitare riconoscimento vocale, notifiche in background e fotocamera: i limiti sono dichiarati nell’app e in `docs/ANDROID.md`.

## Struttura

La logica è divisa in `src/models`, `src/database`, `src/services`, `src/inventory`, `src/shopping`, `src/expiry`, `src/history`, `src/scanner` e `src/voice`. I dettagli sono in `docs/ARCHITECTURE.md`.

## Privacy e limiti

I dati di inventario restano in IndexedDB sul dispositivo. La PWA non garantisce ascolto continuo a schermo spento, risveglio vocale fisico, notifiche background affidabili su tutti i browser o sincronizzazione tra dispositivi. Open Food Facts e SpeechRecognition possono richiedere rete; nessuna di queste integrazioni è necessaria per le funzioni locali principali.

## GitHub in futuro

Il progetto non è pubblicato. Per pubblicarlo in seguito, creare un repository `SMARTFRIDGE-AI`, aggiungere il remote, verificare `.env`/segreti, eseguire lint/test/build e poi fare push su `main`. Non committare file `.env`.
