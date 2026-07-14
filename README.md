# gianluigitarantino.com

Portfolio statico di Gianluigi Tarantino, fotografo di architettura, interni e hospitality.

**Per pubblicare o sostituire le fotografie:** seguire
[LEGGIMI-PUBBLICARE-FOTO.md](LEGGIMI-PUBBLICARE-FOTO.md).

## Stack e hosting

- HTML, CSS e JavaScript vanilla
- GitHub Pages con Jekyll
- GitHub Actions per elaborazione immagini e pubblicazione
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

La procedura principale funziona online da qualsiasi computer e anche da iPhone:

1. Esportare la selezione completa in JPG sRGB, lato lungo da 2048 a 3000 px e
   preferibilmente sotto 10 MiB per file.
2. Numerare i file nell'ordine desiderato: `01.jpg`, `02.jpg`, `03.jpg`.
3. Caricarli nella sezione corretta dentro `carica-foto/` usando GitHub web.
4. Premere `Commit changes`.

Da iPhone usare Safari e salvare prima i JPG nell'app File. Se il pulsante
`Add file` non è visibile, scegliere `aA → Richiedi sito desktop`. Non caricare
direttamente file HEIC dall'app Foto: convertirli o esportarli prima in JPG.
L'upload web accetta fino a 100 file contemporaneamente, ciascuno sotto 25 MiB.

Il workflow `.github/workflows/pubblica-sito.yml` installa Sharp, ottimizza le
immagini, aggiorna le pagine in entrambe le lingue, salva i risultati e distribuisce
direttamente GitHub Pages. I JPG temporanei vengono rimossi dopo un'elaborazione
riuscita. `carica-foto/` è esclusa dalla build Jekyll.

Lo script applica limiti anche ai file pubblicati: 1,5 MiB per il JPG di fallback,
1,25 MiB per il WebP grande e 400 KiB per il WebP da 960 px. Se necessario riduce
automaticamente la qualità entro una soglia prudente; se non riesce a rispettare
il limite, interrompe la pubblicazione senza sostituire la galleria esistente.

Il flusso locale resta disponibile: gli originali dentro `foto-sorgenti/` sono
esclusi da Git e possono essere elaborati con Codex o con
`Aggiorna portfolio.command`.

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
