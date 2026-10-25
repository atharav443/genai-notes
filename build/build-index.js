#!/usr/bin/env node
// Regenerate index.html from content.json. Zero dependencies.
//   node build/build-index.js
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'content.json'), 'utf8'));

const ready = data.topics.filter(function (t) { return t.status === 'ready'; });
const planned = data.topics.filter(function (t) { return t.status !== 'ready'; });

// Fields in content.json may carry HTML entities (e.g. "&amp;"), so they are
// emitted verbatim. They are authored here, not user input.
function esc(s) { return s == null ? '' : String(s); }

function extras(t) {
  if (!t.extras || !t.extras.length) return '';
  return t.extras.map(function (e) {
    return '<a href="' + esc(e.href) + '">' + esc(e.label) + '</a>';
  }).join(' &nbsp;·&nbsp; ');
}

function card(t) {
  var pill = t.status === 'ready' ? '' : '<span class="pill-soon">Coming soon</span>';
  var tag = '<div class="tags"><span class="tag" style="background:' + esc(t.tagColor) + '">'
          + esc(t.tag) + '</span>' + pill + '</div>';
  if (t.status === 'ready') {
    return [
      '  <div class="c">' + tag,
      '    <h2><a class="stretch" href="' + esc(t.html) + '">' + esc(t.title) + '</a></h2>',
      '    <p class="m">' + esc(t.blurb) + '</p>',
      '    <p class="links">' + extras(t) + '</p></div>'
    ].join('\n');
  }
  return [
    '  <div class="c soon">' + tag,
    '    <h2>' + esc(t.title) + '</h2>',
    '    <p class="m">' + esc(t.blurb) + '</p></div>'
  ].join('\n');
}

var out = [
  '<!DOCTYPE html>',
  '<html lang="en"><head><meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width,initial-scale=1">',
  '<title>' + esc(data.site.title) + '</title>',
  '<link rel="stylesheet" href="assets/site.css">',
  '</head><body><div class="w">',
  '<h1>' + esc(data.site.title) + '</h1>',
  '<p class="s">' + esc(data.site.tagline) + '</p>',
  '<p class="count">' + data.topics.length + ' topics &middot; ' + ready.length +
    ' published &middot; ' + planned.length + ' planned</p>',
  '<div class="grid">',
  ready.map(card).join('\n'),
  planned.map(card).join('\n'),
  '</div>',
  '<footer>' + esc(data.site.footer) + '</footer>',
  '</div></body></html>',
  ''
].join('\n');

fs.writeFileSync(path.join(ROOT, 'index.html'), out);
console.log('built index.html  topics=' + data.topics.length +
            ' ready=' + ready.length + ' planned=' + planned.length);
