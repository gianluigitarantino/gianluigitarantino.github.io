#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");
const sitemapPath = path.join(rootDirectory, "sitemap.xml");
const statePath = path.join(rootDirectory, "dati", "sitemap-state.json");
const siteUrl = "https://www.gianluigitarantino.com";
const today = new Date().toISOString().slice(0, 10);

const pageGroups = [
  {
    it: { file: "index.html", path: "/" },
    en: { file: "en-home.html", path: "/en/" },
  },
  {
    it: { file: "architettura.html", path: "/architettura/" },
    en: { file: "en-architecture.html", path: "/en/architecture/" },
  },
  {
    it: { file: "interior.html", path: "/interior/" },
    en: { file: "en-interiors.html", path: "/en/interiors/" },
  },
  {
    it: { file: "personale.html", path: "/personale/" },
    en: { file: "en-personal.html", path: "/en/personal/" },
  },
  {
    it: { file: "profilo.html", path: "/profilo/" },
    en: { file: "en-about.html", path: "/en/about/" },
  },
];

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

function fullUrl(urlPath) {
  return `${siteUrl}${urlPath}`;
}

function fingerprint(content) {
  return createHash("sha256").update(content).digest("hex");
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function xmlDecode(value) {
  return String(value)
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
}

function attributesFromTag(tag) {
  const attributes = {};
  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*(["'])(.*?)\2/gs)) {
    attributes[match[1].toLowerCase()] = match[3];
  }
  return attributes;
}

function linkTags(html) {
  return [...html.matchAll(/<link\b[^>]*>/gi)].map((match) => match[0]);
}

function slideImages(html, pageName) {
  const images = [];
  const tags = [...html.matchAll(/<img\b(?=[^>]*\bclass="[^"]*\bslide\b[^"]*")[^>]*>/gi)];

  for (const match of tags) {
    const attributes = attributesFromTag(match[0]);
    const source = attributes.src ?? "";
    if (!/^\/immagini\/[^/]+\.jpe?g$/i.test(source)) {
      fail(`Percorso JPEG non valido in ${pageName}: ${source || "mancante"}.`);
    }
    if (!attributes.alt?.trim()) fail(`Alt text mancante in ${pageName}: ${source}.`);
    if (images.includes(source)) fail(`Fotografia duplicata in ${pageName}: ${source}.`);
    images.push(source);
  }

  return images;
}

function validateHeadLinks({ html, page, group, language }) {
  const tags = linkTags(html).map(attributesFromTag);
  const canonical = tags.filter((tag) => tag.rel?.split(/\s+/).includes("canonical"));
  const expectedCanonical = fullUrl(page.path);

  if (canonical.length !== 1 || canonical[0].href !== expectedCanonical) {
    fail(`Canonical non valido in ${page.file}; atteso ${expectedCanonical}.`);
  }

  const expectedAlternates = {
    it: fullUrl(group.it.path),
    en: fullUrl(group.en.path),
    "x-default": fullUrl(group.it.path),
  };
  const alternates = tags.filter((tag) => tag.rel?.split(/\s+/).includes("alternate"));

  for (const [hreflang, expectedUrl] of Object.entries(expectedAlternates)) {
    const matches = alternates.filter((tag) => tag.hreflang === hreflang);
    if (matches.length !== 1 || matches[0].href !== expectedUrl) {
      fail(`Hreflang ${hreflang} non valido in ${page.file}; atteso ${expectedUrl}.`);
    }
  }

  const htmlLanguage = html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i)?.[1];
  if (htmlLanguage !== language) {
    fail(`Lingua HTML non valida in ${page.file}; atteso lang="${language}".`);
  }
}

function previousDatesFromSitemap(xml) {
  const dates = {};
  if (!xml) return dates;

  for (const match of xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>[\s\S]*?<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>[\s\S]*?<\/url>/g)) {
    dates[xmlDecode(match[1])] = match[2];
  }
  return dates;
}

async function readState() {
  if (!(await exists(statePath))) return { _version: 1, pages: {} };
  try {
    const parsed = JSON.parse(await readFile(statePath, "utf8"));
    return { _version: 1, pages: parsed?.pages ?? {} };
  } catch (error) {
    fail(`Il file dati/sitemap-state.json non è valido: ${error.message}`);
  }
}

async function atomicWrite(filePath, content) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.sitemap-${process.pid}.tmp`;
  await writeFile(temporaryPath, content, "utf8");
  await rename(temporaryPath, filePath);
}

async function readPages(previousState, previousDates) {
  const pages = [];
  const nextState = { _version: 1, pages: {} };

  for (const group of pageGroups) {
    const groupPages = [];
    for (const language of ["it", "en"]) {
      const page = group[language];
      const sourcePath = path.join(rootDirectory, page.file);
      if (!(await exists(sourcePath))) fail(`Manca la pagina ${page.file}.`);

      const html = await readFile(sourcePath, "utf8");
      validateHeadLinks({ html, page, group, language });
      const images = slideImages(html, page.file);
      for (const imagePath of images) {
        const localImagePath = path.join(rootDirectory, imagePath.replace(/^\//, ""));
        if (!(await exists(localImagePath))) {
          fail(`La sitemap non può usare una fotografia mancante: ${imagePath}.`);
        }
      }
      const pageFingerprint = fingerprint(html);
      const url = fullUrl(page.path);
      const previous = previousState.pages?.[page.path];
      const lastmod =
        previous?.fingerprint === pageFingerprint && /^\d{4}-\d{2}-\d{2}$/.test(previous.lastmod)
          ? previous.lastmod
          : !previous && previousDates[url]
            ? previousDates[url]
            : today;

      nextState.pages[page.path] = {
        source: page.file,
        fingerprint: pageFingerprint,
        lastmod,
      };
      const result = { ...page, language, images, lastmod };
      pages.push({ ...result, group });
      groupPages.push(result);
    }

    const [italian, english] = groupPages;
    if (italian.images.join("\n") !== english.images.join("\n")) {
      fail(`Le fotografie italiane e inglesi non coincidono tra ${italian.file} e ${english.file}.`);
    }
  }

  return { pages, nextState };
}

function renderSitemap(pages) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  ];

  for (const page of pages) {
    lines.push("  <url>");
    lines.push(`    <loc>${xmlEscape(fullUrl(page.path))}</loc>`);
    lines.push(
      `    <xhtml:link rel="alternate" hreflang="it" href="${xmlEscape(fullUrl(page.group.it.path))}"/>`,
    );
    lines.push(
      `    <xhtml:link rel="alternate" hreflang="en" href="${xmlEscape(fullUrl(page.group.en.path))}"/>`,
    );
    lines.push(
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(fullUrl(page.group.it.path))}"/>`,
    );
    lines.push(`    <lastmod>${page.lastmod}</lastmod>`);
    for (const imagePath of page.images) {
      lines.push("    <image:image>");
      lines.push(`      <image:loc>${xmlEscape(fullUrl(imagePath))}</image:loc>`);
      lines.push("    </image:image>");
    }
    lines.push("  </url>");
  }

  lines.push("</urlset>");
  return `${lines.join("\n")}\n`;
}

async function main() {
  console.log("Generazione automatica della sitemap");
  const previousState = await readState();
  const previousXml = (await exists(sitemapPath)) ? await readFile(sitemapPath, "utf8") : "";
  const previousDates = previousDatesFromSitemap(previousXml);
  const { pages, nextState } = await readPages(previousState, previousDates);
  const sitemap = renderSitemap(pages);

  await atomicWrite(sitemapPath, sitemap);
  await atomicWrite(statePath, `${JSON.stringify(nextState, null, 2)}\n`);

  const imageCount = pages.reduce((total, page) => total + page.images.length, 0);
  console.log(`Sitemap pronta: ${pages.length} pagine e ${imageCount} riferimenti fotografici.`);
}

main().catch((error) => {
  console.error(`\nERRORE: ${error.message}`);
  process.exitCode = 1;
});
