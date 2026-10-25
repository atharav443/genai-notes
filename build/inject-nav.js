#!/usr/bin/env node
// Idempotently add shared site chrome to every rendered article in html/:
//
//   site-js      right after <head>   -- marks the document as JS-capable
//   site-nav     right after <body>   -- sticky "<- All topics" bar
//   site-reveal  right before </body> -- cover-the-answer control for recall cards
//
//   node build/inject-nav.js
//
// Each block lives between <!--site-X:start--> and <!--site-X:end--> so a later
// run can REPLACE it when the block changes, not just skip it. Everything outside
// the blocks stays byte-identical, which is what keeps print exports reproducible.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HTML_DIR = path.join(ROOT, 'html');

// --------------------------------------------------------------------- blocks
// The .js gate matters: answers are hidden only once JS has confirmed it runs,
// so a reader with JS off sees every answer instead of 47 dead cards. Print is
// handled explicitly by @media print, which is what the PDF export uses.
const JS_CLASS = '<!--site-js:start-->'
  + '<script>document.documentElement.classList.add("js")</script>'
  + '<!--site-js:end-->';

const NAV = '<!--site-nav:start-->'
  + '<div class="site-nav"><a href="../index.html">&larr; All topics</a></div>'
  + '<style>.site-nav{position:sticky;top:0;z-index:50;display:flex;align-items:center;'
  + 'height:2.6rem;padding:0 1.2rem;background:rgba(251,250,248,.92);'
  + 'backdrop-filter:blur(8px);border-bottom:1px solid #e3e0da;'
  + 'font:600 12.5px/1 ui-sans-serif,-apple-system,"Segoe UI",sans-serif;letter-spacing:.02em}'
  + '.site-nav a{color:#5c5c66;text-decoration:none}'
  + '.site-nav a:hover{color:#1a1a1d}'
  + '@media print{.site-nav{display:none!important}}</style>'
  + '<!--site-nav:end-->';

const REVEAL = '<!--site-reveal:start-->'
  + '<style>'
  + '@media screen{'
  + '.js .card-qa .a{display:none}'
  + '.js .card-qa.open .a{display:block}'
  + '.reveal-btn{margin:0;padding:5px 9px;background:#fff;border:1px solid #e0e0dc;'
  + 'border-radius:3px;font:600 9.5px/1 ui-sans-serif,-apple-system,"Segoe UI",sans-serif;'
  + 'letter-spacing:.12em;text-transform:uppercase;color:#8a8a94;cursor:pointer}'
  + '.reveal-btn:hover{color:#1c1c1e;border-color:#c9c9cf}'
  + '.reveal-btn:focus-visible{outline:2px solid #1c1c1e;outline-offset:2px}'
  + '}'
  + '@media print{.reveal-btn{display:none!important}.card-qa .a{display:block!important}}'
  + '</style>'
  + '<script>(function(){try{'
  + 'var cards=document.querySelectorAll(".card-qa");'
  + 'for(var i=0;i<cards.length;i++){(function(card,n){'
  + 'var a=card.querySelector(".a");if(!a)return;'
  + 'var id="answer-"+n;a.id=id;'
  + 'var b=document.createElement("button");'
  + 'b.type="button";b.className="reveal-btn";b.textContent="Reveal answer";'
  + 'b.setAttribute("aria-expanded","false");b.setAttribute("aria-controls",id);'
  + 'b.addEventListener("click",function(){'
  + 'var open=card.classList.toggle("open");'
  + 'b.textContent=open?"Hide answer":"Reveal answer";'
  + 'b.setAttribute("aria-expanded",open?"true":"false");'
  + '});'
  + 'a.parentNode.insertBefore(b,a);'
  + '})(cards[i],i);}'
  // If anything above throws, un-gate so the answers come back instead of
  // leaving 47 cards hidden behind a button that was never created.
  + '}catch(e){document.documentElement.classList.remove("js");}'
  + '})();</script>'
  + '<!--site-reveal:end-->';

// ------------------------------------------------- one-time legacy migration
// Earlier runs used bare <!--site-nav--> / <!--site-reveal--> markers. Strip
// those blocks (each ends at the first </style> / </script> after the marker) so
// this run re-emits them as paired, replaceable blocks.
function stripLegacy(html) {
  let out = html;
  const legacy = [['<!--site-nav-->', '</style>'], ['<!--site-reveal-->', '</script>']];
  for (const [mark, endTag] of legacy) {
    const i = out.indexOf(mark);
    if (i === -1) continue;
    const j = out.indexOf(endTag, i);
    if (j === -1) continue;
    out = out.slice(0, i) + out.slice(j + endTag.length);
  }
  return out;
}

// --------------------------------------------------------------- block upsert
function upsert(html, name, block, insertAfter, insertBefore) {
  const start = '<!--' + name + ':start-->';
  const end = '<!--' + name + ':end-->';
  const s = html.indexOf(start);
  const e = html.indexOf(end);

  if (s !== -1 && e !== -1) {
    if (html.slice(s, e + end.length) === block) return { html: html, changed: false, existed: true };
    return { html: html.slice(0, s) + block + html.slice(e + end.length), changed: true, existed: true };
  }

  if (insertAfter) {
    const m = html.match(insertAfter);
    if (!m) return { html: html, changed: false, failed: 'no ' + insertAfter };
    const at = m.index + m[0].length;
    return { html: html.slice(0, at) + block + html.slice(at), changed: true, existed: false };
  }
  const at = html.lastIndexOf(insertBefore);
  if (at === -1) return { html: html, changed: false, failed: 'no ' + insertBefore };
  return { html: html.slice(0, at) + block + html.slice(at), changed: true, existed: false };
}

// ---------------------------------------------------------------- the work
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
      ['site-js', JS_CLASS, /<head[^>]*>/, null],
      ['site-nav', NAV, /<body[^>]*>/, null],
      ['site-reveal', REVEAL, null, '</body>']
    ];

    for (const [n, block, after, before2] of steps) {
      const r = upsert(html, n, block, after, before2);
      if (r.failed) { console.log('FAILED   html/' + name + '  (' + r.failed + ')'); failed++; return; }
      if (r.changed) { html = r.html; touched.push(n); }
    }

    if (!touched.length) {
      console.log('skip     html/' + name + '  (up to date)');
      skipped++;
      return;
    }

    fs.writeFileSync(p, html);
    console.log('updated  html/' + name + '  [' + touched.join(' ') + ']  ' +
                (html.length - before.length >= 0 ? '+' : '') + (html.length - before.length) + ' bytes');
    changedN++;
  });

console.log('done  updated=' + changedN + ' skipped=' + skipped + ' failed=' + failed);
if (failed) process.exitCode = 1;
