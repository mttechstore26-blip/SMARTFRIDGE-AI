# Architettura

SmartFridge AI è una PWA React + TypeScript con persistenza locale IndexedDB tramite Dexie. Il browser ospita sia la UI sia il database del dispositivo: non è richiesto un server per la prima versione.

## Flusso dati

La UI in `src/app/App.tsx` legge i dati tramite i servizi di dominio. `src/database/db.ts` definisce lo schema Dexie versionato. `src/services/inventoryService.ts` esegue le mutazioni inventario/storico in transazioni IndexedDB; `shoppingService.ts` calcola le righe automatiche dalla soglia minima e gestisce le righe manuali. `backupService.ts` valida e reimporta il formato JSON versionato.

Scanner, voce e rete sono moduli sostituibili: `src/scanner` usa ZXing solo quando l’utente avvia la fotocamera; `src/voice` separa SpeechRecognition, speech synthesis e parser a regole; `src/services/openFoodFacts.ts` è un arricchimento opzionale con fallback manuale. La modalità demo usa dati in memoria con prefisso `demo_` e non scrive sulle tabelle personali.

## Evoluzione futura

Capacitor può incapsulare la shell esistente. Un futuro backend dovrà aggiungere identità, sincronizzazione, risoluzione conflitti e protezione dei dati: IndexedDB non è una soluzione multi-dispositivo.
