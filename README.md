# rugbyLove

Progetto completo di rugby arcade 7 contro 7, esportato il 21 ottobre 2026.
Versione sorgente: `624030572eda7c7136c26fde5a3b4c7866d5ba41`.

## Aprire con Codex

1. Estrai lo ZIP: contiene la cartella `rugbyLove`.
2. Apri questa cartella come progetto nella tua installazione di Codex.
3. Chiedi: «Leggi README.md e AGENTS.md, avvia il gioco e aiutami a modificarlo».

## Giocare in locale

Con Node.js 20 o superiore, apri un terminale nella cartella ed esegui:

```sh
npm start
```

Apri http://localhost:8080. Per giocare non servono installazioni npm né build.
Alternativa con Python: `python3 -m http.server 8080 --directory dist`.
Non aprire index.html direttamente con file://: il gioco usa moduli JavaScript.

## Struttura

- `dist/index.html`: schermate, pannelli e comandi touch.
- `dist/style.css`: layout responsive e stile rétro.
- `dist/engine.mjs`: simulazione, IA, stamina, passaggi, contrasti e regole arcade.
- `dist/game.mjs`: input, audio, interfaccia e ciclo di gioco.
- `dist/render.mjs`: campo, giocatori, telecamera e indicatori.
- `dist/conversion-render.mjs`: visuale delle conversioni.
- `tests/`: test del motore, adapter DOM e verifiche canvas.
- `tools/`: server locale e avvio test.
- `.openai/hosting.json`: identificativo del sito originale; non necessario in locale.

## Test

`npm test` esegue i test del motore senza dipendenze.
Per i test grafici: `npm install`, poi `npm run test:ui` oppure `npm run test:render`.
Le immagini di verifica vengono salvate in `qa/`.
I test DOM/canvas non sostituiscono una prova su smartphone reale.
Se la suite UI termina per limiti di memoria, esegui i singoli scenari con
`node --test --test-name-pattern="nome dello scenario" tests/ui.test.mjs`.

## Comandi

Joystick o WASD/frecce per muoversi. PASSA/J per passare o scegliere il difensore;
SFONDA/PLACCA con spazio o K, pressione prolungata per scattare in attacco.
Tieni CALCIA/L, orienta e rilascia. Durante la mira il mondo procede al 35%;
la potenza raggiunge il massimo in 3 secondi reali. PASSA annulla.
Escape/P mette in pausa. Le conversioni usano due pressioni per potenza e precisione.

## Stato del progetto

Ricezioni in corsa, ripartenze senza riallineare le squadre, offload, mischie arcade
opzionali con difesa automatica, passaggi direzionati e difesa assistita.
Energia individuale: corsa normale e passaggi gratuiti, consumo nelle azioni,
recupero automatico più rapido da fermo. Nessuna ruck interattiva.

Questa copia contiene il nostro gioco; non contiene i file del gioco commerciale
Retro Rugby (lo ZIP ricevuto conteneva soltanto una cartella vuota).
Il sito originale è https://rugby-retro-blitz.soundmouse16.chatgpt.site.
Le modifiche locali non lo aggiornano automaticamente. Non sono incluse credenziali,
cache o dipendenze installate, né la cronologia Git.
