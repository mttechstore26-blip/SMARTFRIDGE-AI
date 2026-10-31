# Piano di sviluppo — SmartFridge AI

## Ambito e approccio

SmartFridge AI sarà una PWA React + TypeScript strict + Vite, offline-first e installabile, con dati persistenti in IndexedDB tramite Dexie. La prima versione non usa login, backend o database gestito: inventario, lotti, lista spesa, scadenze e storico restano sul dispositivo. Le integrazioni che richiedono rete (ricerca Open Food Facts, riconoscimento vocale del browser e notifiche) saranno isolate dietro servizi con fallback espliciti.

Il dominio sarà separato dall'interfaccia: modelli e validazione in `src/models` e `src/database`, operazioni atomiche inventario/storico in `src/inventory`, lista e scadenze in moduli dedicati, scanner e voce in servizi indipendenti. La UI manterrà una navigazione adatta al tablet: dashboard iniziale, inventario, lista della spesa, scadenze, storico e impostazioni/privacy. Un unico store React leggero ricaricherà i dati dal database e aggiornerà i riepiloghi; le mutazioni passeranno da funzioni di dominio testabili.

La scansione reale userà ZXing tramite fotocamera quando il browser la supporta e un campo codice/manuale come fallback. La modalità demo sarà esplicitamente separata e non scriverà nell'inventario personale. Il parser vocale/testuale sarà basato su regole italiane, con `SpeechRecognition` solo su richiesta dell'utente e `speechSynthesis` per le risposte quando disponibile. La schermata standby sarà una schermata nera applicativa, non uno spegnimento fisico del display.

## Struttura prevista

- `src/app`: bootstrap, routing leggero, stato applicativo e layout.
- `src/components`: componenti riusabili touchscreen, card, modali e feedback.
- `src/pages`: dashboard, inventario, scanner, lista, scadenze, storico, impostazioni e privacy.
- `src/models`: tipi, enum, validatori e funzioni pure.
- `src/database`: Dexie, schema, migrazioni, backup/ripristino ed esportazioni.
- `src/inventory`, `src/shopping`, `src/expiry`, `src/history`: logica di dominio.
- `src/scanner`: scanner reale, modalità manuale/demo e compatibilità.
- `src/voice`: parser italiano, speech recognition/synthesis e fallback testo.
- `src/styles`: tema, responsive layout e accessibilità.
- `tests`: test Vitest di dominio, parser e backup.
- `docs`: architettura, funzionalità, Android, voce, scanner e roadmap.

## Design

### Alternative considerate

- **Minimalismo editoriale da cucina** — 0,06: superfici chiare, tipografia forte, pochi accenti.
- **Neo-organic appliance** — 0,08: forme morbide, verdi naturali e feedback tattili.
- **Utility futurista ad alto contrasto** — 0,07: pannelli scuri, accenti lime e segnali di stato netti.

### Scelta: Neo-organic appliance

- **Movimento:** neo-organic design applicato a un elettrodomestico digitale: familiare, rassicurante e preciso.
- **Principi:** leggibilità a distanza, azioni primarie ovvie, stato sempre visibile, interazioni brevi e reversibili.
- **Colore:** fondo crema freddo e superfici bianche per evocare una cucina pulita; verde salvia come firma del prodotto; ambra e corallo solo per avvisi e azioni distruttive.
- **Layout:** dashboard a flusso verticale con una fascia di stato in alto, azioni Entrata/Uscita come due grandi “piastre” laterali e contenuti in sezioni scorrevoli; niente griglia amministrativa.
- **Elementi distintivi:** pillola “stato frigo”, icone circolari con bordo spesso, barra di freschezza per scorte/scadenze.
- **Interazione:** ogni tap importante ha feedback visivo, testo di conferma e annulla dove possibile; target touch ampi e focus evidente.
- **Animazione:** micro-transizioni da 160–220 ms, ingresso morbido delle card, nessuna animazione continua che consumi batteria; rispettare `prefers-reduced-motion`.
- **Tipografia:** Manrope per titoli e numeri, Inter/system sans per testo e controlli; gerarchia ad alto contrasto e numeri tabulari per quantità.
- **Essenza:** il modo più semplice per sapere cosa c'è nel frigo e cosa manca; calmo, pratico, affidabile.
- **Voce del brand:** diretta, domestica, incoraggiante. Esempi: “Frigo sotto controllo.” / “Manca poco: lo aggiungo alla spesa?”
- **Marchio:** wordmark `SmartFridge` con una “S” contenuta in un anello, affiancato da un piccolo indicatore di freschezza a tre tacche; realizzato come SVG inline, non testo generico.
- **Colore firma:** verde salvia profondo `#2F6B59`.

## Flusso di build e verifica

1. Creare manifest PWA, route manifest, shell React e tema responsive.
2. Implementare modelli, IndexedDB, mutazioni atomiche e dati demo isolati.
3. Collegare dashboard, inventario, lista, scadenze e storico.
4. Integrare scanner reale/manuale/demo e ricerca prodotto online opzionale.
5. Integrare parser vocale/testuale, standby, backup/ripristino e privacy.
6. Scrivere documentazione e test Vitest, configurare ESLint, TypeScript e GitHub Actions.
7. Eseguire `npm run test`, `npm run build` e `npm run lint`, correggere gli errori e verificare il manifest/route manifest via HTTP.
8. Avviare Preview sulla porta configurata e consegnare il progetto senza pubblicarlo su GitHub.

## Limiti dichiarati

La PWA non garantisce ascolto continuo a schermo spento, risveglio vocale fisico, notifiche affidabili in background o sincronizzazione multi-dispositivo. Queste capacità resteranno documentate come future e predisposte dietro moduli separati. Open Food Facts e riconoscimento vocale possono richiedere rete; l'app rimane utilizzabile offline per i dati locali e i prodotti già registrati.
