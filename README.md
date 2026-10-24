# rugbyLove

Progetto completo di rugby arcade 7 contro 7, esportato il 21 ottobre 2026.
Campo attuale di 684 × 1128,6 unità: lunghezza ridotta di un ulteriore 10%, larghezza invariata.
Velocità di movimento dei giocatori aumentata del 7% per entrambe le squadre e tutti i ruoli.
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

## Profili dei giocatori

Profili fissi e uguali per entrambe le squadre: 9 e 10 registi, 12 e 13 potenti,
11, 14 e 15 agili. Il profilo compare accanto al ruolo del giocatore selezionato.
I potenti hanno corporatura più robusta, una finestra di sfondamento più lunga
e placcaggi più pronti; gli agili scattano e schivano più velocemente;
i registi calciano il 35% più lontano, mantenendo la mira esatta mostrata a schermo.
Riserva di stamina: agili 132, registi 110, potenti 99. La lunghezza della barra
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
velocità ordinaria cala del 18% per entrambe le squadre: un compagno
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
- `dist/assets/club-opening-2026-10.png`: illustrazione geometrica del menu.
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
lo scatto consuma il 20% in più e lo sfondamento costa 36 punti. A barra vuota lo
scatto resta sospeso finché non recuperi almeno 25 punti; la corsa normale mantiene la velocità. Placcaggi, calci, schivate e sfondamenti
mantengono i propri costi. Recupero automatico nelle pause, più rapido da fermo e del 9% più veloce senza palla (per entrambe le squadre, cumulato con il bonus nazionale).
La velocità della corsa normale resta invariata e i passaggi restano gratuiti. Nessuna ruck interattiva.

Questa copia contiene il nostro gioco; non contiene i file del gioco commerciale
Retro Rugby (lo ZIP ricevuto conteneva soltanto una cartella vuota).
Il sito originale è https://rugby-retro-blitz.soundmouse16.chatgpt.site.
Le modifiche locali non lo aggiornano automaticamente. Non sono incluse credenziali,
cache o dipendenze installate, né la cronologia Git.

Su smartphone con puntatore touch i giocatori sono ingranditi del 10%; desktop invariato.
Il calcio d’inizio della tua squadra, anche dopo una meta subita, attende CALCIA/L: tieni, orienta e rilascia per scegliere direzione e potenza. La battuta avversaria resta automatica.

La mischia offensiva attende DUELLA (pulsante touch oppure B, K o spazio): la prima pressione avvia il richiamo di 0,4 secondi, seguito dal duello di 4 secondi. Durante l’attesa tempo e bilanciamento restano fermi; la difesa resta automatica.

I giocatori possono recuperare il pallone in tutta l’area di meta. Se una palla libera supera la linea laterale o il fondo dell’area di meta, una rimessa automatica arcade assegna il possesso all’altra squadra dentro il campo; le linee esterne non fanno rimbalzare il pallone.

I calci d’inizio e dopo meta sono sempre alti, anche con un tocco breve: la potenza regola la distanza senza passare al rasoterra. Il tempo di volo permette ai due inseguitori più vicini di ogni squadra di contendere la ricezione. Se il giocatore selezionato è tra loro, segue la zona di caduta finché il joystick è neutro; muovilo per riprendere subito il controllo.

Quando una palla alta scende vicino al giocatore, B / K / spazio diventa CONTENDI: premi per saltare. L’anello verde indica il momento migliore; posizione e tempismo migliorano la presa senza garantirla. Costa 8 energia, con un breve recupero prima di riprovare. Anche gli avversari contendono. Nella finestra finale di 0,65 secondi di simulazione il gioco procede al 70%, solo se sei vicino e abilitato alla contesa; risale subito alla velocità normale dopo ricezione o atterraggio. Senza premere, il recupero rimane automatico.


## Sei nazionali

Dal menu scegli Italia, Francia, Irlanda, Inghilterra, Scozia o Galles e la tua
avversaria. La scelta resta disponibile per rivincita e ritorno al menu. Non si
possono selezionare due nazionali identiche: cambiando una selezione, l'altra
viene sostituita se necessario. Tabellone, mischie, conversioni, mete, risultato
e scritte sul campo seguono le nazionali selezionate.

Identità arcade, non classifiche o statistiche reali:

| Nazionale | Vantaggio | Compromesso |
| --- | --- | --- |
| Italia | Recupero energia +6% | Finestra sfondamento −6% |
| Francia | Finestra sfondamento +6% | Recupero energia −6% |
| Irlanda | Velocità del passaggio +6% entro i limiti esistenti | Finestra sfondamento −6% |
| Inghilterra | Distanza calci e forza in mischia +4% | Velocità della schivata −8% |
| Scozia | Velocità della schivata +6% | Efficacia del placcaggio −6% |
| Galles | Efficacia del placcaggio +6% | Distanza calci −6% |

Il placcaggio modifica durata del tuffo e prontezza del contrasto automatico,
non garantisce la riuscita. Restano i sette profili di ruolo, i costi delle
azioni e i tempi reali della mira. Nessuna nazionale modifica corsa ordinaria,
capacità della stamina, costo dei passaggi o velocità del caricamento. La CPU
può sfondare o schivare dopo aver osservato l'avvicinamento di un difensore,
con gli stessi costi e finestre del giocatore. La difficoltà preesistente resta
separata dai bonus nazionali.

Le divise usano la stessa grafica procedurale e palette smorzata. Negli scontri
tra Italia, Francia e Scozia, l'avversaria veste avorio per evitare maglie
confondibili. Nessuna immagine, libreria o connessione aggiuntiva richiesta.

- `dist/teams.mjs`: identità, bonus, divise e gestione abbinamenti.
- `npm run test:render`: include divise nazionali e tre inquadrature.
- `npm run check:nations`: 30 abbinamenti a difficile, con giocatore scriptato,
  seed fisso e tempi da 30 secondi; salva `qa/nations-check.json`. Verifica che
  le partite finiscano e che le coordinate restino valide, non misura le
  probabilità di vittoria di un giocatore umano. Il bilanciamento competitivo richiede
  ancora partite giocate, non è certificato dalle simulazioni.

Il menu offre partita singola e torneo Six Nations. Il sito originale Sites resta separato.


## Recupero senza palla e verifica Classica

Chi non porta la palla recupera energia il 9% più velocemente, quando il recupero
è già consentito (fermo o movimento lento). Vale per entrambe le squadre, anche
per il passatore durante il volo del pallone. Il bonus moltiplica quello nazionale;
non elimina l'attesa dopo un'azione, non ricarica durante uno scatto e non supera
la capacità del ruolo. La stamina esaurita impedisce lo scatto ma non rallenta più
la corsa ordinaria; passaggi sempre gratuiti.

`npm run check:nations -- normal 60` simula i 30 abbinamenti a Classica con due
tempi da un minuto. Il bot sceglie spazio davanti a sé, scatta, sfonda e passa
sotto pressione; identico nelle due versioni confrontate, con seed 2026.
Nel confronto del 23 ottobre 2026 gli 0–0 sono scesi da 23 a 12 su 30 partite,
le mete del bot sono passate da 7 a 22. Italia–Irlanda: da 0–0 a 7–0.
È una verifica automatica del motore, non una prova su smartphone né una stima
della probabilità di vittoria umana; in questo campione la CPU non ha segnato.

## Menu Six Nations

La schermata iniziale usa il titolo Six Nations, una coppa dorata disegnata in
SVG e sei bandiere rétro locali. I selettori aggiornano bandiera e sette barre:
potenza, difesa, agilità, passaggi, calci, mischia e recupero. Le barre evidenziano i
modificatori nazionali su una scala da −10% a +10%, con tacca centrale sulla
base e percentuali esplicite; non sono voti inventati né classifiche reali. Restano il font, la palette e i
comandi del gioco. Questa modifica riguarda il menu; la modalità disponibile
è ancora partita singola, indicata sotto il titolo.


## Ritocco campo, stamina e calci

Capacità di ogni ruolo aumentata del 10%: Regista 110, Potente 99, Agile 132.
Campo e linee ridotti del 5% su entrambi gli assi. La scala della telecamera su
smartphone resta quella precedente per non ingrandire i giocatori sullo schermo.
Distanza dei calci aumentata del 5%, inclusi rasoterra e ripartenze automatiche;
la portata è indipendente dalla riduzione del campo e resta limitata dai bordi.
Costi delle azioni, recupero, velocità, dimensioni dei giocatori e tempi di mira
rimangono invariati. Le conversioni mantengono il minigioco esistente.


## Attacco più accessibile e Six Nations

I sostegni giocano meno profondi: il ricevitore si orienta in avanti durante il
passaggio, anche se prima stava arretrando. Dopo la ricezione prosegue per 0,3 secondi
con joystick neutro; un input direzionale riprende immediatamente il controllo.
Non riceve un bonus di velocità. La finestra offload resta di 0,34 secondi.
«SFONDA ORA» segnala un difensore frontale a distanza utile quando hai energia;
durante la mira, «INSEGUI» evidenzia il giocatore abilitato più vicino alla destinazione.

La CPU corre alla stessa velocità ordinaria nelle tre difficoltà. Cambiano i tempi
di lettura, riposizionamento e preparazione del placcaggio: a Classica il contrasto
automatico prepara per 0,24 secondi prima dei modificatori del ruolo e della nazionale.
Il bonus di inseguimento CPU diminuisce con la distanza; un difensore vicino può
ancora recuperare il portatore. Un passaggio azzera la preparazione dei soli
difensori vicini al passatore, lasciando attiva la copertura lontana.

Six Nations comprende cinque giornate: affronti una volta ciascuna delle altre
nazionali. Durata, difficoltà e mischie rimangono quelle scelte all'inizio.
Classifica: vittoria 4 punti, pareggio 2; bonus per quattro mete e sconfitta entro
sette punti; cinque vittorie danno altri 3 punti. Pari punti: differenza punti,
poi mete; ulteriore parità condivisa. Le altre due partite della giornata sono
simulate con punteggi arcade bassi, indipendentemente dal risultato del giocatore.
Calendario, classifica e coppa finale sono consultabili dopo la partita.
La regola dei bonus segue il [sistema Six Nations](https://www.sixnationsrugby.com/en/m6n/championship-history-mens);
il calendario e i risultati sono quelli del gioco.

Il torneo si salva nel browser dopo ogni giornata. «Riprendi» conserva risultati
e impostazioni: una partita lasciata a metà ricomincia dall'inizio senza aggiungere
risultati. Se lo storage non è disponibile, la sessione prosegue nella scheda e
il menu mostra un avviso. Iniziare un nuovo torneo sostituisce quello salvato.

Verifica del 23 ottobre: 30 abbinamenti Classica con due tempi da 60 secondi,
stesso bot e seed 2026: mete del bot da 23 a 59, passaggi da 2694 a 1363,
pareggi 0–0 da 8 a 0. Nessuna meta CPU in questo campione: il bot difende molto
efficacemente. Questi numeri verificano progressione e completamento delle partite,
non rappresentano le probabilità umane; il riferimento resta il riscontro del
giocatore, che prima faticava a segnare anche una meta a Classica.

## Aiuti di lettura e inseguimento

Il passaggio automatico del giocatore preferisce una linea libera fra sostegni
di distanza e profondità comparabili, evitando di arretrare molto solo per sicurezza;
se orienti il joystick verso un compagno, la tua scelta rimane disponibile anche
se rischiosa. Se tutte le linee sono marcate il passaggio resta consentito.
Questo aiuto non modifica la scelta della CPU né la finestra degli offload.

Anche durante i calci in azione, alti e rasoterra, il giocatore selezionato
segue la palla con joystick neutro se è tra i due inseguitori abilitati più vicini.
Un input direzionale riprende subito il controllo. Non aumenta la velocità,
non salta automaticamente e non abilita giocatori in fuorigioco.

La mira mostra «DIFESA VICINA» quando un avversario attivo si trova entro 80 unità
dal punto di caduta, altrimenti «SPAZIO»: descrive la posizione attuale,
non garantisce la ricezione. I suggerimenti ricordano quando sfondare e che lo
scatto torna disponibile a 25 energia, mentre corsa normale e passaggi restano liberi.

## Corsa alla meta · Arcade

Nuova sezione dal menu, disponibile anche in `arcade.html`: un portatore corre
in automatico e affronta ondate di difensori. Joystick o WASD/frecce muovono il
portatore; J/spazio attiva lo scatto (20 energia), K la schivata nella direzione
scelta (22), L lo sfondamento di un difensore (32). Senza direzione, la schivata
va verso il centro. L'energia recupera automaticamente e torna piena alla meta.
Ogni 160 metri una meta aumenta densità, velocità e inseguimento delle ondate,
con limiti massimi e almeno una corsia libera alla comparsa di ogni fila.
Un placcaggio termina la corsa; distanza, mete e difensori superati danno punti.
Record locale sul browser, con funzionamento in sessione se lo storage è negato.
P/Escape mette in pausa; cambio scheda o perdita di focus sospendono la corsa.
Motore, controlli e rendering sono separati nei moduli `dist/arcade-*.mjs`.

`npm run test:arcade` verifica collisioni, progressione, comandi touch/tastiera,
pausa, riprova e storage, con adapter DOM e canvas reale. Salva
`qa/arcade-field.png`; non sostituisce una prova interattiva su smartphone.


## Sfida di calci · Arcade

Dal menu o da `kicks.html`: gara di piazzati con tre errori disponibili e record
locale separato da Corsa alla meta. Ogni centro aumenta il livello: distanza
in profondità da 28 a 52 metri, posizioni alternate fino a 23 metri sui lati,
indicatori più veloci e finestra di precisione più stretta. Dal livello 5 il vento
laterale sposta il pallone; distanza totale, posizione e deviazione sono visibili.
I parametri hanno limiti massimi: ogni tiro resta tecnicamente realizzabile.

Joystick, A/D o frecce sinistra/destra regolano la mira; i due pulsanti laterali
permettono la stessa regolazione. Premi il pulsante centrale (K, L o spazio)
per fermare prima la potenza, poi la precisione. La zona verde della precisione
tiene conto di mira e vento. Dopo il volo, PROSSIMO prepara il tiro successivo.
La potenza deve raggiungere la zona verde; anche una precisione buona non salva
un tiro corto. La traiettoria attraversa il piano dei pali nello stesso punto
usato per assegnare il centro. Il record si aggiorna dopo ogni tiro risolto.
P/Escape, cambio scheda e perdita di focus sospendono indicatori e volo.

Punti per centri, livello, distanza e serie consecutive, con bonus per il centro
perfetto. Tre errori terminano la gara; RIPROVA riparte da 28 metri in profondità e 6 metri a destra.
La gara funziona senza dipendenze e senza storage; quando il salvataggio è negato,
il record resta disponibile in sessione e compare un avviso.

`npm run test:kicks` verifica progressione, traiettoria/punteggio, vento,
comandi touch/tastiera, pausa, record e riprova. Genera quattro immagini
`qa/kicks-*.png`. Test con adapter DOM e canvas: non sono una prova su telefono.

I due minigiochi si avviano dalla sezione «Minigiochi Arcade» subito sotto il
logo nella pagina iniziale, sopra il campo e fuori dal menu scorrevole.


Difficoltà iniziale Arcade aumentata: Corsa alla meta parte con 3 difensori per
fila, ritmo 175 unità/s (prima 140), ondate ogni 1,7 secondi (prima 2,15) e
inseguimento più pronto. Il primo gruppo arriva dopo 1 secondo. Restano almeno
una corsia libera per fila alla comparsa e i limiti finali di 5 difensori e 230 unità/s.
Sfida di calci parte da circa 29 metri di distanza totale, già angolata; indicatore
iniziale da 0,62 a 0,82 e finestra base di precisione da 0,15 a 0,12 prima della
penalità per l'angolo. Restano tre errori, progressione e vento dal livello 5.
I record locali già salvati sono conservati.
