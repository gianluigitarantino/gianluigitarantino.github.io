# GUIDA — Come pubblicare o rimuovere le fotografie

Questa è la procedura da seguire per sostituire le fotografie del sito da un
computer o da iPhone. Non servono Codex, Terminale o GitHub Desktop.

## 1. Preparare la galleria

Preparare **tutta la selezione finale** della sezione, non soltanto le fotografie
nuove.

I file devono essere:

- JPG;
- profilo colore sRGB;
- qualità circa 85–90;
- lato lungo da 2048 a 3000 px;
- preferibilmente sotto 10 MiB ciascuno;
- numerati nell'ordine desiderato: `01.jpg`, `02.jpg`, `03.jpg` e così via.

Se si carica un solo JPG, la galleria verrà sostituita con una sola fotografia.

## 2. Aprire la cartella corretta

Accedere con un account GitHub autorizzato a modificare il repository e aprire:

https://github.com/gianluigitarantino/gianluigitarantino.github.io/tree/main/carica-foto

Scegliere una cartella:

- `home`: homepage;
- `architettura`: pagina Architettura;
- `interior`: pagina Interior;
- `personale`: pagina Personale.

Aggiornare una sezione alla volta.

## 3. Caricare i file

Dentro la cartella scelta:

1. premere **Add file → Upload files**;
2. selezionare tutti i JPG della galleria finale;
3. controllare nomi, ordine e sezione;
4. premere **Commit changes** e confermare il salvataggio su `main`.

Il resto viene eseguito automaticamente.
Non occorre scrivere didascalie o alt text, né modificare le pagine del sito.

## 4. Aggiungere o rimuovere fotografie

L'automazione sostituisce sempre l'intera galleria della sezione scelta.

Per aggiungere fotografie:

1. preparare tutte le fotografie già presenti che si vogliono conservare;
2. aggiungere le nuove fotografie;
3. numerare nuovamente l'intera selezione da `01.jpg` in poi, senza salti;
4. caricare tutta la selezione finale nella cartella corretta.

Per rimuovere una fotografia:

1. preparare tutte le fotografie che devono rimanere, escludendo quella da rimuovere;
2. numerarle nuovamente da `01.jpg` in poi, senza salti;
3. caricare tutta la selezione finale nella cartella corretta.

Se non si hanno più tutti i JPG della selezione completa, fermarsi e chiedere a
Codex di recuperare la galleria esistente.

Non eliminare manualmente file dalla cartella `immagini` e non modificare le
pagine HTML: le vecchie versioni JPEG, WebP e AVIF vengono rimosse
automaticamente.

### Correggere un caricamento appena fatto

Se i JPG errati sono ancora visibili dentro `carica-foto`, aprire ogni file,
premere l'icona del cestino (**Delete this file**) e confermare con **Commit
changes**. Poi effettuare il caricamento corretto.

Se i file non sono più visibili, la pubblicazione è già iniziata o terminata:
non fare altre modifiche e chiedere a Codex di ripristinare la galleria.

## 5. Controllare la pubblicazione

Aprire:

https://github.com/gianluigitarantino/gianluigitarantino.github.io/actions

Attendere il segno verde accanto a **Pubblica sito e fotografie**, quindi
controllare la sezione aggiornata su:

https://www.gianluigitarantino.com

La pubblicazione può richiedere alcuni minuti. Se compare un segno rosso, non
ripetere il caricamento: chiedere a Codex di controllare il problema.

## Da iPhone

1. esportare o convertire le fotografie in JPG;
2. salvarle nell'app **File**, già numerate;
3. aprire GitHub con **Safari**;
4. se **Add file** non compare, premere **aA → Richiedi sito desktop**;
5. seguire la stessa procedura indicata sopra.

Non caricare direttamente file HEIC dall'app Foto.

## Importante

Il repository è pubblico. Caricare soltanto copie già destinate al sito, mai RAW,
originali d'archivio, file riservati o fotografie alla massima risoluzione.
