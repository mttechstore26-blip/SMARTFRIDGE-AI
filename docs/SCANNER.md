# Scanner

Il modulo usa `@zxing/browser` e la fotocamera integrata quando il browser espone `getUserMedia`; cerca una camera posteriore/ambientale quando l’etichetta del dispositivo lo consente. Sono gestiti EAN-13, EAN-8 e UPC-A tramite decoder multi-formato. Se il permesso manca, la camera non esiste o il contesto non è HTTPS/localhost, il codice può essere inserito manualmente.

La modalità demo è esplicita e propone codici simulati. I prodotti già associati vengono trattati offline; per un codice sconosciuto l’app prova Open Food Facts online e poi apre la scheda manuale. La fotocamera non viene inviata a un server per leggere il codice.
