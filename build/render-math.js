#!/usr/bin/env node
// Pre-render raw inline/display LaTeX delimiters into static KaTeX markup, in place.
//
//   node build/render-math.js html/VAE.html html/GAN.html html/Diffusion.html
//
// The three visualiser pages currently typeset math in the browser with an inlined
// KaTeX + auto-render bundle, so their markup still carries the raw delimiters and
// readers see nothing until that script runs. Baking the math in matches the RLHF
// articles: no JS required for the math, and print-to-PDF becomes reliable.
// Files already rendered are refused, never rewritten.
//
// Same protect/unprotect trick as viz/build/build-notes.js: two adjacent
// backslashes (LaTeX row breaks, JS string escapes) must not be mistaken for a
// display-math opener.
const fs = require('fs');
const path = require('path');

const KATEX = process.env.KATEX_DIR || path.resolve(__dirname, '../../.genai-work/node_modules/katex');
const katex = require(path.join(KATEX, 'dist/katex.min.js'));

const files = process.argv.slice(2);
if (!files.length) {
  console.error('usage: node build/render-math.js <file.html> [more.html ...]');
  process.exit(2);
}

const SENT = String.fromCharCode(1);
const unprotect = function (t) { return t.split(SENT).join('\\\\'); };

let failures = 0;
function render(tex, displayMode) {
  try {
    katex.renderToString(tex, { throwOnError: true, strict: 'ignore' });
  } catch (e) {
    failures++;
    console.log('  KATEX FAIL: ' + e.message.split('\n')[0]);
    console.log('             ' + tex.replace(/\s+/g, ' ').slice(0, 140));
  }
  return katex.renderToString(tex, {
    displayMode: displayMode, throwOnError: false, strict: 'ignore', trust: false
  });
}

let refused = 0;

files.forEach(function (file) {
  const src = fs.readFileSync(file, 'utf8');
  const rawInline = (src.match(/\\\(/g) || []).length;
  const rawDisplay = (src.match(/\\\[/g) || []).length;
  const rendered = (src.match(/class="katex"/g) || []).length;

  // A converted page keeps a handful of delimiters inside its <script> blocks, so
  // "no raw LaTeX" can never be the test. Presence of any KaTeX span is.
  if (rendered > 0) {
    console.log('already rendered, skipping  ' + file);
    refused++;
    return;
  }
  if (rawInline === 0 && rawDisplay === 0) {
    console.log('no raw LaTeX found, skipping  ' + file);
    refused++;
    return;
  }

  let html = src.replace(/\\\\/g, SENT);
  let nD = 0, nI = 0;

  html = html.replace(/\\\[([\s\S]+?)\\\]/g, function (m, tex) {
    nD++;
    return '<div class="mathblock">' + render(unprotect(tex).trim(), true) + '</div>';
  });
  html = html.replace(/\\\(([\s\S]+?)\\\)/g, function (m, tex) {
    nI++;
    return render(unprotect(tex).trim(), false);
  });

  html = unprotect(html);
  fs.writeFileSync(file, html);
  console.log('rendered ' + file + '  display=' + nD + ' inline=' + nI +
              '  bytes ' + src.length + ' -> ' + html.length);
});

console.log('done  failures=' + failures + ' skipped=' + refused);
if (failures) process.exitCode = 1;
