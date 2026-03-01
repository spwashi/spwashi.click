import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const PAGE_PATHS = ['index.html', 'work/index.html', 'notes/index.html', '404.html'];

async function readPage(relativePath) {
  return readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');
}

test('all pages include shared boot module and viewport metadata', async () => {
  for (const pagePath of PAGE_PATHS) {
    const html = await readPage(pagePath);
    assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1"\s*\/>/);
    assert.match(html, /<meta name="spw:release-date" content="__RELEASE_DATE__"\s*\/>/);
    assert.match(html, /<meta name="spw:release-arc" content="__RELEASE_ARC__"\s*\/>/);
    assert.match(html, /<meta name="spw:release-vibe" content="__RELEASE_VIBE__"\s*\/>/);
    assert.match(html, /<meta name="spw:asset-version" content="__ASSET_VERSION__"\s*\/>/);
    assert.match(html, /<meta name="spw:texture-cache-origin" content="https:\/\/tealstripesvibes\.com"\s*\/>/);
    assert.match(html, /<meta name="spw:feature-index" content="\/spw\.index\.json"\s*\/>/);
    assert.match(html, /<meta name="spw:feature-index-spw" content="\/spw\.index\.spw"\s*\/>/);
    assert.match(html, /<meta name="spw:workspace-index" content="\/\.spw\/workspace\.spw"\s*\/>/);
    assert.match(html, /<link rel="manifest" href="\/manifest\.webmanifest\?v=__ASSET_VERSION__"\s*\/>/);
    assert.match(html, /<script type="module" src="\/src\/core\/boot\.js\?v=__ASSET_VERSION__"><\/script>/);
  }
});

test('navigation and ARIA structure are present across routes', async () => {
  const home = await readPage('index.html');
  const work = await readPage('work/index.html');
  const notes = await readPage('notes/index.html');

  for (const html of [home, work, notes]) {
    assert.match(html, /<spw-site-shell route="(home|work|notes)" aria-label="Site shell"[^>]*>/);
    assert.match(html, /<nav class="site-nav" aria-label="Primary navigation">/);
    assert.match(html, /<a href="\/" data-route="home">Home<\/a>/);
    assert.match(html, /<a href="\/work\/" data-route="work">Work<\/a>/);
    assert.match(html, /<a href="\/notes\/" data-route="notes">Notes<\/a>/);
    assert.match(html, /data-role="performance-toggle"/);
    assert.match(html, /role="main"/);
  }
});

test('home route includes signature click stage with SVG and layered data states', async () => {
  const home = await readPage('index.html');

  assert.match(home, /<spw-click-stage[\s\S]*data-state="interactive"/);
  assert.match(home, /<svg viewBox="0 0 320 120" class="click-stage__score"/);
  assert.match(home, /data-layer="geometry"/);
  assert.match(home, /data-layer="motion"/);
  assert.match(home, /data-layer="highlights"/);
  assert.match(home, /data-layer="fragments"/);
  assert.match(home, /<spw-ecology-map data-state="observing"><\/spw-ecology-map>/);
  assert.match(home, /<spw-shader-field data-state="interactive" aria-label="Shader field interaction surface">/);
  assert.match(home, /data-layout-region="shader-field"/);
  assert.match(home, /<spw-syntax-lab data-state="exploratory"><\/spw-syntax-lab>/);
  assert.match(home, /data-enhancement-zone="seed-atlas"/);
  assert.match(home, /data-structure-label="Primary interaction component with trigger, status narration, SVG score, and rhythm grid"/);
  assert.match(home, /<noscript>/);
});

test('styles include responsive and reduced-motion constraints', async () => {
  const layoutCss = await readFile(new URL('../../src/styles/layout.css', import.meta.url), 'utf8');
  const componentCss = await readFile(new URL('../../src/styles/components.css', import.meta.url), 'utf8');

  assert.match(layoutCss, /@media \(max-width: 900px\)/);
  assert.match(componentCss, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(componentCss, /spw-chapter-panel\[data-locked='true'\]/);
  assert.match(componentCss, /spw-click-stage\[data-phase='chorus'\]/);
  assert.match(componentCss, /\.syntax-lab__radial/);
  assert.match(componentCss, /\.syntax-lab__brace-button\[data-active='true'\]/);
});

test('pwa assets exist with release-aware placeholders and install handlers', async () => {
  const manifest = await readFile(new URL('../../manifest.webmanifest', import.meta.url), 'utf8');
  const serviceWorker = await readFile(new URL('../../sw.js', import.meta.url), 'utf8');

  assert.match(manifest, /"start_url": "\/\?source=pwa"/);
  assert.match(manifest, /__ASSET_VERSION__/);
  assert.match(serviceWorker, /const RELEASE_TAG = '__ASSET_VERSION__'/);
  assert.match(serviceWorker, /self\.addEventListener\('install'/);
  assert.match(serviceWorker, /self\.addEventListener\('fetch'/);
});
