# Caricamento online delle fotografie

Questa cartella permette di aggiornare il sito da qualsiasi computer o da iPhone,
senza Codex, Terminale o GitHub Desktop.

## Procedura

1. Aprire la cartella della sezione da aggiornare.
2. Usare **Add file → Upload files**.
3. Caricare la selezione completa dei JPG nell'ordine finale.
4. Premere **Commit changes**.
5. Attendere il completamento del workflow **Pubblica sito e fotografie** nella
   scheda **Actions**.

## Da iPhone

1. Convertire o esportare le fotografie in JPG e salvarle nell'app **File**.
2. Aprire questa cartella con **Safari**.
3. Se **Add file** non compare, premere **aA → Richiedi sito desktop**.
4. Caricare dall'app File tutta la galleria numerata, quindi premere
   **Commit changes**.
5. Controllare che il workflow nella scheda **Actions** diventi verde.

Non caricare HEIC direttamente dall'app Foto: l'automazione accetta JPG e JPEG.
L'upload web consente fino a 100 file contemporaneamente, ciascuno sotto 25 MiB.

Le cartelle disponibili sono:

- `home` per la homepage;
- `architettura` per Architettura;
- `interior` per Interior;
- `personale` per Personale.

## Preparazione dei file

- formato JPG;
- profilo sRGB;
- lato lungo da 2048 a 3000 px;
- qualità circa 85–90;
- peso consigliato inferiore a 10 MiB per file;
- nomi `01.jpg`, `02.jpg`, `03.jpg` e così via.

La cartella deve ricevere **tutta la galleria finale**, non soltanto le nuove foto.
L'automazione crea i file ottimizzati, aggiorna italiano e inglese, elimina i JPG
temporanei dalla cartella di caricamento e pubblica il sito.

Il peso finale è controllato automaticamente: massimo 1,5 MiB per il JPG di
fallback, 1,25 MiB per il WebP grande e 400 KiB per il WebP da 960 px. Se questi
limiti non possono essere rispettati, la galleria esistente non viene sostituita.

## Importante

Questo è un repository pubblico. Caricare qui soltanto copie già destinate al sito,
mai originali d'archivio, file riservati o fotografie alla massima risoluzione.
I file caricati possono rimanere nella cronologia Git anche dopo la rimozione
automatica.
