#!/usr/bin/env node

import { appendFile } from "node:fs/promises";
import process from "node:process";

import { indexedPages, siteUrl } from "./configurazione-sito.mjs";

const checkBaseUrl = (process.env.SITE_CHECK_BASE_URL || siteUrl).replace(/\/$/, "");
const checkVersion = process.env.SITE_CHECK_VERSION || String(Date.now());
const maximumAttempts = positiveInteger(process.env.SITE_CHECK_ATTEMPTS, 8);
const delayMilliseconds = nonNegativeInteger(process.env.SITE_CHECK_DELAY_MS, 10000);
const requestTimeoutMilliseconds = positiveInteger(process.env.SITE_CHECK_TIMEOUT_MS, 15000);
const siteOrigin = new URL(siteUrl).origin;
const essentialAssets = new Set();

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function nonNegativeInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
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

function relValues(tag) {
  return new Set((tag.attributes.rel || "").toLowerCase().split(/\s+/).filter(Boolean));
}

function decodeHtml(value) {
  return String(value ?? "")
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .trim();
}

function fullUrl(pathname) {
  return `${siteUrl}${pathname}`;
}

function toCheckUrl(publicValue) {
  const publicUrl = new URL(publicValue, siteUrl);
  if (publicUrl.origin !== siteOrigin) return null;

  const checkUrl = new URL(`${publicUrl.pathname}${publicUrl.search}`, `${checkBaseUrl}/`);
  checkUrl.searchParams.set("verifica-pubblicazione", checkVersion);
  return checkUrl;
}

async function fetchWithTimeout(url, options = {}) {
  try {
    return await fetch(url, {
      redirect: "follow",
      cache: "no-store",
      ...options,
      headers: {
        "cache-control": "no-cache",
        "user-agent": "gianluigitarantino.com deployment check",
        ...(options.headers || {}),
      },
      signal: AbortSignal.timeout(requestTimeoutMilliseconds),
    });
  } catch (error) {
    throw new Error(`${url}: ${error.message}`);
  }
}

async function fetchText(publicValue, expectedStatus = 200) {
  const checkUrl = toCheckUrl(publicValue);
  if (!checkUrl) throw new Error(`URL esterno inatteso: ${publicValue}`);

  const response = await fetchWithTimeout(checkUrl);
  if (response.status !== expectedStatus) {
    throw new Error(`${publicValue}: HTTP ${response.status}, atteso ${expectedStatus}.`);
  }

  const text = await response.text();
  if (!text.trim()) throw new Error(`${publicValue}: risposta vuota.`);
  return { response, text };
}

function addAsset(value) {
  if (!value) return;
  try {
    const publicUrl = new URL(decodeHtml(value), siteUrl);
    if (publicUrl.origin === siteOrigin) essentialAssets.add(publicUrl.href);
  } catch {
    // Gli URL non validi vengono già intercettati dal controllo tecnico locale.
  }
}

function addSrcset(value) {
  for (const candidate of String(value || "").split(",")) {
    const url = candidate.trim().split(/\s+/)[0];
    if (url) addAsset(url);
  }
}

function checkPageMarkup(page, html) {
  const errors = [];
  const pageLabel = page.path;
  const htmlTags = tags(html, "html");
  const linkTags = tags(html, "link");
  const metaTags = tags(html, "meta");

  if (htmlTags.length !== 1 || htmlTags[0].attributes.lang !== page.language) {
    errors.push(`${pageLabel}: attributo lang online non corretto.`);
  }

  const canonicalTags = linkTags.filter((tag) => relValues(tag).has("canonical"));
  const expectedCanonical = fullUrl(page.path);
  if (
    canonicalTags.length !== 1 ||
    decodeHtml(canonicalTags[0].attributes.href) !== expectedCanonical
  ) {
    errors.push(`${pageLabel}: canonical online non corretto.`);
  }

  const alternateTags = linkTags.filter((tag) => relValues(tag).has("alternate"));
  const expectedAlternates = {
    it: fullUrl(page.group.it.path),
    en: fullUrl(page.group.en.path),
    "x-default": fullUrl(page.group.it.path),
  };
  for (const [language, expectedUrl] of Object.entries(expectedAlternates)) {
    const matches = alternateTags.filter(
      (tag) =>
        tag.attributes.hreflang === language && decodeHtml(tag.attributes.href) === expectedUrl,
    );
    if (matches.length !== 1) {
      errors.push(`${pageLabel}: hreflang ${language} online non corretto.`);
    }
  }

  for (const link of linkTags) {
    const rel = relValues(link);
    if (
      rel.has("stylesheet") ||
      rel.has("icon") ||
      rel.has("apple-touch-icon") ||
      rel.has("manifest") ||
      rel.has("preload")
    ) {
      addAsset(link.attributes.href);
      addSrcset(link.attributes.imagesrcset);
    }
  }

  for (const script of tags(html, "script")) addAsset(script.attributes.src);

  const ogImage = metaTags.find((tag) => tag.attributes.property === "og:image");
  addAsset(ogImage?.attributes.content);

  const galleryPresent = /\bclass=["'][^"']*\bgallery\b/i.test(html);
  const pictureBlocks = [...html.matchAll(/<picture\b[^>]*>([\s\S]*?)<\/picture>/gi)];
  const firstGalleryPicture = pictureBlocks.find((block) =>
    /<img\b[^>]*\bclass=["'][^"']*\bslide\b/i.test(block[1]),
  );

  if (galleryPresent && !firstGalleryPicture) {
    errors.push(`${pageLabel}: fotografia principale online non trovata.`);
  }

  if (firstGalleryPicture) {
    for (const image of tags(firstGalleryPicture[1], "img")) addAsset(image.attributes.src);
    for (const source of tags(firstGalleryPicture[1], "source")) {
      addSrcset(source.attributes.srcset);
    }
  }

  return errors;
}

async function checkPage(page) {
  const expectedUrl = fullUrl(page.path);
  const { response, text } = await fetchText(expectedUrl);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) {
    return [`${page.path}: content-type online inatteso: ${contentType || "mancante"}.`];
  }
  return checkPageMarkup(page, text);
}

async function checkSitemap() {
  const { text } = await fetchText(`${siteUrl}/sitemap.xml`);
  const foundUrls = [...text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) =>
    decodeHtml(match[1]),
  );
  const expectedUrls = indexedPages.map((page) => fullUrl(page.path));
  if (JSON.stringify(foundUrls) !== JSON.stringify(expectedUrls)) {
    throw new Error("sitemap.xml online non contiene esattamente le pagine previste.");
  }
}

async function checkRobots() {
  const { text } = await fetchText(`${siteUrl}/robots.txt`);
  if (!text.includes(`Sitemap: ${siteUrl}/sitemap.xml`)) {
    throw new Error("robots.txt online non indica la sitemap corretta.");
  }
  if (/^\s*Disallow:\s*\/\s*$/im.test(text)) {
    throw new Error("robots.txt online blocca l'intero sito.");
  }
}

async function checkManifest() {
  const { text } = await fetchText(`${siteUrl}/manifest.webmanifest`);
  let manifest;
  try {
    manifest = JSON.parse(text);
  } catch (error) {
    throw new Error(`manifest.webmanifest online non valido: ${error.message}`);
  }
  if (manifest.start_url !== "/") throw new Error("manifest online con start_url non corretto.");
  for (const icon of manifest.icons || []) addAsset(icon.src);
}

async function check404() {
  const missingPath = `/pagina-inesistente-controllo-${checkVersion}/`;
  const { text } = await fetchText(`${siteUrl}${missingPath}`, 404);
  const robotsMeta = tags(text, "meta").find((tag) => tag.attributes.name === "robots");
  if (!/\bnoindex\b/i.test(robotsMeta?.attributes.content || "")) {
    throw new Error("pagina 404 online priva di noindex.");
  }
}

async function checkAsset(publicUrl) {
  const checkUrl = toCheckUrl(publicUrl);
  let response = await fetchWithTimeout(checkUrl, { method: "HEAD" });

  if (response.status === 405 || response.status === 501) {
    response = await fetchWithTimeout(checkUrl, {
      headers: { range: "bytes=0-0" },
    });
  }

  if (response.status !== 200 && response.status !== 206) {
    throw new Error(`${new URL(publicUrl).pathname}: HTTP ${response.status}.`);
  }
  if (response.headers.get("content-length") === "0") {
    throw new Error(`${new URL(publicUrl).pathname}: risorsa vuota.`);
  }
}

async function checkAssets() {
  const assets = [...essentialAssets];
  let nextIndex = 0;
  const errors = [];

  async function worker() {
    while (nextIndex < assets.length) {
      const asset = assets[nextIndex];
      nextIndex += 1;
      try {
        await checkAsset(asset);
      } catch (error) {
        errors.push(error.message);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(6, assets.length) }, () => worker()));
  return errors;
}

async function runAttempt() {
  essentialAssets.clear();
  const errors = [];

  const pageResults = await Promise.all(
    indexedPages.map(async (page) => {
      try {
        return await checkPage(page);
      } catch (error) {
        return [`${page.path}: ${error.message}`];
      }
    }),
  );
  errors.push(...pageResults.flat());

  for (const check of [checkSitemap, checkRobots, checkManifest, check404]) {
    try {
      await check();
    } catch (error) {
      errors.push(error.message);
    }
  }

  errors.push(...(await checkAssets()));
  return { errors, assetCount: essentialAssets.size };
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function writeSummary(success, attempt, assetCount, errors = []) {
  if (!process.env.GITHUB_STEP_SUMMARY) return;
  const lines = [
    "## Controllo del sito online",
    "",
    success
      ? `✅ Superato al tentativo ${attempt}: ${indexedPages.length} pagine e ${assetCount} risorse essenziali raggiungibili.`
      : `❌ Non superato dopo ${attempt} tentativi.`,
    "",
  ];
  if (!success) lines.push(...errors.map((error) => `- ${error}`), "");
  await appendFile(process.env.GITHUB_STEP_SUMMARY, `${lines.join("\n")}\n`, "utf8");
}

async function main() {
  console.log("Controllo del sito realmente online");

  let lastResult = { errors: ["Controllo non eseguito."], assetCount: 0 };
  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    lastResult = await runAttempt();
    if (lastResult.errors.length === 0) {
      console.log(
        `Controllo superato al tentativo ${attempt}: ${indexedPages.length} pagine e ${lastResult.assetCount} risorse essenziali raggiungibili.`,
      );
      await writeSummary(true, attempt, lastResult.assetCount);
      return;
    }

    console.log(
      `Tentativo ${attempt}/${maximumAttempts} non superato (${lastResult.errors.length} problemi).`,
    );
    if (attempt < maximumAttempts) await wait(delayMilliseconds);
  }

  console.error("Il sito online non ha superato il controllo:");
  for (const error of lastResult.errors) console.error(`- ${error}`);
  await writeSummary(false, maximumAttempts, lastResult.assetCount, lastResult.errors);
  process.exitCode = 1;
}

await main().catch((error) => {
  console.error(`Controllo online interrotto: ${error.message}`);
  process.exitCode = 1;
});
