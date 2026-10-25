#!/usr/bin/env node
// Idempotently add a "← All topics" bar to every rendered article in html/.
//   node build/inject-nav.js
// Everything except the inserted block stays byte-identical.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HTML_DIR = path.join(ROOT, 'html');
const MARK = '<!--site-nav-->';

const NAV = MARK
  + '<div class="site-nav"><a href="../index.html">&larr; All topics</a></div>'
  + '<style>.site-nav{position:sticky;top:0;z-index:50;display:flex;align-items:center;'
  + 'height:2.6rem;padding:0 1.2rem;background:rgba(251,250,248,.92);'
  + 'backdrop-filter:blur(8px);border-bottom:1px solid #e3e0da;'
  + 'font:600 12.5px/1 ui-sans-serif,-apple-system,"Segoe UI",sans-serif;letter-spacing:.02em}'
  + '.site-nav a{color:#5c5c66;text-decoration:none}'
  + '.site-nav a:hover{color:#1a1a1d}'
  + '@media print{.site-nav{display:none!important}}</style>';

let injected = 0, skipped = 0, failed = 0;

fs.readdirSync(HTML_DIR)
  .filter(function (n) { return n.endsWith('.html'); })
  .sort()
  .forEach(function (name) {
    const p = path.join(HTML_DIR, name);
    const before = fs.readFileSync(p, 'utf8');

    if (before.indexOf(MARK) !== -1) {
      console.log('skip     html/' + name + '  (already has nav)');
      skipped++;
      return;
    }

    const m = before.match(/<body[^>]*>/);
    if (!m) {
      console.log('FAILED   html/' + name + '  (no <body> tag)');
      failed++;
      return;
    }

    const at = m.index + m[0].length;
    const after = before.slice(0, at) + NAV + before.slice(at);
    fs.writeFileSync(p, after);
    console.log('injected html/' + name + '  (+' + (after.length - before.length) + ' bytes)');
    injected++;
  });

console.log('done  injected=' + injected + ' skipped=' + skipped + ' failed=' + failed);
if (failed) process.exitCode = 1;
