# gianluigitarantino.com – Linee guida per sviluppatori

Questa repo contiene il **frontend statico** di gianluigitarantino.com  
Stack attuale: **HTML + CSS + JS vanilla**, senza framework e senza build system.

Obiettivo: sito **veloce, stabile, facile da mantenere** e con forte attenzione a **UX, SEO e localizzazione**.


## 1. Panoramica tecnica

- Niente React / Vue / framework SPA.
- Nessun bundler (niente Webpack/Vite/Parcel, ecc.) salvo accordi.
- Hosting: **Netlify**, deploy automatico da questa repo.
- Dominio: `gianluigitarantino.com` (root) + `/en/` per la versione inglese.
- File principali:
  - `index.html` → home italiana
  - `en/index.html` → home inglese
  - `/assets/css/…` → stili
  - `/assets/js/…` → script
  - `/assets/img/…` → immagini e icone


## 2. Regole sugli URL (IMPORTANTISSIMO)

Queste **non devono essere modificate** senza autorizzazione:

- `/` → Italiano (lingua predefinita)
- `/en/` → Inglese
- Niente `/it/`, niente parametri tipo `?lang=`, niente routing client-side.

Per ogni nuova pagina/section:
- Versione italiana: `/pagina/`
- Versione inglese: `/en/pagina/`


## 3. Cosa PUOI modificare liberamente

Puoi:

- Aggiornare testi in entrambe le lingue.
- Lavorare su layout e CSS:
  - spaziature, griglie, responsive
  - colori, hover, animazioni leggere
- Aggiungere sezioni o blocchi nuovi:
  - griglie progetti
  - case study
  - blocchi contatti
- Aggiungere/aggiornare immagini ottimizzate.
- Aggiungere piccoli script JS per migliorare UX:
  - smooth scrolling
  - intersection observers
  - lazy loading basilare

Regola di base:  
> non rompere SEO, localizzazione e accessibilità minima.


## 4. Cosa NON DEVI modificare (senza accordo esplicito)

### 4.1 Schema URL

- `/` e `/en/` devono rimanere così.
- Evita rename di `index.html` o delle directory base.
- Niente routing SPA.

### 4.2 Struttura della `<head>`

Non rimuovere né rinominare:

- `<title>` (puoi cambiare il testo, non la struttura).
- `<meta name="description">` (mantenerla unica e significativa).
- Tutti i meta **Open Graph** (`og:*`).
- Tutti i meta **Twitter Card**.
- `<meta property="og:locale">`:
  - `it_IT` per `/`
  - `en_GB` per `/en/`
- `<meta property="og:site_name">`.

Questi tag possono essere aggiornati nei valori, non eliminati.

### 4.3 JSON-LD (Schema.org)

È presente (o verrà presente) uno script:
`<script type="application/ld+json">`  
che descrive **Gianluigi Tarantino** come persona/fotografo.

- Non eliminarlo.
- Non cambiare struttura e `@type`.
- Aggiorna solo i valori quando cambia il contenuto.

### 4.4 Font & Preload

Il sito usa **IBM Plex Sans** via Google Fonts con **preload**:

- Non rimuovere i link `rel="preload"`.
- Se cambi font:
  - mantieni preload dei woff2 principali
  - mantieni `crossorigin`.

### 4.5 Analytics / tracking

Se presenti:

- GA4 o altri tracking script

→ non devono essere duplicati, rimossi o spostati.

### 4.6 File specifici Netlify

Non rimuovere né rinominare:

- `_redirects`
- `_headers`
- `netlify.toml`

Modificali solo previo accordo: rompere questi file rompe il sito in produzione.


## 5. Cosa PUOI estendere, con attenzione

### 5.1 Nuove pagine

Ammesso:

- `/projects/slug/`
- `/en/projects/slug/`
- `/about/` / `/en/about/` ecc.

Ogni nuova pagina deve avere:

- `<title>` e `<meta description>` coerenti
- OG/Twitter tags
- JSON-LD solo se necessario (di solito non sulle pagine interne)

### 5.2 CSS

Puoi:

- modularizzare i file CSS
- usare BEM o naming coerente
- aggiungere utility classes leggere

Evita:

- framework pesanti (Bootstrap, Tailwind ecc., salvo richiesta)
- modifiche drastiche alla brand identity

### 5.3 JS

Puoi:

- migliorare interazioni leggere
- gestire piccoli componenti
- migliorare il language switch (rispettando la struttura URL)

Evita:

- introdurre framework JS pesanti senza accordo
- trasformare il sito in una SPA


## 6. Immagini & assets

Best practice:

- WebP/AVIF come formati principali
- JPG come fallback quando serve
- Sotto i ~300–400 KB quando possibile
- `loading="lazy"` per immagini fuori dallo schermo
- Naming coerente

Non usare hotlink da domini esterni (CDN ok se previsto).

  
## 7. Lingua e contenuti

- Italiano = `/`
- Inglese = `/en/`

Ogni contenuto nuovo deve mantenere la lingua della pagina.  
Testi, alt text, titoli devono essere coerenti.

Se aggiungi una sezione in italiano, aggiungi la relativa versione inglese.


## 8. Deploy

- Deploy automatico su Netlify dal branch principale.
- Non pushare robaccia o lavori rotti sul branch di produzione.
- Per modifiche grandi, usa branch separati.

Se in produzione qualcosa si rompe:
> fai **revert immediato**, poi debug.


## 9. Filosofia del progetto

Il sito rappresenta **Gianluigi Tarantino**, fotografo di architettura e interni.

Stile e intenzione:

- minimal
- veloce
- preciso
- zero complessità inutile

Quando sei indecisa/o:

- soluzione semplice > soluzione “furba”
- JS/CSS vanilla > nuove dipendenze
- stabilità > sperimentazione

Se hai dubbi, chiedi.
