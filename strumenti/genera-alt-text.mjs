#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");
const configuredSourcesDirectory = process.env.PORTFOLIO_SOURCES_DIR?.trim();
const sourcesDirectory = configuredSourcesDirectory
  ? path.resolve(rootDirectory, configuredSourcesDirectory)
  : path.join(rootDirectory, "foto-sorgenti");
const cachePath = path.join(rootDirectory, "dati", "alt-text.json");
const apiKey = process.env.OPENAI_API_KEY?.trim();
const model = process.env.OPENAI_ALT_MODEL?.trim() || "gpt-5.6-luna";
const useExistingImages = process.env.PORTFOLIO_EXISTING_IMAGES === "1";
const preserveExistingAlt = process.env.PORTFOLIO_PRESERVE_EXISTING_ALT === "1";
const responsesEndpoint =
  process.env.OPENAI_RESPONSES_ENDPOINT?.trim() || "https://api.openai.com/v1/responses";

const sections = {
  home: {
    context: "selezione generale della homepage di un portfolio fotografico",
    pages: { it: "index.html", en: "en-home.html" },
  },
  architettura: {
    context: "portfolio di fotografia di architettura",
    pages: { it: "architettura.html", en: "en-architecture.html" },
  },
  interior: {
    context: "portfolio di fotografia di interni e hospitality",
    pages: { it: "interior.html", en: "en-interiors.html" },
  },
  personale: {
    context: "ricerca fotografica personale su spazio, paesaggio e materia",
    pages: { it: "personale.html", en: "en-personal.html" },
  },
};

function fail(message) {
  throw new Error(message);
}

async function exists(filePath) {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function slugToContext(value) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseSourceFilename(filename) {
  const match = filename.match(/^(\d{1,3})(?:[-_ ]+(.+?))?\.(jpe?g)$/i);
  if (!match) {
    fail(
      `Nome non valido: ${filename}. Usa un numero iniziale, per esempio 01.jpg oppure 01-cortile.jpg.`,
    );
  }

  const orderNumber = Number(match[1]);
  if (!Number.isInteger(orderNumber) || orderNumber < 1) {
    fail(`Numero d'ordine non valido: ${filename}.`);
  }

  return {
    filename,
    orderNumber,
    orderKey: String(orderNumber).padStart(2, "0"),
    filenameContext: match[2] ? slugToContext(match[2]) : "",
  };
}

async function sha256(filePath) {
  const buffer = await readFile(filePath);
  return createHash("sha256").update(buffer).digest("hex");
}

async function readUploadedSources(sectionName) {
  const directory = path.join(sourcesDirectory, sectionName);
  await mkdir(directory, { recursive: true });

  const filenames = (await readdir(directory)).filter((filename) => /\.jpe?g$/i.test(filename));
  const sources = filenames
    .map(parseSourceFilename)
    .sort((first, second) => first.orderNumber - second.orderNumber);

  const seen = new Set();
  for (const source of sources) {
    if (seen.has(source.orderNumber)) {
      fail(`Nella cartella ${sectionName} ci sono due immagini con il numero ${source.orderNumber}.`);
    }
    seen.add(source.orderNumber);
    source.path = path.join(directory, source.filename);
    source.sha256 = await sha256(source.path);
  }

  return sources;
}

function attributeFromTag(tag, attribute) {
  const match = tag.match(new RegExp(`\\b${attribute}="([^"]*)"`, "i"));
  return match?.[1] ?? "";
}

function slideImageTags(html) {
  return [...html.matchAll(/<img\b(?=[^>]*\bclass="[^"]*\bslide\b[^"]*")[^>]*>/gi)].map(
    (match) => match[0],
  );
}

async function readExistingSources(sectionName) {
  const pageTags = {};
  for (const [language, pageName] of Object.entries(sections[sectionName].pages)) {
    const pagePath = path.join(rootDirectory, pageName);
    if (!(await exists(pagePath))) fail(`Manca la pagina ${pageName}.`);
    pageTags[language] = slideImageTags(await readFile(pagePath, "utf8"));
    if (!pageTags[language].length) fail(`Non trovo fotografie nella pagina ${pageName}.`);
  }

  if (pageTags.it.length !== pageTags.en.length) {
    fail(`Il numero di fotografie italiane e inglesi non coincide nella sezione ${sectionName}.`);
  }

  const sources = [];
  for (const [index, italianTag] of pageTags.it.entries()) {
    const englishTag = pageTags.en[index];
    const sourceUrl = attributeFromTag(italianTag, "src");
    const englishSourceUrl = attributeFromTag(englishTag, "src");
    if (sourceUrl !== englishSourceUrl) {
      fail(`L'ordine delle fotografie italiane e inglesi non coincide nella sezione ${sectionName}.`);
    }
    const match = sourceUrl.match(/^\/immagini\/([^/]+\.jpe?g)$/i);
    if (!match) fail(`Percorso JPEG non valido in ${sections[sectionName].pages.it}: ${sourceUrl}`);

    const filename = match[1];
    const orderNumber = index + 1;
    const orderKey = String(orderNumber).padStart(2, "0");
    const filenameContext = slugToContext(
      filename
        .replace(/\.jpe?g$/i, "")
        .replace(new RegExp(`^${sectionName}-${orderKey}-?`, "i"), ""),
    );
    const filePath = path.join(rootDirectory, "immagini", filename);
    if (!(await exists(filePath))) fail(`Manca la fotografia immagini/${filename}.`);

    sources.push({
      filename,
      filenameContext,
      orderKey,
      orderNumber,
      path: filePath,
      sha256: await sha256(filePath),
      existingAlt: {
        it: decodeAttribute(attributeFromTag(italianTag, "alt")),
        en: decodeAttribute(attributeFromTag(englishTag, "alt")),
      },
    });
  }

  return sources;
}

function decodeAttribute(value) {
  return String(value)
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");
}

function emptyCache() {
  return {
    _version: 1,
    home: {},
    architettura: {},
    interior: {},
    personale: {},
  };
}

async function readCache() {
  if (!(await exists(cachePath))) return emptyCache();

  try {
    const parsed = JSON.parse(await readFile(cachePath, "utf8"));
    const cache = emptyCache();
    for (const sectionName of Object.keys(sections)) {
      if (parsed?.[sectionName] && typeof parsed[sectionName] === "object") {
        cache[sectionName] = parsed[sectionName];
      }
    }
    return cache;
  } catch (error) {
    fail(`Il file dati/alt-text.json non è valido: ${error.message}`);
  }
}

function cachedAltIsValid(entry, source) {
  return (
    entry?.sha256 === source.sha256 &&
    typeof entry.it === "string" &&
    entry.it.trim() &&
    typeof entry.en === "string" &&
    entry.en.trim()
  );
}

function cleanAltText(value, language) {
  if (typeof value !== "string") fail(`L'alt text ${language} non è una stringa.`);

  const cleaned = value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^["“”']+|["“”']+$/g, "")
    .trim();

  if (cleaned.length < 12 || cleaned.length > 220) {
    fail(`L'alt text ${language} deve contenere da 12 a 220 caratteri.`);
  }
  if (/[<>]|https?:\/\//i.test(cleaned)) {
    fail(`L'alt text ${language} contiene caratteri o collegamenti non ammessi.`);
  }
  if (/^(?:non posso|impossibile|i (?:can't|cannot)|unable to)\b/i.test(cleaned)) {
    fail(`L'alt text ${language} non descrive la fotografia.`);
  }

  return cleaned;
}

function responseText(response) {
  if (typeof response?.output_text === "string" && response.output_text.trim()) {
    return response.output_text;
  }

  for (const output of response?.output ?? []) {
    for (const content of output?.content ?? []) {
      if (content?.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }

  fail("L'API non ha restituito gli alt text richiesti.");
}

function promptFor(sectionName, source) {
  const optionalContext = source.filenameContext
    ? `\nIl nome del file fornisce questo possibile contesto: “${source.filenameContext}”. Usalo soltanto se è coerente con ciò che vedi e non trasformarlo in un fatto non verificabile.`
    : "";

  return `Analizza questa fotografia destinata a un ${sections[sectionName].context}.
Scrivi due alt text equivalenti: uno in italiano e uno in inglese britannico naturale.

Regole:
- descrivi soltanto ciò che è chiaramente visibile, privilegiando soggetto, spazio, composizione, materiali e luce;
- sii concreto e conciso: idealmente 8–24 parole, senza tono pubblicitario;
- non iniziare con “Fotografia di”, “Foto di”, “Immagine di”, “Photo of” o “Image of”;
- non citare il fotografo e non aggiungere parole chiave SEO artificiali;
- non inventare luogo, edificio, progetto, architetto, marchio, identità, emozioni o intenzioni;
- se un dettaglio è incerto, omettilo e usa una descrizione più generale ma visivamente accurata;
- non scrivere didascalie, titoli, virgolette o spiegazioni.${optionalContext}`;
}

async function requestAltText(sectionName, source) {
  const image = await readFile(source.path);
  const imageUrl = `data:image/jpeg;base64,${image.toString("base64")}`;
  const body = {
    model,
    instructions:
      "Sei un photo editor accurato. Devi restituire soltanto il JSON richiesto e non devi dedurre informazioni che la fotografia non dimostra.",
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: promptFor(sectionName, source) },
          { type: "input_image", image_url: imageUrl, detail: "high" },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "portfolio_alt_text",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            it: { type: "string" },
            en: { type: "string" },
          },
          required: ["it", "en"],
        },
      },
    },
    max_output_tokens: 300,
  };

  const response = await fetch(responsesEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    fail(`L'API ha restituito una risposta non leggibile (HTTP ${response.status}).`);
  }

  if (!response.ok) {
    const apiMessage = payload?.error?.message ? `: ${payload.error.message}` : "";
    fail(`Analisi di ${source.filename} non riuscita (HTTP ${response.status})${apiMessage}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(responseText(payload));
  } catch (error) {
    fail(`Risposta non valida per ${source.filename}: ${error.message}`);
  }

  return {
    sha256: source.sha256,
    it: cleanAltText(parsed.it, "italiano"),
    en: cleanAltText(parsed.en, "inglese"),
    model,
  };
}

async function atomicWrite(filePath, content) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.alt-${process.pid}.tmp`;
  await writeFile(temporaryPath, content, "utf8");
  await rename(temporaryPath, filePath);
}

function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function prepareExistingPageUpdates(cache, selections) {
  const updates = [];

  for (const { sectionName, sources } of selections) {
    for (const [language, pageName] of Object.entries(sections[sectionName].pages)) {
      const pagePath = path.join(rootDirectory, pageName);
      const original = await readFile(pagePath, "utf8");
      let imageIndex = 0;

      const updated = original.replace(
        /<img\b(?=[^>]*\bclass="[^"]*\bslide\b[^"]*")[^>]*>/gi,
        (tag) => {
          const source = sources[imageIndex];
          if (!source) fail(`Ci sono troppe fotografie nella pagina ${pageName}.`);

          const sourceUrl = attributeFromTag(tag, "src");
          if (sourceUrl !== `/immagini/${source.filename}`) {
            fail(`L'ordine delle fotografie non coincide nella pagina ${pageName}.`);
          }

          const entry = cache[sectionName]?.[source.orderKey];
          if (!cachedAltIsValid(entry, source)) {
            fail(`Manca un alt text valido per ${source.filename}.`);
          }

          const alt = escapeAttribute(entry[language]);
          imageIndex += 1;
          if (!/\balt="[^"]*"/i.test(tag)) fail(`Manca l'attributo alt in ${pageName}.`);
          return tag.replace(/\balt="[^"]*"/i, `alt="${alt}"`);
        },
      );

      if (imageIndex !== sources.length) {
        fail(`Il numero di fotografie non coincide nella pagina ${pageName}.`);
      }
      updates.push({ pagePath, updated });
    }
  }

  return updates;
}

async function main() {
  console.log("Generazione automatica degli alt text");
  const cache = await readCache();
  const selections = [];
  let newAnalyses = 0;

  for (const sectionName of Object.keys(sections)) {
    const sources = useExistingImages
      ? await readExistingSources(sectionName)
      : await readUploadedSources(sectionName);
    if (!sources.length) continue;

    if (useExistingImages && preserveExistingAlt) {
      for (const source of sources) {
        if (!cachedAltIsValid(cache[sectionName]?.[source.orderKey], source)) {
          cache[sectionName][source.orderKey] = {
            sha256: source.sha256,
            it: cleanAltText(source.existingAlt.it, "italiano"),
            en: cleanAltText(source.existingAlt.en, "inglese"),
            model: "existing-reviewed",
          };
        }
      }
    }

    const pending = sources.filter(
      (source) => !cachedAltIsValid(cache[sectionName]?.[source.orderKey], source),
    );
    newAnalyses += pending.length;
    selections.push({ sectionName, sources, pending });
  }

  if (!selections.length) {
    console.log("Nessuna fotografia trovata: non ci sono alt text da generare.");
    return;
  }

  if (newAnalyses && !apiKey) {
    fail(
      "Manca il secret OPENAI_API_KEY. Aggiungilo nelle impostazioni GitHub del repository e riesegui la pubblicazione.",
    );
  }

  for (const { sectionName, sources, pending } of selections) {
    console.log(`\n${sectionName}: ${sources.length} fotografie, ${pending.length} da analizzare`);
    const updatedSection = {};

    for (const source of sources) {
      const cached = cache[sectionName]?.[source.orderKey];
      if (cachedAltIsValid(cached, source)) {
        updatedSection[source.orderKey] = cached;
        console.log(`  ${source.filename}: alt text già disponibile`);
      } else {
        console.log(`  ${source.filename}: analisi visiva in corso`);
        updatedSection[source.orderKey] = await requestAltText(sectionName, source);
      }
    }

    cache[sectionName] = updatedSection;
  }

  const pageUpdates = useExistingImages
    ? await prepareExistingPageUpdates(cache, selections)
    : [];

  await atomicWrite(cachePath, `${JSON.stringify(cache, null, 2)}\n`);
  await Promise.all(pageUpdates.map(({ pagePath, updated }) => atomicWrite(pagePath, updated)));
  console.log(`\nAlt text pronti. Nuove fotografie analizzate: ${newAnalyses}.`);
  if (useExistingImages) console.log("Pagine italiane e inglesi aggiornate senza ricomprimere le fotografie.");
}

main().catch((error) => {
  console.error(`\nERRORE: ${error.message}`);
  process.exitCode = 1;
});
