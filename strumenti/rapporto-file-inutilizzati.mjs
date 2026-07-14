#!/usr/bin/env node

import { appendFile, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { indexedPages } from "./configurazione-sito.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");

const referenceFiles = [
  ...indexedPages.map(({ file }) => file),
  "404.html",
  "style.css",
  "script.js",
  "manifest.webmanifest",
  "robots.txt",
  "sitemap.xml",
];

const assetDirectories = ["immagini", "fonts"];
const mediaExtensions = new Set([
  ".avif",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".otf",
  ".png",
  ".svg",
  ".ttf",
  ".webp",
  ".woff",
  ".woff2",
]);

function toSitePath(filePath) {
  return path.relative(rootDirectory, filePath).split(path.sep).join("/");
}

async function listFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(entryPath)));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }
  return files;
}

async function collectPublicAssets() {
  const assets = [];

  for (const directory of assetDirectories) {
    assets.push(...(await listFiles(path.join(rootDirectory, directory))));
  }

  for (const entry of await readdir(rootDirectory, { withFileTypes: true })) {
    if (entry.isFile() && mediaExtensions.has(path.extname(entry.name).toLowerCase())) {
      assets.push(path.join(rootDirectory, entry.name));
    }
  }

  return assets.sort((a, b) => toSitePath(a).localeCompare(toSitePath(b), "it"));
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
}

async function main() {
  const referenceContents = await Promise.all(
    referenceFiles.map((file) => readFile(path.join(rootDirectory, file), "utf8")),
  );
  const references = referenceContents.join("\n");
  const assets = await collectPublicAssets();
  const unused = [];

  for (const assetPath of assets) {
    const sitePath = toSitePath(assetPath);
    if (!references.includes(`/${sitePath}`)) {
      unused.push({
        path: sitePath,
        size: (await stat(assetPath)).size,
      });
    }
  }

  const unusedBytes = unused.reduce((total, file) => total + file.size, 0);
  const summary = [
    "## Rapporto sui file pubblici inutilizzati",
    "",
    `Controllati **${assets.length}** file multimediali nelle cartelle pubbliche.`,
    "",
  ];

  console.log("Rapporto sui file pubblici inutilizzati");
  console.log(`File controllati: ${assets.length}.`);

  if (unused.length === 0) {
    console.log("Nessun file inutilizzato rilevato.");
    summary.push("✅ Nessun file inutilizzato rilevato.", "");
  } else {
    console.log(
      `Possibili file inutilizzati: ${unused.length} (${formatBytes(unusedBytes)} complessivi).`,
    );
    for (const file of unused) {
      console.log(`- ${file.path} (${formatBytes(file.size)})`);
    }
    console.log("Il rapporto è informativo: nessun file è stato eliminato automaticamente.");

    summary.push(
      `⚠️ Rilevati **${unused.length}** possibili file inutilizzati (${formatBytes(unusedBytes)} complessivi).`,
      "",
      "| File | Dimensione |",
      "| --- | ---: |",
      ...unused.map((file) => `| \`${file.path}\` | ${formatBytes(file.size)} |`),
      "",
      "Il rapporto è informativo: nessun file viene eliminato automaticamente.",
      "",
    );
  }

  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `${summary.join("\n")}\n`, "utf8");
  }
}

main().catch((error) => {
  console.error(`Impossibile generare il rapporto: ${error.message}`);
  process.exitCode = 1;
});
