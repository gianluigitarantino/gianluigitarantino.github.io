# gianluigitarantino.com

Portfolio statico di Gianluigi Tarantino, fotografo di architettura, interni e hospitality.

## Stack e hosting

- HTML, CSS e JavaScript vanilla
- GitHub Pages con Jekyll
- Dominio pubblico: `https://www.gianluigitarantino.com`
- URL puliti gestiti tramite front matter `permalink`
- Redirect dai precedenti URL `.html` tramite `jekyll-redirect-from`

## Pagine pubbliche

- `/`
- `/architettura/`
- `/interior/`
- `/personale/`
- `/profilo/`

I precedenti indirizzi dei servizi reindirizzano a `/profilo/`.

## Regole

- Nei link interni, nelle canonical e nella sitemap usare solo URL puliti con slash finale.
- La homepage deve puntare a `/`, mai a `/index.html`.
- Ogni pagina deve mantenere un `<title>`, una meta description e una canonical unici.
- Le immagini del portfolio devono avere WebP responsive, JPG di fallback, dimensioni dichiarate e alt text descrittivi.
- Non aggiungere framework o dipendenze client-side senza una necessità reale.
- Non aggiungere `.nojekyll`: disabiliterebbe i permalink e i redirect.

## SEO

- Sitemap: `/sitemap.xml`
- Robots: `/robots.txt`
- Dati strutturati JSON-LD presenti nelle pagine principali
- Le attività esterne necessarie sono elencate in `SEO-AZIONI-ESTERNE.md`
