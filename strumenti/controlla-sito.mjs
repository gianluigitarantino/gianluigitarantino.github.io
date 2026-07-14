#!/usr/bin/env node

import { access, readFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { indexedPages, siteUrl } from "./configurazione-sito.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");
const errors = [];
const knownRoutes = new Set(indexedPages.map((page) => page.path));
knownRoutes.add("/404.html");

function report(message) {
  errors.push(message);
}

async function exists(filePath) {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function attributesFromTag(tag) {
  const attributes = {};
  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*(["'])(.*?)\2/gs)) {
    attributes[match[1].toLowerCase()] = match[3];
  }
  return attributes;
}

function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map((match) => ({
    raw: match[0],
    attributes: attributesFromTag(match[0]),
  }));
}

function decodeHtml(value) {
  return String(value ?? "")
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function oneValue(entries, selector, label, pageName) {
  const matches = entries.filter(selector);
  if (matches.length !== 1) {
    report(`${pageName}: deve esserci un solo ${label}; trovati ${matches.length}.`);
    return "";
  }
  const value = decodeHtml(matches[0].attributes.content ?? matches[0].attributes.href);
  if (!value) report(`${pageName}: ${label} è vuoto.`);
  return value;
}

function metaValue(metaTags, key, value, pageName) {
  return oneValue(
    metaTags,
    (tag) => tag.attributes[key] === value,
    `${key}="${value}"`,
    pageName,
  );
}

function fullUrl(urlPath) {
  return `${siteUrl}${urlPath}`;
}

function localPathFromUrl(value) {
  if (!value || /^(?:mailto:|tel:|data:|javascript:|#)/i.test(value)) return null;
  try {
    const url = new URL(value, siteUrl);
    if (url.origin !== new URL(siteUrl).origin) return null;
    return decodeURIComponent(url.pathname);
  } catch {
    return null;
  }
}

async function checkLocalReference(value, pageName, label) {
  const localPath = localPathFromUrl(value);
  if (!localPath) return;
  if (knownRoutes.has(localPath)) return;

  if (localPath.endsWith("/")) {
    report(`${pageName}: percorso interno inesistente in ${label}: ${localPath}.`);
    return;
  }

  const filePath = path.join(rootDirectory, localPath.replace(/^\//, ""));
  if (!(await exists(filePath))) {
    report(`${pageName}: file interno mancante in ${label}: ${localPath}.`);
  }
}

async function checkSrcset(value, pageName, label) {
  for (const candidate of String(value ?? "").split(",")) {
    const url = candidate.trim().split(/\s+/)[0];
    if (url) await checkLocalReference(url, pageName, label);
  }
}

function checkJsonLd(html, pageName) {
  const blocks = [
    ...html.matchAll(/<script\b(?=[^>]*\btype=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi),
  ];
  if (!blocks.length) report(`${pageName}: dati strutturati JSON-LD mancanti.`);

  for (const [index, block] of blocks.entries()) {
    try {
      JSON.parse(block[1]);
    } catch (error) {
      report(`${pageName}: JSON-LD ${index + 1} non valido: ${error.message}`);
    }
  }
}

function checkDuplicateIds(html, pageName) {
  const seen = new Set();
  for (const element of [...html.matchAll(/<[a-z][^>]*\bid=["']([^"']+)["'][^>]*>/gi)]) {
    const id = element[1];
    if (seen.has(id)) report(`${pageName}: id HTML duplicato: ${id}.`);
    seen.add(id);
  }
}

async function checkAssets(html, pageName) {
  for (const tagName of ["a", "link"]) {
    for (const tag of tags(html, tagName)) {
      if (tag.attributes.href) await checkLocalReference(tag.attributes.href, pageName, `<${tagName}>`);
      if (tag.attributes.target === "_blank") {
        const rel = new Set((tag.attributes.rel ?? "").split(/\s+/));
        if (!rel.has("noopener") || !rel.has("noreferrer")) {
          report(`${pageName}: link target="_blank" senza noopener e noreferrer.`);
        }
      }
      if (tag.attributes.imagesrcset) {
        await checkSrcset(tag.attributes.imagesrcset, pageName, `<${tagName}> imagesrcset`);
      }
    }
  }

  for (const tagName of ["script", "img"]) {
    for (const tag of tags(html, tagName)) {
      if (tag.attributes.src) await checkLocalReference(tag.attributes.src, pageName, `<${tagName}>`);
    }
  }

  for (const source of tags(html, "source")) {
    if (source.attributes.srcset) {
      await checkSrcset(source.attributes.srcset, pageName, "<source> srcset");
    }
  }
}

async function checkImages(html, pageName) {
  const imageTags = tags(html, "img");
  for (const image of imageTags) {
    if (!("alt" in image.attributes)) report(`${pageName}: immagine senza attributo alt.`);
  }

  const slides = imageTags.filter((image) =>
    (image.attributes.class ?? "").split(/\s+/).includes("slide"),
  );
  const pictureBlocks = [
    ...html.matchAll(/<picture\b(?=[^>]*\bclass="[^"]*\bslide-frame\b[^"]*")[^>]*>([\s\S]*?)<\/picture>/gi),
  ];
  if (pictureBlocks.length !== slides.length) {
    report(`${pageName}: ogni fotografia deve essere contenuta in un elemento picture responsive.`);
  }

  for (const [index, picture] of pictureBlocks.entries()) {
    const sourceTypes = new Set(
      tags(picture[1], "source").map((source) => source.attributes.type),
    );
    if (!sourceTypes.has("image/avif") || !sourceTypes.has("image/webp")) {
      report(`${pageName}: picture ${index + 1} deve offrire AVIF e WebP.`);
    }
  }

  const imagePreloads = tags(html, "link").filter(
    (link) =>
      (link.attributes.rel ?? "").split(/\s+/).includes("preload") &&
      link.attributes.as === "image",
  );
  if (slides.length && imagePreloads.length !== 1) {
    report(`${pageName}: deve esserci un solo preload per la prima fotografia.`);
  } else if (slides.length && imagePreloads[0].attributes.fetchpriority !== "high") {
    report(`${pageName}: il preload della prima fotografia deve avere fetchpriority="high".`);
  }

  for (const [index, image] of slides.entries()) {
    const { alt, height, loading, width } = image.attributes;
    if (!decodeHtml(alt)) report(`${pageName}: alt text vuoto per ${image.attributes.src ?? "una fotografia"}.`);
    if (!/^\d+$/.test(width ?? "") || !/^\d+$/.test(height ?? "")) {
      report(`${pageName}: dimensioni width/height mancanti per ${image.attributes.src ?? "una fotografia"}.`);
    }
    if (index === 0) {
      if (loading === "lazy") report(`${pageName}: la prima fotografia non deve usare loading="lazy".`);
      if (image.attributes.fetchpriority !== "high") {
        report(`${pageName}: la prima fotografia deve usare fetchpriority="high".`);
      }
    } else if (loading !== "lazy") {
      report(`${pageName}: fotografia successiva alla prima senza loading="lazy": ${image.attributes.src}.`);
    }
  }
}

async function checkIndexedPage(page, titleRegistry, descriptionRegistry) {
  const filePath = path.join(rootDirectory, page.file);
  if (!(await exists(filePath))) {
    report(`Pagina mancante: ${page.file}.`);
    return;
  }

  const html = await readFile(filePath, "utf8");
  const pageName = page.file;
  if (!/^---\s*[\s\S]*?---\s*<!doctype html>/i.test(html)) {
    report(`${pageName}: front matter o doctype HTML mancante.`);
  }

  const htmlLanguage = html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i)?.[1];
  if (htmlLanguage !== page.language) report(`${pageName}: lang HTML deve essere "${page.language}".`);

  const titleMatches = [...html.matchAll(/<title>([\s\S]*?)<\/title>/gi)];
  if (titleMatches.length !== 1 || !decodeHtml(titleMatches[0]?.[1])) {
    report(`${pageName}: deve esserci un solo title non vuoto.`);
  }
  const title = decodeHtml(titleMatches[0]?.[1]);

  const metaTags = tags(html, "meta");
  const linkTags = tags(html, "link");
  const description = metaValue(metaTags, "name", "description", pageName);
  const robots = metaValue(metaTags, "name", "robots", pageName);
  if (!robots.includes("index") || !robots.includes("follow")) {
    report(`${pageName}: robots deve consentire index e follow.`);
  }

  const canonical = oneValue(
    linkTags,
    (tag) => (tag.attributes.rel ?? "").split(/\s+/).includes("canonical"),
    "canonical",
    pageName,
  );
  const expectedUrl = fullUrl(page.path);
  if (canonical !== expectedUrl) report(`${pageName}: canonical deve essere ${expectedUrl}.`);

  const sitemapLink = linkTags.filter(
    (tag) => (tag.attributes.rel ?? "").split(/\s+/).includes("sitemap"),
  );
  if (sitemapLink.length !== 1 || sitemapLink[0].attributes.href !== `${siteUrl}/sitemap.xml`) {
    report(`${pageName}: collegamento alla sitemap mancante o errato.`);
  }

  const expectedAlternates = {
    it: fullUrl(page.group.it.path),
    en: fullUrl(page.group.en.path),
    "x-default": fullUrl(page.group.it.path),
  };
  for (const [language, expected] of Object.entries(expectedAlternates)) {
    const matching = linkTags.filter(
      (tag) =>
        (tag.attributes.rel ?? "").split(/\s+/).includes("alternate") &&
        tag.attributes.hreflang === language,
    );
    if (matching.length !== 1 || matching[0].attributes.href !== expected) {
      report(`${pageName}: hreflang ${language} deve essere ${expected}.`);
    }
  }

  const ogTitle = metaValue(metaTags, "property", "og:title", pageName);
  const ogDescription = metaValue(metaTags, "property", "og:description", pageName);
  const ogUrl = metaValue(metaTags, "property", "og:url", pageName);
  const ogImage = metaValue(metaTags, "property", "og:image", pageName);
  const ogImageAlt = metaValue(metaTags, "property", "og:image:alt", pageName);
  const ogSiteName = metaValue(metaTags, "property", "og:site_name", pageName);
  const ogType = metaValue(metaTags, "property", "og:type", pageName);
  const ogLocale = metaValue(metaTags, "property", "og:locale", pageName);
  const ogLocaleAlternate = metaValue(metaTags, "property", "og:locale:alternate", pageName);
  const ogImageWidth = metaValue(metaTags, "property", "og:image:width", pageName);
  const ogImageHeight = metaValue(metaTags, "property", "og:image:height", pageName);
  if (ogTitle !== title) report(`${pageName}: og:title non coincide con title.`);
  if (ogDescription !== description) report(`${pageName}: og:description non coincide con description.`);
  if (ogUrl !== expectedUrl) report(`${pageName}: og:url deve essere ${expectedUrl}.`);
  if (!ogImageAlt) report(`${pageName}: og:image:alt mancante.`);
  if (ogSiteName !== "Gianluigi Tarantino") report(`${pageName}: og:site_name non valido.`);
  if (!new Set(["website", "profile"]).has(ogType)) report(`${pageName}: og:type non valido.`);
  const expectedLocale = page.language === "it" ? "it_IT" : "en_GB";
  const expectedAlternateLocale = page.language === "it" ? "en_GB" : "it_IT";
  if (ogLocale !== expectedLocale) report(`${pageName}: og:locale deve essere ${expectedLocale}.`);
  if (ogLocaleAlternate !== expectedAlternateLocale) {
    report(`${pageName}: og:locale:alternate deve essere ${expectedAlternateLocale}.`);
  }
  if (!/^\d+$/.test(ogImageWidth) || !/^\d+$/.test(ogImageHeight)) {
    report(`${pageName}: dimensioni Open Graph mancanti o non valide.`);
  }
  await checkLocalReference(ogImage, pageName, "og:image");

  const twitterCard = metaValue(metaTags, "name", "twitter:card", pageName);
  const twitterTitle = metaValue(metaTags, "name", "twitter:title", pageName);
  const twitterDescription = metaValue(metaTags, "name", "twitter:description", pageName);
  const twitterImage = metaValue(metaTags, "name", "twitter:image", pageName);
  const twitterImageAlt = metaValue(metaTags, "name", "twitter:image:alt", pageName);
  if (twitterCard !== "summary_large_image") report(`${pageName}: twitter:card non valido.`);
  if (twitterTitle !== ogTitle) report(`${pageName}: twitter:title non coincide con og:title.`);
  if (twitterDescription !== ogDescription) report(`${pageName}: twitter:description non coincide con og:description.`);
  if (twitterImage !== ogImage) report(`${pageName}: twitter:image non coincide con og:image.`);
  if (twitterImageAlt !== ogImageAlt) report(`${pageName}: twitter:image:alt non coincide con og:image:alt.`);

  if (titleRegistry.has(title)) report(`${pageName}: title duplicato anche in ${titleRegistry.get(title)}.`);
  else titleRegistry.set(title, pageName);
  if (descriptionRegistry.has(description)) {
    report(`${pageName}: description duplicata anche in ${descriptionRegistry.get(description)}.`);
  } else descriptionRegistry.set(description, pageName);

  checkJsonLd(html, pageName);
  checkDuplicateIds(html, pageName);
  await checkImages(html, pageName);
  await checkAssets(html, pageName);
}

async function checkNotFoundPage() {
  const pageName = "404.html";
  const filePath = path.join(rootDirectory, pageName);
  if (!(await exists(filePath))) {
    report("Pagina 404.html mancante.");
    return;
  }
  const html = await readFile(filePath, "utf8");
  const robots = metaValue(tags(html, "meta"), "name", "robots", pageName);
  if (!robots.includes("noindex") || !robots.includes("follow")) {
    report("404.html: robots deve contenere noindex e follow.");
  }
  checkJsonLd(html, pageName);
  checkDuplicateIds(html, pageName);
  await checkImages(html, pageName);
  await checkAssets(html, pageName);
}

async function checkManifest() {
  const pageName = "manifest.webmanifest";
  try {
    const manifest = JSON.parse(await readFile(path.join(rootDirectory, pageName), "utf8"));
    if (!manifest.name || !manifest.short_name) report(`${pageName}: nome mancante.`);
    if (!knownRoutes.has(manifest.start_url)) report(`${pageName}: start_url non valido.`);
    for (const icon of manifest.icons ?? []) {
      await checkLocalReference(icon.src, pageName, "icona");
    }
  } catch (error) {
    report(`${pageName}: JSON non valido o file mancante: ${error.message}`);
  }
}

async function checkRobots() {
  const pageName = "robots.txt";
  try {
    const robots = await readFile(path.join(rootDirectory, pageName), "utf8");
    if (!robots.includes(`Sitemap: ${siteUrl}/sitemap.xml`)) {
      report(`${pageName}: riferimento alla sitemap mancante.`);
    }
    if (/^Disallow:\s*\/$/mi.test(robots)) report(`${pageName}: il sito intero risulta bloccato.`);
  } catch (error) {
    report(`${pageName}: file mancante o illeggibile: ${error.message}`);
  }
}

async function checkSitemap() {
  const pageName = "sitemap.xml";
  try {
    const xml = await readFile(path.join(rootDirectory, pageName), "utf8");
    const urls = [...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>[\s\S]*?<\/url>/g)].map(
      (match) => decodeHtml(match[1]),
    );
    const expected = indexedPages.map((page) => fullUrl(page.path));
    if (urls.join("\n") !== expected.join("\n")) {
      report(`${pageName}: l'elenco delle pagine non coincide con il sito.`);
    }
    if (/<image:(?:title|caption|geo_location|license)>/i.test(xml)) {
      report(`${pageName}: contiene elementi immagine deprecati.`);
    }
    for (const match of xml.matchAll(/<image:loc>([^<]+)<\/image:loc>/g)) {
      await checkLocalReference(decodeHtml(match[1]), pageName, "image:loc");
    }
    const dates = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((match) => match[1]);
    if (dates.length !== indexedPages.length || dates.some((date) => !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
      report(`${pageName}: lastmod mancanti o non validi.`);
    }
  } catch (error) {
    report(`${pageName}: file mancante o illeggibile: ${error.message}`);
  }
}

async function checkCssAssets() {
  const pageName = "style.css";
  try {
    const css = await readFile(path.join(rootDirectory, pageName), "utf8");
    for (const match of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
      await checkLocalReference(match[1], pageName, "url()");
    }
  } catch (error) {
    report(`${pageName}: file mancante o illeggibile: ${error.message}`);
  }
}

async function main() {
  console.log("Controllo tecnico prima della pubblicazione");
  const titleRegistry = new Map();
  const descriptionRegistry = new Map();

  for (const page of indexedPages) {
    await checkIndexedPage(page, titleRegistry, descriptionRegistry);
  }
  await checkNotFoundPage();
  await checkManifest();
  await checkRobots();
  await checkSitemap();
  await checkCssAssets();

  if (errors.length) {
    console.error(`\nSono stati trovati ${errors.length} problemi:`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `Controllo superato: ${indexedPages.length} pagine indicizzabili, pagina 404, metadati, link, immagini, JSON-LD e sitemap validi.`,
  );
}

main().catch((error) => {
  console.error(`\nERRORE: ${error.message}`);
  process.exitCode = 1;
});
