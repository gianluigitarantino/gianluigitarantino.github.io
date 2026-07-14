#!/usr/bin/env node

import { access, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");
const sourcesDirectory = path.join(rootDirectory, "foto-sorgenti");
const imagesDirectory = path.join(rootDirectory, "immagini");
const descriptionsPath = path.join(sourcesDirectory, "descrizioni.json");

const sections = {
  home: {
    prefix: "home",
    pages: { it: "index.html", en: "en-home.html" },
    fallbackAlt: {
      it: "Fotografia selezionata del portfolio di Gianluigi Tarantino",
      en: "Selected photograph from Gianluigi Tarantino's portfolio",
    },
  },
  architettura: {
    prefix: "architettura",
    pages: { it: "architettura.html", en: "en-architecture.html" },
    fallbackAlt: {
      it: "Fotografia di architettura di Gianluigi Tarantino",
      en: "Architecture photograph by Gianluigi Tarantino",
    },
  },
  interior: {
    prefix: "interior",
    pages: { it: "interior.html", en: "en-interiors.html" },
    fallbackAlt: {
      it: "Fotografia di interni di Gianluigi Tarantino",
      en: "Interior photograph by Gianluigi Tarantino",
    },
  },
  personale: {
    prefix: "personale",
    pages: { it: "personale.html", en: "en-personal.html" },
    fallbackAlt: {
      it: "Ricerca fotografica personale di Gianluigi Tarantino",
      en: "Personal photographic work by Gianluigi Tarantino",
    },
  },
};

const imageSizes = {
  smallWidth: 960,
  maximumEdge: 2048,
  recommendedMinimumEdge: 2500,
  recommendedMaximumEdge: 6000,
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

async function loadSharp() {
  const candidates = [
    process.env.CODEX_NODE_MODULES,
    path.join(
      os.homedir(),
      ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules",
    ),
  ].filter(Boolean);

  for (const modulesDirectory of candidates) {
    const entryPoint = path.join(modulesDirectory, "sharp", "lib", "index.js");
    if (await exists(entryPoint)) {
      const imported = await import(pathToFileURL(entryPoint).href);
      return imported.default;
    }
  }

  fail("Il convertitore immagini incluso in Codex non è disponibile. Apri o aggiorna Codex e riprova.");
}

function parseArguments() {
  const requested = [];
  for (let index = 2; index < process.argv.length; index += 1) {
    const argument = process.argv[index];
    if (argument === "--section" || argument === "-s") {
      const sectionName = process.argv[index + 1];
      if (!sectionName) fail("Dopo --section devi indicare una sezione.");
      requested.push(sectionName);
      index += 1;
    } else {
      requested.push(argument);
    }
  }

  const names = requested.length ? requested : Object.keys(sections);
  for (const name of names) {
    if (!sections[name]) {
      fail(`Sezione sconosciuta: ${name}. Usa home, architettura, interior o personale.`);
    }
  }
  return [...new Set(names)];
}

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
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
    descriptionSlug: match[2] ? slugify(match[2]) : "",
  };
}

async function readSources(sectionName) {
  const directory = path.join(sourcesDirectory, sectionName);
  await mkdir(directory, { recursive: true });

  const filenames = (await readdir(directory)).filter((filename) => /\.jpe?g$/i.test(filename));
  const parsed = filenames.map(parseSourceFilename).sort((a, b) => a.orderNumber - b.orderNumber);

  const seen = new Set();
  for (const source of parsed) {
    if (seen.has(source.orderNumber)) {
      fail(`Nella cartella ${sectionName} ci sono due immagini con il numero ${source.orderNumber}.`);
    }
    seen.add(source.orderNumber);
    source.path = path.join(directory, source.filename);
  }

  return parsed;
}

async function readDescriptions() {
  if (!(await exists(descriptionsPath))) return {};
  try {
    return JSON.parse(await readFile(descriptionsPath, "utf8"));
  } catch (error) {
    fail(`Il file foto-sorgenti/descrizioni.json non è valido: ${error.message}`);
  }
}

function orientedDimensions(metadata) {
  if (!metadata.width || !metadata.height) fail("Impossibile leggere le dimensioni di una fotografia.");
  const swapsAxes = [5, 6, 7, 8].includes(metadata.orientation);
  return swapsAxes
    ? { width: metadata.height, height: metadata.width }
    : { width: metadata.width, height: metadata.height };
}

function containedDimensions(width, height, maximumEdge) {
  const scale = Math.min(1, maximumEdge / width, maximumEdge / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function processImage({ sharp, sectionName, source, stagingDirectory }) {
  const metadata = await sharp(source.path).metadata();
  if (!["jpeg", "jpg"].includes(metadata.format)) {
    fail(`${source.filename} non è un vero file JPEG.`);
  }

  const original = orientedDimensions(metadata);
  const longEdge = Math.max(original.width, original.height);
  if (longEdge < imageSizes.recommendedMinimumEdge) {
    console.warn(
      `  Avviso: ${source.filename} misura solo ${longEdge}px sul lato lungo; sono consigliati almeno ${imageSizes.recommendedMinimumEdge}px.`,
    );
  } else if (longEdge > imageSizes.recommendedMaximumEdge) {
    console.warn(
      `  Nota: ${source.filename} supera ${imageSizes.recommendedMaximumEdge}px; verrà ridimensionata automaticamente.`,
    );
  }

  const full = containedDimensions(original.width, original.height, imageSizes.maximumEdge);
  const smallWidth = Math.min(imageSizes.smallWidth, full.width);
  const suffix = source.descriptionSlug ? `-${source.descriptionSlug}` : "";
  const baseName = `${sections[sectionName].prefix}-${source.orderKey}${suffix}`;
  const jpegName = `${baseName}.jpg`;
  const fullWebpName = `${baseName}-${full.width}.webp`;
  const smallWebpName = `${baseName}-${smallWidth}.webp`;

  const fullPipeline = () =>
    sharp(source.path)
      .rotate()
      .resize({
        width: imageSizes.maximumEdge,
        height: imageSizes.maximumEdge,
        fit: "inside",
        withoutEnlargement: true,
      })
      .toColourspace("srgb");

  const tasks = [
    fullPipeline()
      .jpeg({ quality: 88, progressive: true, mozjpeg: true })
      .toFile(path.join(stagingDirectory, jpegName)),
    fullPipeline()
      .webp({ quality: 84, effort: 5, smartSubsample: true })
      .toFile(path.join(stagingDirectory, fullWebpName)),
  ];

  if (smallWidth !== full.width) {
    tasks.push(
      sharp(source.path)
        .rotate()
        .resize({ width: smallWidth, withoutEnlargement: true })
        .toColourspace("srgb")
        .webp({ quality: 82, effort: 5, smartSubsample: true })
        .toFile(path.join(stagingDirectory, smallWebpName)),
    );
  }

  await Promise.all(tasks);

  return {
    orderKey: source.orderKey,
    sourceFilename: source.filename,
    baseName,
    jpegName,
    fullWebpName,
    smallWebpName,
    fullWidth: full.width,
    fullHeight: full.height,
    smallWidth,
  };
}

function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function altText({ sectionName, image, language, descriptions }) {
  const described = descriptions?.[sectionName]?.[image.orderKey]?.[language];
  if (typeof described === "string" && described.trim()) return described.trim();
  return sections[sectionName].fallbackAlt[language];
}

function srcsetFor(image) {
  if (image.smallWidth === image.fullWidth) {
    return `/immagini/${image.fullWebpName} ${image.fullWidth}w`;
  }
  return [
    `/immagini/${image.smallWebpName} ${image.smallWidth}w`,
    `/immagini/${image.fullWebpName} ${image.fullWidth}w`,
  ].join(", ");
}

function pictureMarkup({ sectionName, image, index, language, descriptions }) {
  const alt = escapeAttribute(altText({ sectionName, image, language, descriptions }));
  const priorityAttributes =
    index === 0 ? 'fetchpriority="high"' : 'loading="lazy"';

  return [
    '<picture class="slide-frame">',
    `<source sizes="(max-width: 1024px) 100vw, 70vw" srcset="${srcsetFor(image)}" type="image/webp">`,
    `<img alt="${alt}" class="slide" decoding="async" ${priorityAttributes} height="${image.fullHeight}" src="/immagini/${image.jpegName}" width="${image.fullWidth}">`,
    "</picture>",
  ].join("\n");
}

function preloadMarkup(image) {
  return `<link as="image" fetchpriority="high" href="/immagini/${image.fullWebpName}" imagesizes="(max-width: 1024px) 100vw, 70vw" imagesrcset="${srcsetFor(image)}" rel="preload" type="image/webp">`;
}

function updateGalleryHtml({ html, sectionName, images, language, descriptions, pageName }) {
  const gallery = [
    "<!-- PORTFOLIO-GALLERY:START -->",
    ...images.map((image, index) =>
      pictureMarkup({ sectionName, image, index, language, descriptions }),
    ),
    "<!-- PORTFOLIO-GALLERY:END -->",
  ].join("\n");

  const markedGalleryPattern =
    /<!-- PORTFOLIO-GALLERY:START -->[\s\S]*?<!-- PORTFOLIO-GALLERY:END -->/;

  if (markedGalleryPattern.test(html)) {
    html = html.replace(markedGalleryPattern, gallery);
  } else {
    const slidesPattern = /(<div class="slides">)[\s\S]*?(<\/div>\s*<\/main>)/;
    if (!slidesPattern.test(html)) {
      fail(`Non trovo la galleria in ${pageName}.`);
    }
    html = html.replace(slidesPattern, `$1\n${gallery}\n$2`);
  }

  const preloadPattern = /<link\b(?=[^>]*\brel="preload")(?=[^>]*\bas="image")[^>]*>/i;
  if (!preloadPattern.test(html)) {
    fail(`Non trovo il preload dell'immagine principale in ${pageName}.`);
  }
  return html.replace(preloadPattern, preloadMarkup(images[0]));
}

async function preparePageUpdates({ sectionName, images, descriptions }) {
  const updates = [];
  for (const [language, pageName] of Object.entries(sections[sectionName].pages)) {
    const pagePath = path.join(rootDirectory, pageName);
    if (!(await exists(pagePath))) fail(`Manca la pagina ${pageName}.`);
    const original = await readFile(pagePath, "utf8");
    const updated = updateGalleryHtml({
      html: original,
      sectionName,
      images,
      language,
      descriptions,
      pageName,
    });
    updates.push({ pagePath, updated });
  }
  return updates;
}

async function installGeneratedAssets(stagingDirectory) {
  await mkdir(imagesDirectory, { recursive: true });
  const generated = await readdir(stagingDirectory);
  for (const filename of generated) {
    await rename(path.join(stagingDirectory, filename), path.join(imagesDirectory, filename));
  }
  return new Set(generated);
}

async function removeStaleGeneratedAssets(sectionName, keepFilenames) {
  const prefix = `${sections[sectionName].prefix}-`;
  const existing = await readdir(imagesDirectory);
  await Promise.all(
    existing
      .filter(
        (filename) =>
          filename.startsWith(prefix) &&
          /\.(?:jpe?g|webp|avif)$/i.test(filename) &&
          !keepFilenames.has(filename),
      )
      .map((filename) => rm(path.join(imagesDirectory, filename))),
  );
}

async function atomicWrite(filePath, content) {
  const temporaryPath = `${filePath}.portfolio-${process.pid}.tmp`;
  await writeFile(temporaryPath, content, "utf8");
  await rename(temporaryPath, filePath);
}

async function processSection({ sharp, sectionName, sources, descriptions }) {
  console.log(`\n${sectionName}: ${sources.length} fotografie`);
  const stagingDirectory = path.join(imagesDirectory, `.portfolio-staging-${sectionName}-${process.pid}`);
  await rm(stagingDirectory, { recursive: true, force: true });
  await mkdir(stagingDirectory, { recursive: true });

  try {
    const processed = [];
    for (const source of sources) {
      console.log(`  Elaboro ${source.filename}`);
      processed.push(
        await processImage({ sharp, sectionName, source, stagingDirectory }),
      );
    }

    const pageUpdates = await preparePageUpdates({
      sectionName,
      images: processed,
      descriptions,
    });

    const generatedFilenames = await installGeneratedAssets(stagingDirectory);
    await Promise.all(pageUpdates.map(({ pagePath, updated }) => atomicWrite(pagePath, updated)));
    await removeStaleGeneratedAssets(sectionName, generatedFilenames);
    console.log(`  Fatto: pagine italiana e inglese aggiornate.`);
  } finally {
    await rm(stagingDirectory, { recursive: true, force: true });
  }
}

async function ensureSourceFolders() {
  for (const sectionName of Object.keys(sections)) {
    await mkdir(path.join(sourcesDirectory, sectionName), { recursive: true });
  }
}

async function main() {
  console.log("Preparazione automatica del portfolio");
  await ensureSourceFolders();

  const requestedSections = parseArguments();
  const selected = [];
  for (const sectionName of requestedSections) {
    const sources = await readSources(sectionName);
    if (sources.length) selected.push({ sectionName, sources });
  }

  if (!selected.length) {
    console.log("\nNessuna fotografia trovata.");
    console.log("Inserisci JPG numerati nelle cartelle dentro foto-sorgenti e riprova.");
    return;
  }

  const sharp = await loadSharp();
  const descriptions = await readDescriptions();
  await mkdir(imagesDirectory, { recursive: true });

  for (const selection of selected) {
    await processSection({ sharp, descriptions, ...selection });
  }

  console.log("\nTutte le fotografie sono state ottimizzate correttamente.");
}

main().catch((error) => {
  console.error(`\nERRORE: ${error.message}`);
  process.exitCode = 1;
});
