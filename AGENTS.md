# Indicazioni per Codex

Leggi README.md. Il progetto è buildless: dist/ contiene i sorgenti effettivi,
non file generati da ricompilare. Modifica direttamente questi file.

Priorità: smartphone, fluidità, stile rétro minimale, joystick e tre pulsanti.
Conserva offload e recupero automatico; non reintrodurre una ruck interattiva.
Le mischie difensive si risolvono automaticamente; quelle offensive hanno comandi.
La mira del calcio rallenta il mondo al 35%, ma input e potenza usano tempo reale.
La stamina non deve ridurre la velocità della corsa normale o bloccare i passaggi.

Usa npm test dopo modifiche al motore. Per UI e canvas installa le devDependencies.
Verifica il comportamento su touch e tastiera; non dichiarare performance su telefono
senza una prova reale. Nessuna dipendenza è necessaria per avviare il gioco.

Questa è una copia locale. Il manifest .openai/hosting.json identifica il sito
originale: non cambiarne identità o pubblicare modifiche senza una richiesta dell'utente.
Non sono presenti credenziali. Per pubblicare usa il flusso Sites autenticato disponibile.
