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
Tieni CALCIA/L, orienta e rilascia. Durante la mira il mondo procede al 25%;
la potenza raggiunge il massimo in 3 secondi reali. PASSA annulla.
Escape/P mette in pausa. Le conversioni usano due pressioni per potenza e precisione.

## Profili dei giocatori

Profili fissi e uguali per entrambe le squadre: 9 e 10 registi, 12 e 13 potenti,
11, 14 e 15 agili. Il profilo compare accanto al ruolo del giocatore selezionato.
I potenti hanno corporatura più robusta, una finestra di sfondamento più lunga
e placcaggi più pronti; gli agili scattano e schivano più velocemente;
i registi calciano il 35% più lontano, mantenendo la mira esatta mostrata a schermo.
Riserva di stamina: agili 120, registi 100, potenti 90. La lunghezza della barra
rappresenta la capacità; il riempimento indica l’energia residua. I costi delle azioni
restano in punti, quindi una riserva maggiore permette uno sforzo più lungo.
Il Potente può provocare un pallone libero con un placcaggio manuale frontale
ben centrato: almeno 35 punti alla partenza, costo totale 25 in caso di riuscita
(12 per il tentativo normale), attesa di 6 secondi tra due successi.
Quando il Potente è pronto e davanti al portatore a distanza utile, «PLACCA ORA» segnala
l’occasione: un tocco su PLACCA (o K/spazio) esegue il tuffo. Il placcaggio perfetto
ha un fermo d’impatto di 65 ms, un’onda dorata e un suono dedicato quando l’audio è attivo.
Entrambe le squadre possono recuperare automaticamente il pallone; nessun nuovo comando.
Corsa normale e passaggi non dipendono dalla stamina. Con la palla in mano la
velocità ordinaria cala leggermente (10%) per entrambe le squadre: un compagno
senza palla o un difensore può guadagnare terreno. I tempi reali di caricamento
restano uguali per tutti.

## Stile visivo: paesaggio geometrico

Direzione ispirata ad Art of Rally: verdi salvia, avorio e terracotta, superfici
pulite, alberi e colline sfaccettati, ombre diagonali. Giocatori a volumi semplici,
divise blu e avorio, numeri bitmap leggibili e pallone chiaro.
Campo e paesaggio sono disegnati una volta; lo sfondo delle conversioni viene
memorizzato e rigenerato solo al cambio di dimensioni.

- `dist/art.mjs`: palette condivisa e paesaggio delle conversioni.
- `dist/theme.css`: interfaccia, tabellone e controlli nella nuova palette.
- `dist/assets/club-lowpoly.png`: immagine originale del menu reinterpretata in stile low-poly.
- `dist/assets/silkscreen-regular.ttf`: font incluso localmente, licenza in `SILKSCREEN-LICENSE.txt`.

Non servono servizi font o dipendenze aggiuntive per giocare. Le verifiche visive
producono anche `qa/player-style.png` con le due divise e le pose principali.

## Attacco in movimento

Alle ripartenze le squadre si dispongono in uno schema da rugby a sette:
9 al calcio d'inizio, 10 in appoggio, 12 e 13 nei canali centrali, 11 e 14
larghi sulle fasce, 15 profondo in copertura. La squadra che riceve ha una
prima linea pronta a contendere il calcio e il 15 arretrato. Lo schieramento
si specchia nel secondo tempo; durante l'azione i giocatori seguono i varchi
e mantengono le proprie opzioni di sostegno.

Avvicinati a un difensore che ti sta venendo incontro e passa: deve completare
il suo appoggio prima di girarsi verso il ricevitore. La copertura rimane libera.
Dopo un passaggio corto, chi ha passato gira dietro al compagno per offrirsi
all’esterno: l’anello azzurro e «UNO-DUE» indicano il ritorno disponibile.
Puoi restituire la palla con PASSA oppure continuare la corsa e giocare sull’altro lato.

Un tocco breve su CALCIA/L produce un rasoterra da inseguire: il pallone rimbalza
basso e può essere raccolto anche lungo il tragitto, da entrambe le squadre.
Tenendo premuto oltre circa 0,28 secondi si prepara invece un calcio alto.
La mira mostra tipo e destinazione prima del rilascio; PASSA annulla.
I compagni davanti al calciatore restano soggetti alle regole del fuorigioco.

## Atmosfera della partita

Quando il portatore supera quasi tutta la difesa, una scia discreta accompagna la corsa
e il pubblico cresce avvicinandosi alla meta (con audio attivo). Alla segnatura
compaiono raggi dorati e coriandoli pixel. Gli effetti non modificano velocità,
placcaggi o punteggio e non richiedono comandi aggiuntivi.

## Stato del progetto

Ricezioni in corsa, ripartenze senza riallineare le squadre, offload, mischie arcade
opzionali con difesa automatica, passaggi direzionati e difesa assistita.
Energia individuale: la corsa continua consuma gradualmente energia dopo due secondi;
lo scatto prolungato costa di più. Placcaggi, calci, schivate e sfondamenti
mantengono i propri costi. Recupero automatico nelle pause, più rapido da fermo.
La velocità della corsa normale resta invariata e i passaggi restano gratuiti. Nessuna ruck interattiva.

Questa copia contiene il nostro gioco; non contiene i file del gioco commerciale
Retro Rugby (lo ZIP ricevuto conteneva soltanto una cartella vuota).
Il sito originale è https://rugby-retro-blitz.soundmouse16.chatgpt.site.
Le modifiche locali non lo aggiornano automaticamente. Non sono incluse credenziali,
cache o dipendenze installate, né la cronologia Git.
