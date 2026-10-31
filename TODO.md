# TODO — SmartFridge AI

## Fondamenta PWA e UI

- [ ] La PWA deve funzionare su Chrome Android e PC, essere installabile, usare touchscreen, adattarsi a tablet da 7–10 pollici e supportare orientamento verticale/orizzontale.
- [ ] L'app deve funzionare offline per le funzionalità principali e non richiedere login nella prima versione.
- [ ] La dashboard deve mostrare logo, data/ora, totale prodotti, quasi terminati, esauriti, in scadenza, grandi pulsanti ENTRATA/USCITA, assistente vocale, inventario e lista spesa.
- [ ] Il design deve essere commerciale, moderno, leggibile, accessibile, con tema chiaro/scuro, colori coerenti, animazioni leggere e feedback visivi/sonori.

## Dominio, database e inventario

- [ ] IndexedDB tramite Dexie deve conservare inventario, aggiunte/rimozioni, prodotti riconosciuti, lista spesa, scadenze e storico offline.
- [ ] Ogni prodotto deve supportare id, barcode opzionale, nome, marca, categoria, immagine opzionale, quantità, unità, quantità minima, obiettivo, scadenza opzionale, note e date.
- [ ] Devono funzionare aggiunta manuale/scansione/voce, modifica, eliminazione con conferma, incremento/decremento, ricerca, filtri, ordinamento, categorie, esauriti, quasi terminati e storico.
- [ ] La quantità non deve mai essere negativa; non convertire automaticamente unità incompatibili; supportare pezzi, confezioni, bottiglie, vasetti, litri, millilitri, chilogrammi e grammi.
- [ ] Devono essere possibili lotti dello stesso prodotto con scadenze differenti.
- [ ] Backup JSON, ripristino JSON validato, CSV, migrazioni e protezione dalla perdita dati devono essere disponibili.

## Scanner e riconoscimento prodotti

- [ ] Lo scanner reale deve usare solo la fotocamera integrata e supportare EAN-13, EAN-8 e UPC-A quando il browser lo consente.
- [ ] Devono essere gestiti selezione fotocamera, permessi, feedback, errori, inserimento manuale, scansioni consecutive, duplicati involontari, undo e cambio ENTRATA/USCITA.
- [ ] Il riconoscimento deve cercare prima nel DB locale, poi opzionalmente Open Food Facts con cache e User-Agent appropriato, fallback manuale e funzionamento offline dei prodotti già registrati.
- [ ] La modalità demo deve distinguere chiaramente lo scanner simulato da quello reale.

## Voce, spesa, scadenze e standby

- [ ] Il parser italiano a regole deve supportare aggiunte, rimozioni, quantità, richieste inventario, lista della spesa e scadenze, anche via input testuale.
- [ ] Il riconoscimento vocale deve partire solo su richiesta quando supportato; le risposte vocali devono usare speech synthesis quando disponibile; i comandi ambigui devono chiedere conferma.
- [ ] La lista deve aggiornarsi da soglie minime/obiettivi, evitare duplicazioni, permettere quantità, stato acquistato, rimozione, copia/condivisione/esportazione e reintegro.
- [ ] Le scadenze devono supportare data, modifica, avvisi, scaduti, ordinamento, soglie 1/3/7 giorni configurabili e lotti.
- [ ] Lo standby deve mostrare una schermata nera dopo 30 secondi configurabili, riattivarsi al tocco e tornare alla dashboard senza dichiarare spegnimento fisico.

## Storico e demo

- [ ] Ogni movimento deve registrare prodotto, data/ora, tipo, quantità e metodo scanner/touch/voce/manuale; devono funzionare filtri, cronologia, undo e protezione duplicati.
- [ ] La demo isolata deve includere latte, uova, yogurt, mozzarella, burro, formaggio, acqua, prosciutto, verdure e frutta e non contaminare l'inventario personale.

## Qualità, sicurezza e documentazione

- [ ] TypeScript strict, ESLint, Vitest, build produzione e GitHub Actions devono essere configurati.
- [ ] I test devono coprire prodotti, modifiche, entrate/uscite, quantità non negative, barcode duplicati, soglie, lista, scadenze, storico, undo, parser, backup e ripristino.
- [ ] La documentazione italiana deve includere README, ARCHITECTURE, FEATURES, ANDROID, VOICE, SCANNER, ROADMAP e privacy, con limiti reali e istruzioni PC/Android/GitHub.
- [ ] Non inserire segreti, chiedere permessi solo quando necessari, non inviare immagini della fotocamera per la semplice lettura barcode e non registrare audio continuamente.
- [ ] Il progetto non deve essere pubblicato su GitHub finché non richiesto.
