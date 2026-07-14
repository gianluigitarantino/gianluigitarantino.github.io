# LEGGIMI — Come pubblicare le fotografie

Questa è la procedura completa da seguire ogni volta che si aggiornano le fotografie
su `gianluigitarantino.com`.

## 1. Preparare i JPG

Esportare le fotografie con queste impostazioni:

- formato: JPG;
- profilo colore: sRGB;
- qualità: circa 90;
- lato lungo: circa 4000 px (minimo consigliato 2500 px);
- nomi in ordine: `01.jpg`, `02.jpg`, `03.jpg` e così via.

Non creare WebP o AVIF: vengono prodotti automaticamente.

## 2. Aprire la cartella del sito

In GitHub Desktop selezionare il repository e usare **Repository → Show in Finder**.

Il percorso locale è:

```text
/Users/gianluigitarantino/Documents/Codex/2026-07-13/ho/gianluigitarantino.github.io
```

Aprire `foto-sorgenti` e scegliere la cartella corretta:

- `home`: homepage;
- `architettura`: pagina Architettura;
- `interior`: pagina Interior;
- `personale`: pagina Personale.

Non inserire manualmente fotografie nella cartella `immagini`.

## 3. Inserire la selezione completa

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

## 4. Generare il sito

Tornare nella cartella principale e fare doppio clic su:

```text
Aggiorna portfolio.command
```

Attendere il messaggio **Operazione completata**. Il comando ridimensiona le
fotografie, crea JPG e WebP ottimizzati e aggiorna le pagine italiane e inglesi.

Se compare un errore, non pubblicare: conservare il messaggio e chiedere a Codex.

## 5. Pubblicare con GitHub Desktop

1. Aprire GitHub Desktop e controllare le modifiche.
2. Nel campo **Summary** scrivere, per esempio, `Aggiorna fotografie architettura`.
3. Premere **Commit to main**.
4. Premere **Push origin**.
5. Attendere qualche minuto e controllare il sito online.

## Da ricordare

- I file dentro `foto-sorgenti` restano solo sul Mac: conservarne anche un backup.
- Non caricare immagini o modificare le gallerie dal sito web di GitHub.
- Se qualcosa è stato modificato da GitHub web, eseguire **Fetch origin** e
  **Pull origin** in GitHub Desktop prima di continuare.
- Codex serve per modificare il sito; GitHub Desktop serve per pubblicare.

## Controllo finale rapido

- [ ] JPG in sRGB, circa 4000 px sul lato lungo
- [ ] Sezione corretta e selezione completa
- [ ] Numerazione nell'ordine desiderato
- [ ] Messaggio `Operazione completata`
- [ ] Commit to main
- [ ] Push origin
- [ ] Controllo del sito online
