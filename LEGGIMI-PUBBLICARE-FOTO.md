# LEGGIMI — Come pubblicare le fotografie

Questa guida va usata ogni volta che si aggiornano le fotografie su
`gianluigitarantino.com`.

## Procedura consigliata: pubblicare con Codex

### 1. Preparare i JPG

Esportare le fotografie con queste impostazioni:

- formato: JPG;
- profilo colore: sRGB;
- qualità: circa 90;
- lato lungo: circa 4000 px (minimo consigliato 2500 px);
- nomi in ordine: `01.jpg`, `02.jpg`, `03.jpg` e così via.

Non creare WebP o AVIF: vengono prodotti automaticamente.

### 2. Aprire la cartella delle fotografie

Nel Finder premere **Comando + Maiuscole + G** e incollare:

```text
/Users/gianluigitarantino/Documents/Codex/2026-07-13/ho/gianluigitarantino.github.io/foto-sorgenti
```

Scegliere la cartella corretta:

- `home`: homepage;
- `architettura`: pagina Architettura;
- `interior`: pagina Interior;
- `personale`: pagina Personale.

Non inserire manualmente fotografie nella cartella `immagini`.

### 3. Inserire la selezione completa

La cartella della sezione deve contenere **tutta la galleria finale**, non soltanto
le nuove fotografie. Se contiene un solo JPG, online resterà una sola fotografia.

Esempio:

```text
foto-sorgenti/architettura/
├── 01.jpg
├── 02.jpg
├── 03.jpg
└── 04.jpg
```

Per cambiare l'ordine basta cambiare i numeri. La homepage è indipendente: se la
stessa fotografia deve apparire anche lì, inserirne una copia nella cartella `home`.

### 4. Chiedere a Codex di pubblicare

Dopo aver inserito i JPG, scrivere a Codex indicando la sezione:

```text
Ho inserito le fotografie in architettura. Controlla e pubblica.
```

Non è necessario aprire `Aggiorna portfolio.command` o GitHub Desktop.

Codex eseguirà:

1. controllo del repository e dei nomi dei file;
2. verifica di formato e dimensioni;
3. ottimizzazione delle fotografie;
4. aggiornamento delle pagine italiane e inglesi;
5. controllo delle modifiche;
6. commit e push su GitHub;
7. conferma dell'avvenuta pubblicazione.

### 5. Controllare il sito

Dopo la conferma di Codex, attendere qualche minuto e controllare la sezione online.
Se qualcosa non convince, chiedere a Codex di correggerla.

## Procedura alternativa senza Codex

Se si desidera procedere autonomamente:

1. fare doppio clic su `Aggiorna portfolio.command`;
2. attendere il messaggio **Operazione completata**;
3. aprire GitHub Desktop;
4. scrivere un titolo nel campo **Summary**;
5. premere **Commit to main**;
6. premere **Push origin**;
7. controllare il sito dopo qualche minuto.

## Da ricordare

- I JPG dentro `foto-sorgenti` restano solo sul Mac: conservarne anche un backup.
- La cartella della sezione deve sempre contenere la selezione completa.
- Non caricare immagini o modificare le gallerie dal sito web di GitHub.
- Se qualcosa è stato modificato da GitHub web, segnalarlo a Codex prima di pubblicare.
- GitHub Desktop è facoltativo: serve solo per lavorare autonomamente senza Codex.
- La scorciatoia alla guida si trova anche in `Documenti/Codex`.

## Controllo rapido consigliato

- [ ] JPG in sRGB, circa 4000 px sul lato lungo
- [ ] Sezione corretta e selezione completa
- [ ] Numerazione nell'ordine desiderato
- [ ] Messaggio a Codex con il nome della sezione
- [ ] Conferma di pubblicazione ricevuta
- [ ] Controllo del sito online
