const CONFIGURAZIONE_SEARCH_CONSOLE = Object.freeze({
  proprieta: "sc-domain:gianluigitarantino.com",
  sitemap: "https://www.gianluigitarantino.com/sitemap.xml",
  fusoOrario: "Europe/Rome",
  giornoInvio: 5,
  oraInvio: 9,
  sogliaCaloPercentuale: -30,
  sogliaImpressioni: 50,
  sogliaClic: 5,
});

const MESI_ITALIANI = Object.freeze([
  "gennaio",
  "febbraio",
  "marzo",
  "aprile",
  "maggio",
  "giugno",
  "luglio",
  "agosto",
  "settembre",
  "ottobre",
  "novembre",
  "dicembre",
]);

/**
 * Eseguire questa funzione una sola volta dall'editor Apps Script.
 * Verifica l'accesso, invia subito un primo rapporto e crea il trigger mensile.
 */
function configuraRapportoMensile() {
  const rapporto = creaRapportoMensile_();
  inviaRapporto_(rapporto, true);

  ScriptApp.getProjectTriggers()
    .filter((trigger) => trigger.getHandlerFunction() === "inviaRapportoMensileSearchConsole")
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));

  ScriptApp.newTrigger("inviaRapportoMensileSearchConsole")
    .timeBased()
    .onMonthDay(CONFIGURAZIONE_SEARCH_CONSOLE.giornoInvio)
    .atHour(CONFIGURAZIONE_SEARCH_CONSOLE.oraInvio)
    .inTimezone(CONFIGURAZIONE_SEARCH_CONSOLE.fusoOrario)
    .create();

  console.log("Rapporto di prova inviato e automazione mensile attivata.");
}

/**
 * Funzione eseguita automaticamente dal trigger mensile.
 */
function inviaRapportoMensileSearchConsole() {
  const rapporto = creaRapportoMensile_();
  inviaRapporto_(rapporto, false);
}

function creaRapportoMensile_() {
  const periodi = calcolaPeriodi_();
  const corrente = caricaPrestazioni_(periodi.corrente);
  const precedente = caricaPrestazioni_(periodi.precedente);
  const pagine = leggiPagineDallaSitemap_();
  const indicizzazione = controllaIndicizzazione_(pagine);
  const sitemap = caricaStatoSitemap_();
  const anomalie = trovaAnomalie_(corrente, precedente, indicizzazione, sitemap);

  return {
    periodi,
    corrente,
    precedente,
    indicizzazione,
    sitemap,
    anomalie,
  };
}

function calcolaPeriodi_() {
  const oggi = new Date();
  const inizioCorrente = new Date(oggi.getFullYear(), oggi.getMonth() - 1, 1);
  const fineCorrente = new Date(oggi.getFullYear(), oggi.getMonth(), 0);
  const inizioPrecedente = new Date(oggi.getFullYear(), oggi.getMonth() - 2, 1);
  const finePrecedente = new Date(oggi.getFullYear(), oggi.getMonth() - 1, 0);

  return {
    corrente: creaPeriodo_(inizioCorrente, fineCorrente),
    precedente: creaPeriodo_(inizioPrecedente, finePrecedente),
  };
}

function creaPeriodo_(inizio, fine) {
  return {
    inizio: Utilities.formatDate(inizio, CONFIGURAZIONE_SEARCH_CONSOLE.fusoOrario, "yyyy-MM-dd"),
    fine: Utilities.formatDate(fine, CONFIGURAZIONE_SEARCH_CONSOLE.fusoOrario, "yyyy-MM-dd"),
    etichetta: `${MESI_ITALIANI[inizio.getMonth()]} ${Utilities.formatDate(
      inizio,
      CONFIGURAZIONE_SEARCH_CONSOLE.fusoOrario,
      "yyyy",
    )}`,
  };
}

function caricaPrestazioni_(periodo) {
  const totaleRisposta = interrogaSearchAnalytics_(periodo, [], 1);
  const paesiRisposta = interrogaSearchAnalytics_(periodo, ["country"], 25000);
  const queryRisposta = interrogaSearchAnalytics_(periodo, ["query"], 10);
  const totale = normalizzaRiga_((totaleRisposta.rows || [])[0]);
  const paesi = {};

  (paesiRisposta.rows || []).forEach((riga) => {
    paesi[String(riga.keys[0]).toLowerCase()] = normalizzaRiga_(riga);
  });

  return {
    totale,
    italia: paesi.ita || metricheVuote_(),
    regnoUnito: paesi.gbr || metricheVuote_(),
    query: (queryRisposta.rows || []).map((riga) => ({
      testo: riga.keys[0],
      ...normalizzaRiga_(riga),
    })),
  };
}

function interrogaSearchAnalytics_(periodo, dimensioni, limite) {
  const proprieta = encodeURIComponent(CONFIGURAZIONE_SEARCH_CONSOLE.proprieta);
  const url = `https://www.googleapis.com/webmasters/v3/sites/${proprieta}/searchAnalytics/query`;
  return richiestaGoogle_(url, "post", {
    startDate: periodo.inizio,
    endDate: periodo.fine,
    dimensions: dimensioni,
    type: "web",
    dataState: "final",
    rowLimit: limite,
  });
}

function leggiPagineDallaSitemap_() {
  const risposta = UrlFetchApp.fetch(CONFIGURAZIONE_SEARCH_CONSOLE.sitemap, {
    muteHttpExceptions: true,
  });

  if (risposta.getResponseCode() !== 200) {
    throw new Error(`Sitemap non raggiungibile: HTTP ${risposta.getResponseCode()}.`);
  }

  const testo = risposta.getContentText();
  const pagine = [];
  const espressione = /<loc>([^<]+)<\/loc>/g;
  let corrispondenza;

  while ((corrispondenza = espressione.exec(testo)) !== null) {
    pagine.push(decodificaEntitaXml_(corrispondenza[1].trim()));
  }

  if (pagine.length === 0) {
    throw new Error("La sitemap non contiene URL di pagina leggibili.");
  }

  return [...new Set(pagine)];
}

function controllaIndicizzazione_(pagine) {
  const risultati = pagine.map((url) => {
    try {
      const risposta = richiestaGoogle_(
        "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
        "post",
        {
          inspectionUrl: url,
          siteUrl: CONFIGURAZIONE_SEARCH_CONSOLE.proprieta,
          languageCode: "it-IT",
        },
      );
      const stato = risposta.inspectionResult && risposta.inspectionResult.indexStatusResult;

      if (!stato) {
        return { url, indicizzata: false, stato: "Risposta priva dello stato di indicizzazione" };
      }

      return {
        url,
        indicizzata: stato.verdict === "PASS",
        stato: stato.coverageState || stato.verdict || "Stato non disponibile",
        ultimaScansione: stato.lastCrawlTime || "",
        canonicalGoogle: stato.googleCanonical || "",
        canonicalUtente: stato.userCanonical || "",
      };
    } catch (errore) {
      return { url, indicizzata: false, stato: `Controllo non riuscito: ${errore.message}` };
    }
  });

  return {
    totale: risultati.length,
    indicizzate: risultati.filter((pagina) => pagina.indicizzata).length,
    escluse: risultati.filter((pagina) => !pagina.indicizzata).length,
    pagine: risultati,
  };
}

function caricaStatoSitemap_() {
  const proprieta = encodeURIComponent(CONFIGURAZIONE_SEARCH_CONSOLE.proprieta);
  const risposta = richiestaGoogle_(
    `https://www.googleapis.com/webmasters/v3/sites/${proprieta}/sitemaps`,
    "get",
  );
  const sitemap = (risposta.sitemap || []).find(
    (elemento) => normalizzaUrl_(elemento.path) === normalizzaUrl_(CONFIGURAZIONE_SEARCH_CONSOLE.sitemap),
  );

  if (!sitemap) {
    return {
      presente: false,
      errori: 0,
      avvisi: 0,
      inviate: 0,
      indicizzate: 0,
      ultimoInvio: "",
      ultimoDownload: "",
    };
  }

  const contenuti = sitemap.contents || [];
  return {
    presente: true,
    inAttesa: Boolean(sitemap.isPending),
    errori: numero_(sitemap.errors),
    avvisi: numero_(sitemap.warnings),
    inviate: contenuti.reduce((totale, elemento) => totale + numero_(elemento.submitted), 0),
    indicizzate: contenuti.reduce((totale, elemento) => totale + numero_(elemento.indexed), 0),
    ultimoInvio: sitemap.lastSubmitted || "",
    ultimoDownload: sitemap.lastDownloaded || "",
  };
}

function trovaAnomalie_(corrente, precedente, indicizzazione, sitemap) {
  const anomalie = [];
  aggiungiCalo_(
    anomalie,
    "impressioni complessive",
    corrente.totale.impressions,
    precedente.totale.impressions,
    CONFIGURAZIONE_SEARCH_CONSOLE.sogliaImpressioni,
  );
  aggiungiCalo_(
    anomalie,
    "clic complessivi",
    corrente.totale.clicks,
    precedente.totale.clicks,
    CONFIGURAZIONE_SEARCH_CONSOLE.sogliaClic,
  );
  aggiungiCalo_(
    anomalie,
    "impressioni dall'Italia",
    corrente.italia.impressions,
    precedente.italia.impressions,
    CONFIGURAZIONE_SEARCH_CONSOLE.sogliaImpressioni,
  );
  aggiungiCalo_(
    anomalie,
    "impressioni dal Regno Unito",
    corrente.regnoUnito.impressions,
    precedente.regnoUnito.impressions,
    CONFIGURAZIONE_SEARCH_CONSOLE.sogliaImpressioni,
  );

  if (indicizzazione.escluse > 0) {
    anomalie.push(`${indicizzazione.escluse} URL della sitemap non risultano indicizzati.`);
  }
  if (!sitemap.presente) anomalie.push("La sitemap non risulta inviata nella proprietà Search Console.");
  if (sitemap.inAttesa) anomalie.push("Google sta ancora elaborando la sitemap.");
  if (sitemap.errori > 0) anomalie.push(`La sitemap segnala ${sitemap.errori} errori.`);
  if (sitemap.avvisi > 0) anomalie.push(`La sitemap segnala ${sitemap.avvisi} avvisi.`);

  return anomalie;
}

function aggiungiCalo_(elenco, nome, valoreCorrente, valorePrecedente, minimoPrecedente) {
  if (valorePrecedente < minimoPrecedente) return;
  const variazione = variazionePercentuale_(valoreCorrente, valorePrecedente);
  if (variazione !== null && variazione <= CONFIGURAZIONE_SEARCH_CONSOLE.sogliaCaloPercentuale) {
    elenco.push(`${nome}: ${formattaVariazione_(variazione)} rispetto al mese precedente.`);
  }
}

function inviaRapporto_(rapporto, prova) {
  const destinatario =
    PropertiesService.getScriptProperties().getProperty("REPORT_EMAIL") ||
    Session.getEffectiveUser().getEmail();

  if (!destinatario) {
    throw new Error(
      "Email non disponibile. Aggiungi una proprietà script REPORT_EMAIL con il destinatario desiderato.",
    );
  }

  const prefisso = prova ? "[PROVA] " : "";
  const oggetto = `${prefisso}Search Console — ${maiuscola_(rapporto.periodi.corrente.etichetta)}`;
  MailApp.sendEmail({
    to: destinatario,
    subject: oggetto,
    body: creaTestoRapporto_(rapporto),
    htmlBody: creaHtmlRapporto_(rapporto),
    name: "Rapporto Search Console",
  });
}

function creaTestoRapporto_(rapporto) {
  const { corrente, precedente, indicizzazione, sitemap, anomalie, periodi } = rapporto;
  const righe = [
    `RAPPORTO SEARCH CONSOLE — ${periodi.corrente.etichetta.toUpperCase()}`,
    `Periodo: ${periodi.corrente.inizio} – ${periodi.corrente.fine}`,
    `Confronto: ${periodi.precedente.inizio} – ${periodi.precedente.fine}`,
    "",
    "RISULTATO ESSENZIALE",
    rigaMetrica_("Clic", corrente.totale.clicks, precedente.totale.clicks),
    rigaMetrica_("Impressioni", corrente.totale.impressions, precedente.totale.impressions),
    `CTR: ${formattaPercentuale_(corrente.totale.ctr * 100)}`,
    `Posizione media: ${formattaDecimale_(corrente.totale.position)}`,
    `Pagine della sitemap: ${indicizzazione.indicizzate} indicizzate, ${indicizzazione.escluse} escluse o da verificare`,
    "",
    "ITALIA",
    rigaMetrica_("Clic", corrente.italia.clicks, precedente.italia.clicks),
    rigaMetrica_("Impressioni", corrente.italia.impressions, precedente.italia.impressions),
    "",
    "REGNO UNITO",
    rigaMetrica_("Clic", corrente.regnoUnito.clicks, precedente.regnoUnito.clicks),
    rigaMetrica_("Impressioni", corrente.regnoUnito.impressions, precedente.regnoUnito.impressions),
    "",
    "RICERCHE CHE PORTANO VISITE",
  ];

  if (corrente.query.length === 0) {
    righe.push("Nessuna query disponibile per il periodo.");
  } else {
    corrente.query.forEach((query, indice) => {
      righe.push(
        `${indice + 1}. ${query.testo} — ${formattaNumero_(query.clicks)} clic, ${formattaNumero_(query.impressions)} impressioni`,
      );
    });
  }

  righe.push(
    "",
    "SITEMAP",
    sitemap.presente
      ? `${sitemap.errori} errori, ${sitemap.avvisi} avvisi; ${sitemap.indicizzate}/${sitemap.inviate} URL indicizzati secondo il rapporto sitemap.`
      : "La sitemap non risulta inviata in Search Console.",
    "",
    "ANOMALIE",
    ...(anomalie.length ? anomalie.map((voce) => `- ${voce}`) : ["Nessuna anomalia rilevata."]),
    "",
    "PAGINE ESCLUSE O DA VERIFICARE",
  );

  const escluse = indicizzazione.pagine.filter((pagina) => !pagina.indicizzata);
  righe.push(
    ...(escluse.length
      ? escluse.map((pagina) => `- ${pagina.url} — ${pagina.stato}`)
      : ["Tutti gli URL della sitemap controllati risultano indicizzati."]),
  );

  return righe.join("\n");
}

function creaHtmlRapporto_(rapporto) {
  const { corrente, precedente, indicizzazione, sitemap, anomalie, periodi } = rapporto;
  const queryHtml = corrente.query.length
    ? `<ol>${corrente.query
        .map(
          (query) =>
            `<li><strong>${escapeHtml_(query.testo)}</strong> — ${formattaNumero_(query.clicks)} clic, ${formattaNumero_(query.impressions)} impressioni</li>`,
        )
        .join("")}</ol>`
    : "<p>Nessuna query disponibile per il periodo.</p>";
  const escluse = indicizzazione.pagine.filter((pagina) => !pagina.indicizzata);
  const escluseHtml = escluse.length
    ? `<ul>${escluse
        .map(
          (pagina) =>
            `<li><a href="${escapeHtml_(pagina.url)}">${escapeHtml_(pagina.url)}</a> — ${escapeHtml_(pagina.stato)}</li>`,
        )
        .join("")}</ul>`
    : "<p>✅ Tutti gli URL della sitemap controllati risultano indicizzati.</p>";
  const anomalieHtml = anomalie.length
    ? `<ul>${anomalie.map((voce) => `<li>${escapeHtml_(voce)}</li>`).join("")}</ul>`
    : "<p>✅ Nessuna anomalia rilevata.</p>";

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#171717;max-width:720px">
      <h1 style="font-size:24px;margin-bottom:4px">Rapporto Search Console</h1>
      <p style="margin-top:0"><strong>${escapeHtml_(maiuscola_(periodi.corrente.etichetta))}</strong><br>
      ${periodi.corrente.inizio} – ${periodi.corrente.fine}, confrontato con ${periodi.precedente.inizio} – ${periodi.precedente.fine}</p>

      <h2 style="font-size:18px">Risultato essenziale</h2>
      ${tabellaMetriche_(corrente.totale, precedente.totale)}
      <p><strong>Pagine della sitemap:</strong> ${indicizzazione.indicizzate} indicizzate, ${indicizzazione.escluse} escluse o da verificare.</p>

      <h2 style="font-size:18px">Italia e Regno Unito</h2>
      <table style="border-collapse:collapse;width:100%">
        <tr><th style="text-align:left;border-bottom:1px solid #ddd;padding:6px">Paese</th><th style="text-align:right;border-bottom:1px solid #ddd;padding:6px">Clic</th><th style="text-align:right;border-bottom:1px solid #ddd;padding:6px">Impressioni</th></tr>
        ${rigaPaeseHtml_("Italia", corrente.italia, precedente.italia)}
        ${rigaPaeseHtml_("Regno Unito", corrente.regnoUnito, precedente.regnoUnito)}
      </table>

      <h2 style="font-size:18px">Ricerche che portano visite</h2>
      ${queryHtml}

      <h2 style="font-size:18px">Sitemap</h2>
      <p>${
        sitemap.presente
          ? `${sitemap.errori} errori, ${sitemap.avvisi} avvisi; ${sitemap.indicizzate}/${sitemap.inviate} URL indicizzati secondo il rapporto sitemap.`
          : "La sitemap non risulta inviata in Search Console."
      }</p>

      <h2 style="font-size:18px">Anomalie</h2>
      ${anomalieHtml}

      <h2 style="font-size:18px">Pagine escluse o da verificare</h2>
      ${escluseHtml}
      <p style="color:#666;font-size:12px;margin-top:28px">Rapporto automatico basato esclusivamente sui dati di Google Search Console. Nessun cookie o Google Analytics è utilizzato.</p>
    </div>`;
}

function tabellaMetriche_(corrente, precedente) {
  return `<table style="border-collapse:collapse;width:100%">
    ${rigaMetricaHtml_("Clic", formattaNumero_(corrente.clicks), corrente.clicks, precedente.clicks)}
    ${rigaMetricaHtml_("Impressioni", formattaNumero_(corrente.impressions), corrente.impressions, precedente.impressions)}
    ${rigaMetricaHtml_("CTR", formattaPercentuale_(corrente.ctr * 100), corrente.ctr, precedente.ctr)}
    ${rigaMetricaHtml_("Posizione media", formattaDecimale_(corrente.position), null, null)}
  </table>`;
}

function rigaMetricaHtml_(nome, valoreFormattato, corrente, precedente) {
  const variazione = corrente === null ? "" : formattaVariazione_(variazionePercentuale_(corrente, precedente));
  return `<tr><td style="border-bottom:1px solid #eee;padding:6px">${nome}</td><td style="text-align:right;border-bottom:1px solid #eee;padding:6px"><strong>${valoreFormattato}</strong></td><td style="text-align:right;border-bottom:1px solid #eee;padding:6px;color:#666">${variazione}</td></tr>`;
}

function rigaPaeseHtml_(nome, corrente, precedente) {
  return `<tr><td style="border-bottom:1px solid #eee;padding:6px">${nome}</td><td style="text-align:right;border-bottom:1px solid #eee;padding:6px">${formattaNumero_(corrente.clicks)} <span style="color:#666">(${formattaVariazione_(variazionePercentuale_(corrente.clicks, precedente.clicks))})</span></td><td style="text-align:right;border-bottom:1px solid #eee;padding:6px">${formattaNumero_(corrente.impressions)} <span style="color:#666">(${formattaVariazione_(variazionePercentuale_(corrente.impressions, precedente.impressions))})</span></td></tr>`;
}

function richiestaGoogle_(url, metodo, corpo) {
  const opzioni = {
    method: metodo,
    headers: { Authorization: `Bearer ${ScriptApp.getOAuthToken()}` },
    muteHttpExceptions: true,
  };
  if (corpo !== undefined) {
    opzioni.contentType = "application/json";
    opzioni.payload = JSON.stringify(corpo);
  }

  const risposta = UrlFetchApp.fetch(url, opzioni);
  const codice = risposta.getResponseCode();
  const testo = risposta.getContentText();
  let dati = {};

  try {
    dati = testo ? JSON.parse(testo) : {};
  } catch (errore) {
    throw new Error(`Risposta Google non valida (HTTP ${codice}).`);
  }

  if (codice < 200 || codice >= 300) {
    const messaggio = dati.error && dati.error.message ? dati.error.message : testo;
    throw new Error(`Google Search Console API: HTTP ${codice} — ${messaggio}`);
  }

  return dati;
}

function normalizzaRiga_(riga) {
  if (!riga) return metricheVuote_();
  return {
    clicks: numero_(riga.clicks),
    impressions: numero_(riga.impressions),
    ctr: numero_(riga.ctr),
    position: numero_(riga.position),
  };
}

function metricheVuote_() {
  return { clicks: 0, impressions: 0, ctr: 0, position: 0 };
}

function numero_(valore) {
  const numero = Number(valore);
  return Number.isFinite(numero) ? numero : 0;
}

function variazionePercentuale_(corrente, precedente) {
  if (!precedente) return corrente ? null : 0;
  return ((corrente - precedente) / precedente) * 100;
}

function rigaMetrica_(nome, corrente, precedente) {
  return `${nome}: ${formattaNumero_(corrente)} (${formattaVariazione_(variazionePercentuale_(corrente, precedente))})`;
}

function formattaNumero_(valore) {
  return Math.round(numero_(valore)).toLocaleString("it-IT");
}

function formattaDecimale_(valore) {
  return numero_(valore).toFixed(1).replace(".", ",");
}

function formattaPercentuale_(valore) {
  return `${formattaDecimale_(valore)}%`;
}

function formattaVariazione_(valore) {
  if (valore === null) return "nuovo dato";
  const segno = valore > 0 ? "+" : "";
  return `${segno}${formattaPercentuale_(valore)}`;
}

function normalizzaUrl_(url) {
  return String(url || "").replace(/\/+$/, "");
}

function maiuscola_(testo) {
  return testo ? testo.charAt(0).toUpperCase() + testo.slice(1) : testo;
}

function decodificaEntitaXml_(testo) {
  return testo
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function escapeHtml_(testo) {
  return String(testo)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
