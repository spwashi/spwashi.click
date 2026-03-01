#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const RELEASE_MANIFEST_PATH = path.join(ROOT_DIR, 'release.manifest.json');
const REQUIRED_COPY_TARGETS = [
  'index.html',
  '404.html',
  'CNAME',
  'robots.txt',
  'sitemap.xml',
  'manifest.webmanifest',
  'sw.js',
  'assets.manifest.json',
  'favicon.svg',
  'spw.index.json',
  'spw.index.spw',
  'release.manifest.json',
  'work',
  'notes',
  'src'
];
const OPTIONAL_COPY_TARGETS = ['seed/site', 'seed/images', '.spw'];
const DIST_HTML_FILES = ['index.html', '404.html', 'work/index.html', 'notes/index.html'];
const DIST_TEMPLATE_FILES = ['manifest.webmanifest', 'sw.js', 'assets.manifest.json'];

async function copyTarget(target) {
  const sourcePath = path.join(ROOT_DIR, target);
  const destinationPath = path.join(DIST_DIR, target);
  await cp(sourcePath, destinationPath, { recursive: true });
}

function toIsoDate(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function slugToken(value, fallback) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || fallback;
}

function computeAssetVersion(releaseDate, releaseId, releaseArc, releaseVibe) {
  return `${releaseDate.replace(/-/g, '')}-${releaseArc}-${releaseVibe}-${releaseId}`;
}

async function loadReleaseMeta() {
  let parsedManifest = {};

  if (existsSync(RELEASE_MANIFEST_PATH)) {
    const raw = await readFile(RELEASE_MANIFEST_PATH, 'utf8');
    parsedManifest = JSON.parse(raw);
  }

  const releaseDate = process.env.RELEASE_DATE ?? parsedManifest.releaseDate ?? toIsoDate();
  const releaseId = slugToken(process.env.RELEASE_ID ?? parsedManifest.releaseId ?? 'r0', 'r0');
  const releaseArc = slugToken(process.env.RELEASE_ARC ?? parsedManifest.arc ?? 'baseline', 'baseline');
  const releaseVibe = slugToken(process.env.RELEASE_VIBE ?? parsedManifest.vibe ?? 'steady', 'steady');
  const assetVersion =
    process.env.ASSET_VERSION ??
    parsedManifest.assetVersion ??
    computeAssetVersion(releaseDate, releaseId, releaseArc, releaseVibe);

  return {
    releaseDate,
    releaseId,
    releaseArc,
    releaseVibe,
    assetVersion
  };
}

async function stampHtmlReleasePlaceholders(releaseMeta) {
  for (const relativePath of DIST_HTML_FILES) {
    const absolutePath = path.join(DIST_DIR, relativePath);
    const existingContent = await readFile(absolutePath, 'utf8');
    const stampedContent = existingContent
      .replaceAll('__RELEASE_DATE__', releaseMeta.releaseDate)
      .replaceAll('__RELEASE_ID__', releaseMeta.releaseId)
      .replaceAll('__RELEASE_ARC__', releaseMeta.releaseArc)
      .replaceAll('__RELEASE_VIBE__', releaseMeta.releaseVibe)
      .replaceAll('__ASSET_VERSION__', releaseMeta.assetVersion);

    await writeFile(absolutePath, stampedContent, 'utf8');
  }
}

async function stampTemplateReleasePlaceholders(releaseMeta) {
  for (const relativePath of DIST_TEMPLATE_FILES) {
    const absolutePath = path.join(DIST_DIR, relativePath);
    const existingContent = await readFile(absolutePath, 'utf8');
    const stampedContent = existingContent
      .replaceAll('__RELEASE_DATE__', releaseMeta.releaseDate)
      .replaceAll('__RELEASE_ID__', releaseMeta.releaseId)
      .replaceAll('__RELEASE_ARC__', releaseMeta.releaseArc)
      .replaceAll('__RELEASE_VIBE__', releaseMeta.releaseVibe)
      .replaceAll('__ASSET_VERSION__', releaseMeta.assetVersion);

    await writeFile(absolutePath, stampedContent, 'utf8');
  }
}

async function runBuild() {
  const releaseMeta = await loadReleaseMeta();

  await rm(DIST_DIR, { recursive: true, force: true });
  await mkdir(DIST_DIR, { recursive: true });

  for (const target of REQUIRED_COPY_TARGETS) {
    await copyTarget(target);
  }

  for (const target of OPTIONAL_COPY_TARGETS) {
    const sourcePath = path.join(ROOT_DIR, target);
    if (existsSync(sourcePath)) {
      await copyTarget(target);
    }
  }

  await stampHtmlReleasePlaceholders(releaseMeta);
  await stampTemplateReleasePlaceholders(releaseMeta);
  await writeFile(path.join(DIST_DIR, '.nojekyll'), '', 'utf8');
  console.log(`Build complete: ${DIST_DIR}`);
  console.log(
    `Release stamp: ${releaseMeta.releaseDate} arc=${releaseMeta.releaseArc} vibe=${releaseMeta.releaseVibe} id=${releaseMeta.releaseId} -> ${releaseMeta.assetVersion}`
  );
}

runBuild().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
