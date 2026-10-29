#!/usr/bin/env node
// Idempotently add shared site chrome to every rendered article in html/:
//
//   site-js      right after <head>   -- marks the document JS-capable + sets its accent
//   site-nav     right after <body>   -- sticky bar with the site mark and a back pill
//   site-reveal  right before </body> -- chrome.css + chrome.js, inlined
//
//   node build/inject-nav.js
//
// Each block lives between <!--site-X:start--> and <!--site-X:end--> so a later run
// REPLACES it when the block changes rather than skipping it. Everything outside the
// blocks stays byte-identical, which is what keeps the print exports reproducible.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HTML_DIR = path.join(ROOT, 'html');

// One accent per article, so each topic keeps its identity in the chrome.
// chrome.css defines the four palettes; anything unmapped falls back to indigo.
const ACCENTS = {
  'RLHF-Curious.html': 'rose',
  'RLHF-Study-Notes.html': 'rose',
  'GAN-Curious.html': 'violet',
  'GAN.html': 'violet',
  'VAE-Curious.html': 'teal',
  'VAE.html': 'teal',
  'Diffusion-Curious.html': 'orange',
  'Diffusion.html': 'orange',
  'Foundations-Curious.html': 'slate'
};

function accentFor(name) {
  return ACCENTS[name] || null;
}

function jsBlock(accent) {
  var acc = accent ? ';document.documentElement.setAttribute("data-accent","' + accent + '")' : '';
  return '<!--site-js:start-->'
    + '<script>document.documentElement.classList.add("js")' + acc + '</script>'
    + '<!--site-js:end-->';
}

const NAV = '<!--site-nav:start-->'
  + '<div class="site-nav">'
  + '<a class="mark" href="../index.html"><span class="mark-glyph">G</span>'
  + '<span class="mark-name">Generative AI</span></a>'
  + '<span class="spacer"></span>'
  + '<a class="back" href="../index.html">&larr; All topics</a>'
  + '</div>'
  + '<style>'
  + '.site-nav{position:sticky;top:0;z-index:50;display:flex;align-items:center;gap:12px;'
  + 'height:3rem;padding:0 20px;background:rgba(250,249,246,.9);backdrop-filter:blur(10px);'
  + 'border-bottom:1px solid #e7e4dc;font-family:ui-sans-serif,-apple-system,"Segoe UI",sans-serif}'
  + '.site-nav .mark{display:flex;align-items:center;gap:9px;text-decoration:none;color:#17171a}'
  + '.site-nav .mark-glyph{width:22px;height:22px;border-radius:50%;'
  + 'background:var(--accent,#4338ca);display:grid;place-items:center;color:#fff;'
  + 'font:700 11px/1 ui-sans-serif,sans-serif}'
  + '.site-nav .mark-name{font:600 13px/1 ui-sans-serif,sans-serif}'
  + '.site-nav .spacer{flex:1}'
  + '.site-nav .back{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;'
  + 'border:1px solid #e7e4dc;border-radius:999px;background:#fff;color:#5f5f68;'
  + 'text-decoration:none;font:600 12.5px/1 ui-sans-serif,sans-serif;transition:.15s}'
  + '.site-nav .back:hover{border-color:var(--accent,#4338ca);color:var(--accent,#4338ca)}'
  + '@media print{.site-nav{display:none!important}}'
  + '</style>'
  + '<!--site-nav:end-->';

// chrome.css + chrome.js are the single source for the injected article chrome.
const CHROME_DIR = path.join(ROOT, 'build', 'chrome');
const chromeCss = fs.readFileSync(path.join(CHROME_DIR, 'chrome.css'), 'utf8');
const chromeJs = fs.readFileSync(path.join(CHROME_DIR, 'chrome.js'), 'utf8');

if (chromeJs.indexOf('</' + 'script') !== -1) {
  throw new Error('build/chrome/chrome.js contains a literal script-close tag; it cannot be inlined');
}

const REVEAL = '<!--site-reveal:start-->'
  + '<style>' + chromeCss + '</style>'
  + '<script>' + chromeJs + '</script>'
  + '<!--site-reveal:end-->';

// Earlier runs used bare <!--site-nav--> / <!--site-reveal--> markers. Strip those
// blocks so this run re-emits them as paired, replaceable blocks.
function stripLegacy(html) {
  let out = html;
  const legacy = [['<!--site-nav-->', '</style>'], ['<!--site-reveal-->', '</script>']];
  for (const pair of legacy) {
    const i = out.indexOf(pair[0]);
    if (i === -1) continue;
    const j = out.indexOf(pair[1], i);
    if (j === -1) continue;
    out = out.slice(0, i) + out.slice(j + pair[1].length);
  }
  return out;
}

function upsert(html, name, block, insertAfter, insertBefore) {
  const start = '<!--' + name + ':start-->';
  const end = '<!--' + name + ':end-->';
  const s = html.indexOf(start);
  const e = html.indexOf(end);

  if (s !== -1 && e !== -1) {
    if (html.slice(s, e + end.length) === block) return { html: html, changed: false };
    return { html: html.slice(0, s) + block + html.slice(e + end.length), changed: true };
  }

  if (insertAfter) {
    const m = html.match(insertAfter);
    if (!m) return { html: html, changed: false, failed: 'no ' + insertAfter };
    const at = m.index + m[0].length;
    return { html: html.slice(0, at) + block + html.slice(at), changed: true };
  }
  const at = html.lastIndexOf(insertBefore);
  if (at === -1) return { html: html, changed: false, failed: 'no ' + insertBefore };
  return { html: html.slice(0, at) + block + html.slice(at), changed: true };
}

let changedN = 0, skipped = 0, failed = 0;

fs.readdirSync(HTML_DIR)
  .filter(function (n) { return n.endsWith('.html'); })
  .sort()
  .forEach(function (name) {
    const p = path.join(HTML_DIR, name);
    const before = fs.readFileSync(p, 'utf8');
    let html = stripLegacy(before);
    const touched = [];

    const steps = [
      ['site-js', jsBlock(accentFor(name)), /<head[^>]*>/, null],
      ['site-nav', NAV, /<body[^>]*>/, null],
      ['site-reveal', REVEAL, null, '</body>']
    ];

    for (const step of steps) {
      const r = upsert(html, step[0], step[1], step[2], step[3]);
      if (r.failed) { console.log('FAILED   html/' + name + '  (' + r.failed + ')'); failed++; return; }
      if (r.changed) { html = r.html; touched.push(step[0]); }
    }

    if (!touched.length) {
      console.log('skip     html/' + name + '  (up to date)');
      skipped++;
      return;
    }

    fs.writeFileSync(p, html);
    const delta = html.length - before.length;
    console.log('updated  html/' + name + '  [' + touched.join(' ') + ']  '
      + (delta >= 0 ? '+' : '') + delta + ' bytes');
    changedN++;
  });

console.log('done  updated=' + changedN + ' skipped=' + skipped + ' failed=' + failed);
if (failed) process.exitCode = 1;
