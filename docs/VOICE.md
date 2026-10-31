# Voce

Il pulsante Ehi Frigo avvia il riconoscimento vocale del browser solo dopo un’azione dell’utente. Il testo riconosciuto passa al parser a regole in `src/voice/voiceParser.ts`. Sono supportati aggiunta, consumo, quantità, interrogazione inventario, lista della spesa e prodotti in scadenza; lo stesso parser è disponibile nel campo testuale.

`SpeechRecognition` dipende dal browser e può richiedere rete. `speechSynthesis` è usato per le risposte solo quando disponibile. La wake word “Ehi Frigo” è una direzione architetturale, non un ascolto continuo implementato: una PWA non deve dichiarare ascolto a schermo spento.
