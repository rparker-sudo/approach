// Finishes the mobile-browser build of Load & Launch.
//
// Run after `expo export --platform web` (or just `npm run build:web`).
//  1. dist/            → a normal website folder for GitHub Pages (or any static host).
//                         Set EXPO_BASE_URL (e.g. /load-and-launch) when the site lives in a sub-folder.
//  2. dist-single/load-and-launch.html
//                       → the whole app in ONE file (scripts, fonts and images
//                         inlined). Handy for previews and places that only take one file.

import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dist = path.join(root, 'dist');
const singleDir = path.join(root, 'dist-single');
const base = (process.env.EXPO_BASE_URL || '').replace(/\/+$/, '');
const appStoreId = process.env.EXPO_PUBLIC_APP_STORE_ID || '';

const HEAD_TAGS = `
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black" />
    <meta name="apple-mobile-web-app-title" content="Load &amp; Launch" />
    <meta name="application-name" content="Load &amp; Launch" />
    <meta name="color-scheme" content="dark light" />
    <link rel="apple-touch-icon" href="${base}/apple-touch-icon.png" />
    <link rel="manifest" href="${base}/manifest.webmanifest" />${
      appStoreId ? `\n    <meta name="apple-itunes-app" content="app-id=${appStoreId}" />` : ''
    }
    <style>
      html, body { background: #0B0B0C; overscroll-behavior: none; -webkit-tap-highlight-color: transparent; }
      input, textarea { font-size: 16px; } /* stops iOS Safari zooming into fields */
    </style>`;

const VIEWPORT =
  '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />';

function patchHead(html) {
  html = html.replace(/<meta name="viewport"[^>]*>/, VIEWPORT);
  html = html.replace(/<link rel="icon" href="[^"]*favicon.ico"\/?>/, `<link rel="icon" href="${base}/favicon.ico" />`);
  if (!html.includes('apple-mobile-web-app-capable')) html = html.replace('</head>', `${HEAD_TAGS}\n  </head>`);
  return html;
}

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
};

function dataUri(file) {
  const type = MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
  return `data:${type};base64,${fs.readFileSync(file).toString('base64')}`;
}

function fromDist(urlPath) {
  const p = base && urlPath.startsWith(base + '/') ? urlPath.slice(base.length) : urlPath;
  return path.join(dist, decodeURIComponent(p.replace(/^\//, '')));
}

// ---- 1. Patch the website folder ----
const indexPath = path.join(dist, 'index.html');
if (!fs.existsSync(indexPath)) {
  console.error('dist/index.html not found. Run: npx expo export --platform web');
  process.exit(1);
}
let html = patchHead(fs.readFileSync(indexPath, 'utf8'));
fs.writeFileSync(indexPath, html);
// GitHub Pages: serve the app for any path (e.g. /join?code=…) and don't hide the _expo folder.
fs.writeFileSync(path.join(dist, '404.html'), html);
fs.writeFileSync(path.join(dist, '.nojekyll'), '');
// The home-screen manifest needs the sub-folder too.
{
  const mPath = path.join(dist, 'manifest.webmanifest');
  const m = JSON.parse(fs.readFileSync(mPath, 'utf8'));
  m.start_url = `${base}/`;
  m.scope = `${base}/`;
  m.icons = m.icons.map((i) => ({ ...i, src: `${base}/${i.src.replace(/^.*\//, '')}` }));
  fs.writeFileSync(mPath, JSON.stringify(m, null, 2));
}
console.log(`✓ dist/ is ready for GitHub Pages${base ? ` at ${base}/` : ''}`);

// ---- 2. Single-file version ----
let single = html;

// Inline scripts, swapping every "/assets/..." URL inside them for a data: URI.
single = single.replace(/<script src="([^"]+)" defer><\/script>/g, (_, src) => {
  let js = fs.readFileSync(fromDist(src), 'utf8');
  js = js.replace(/"((?:\/[^"\/]+)?\/assets\/[^"]+\.(?:png|jpg|ttf|otf))"/g, (m, url) => {
    const file = fromDist(url);
    return fs.existsSync(file) ? JSON.stringify(dataUri(file)) : m;
  });
  // Keep "</script>" inside strings from closing the tag early.
  js = js.replace(/<\/script/gi, '<\\/script');
  return `<script>${js}</script>`;
});

// Icons and manifest as data URIs (relative paths do not exist next to a single file).
const manifest = JSON.parse(fs.readFileSync(path.join(dist, 'manifest.webmanifest'), 'utf8'));
manifest.start_url = '.';
manifest.scope = '.';
manifest.icons = manifest.icons.map((i) => ({ ...i, src: dataUri(fromDist(i.src)) }));
single = single
  .replace(`href="${base}/apple-touch-icon.png"`, `href="${dataUri(path.join(dist, 'apple-touch-icon.png'))}"`)
  .replace(`href="${base}/favicon.ico"`, `href="${dataUri(path.join(dist, 'favicon.ico'))}"`)
  .replace(
    `href="${base}/manifest.webmanifest"`,
    `href="data:application/manifest+json;base64,${Buffer.from(JSON.stringify(manifest)).toString('base64')}"`,
  );

// The router reads the URL path. A single file can be opened at any path,
// so start the app at "/" unless the path is one of the app's own screens.
const ROUTER_FIX = `<script>(function(){try{var p=location.pathname;if(!/^\\/(fuel|program|progress|onboarding|builder|session|workout|import|settings)?\\/?$/.test(p)&&!/^\\/program\\//.test(p)){history.replaceState(null,'','/'+location.search+location.hash)}}catch(e){}})();</script>`;
single = single.replace('<div id="root"></div>', `<div id="root"></div>\n  ${ROUTER_FIX}`);

// Scripts were "defer"; inline scripts run immediately, so keep them after #root.
fs.mkdirSync(singleDir, { recursive: true });
const out = path.join(singleDir, 'load-and-launch.html');
fs.writeFileSync(out, single);
const mb = (fs.statSync(out).size / 1024 / 1024).toFixed(1);
console.log(`✓ dist-single/load-and-launch.html (${mb} MB)`);

// ---- 3. Embed version (page content only, no <html>/<head>/<body> wrapper) ----
// For hosts that wrap the page in their own document skeleton (e.g. a claude.ai artifact preview).
{
  const head = single.match(/<head>([\s\S]*?)<\/head>/)[1].replace(/<meta name="viewport"[^>]*>/, '');
  const body = single.match(/<body>([\s\S]*?)<\/body>/)[1];
  const embed = `<title>Load &amp; Launch</title>\n${head.replace(/<title>[^<]*<\/title>/, '')}\n<style>:root{color-scheme:dark}</style>\n${body}`;
  const embedOut = path.join(singleDir, 'load-and-launch-embed.html');
  fs.writeFileSync(embedOut, embed);
  console.log(`✓ dist-single/load-and-launch-embed.html (${(fs.statSync(embedOut).size / 1024 / 1024).toFixed(1)} MB)`);
}
