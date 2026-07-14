# LEGGIMI — Come pubblicare le fotografie

Il sito può essere aggiornato da qualsiasi computer con un browser e anche da
iPhone. Il Mac abituale, Codex, il Terminale e GitHub Desktop non sono necessari
per la procedura online.

## Procedura consigliata: caricamento online

### 1. Preparare la galleria

Preparare copie già destinate al sito con queste caratteristiche:

- formato JPG;
- profilo colore sRGB;
- qualità circa 85–90;
- lato lungo da 2048 a 3000 px;
- nomi in ordine: `01.jpg`, `02.jpg`, `03.jpg` e così via.

La selezione deve essere **completa**. Se si carica un solo JPG, la pagina mostrerà
una sola fotografia.

Questo repository è pubblico: non caricare originali d'archivio, file riservati o
fotografie alla massima risoluzione.

### 2. Aprire il punto di caricamento

Accedere a GitHub e aprire:

```text
https://github.com/gianluigitarantino/gianluigitarantino.github.io/tree/main/carica-foto
```

Scegliere la cartella corretta:

- `home`: homepage;
- `architettura`: pagina Architettura;
- `interior`: pagina Interior;
- `personale`: pagina Personale.

### 3. Caricare i JPG

Dentro la cartella della sezione:

1. premere **Add file → Upload files**;
2. trascinare o selezionare tutti i JPG della galleria finale;
3. controllare che i nomi inizino con `01`, `02`, `03` e così via;
4. premere **Commit changes**.

È preferibile aggiornare una sezione alla volta.

### Da iPhone

1. esportare o convertire prima le immagini in JPG;
2. salvarle nell'app **File**, già numerate `01.jpg`, `02.jpg`, `03.jpg`;
3. aprire il collegamento di caricamento con **Safari**;
4. se **Add file** non compare, premere **aA → Richiedi sito desktop**;
5. usare **Add file → Upload files** e scegliere i JPG dall'app File;
6. premere **Commit changes** e controllare il risultato nella scheda **Actions**.

Non caricare direttamente file HEIC dall'app Foto: l'automazione accetta JPG e
JPEG. GitHub permette dal browser fino a 100 file alla volta e richiede che ogni
file sia inferiore a 25 MiB.

### 4. Attendere la pubblicazione

GitHub avvia automaticamente il workflow **Pubblica sito e fotografie**, che:

1. controlla nomi, formato e dimensioni;
2. crea JPG e WebP ottimizzati;
3. aggiorna le pagine italiane e inglesi;
4. elimina i file temporanei dalla cartella di caricamento;
5. salva le modifiche nel repository;
6. genera e pubblica GitHub Pages.

Lo stato si vede nella scheda **Actions** del repository. Un segno verde indica che
l'operazione è riuscita. La pubblicazione del sito può richiedere alcuni minuti.

Se compare un segno rosso, non ripetere il caricamento: i JPG restano disponibili
e si può chiedere a Codex di controllare e riavviare il processo.

## Se il Mac non è disponibile

Il sito, l'automazione, le guide e tutte le fotografie già pubblicate rimangono su
GitHub. Da un altro computer o da iPhone basta accedere al proprio account GitHub
e seguire la procedura online. Non è necessario ricostruire il sito o installare
programmi.

Questa automazione protegge la possibilità di gestire il sito, non sostituisce il
backup dell'archivio fotografico originale. Conservare gli originali anche su un
servizio cloud o su un secondo disco.

## Procedura alternativa con Codex sul Mac

Se si usa il Mac abituale:

1. esportare JPG in sRGB, qualità 90 e lato lungo di circa 4000 px;
2. inserirli nella sezione corretta dentro `foto-sorgenti`;
3. scrivere a Codex, per esempio:
   `Ho inserito le fotografie in architettura. Controlla e pubblica.`

Codex eseguirà ottimizzazione, verifica, commit e push.

## Procedura manuale con GitHub Desktop

In assenza di Codex ma usando il Mac configurato:

1. inserire la selezione completa dentro `foto-sorgenti`;
2. fare doppio clic su `Aggiorna portfolio.command`;
3. attendere **Operazione completata**;
4. aprire GitHub Desktop;
5. eseguire **Commit to main** e **Push origin**.

## Controllo rapido online

- [ ] JPG in sRGB, lato lungo da 2048 a 3000 px
- [ ] Selezione completa della sezione
- [ ] File numerati nell'ordine desiderato
- [ ] Cartella online corretta
- [ ] Da iPhone: JPG salvati nell'app File, non HEIC
- [ ] Commit changes
- [ ] Workflow verde nella scheda Actions
- [ ] Controllo del sito online
