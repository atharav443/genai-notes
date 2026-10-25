#!/usr/bin/env node
// Build RLHF-Study-Notes.html from a LaTeX-bearing source.
//   \[ ... \]  -> display math      \( ... \)  -> inline math      (KaTeX, pre-rendered)
//   /*KATEX_CSS*/  -> katex.min.css with every woff2 font base64-inlined (offline / print-safe)
const fs = require('fs');
const path = require('path');
const KATEX = '/Users/anaik/Documents/papers/.genai-work/node_modules/katex';
const katex = require(path.join(KATEX, 'dist/katex.min.js'));

const SRC = process.argv[2];
const OUT = process.argv[3];

function inlineCss() {
  let css = fs.readFileSync(path.join(KATEX, 'dist/katex.min.css'), 'utf8');
  const dir = path.join(KATEX, 'dist/fonts');
  const cache = {};
  css = css.replace(/url\(fonts\/([A-Za-z0-9_\-]+\.woff2)\)/g, (m, file) => {
    if (!cache[file]) cache[file] = 'data:font/woff2;base64,' + fs.readFileSync(path.join(dir, file)).toString('base64');
    return 'url(' + cache[file] + ')';
  });
  // woff2 resolves first; drop the woff/ttf fallbacks so file:// never 404s
  css = css.replace(/,\s*url\(fonts\/[A-Za-z0-9_\-]+\.(woff|ttf)\)\s*format\("(woff|truetype)"\)/g, '');
  return css;
}

let failures = 0;
function render(tex, displayMode) {
  try {
    katex.renderToString(tex, { throwOnError: true, strict: 'ignore' });
  } catch (e) {
    failures++;
    console.log('KATEX FAIL: ' + e.message.split('\n')[0]);
    console.log('   ' + tex.replace(/\s+/g, ' ').slice(0, 160));
  }
  return katex.renderToString(tex, { displayMode, throwOnError: false, strict: 'ignore', trust: false });
}

let html = fs.readFileSync(SRC, 'utf8');
// drop the source-only build banner
html = html.replace(/<div class="buildnote"[^>]*>[\s\S]*?<\/div>\n?/, '');
let nD = 0, nI = 0;

// Protect LaTeX row breaks (two adjacent backslashes) from the delimiter regex,
// which would otherwise read the 2nd backslash of "\\[2pt]" as a display opener.
const SENT = String.fromCharCode(1);
const unprotect = t => t.split(SENT).join('\\\\');
html = html.replace(/\\\\/g, SENT);

html = html.replace(/\\\[([\s\S]+?)\\\]/g, (m, tex) => {
  nD++;
  return '<div class="mathblock">' + render(unprotect(tex).trim(), true) + '</div>';
});

html = html.replace(/\\\(([\s\S]+?)\\\)/g, (m, tex) => {
  nI++;
  return render(unprotect(tex).trim(), false);
});

html = unprotect(html);
html = html.replace('/*KATEX_CSS*/', inlineCss());
fs.writeFileSync(OUT, html);
console.log('built ' + OUT + '  display=' + nD + '  inline=' + nI + '  failures=' + failures + '  bytes=' + html.length);
