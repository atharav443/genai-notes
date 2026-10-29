#!/usr/bin/env node
// Build the essay: KaTeX pre-render + inlined fonts + flashcard index + TSV export.
const fs = require('fs');
const path = require('path');
const KATEX = process.env.KATEX_DIR || path.resolve(__dirname, '../../../.genai-work/node_modules/katex');
const katex = require(path.join(KATEX, 'dist/katex.min.js'));

const SRC = process.argv[2], OUT = process.argv[3], TSV = process.argv[4];

function inlineCss() {
  let css = fs.readFileSync(path.join(KATEX, 'dist/katex.min.css'), 'utf8');
  const dir = path.join(KATEX, 'dist/fonts'), cache = {};
  css = css.replace(/url\(fonts\/([A-Za-z0-9_\-]+\.woff2)\)/g, (m, f) => {
    if (!cache[f]) cache[f] = 'data:font/woff2;base64,' + fs.readFileSync(path.join(dir, f)).toString('base64');
    return 'url(' + cache[f] + ')';
  });
  return css.replace(/,\s*url\(fonts\/[A-Za-z0-9_\-]+\.(woff|ttf)\)\s*format\("(woff|truetype)"\)/g, '');
}

const decode = t => t
  .replace(/<span class="lbl">[\s\S]*?<\/span>/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '\u2014').replace(/&ndash;/g, '\u2013')
  .replace(/&ldquo;/g, '\u201c').replace(/&rdquo;/g, '\u201d')
  .replace(/&lsquo;/g, '\u2018').replace(/&rsquo;/g, '\u2019')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim();

let html = fs.readFileSync(SRC, 'utf8');
// drop the source-only build banner
html = html.replace(/<div class="buildnote"[^>]*>[\s\S]*?<\/div>\n?/, '');

// ---- 1. harvest cards (before math is rendered, so LaTeX survives as-is) ----
const cards = [];
html.replace(/<div class="card-qa">([\s\S]*?)<\/div>/g, (m, inner) => {
  const qm = inner.match(/<p class="q">([\s\S]*?)<\/p>/);
  const am = inner.match(/<p class="a">([\s\S]*?)<\/p>/);
  if (qm && am) {
    const nm = qm[1].match(/<span class="n">([^<]*)<\/span>/);
    cards.push({
      id: nm ? decode(nm[1]) : String(cards.length + 1),
      q: decode(qm[1]),
      a: decode(am[1]),
      qRaw: qm[1].replace(/<span class="lbl">[\s\S]*?<\/span>/, '').trim()
    });
  }
  return m;
});

// ---- 2. inject the review index ----
const idx = cards.map(c =>
  '<p class="idxq"><span class="idx-n">' + c.id + '</span>' + c.qRaw + '</p>').join('\n');
if (!html.includes('<!--CARDINDEX-->')) throw new Error('CARDINDEX placeholder missing');
html = html.replace('<!--CARDINDEX-->', idx);

// ---- 3. render math ----
let nD = 0, nI = 0, bad = 0;
const SENT = String.fromCharCode(1);
const unprotect = t => t.split(SENT).join('\\\\');
html = html.replace(/\\\\/g, SENT);
function render(tex, display) {
  try { katex.renderToString(tex, { throwOnError: true, strict: 'ignore' }); }
  catch (e) { bad++; console.log('KATEX FAIL: ' + e.message.split('\n')[0] + '\n   ' + tex.replace(/\s+/g, ' ').slice(0, 140)); }
  return katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: 'ignore' });
}
html = html.replace(/\\\[([\s\S]+?)\\\]/g, (m, t) => { nD++; return '<div class="mathblock">' + render(unprotect(t).trim(), true) + '</div>'; });
html = html.replace(/\\\(([\s\S]+?)\\\)/g, (m, t) => { nI++; return render(unprotect(t).trim(), false); });
html = unprotect(html).replace('/*KATEX_CSS*/', inlineCss());

fs.writeFileSync(OUT, html);

// ---- 4. write the Anki-importable deck ----
if (TSV) {
  const clean = s => s.replace(/\t/g, ' ');
  fs.writeFileSync(TSV, cards.map(c => [c.id, clean(c.q), clean(c.a)].join('\t')).join('\n') + '\n');
}
console.log('built ' + OUT + '  cards=' + cards.length + '  display=' + nD + '  inline=' + nI + '  katex_failures=' + bad);
