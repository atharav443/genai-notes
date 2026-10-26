#!/usr/bin/env node
// Assemble a mnemonic-medium essay source from a body fragment plus the shared
// stylesheet, so every essay in the series is typeset identically.
//
//   node build/build-essay.js viz/gan.body.html viz/GAN-Curious.src.html
//
// Then render it (KaTeX pre-render + card harvest) with the existing pipeline:
//
//   node viz/build/build-curious.js viz/GAN-Curious.src.html //        html/GAN-Curious.html notes/gan/flashcards.tsv
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const bodyPath = process.argv[2];
const outPath = process.argv[3];

if (!bodyPath || !outPath) {
  console.error('usage: node build/build-essay.js <body.html> <out.src.html>');
  process.exit(2);
}

const body = fs.readFileSync(bodyPath, 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'viz', '_essay.css'), 'utf8');

const metaMatch = body.match(/<!--META([\s\S]*?)-->/);
if (!metaMatch) {
  console.error('missing <!--META {json} --> block in ' + bodyPath);
  process.exit(1);
}
let meta;
try {
  meta = JSON.parse(metaMatch[1]);
} catch (e) {
  console.error('META block is not valid JSON: ' + e.message);
  process.exit(1);
}
if (!meta.title) { console.error('META needs a title'); process.exit(1); }

const content = body.replace(/<!--META[\s\S]*?-->/, '').trim();

const outName = path.basename(outPath);
const banner = '<div class="buildnote" style="background:#fde68a;border:1px solid #f59e0b;'
  + 'border-radius:4px;padding:10px 14px;margin:0 0 18px 0;'
  + 'font:600 13px/1.5 ui-sans-serif,-apple-system,sans-serif;color:#78350f">'
  + 'BUILD SOURCE &mdash; do not read this file in a browser. Math is still raw LaTeX here. '
  + 'Open <code>html/' + outName.replace('-Curious.src.html', '-Curious.html') + '</code> instead. '
  + 'Assembled by <code>build/build-essay.js</code> from <code>' + bodyPath + '</code>.</div>';

const out = [
  '<!doctype html>',
  '<html><head><meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width,initial-scale=1">',
  '<title>' + meta.title + '</title>',
  '<style>/*KATEX_CSS*/</style>',
  '<style>',
  css,
  '</style>',
  '</head><body>',
  banner,
  '',
  content,
  '',
  '</body></html>',
  ''
].join(String.fromCharCode(10));

fs.writeFileSync(outPath, out);
const cards = (content.match(/<div class="card-qa">/g) || []).length;
const parts = (content.match(/<div class="part">/g) || []).length;
console.log('assembled ' + outPath + '  bytes=' + out.length + '  parts=' + parts + '  cards=' + cards);
