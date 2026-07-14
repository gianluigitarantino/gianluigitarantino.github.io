# gianluigitarantino.com

Portfolio statico di Gianluigi Tarantino, fotografo di architettura, interni e hospitality.

**Per pubblicare o sostituire le fotografie:** seguire
[LEGGIMI-PUBBLICARE-FOTO.md](LEGGIMI-PUBBLICARE-FOTO.md).

## Stack e hosting

- HTML, CSS e JavaScript vanilla
- GitHub Pages con Jekyll
- Dominio pubblico: `https://www.gianluigitarantino.com`
- URL puliti gestiti tramite front matter `permalink`
- Redirect dai precedenti URL `.html` tramite `jekyll-redirect-from`

## Pagine pubbliche

Italiano:

- `/`
- `/architettura/`
- `/interior/`
- `/personale/`
- `/profilo/`

English:

- `/en/`
- `/en/architecture/`
- `/en/interiors/`
- `/en/personal/`
- `/en/about/`

I precedenti indirizzi dei servizi reindirizzano a `/profilo/` in italiano e a `/en/about/` in inglese.

## Regole

- Nei link interni, nelle canonical e nella sitemap usare solo URL puliti con slash finale.
- La homepage deve puntare a `/`, mai a `/index.html`.
- Ogni pagina deve mantenere un `<title>`, una meta description e una canonical unici.
- Ogni lingua deve avere un URL separato, contenere una sola lingua e dichiarare le versioni reciproche con `hreflang` (`it`, `en` e `x-default`).
- Il selettore lingua deve collegare direttamente le due pagine equivalenti.
- Le immagini del portfolio devono avere WebP responsive, JPG di fallback, dimensioni dichiarate e alt text descrittivi.
- Non aggiungere framework o dipendenze client-side senza una necessità reale.
- Non aggiungere `.nojekyll`: disabiliterebbe i permalink e i redirect.

## Aggiornare le fotografie

Il sito include un flusso locale che prepara le immagini e aggiorna automaticamente
le gallerie italiane e inglesi.

1. Esportare JPG in sRGB, qualità 90 e lato lungo di circa 4000 px.
2. Inserirli nella cartella corrispondente dentro `foto-sorgenti/`:
   `home`, `architettura`, `interior` oppure `personale`.
3. Numerare i file nell'ordine desiderato: `01.jpg`, `02.jpg`, `03.jpg`.
   È possibile aggiungere un nome, per esempio `01-cortile.jpg`.
4. Scrivere a Codex indicando la sezione e chiedere: `Controlla e pubblica`.

Lo script crea un JPG di fallback e due WebP responsive, applica l'orientamento,
converte in sRGB, elimina i metadati superflui, aggiorna dimensioni, preload,
lazy loading e pagine in entrambe le lingue. I file dentro `foto-sorgenti/` sono
esclusi da Git e restano soltanto sul computer.

Codex controlla i file, esegue lo script, verifica le modifiche e completa commit e
push. GitHub Desktop e `Aggiorna portfolio.command` restano disponibili come
procedura alternativa per lavorare autonomamente.

Per sostituire una galleria, la relativa cartella sorgente deve contenere la
selezione completa nel suo ordine finale. Le descrizioni alternative non visibili
possono essere definite facoltativamente in `foto-sorgenti/descrizioni.json`,
seguendo il modello `strumenti/descrizioni.example.json`. Se il file non è
presente, lo script usa una descrizione neutra e non visibile.

## SEO

- Sitemap: `/sitemap.xml`
- Robots: `/robots.txt`
- Dati strutturati JSON-LD presenti nelle pagine principali
- Le attività esterne necessarie sono elencate in `SEO-AZIONI-ESTERNE.md`
