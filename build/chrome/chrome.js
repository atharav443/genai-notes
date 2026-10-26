/* Shared article chrome — injected by build/inject-nav.js.
   A. inline recall cards become postcards with click-to-reveal
   B. each Part gets a review deck built from those same cards
   C. a real SM-2-style scheduler in localStorage
   D. a sticky sidebar: contents, per-Part completion, due count, memory ladder
   No backslash escapes and no literal script-close tag, so this file can be
   inlined into any article without escaping. */
(function () {
  'use strict';

  var doc = document;
  var PAGE = location.pathname.split('/').pop() || 'index';
  if (PAGE.slice(-5) === '.html') PAGE = PAGE.slice(0, -5);
  var STORE_KEY = 'genai-review:' + PAGE;
  var DAY = 86400000;
  var NBSP = String.fromCharCode(160);
  var EMDASH = String.fromCharCode(8212);
  var MIDDOT = String.fromCharCode(183);
  var APOS = String.fromCharCode(8217);

  /* ------------------------------------------------------------ scheduler */
  /* A deliberately small SM-2: one button either promotes the card along the
     intervals 1d -> 6d -> ivl*ef, or demotes it back to "due now". ef drifts
     between 1.3 and 2.8. Every number the sidebar shows is read from this. */
  var sched = loadSched();

  function loadSched() {
    var raw;
    try { raw = JSON.parse(window.localStorage.getItem(STORE_KEY)) || {}; }
    catch (e) { return {}; }
    var out = {};
    Object.keys(raw).forEach(function (k) {
      if (k.charAt(0) === '_') return;
      var v = raw[k];
      if (typeof v === 'string') {
        // migrate v1 grades, which were just 'hit' / 'miss'
        var hit = v === 'hit';
        out[k] = { n: hit ? 1 : 0, ef: 2.5, ivl: hit ? 1 : 0,
                   due: Date.now() + (hit ? DAY : 0), lapses: hit ? 0 : 1 };
      } else if (v && typeof v === 'object' && typeof v.ivl === 'number') {
        out[k] = v;
      }
    });
    return out;
  }

  function saveSched() {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(sched)); } catch (e) {}
  }

  function gradeCard(num, hit) {
    var c = sched[num] || { n: 0, ef: 2.5, ivl: 0, due: 0, lapses: 0 };
    if (hit) {
      c.n += 1;
      c.ivl = c.n === 1 ? 1 : (c.n === 2 ? 6 : Math.round(c.ivl * c.ef));
      c.ef = Math.min(2.8, c.ef + 0.1);
      c.due = Date.now() + c.ivl * DAY;
    } else {
      c.n = 0;
      c.lapses += 1;
      c.ivl = 0;
      c.ef = Math.max(1.3, c.ef - 0.2);
      c.due = Date.now();
    }
    sched[num] = c;
    saveSched();
    return c;
  }

  function bucketed(nums) {
    var b = [0, 0, 0, 0, 0];   // in-text, 1 day, 1 week, 1 month, long-term
    nums.forEach(function (num) {
      var c = sched[num];
      if (!c || c.ivl <= 0) b[0]++;
      else if (c.ivl < 6) b[1]++;
      else if (c.ivl < 30) b[2]++;
      else if (c.ivl < 120) b[3]++;
      else b[4]++;
    });
    return b;
  }

  /* --------------------------------------------------------------- helpers */
  function strippedHtml(el) {
    var clone = el.cloneNode(true);
    var lbl = clone.querySelector('.lbl');
    if (lbl && lbl.parentNode) lbl.parentNode.removeChild(lbl);
    return clone.innerHTML;
  }
  function numOf(qEl) {
    var n = qEl.querySelector('.lbl .n');
    if (!n) return '';
    return n.textContent.split(NBSP).join(' ').trim();
  }
  function partLabel(title) {
    var i = title.indexOf(EMDASH);
    return (i === -1 ? title : title.slice(0, i)).trim();
  }
  function el(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ------------------------------------------- A. inline cards as postcards */
  var inlineCards = [].slice.call(doc.querySelectorAll('.card-qa'));
  var items = [];
  var itemByEl = new Map();

  inlineCards.forEach(function (card, i) {
    var q = card.querySelector('.q');
    var a = card.querySelector('.a');
    if (!q || !a) return;

    a.id = 'answer-' + i;
    var btn = el('button', 'reveal-btn', 'Reveal answer');
    btn.type = 'button';
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', a.id);

    function toggle() {
      var open = card.classList.toggle('open');
      btn.textContent = open ? 'Hide answer' : 'Reveal answer';
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    btn.addEventListener('click', function (e) { e.stopPropagation(); toggle(); });
    card.addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.closest && t.closest('a, button')) return;
      toggle();
    });
    a.parentNode.insertBefore(btn, a);

    var item = { num: numOf(q), q: strippedHtml(q), a: strippedHtml(a), el: card, part: null };
    items.push(item);
    itemByEl.set(card, item);
  });

  if (!items.length) return;

  /* --------------------------------------------- group the cards by Part */
  var parts = [];
  var cur = null;
  [].slice.call(doc.querySelectorAll('.part, .card-qa')).forEach(function (n) {
    if (n.classList.contains('part')) {
      cur = { el: n, title: n.textContent.trim(), items: [] };
      parts.push(cur);
    } else if (cur) {
      var it = itemByEl.get(n);
      if (it) { it.part = cur; cur.items.push(it); }
    }
  });
  if (!parts.length) return;

  /* ------------------------------------------------------------ deck build */
  var deckRefs = [];   // { part, ringFill, CIRC }

  function buildDeck(list, label, opts) {
    opts = opts || {};
    if (!list.length) return null;

    var CIRC = 94.25;   // 2 * pi * 15
    var sec = el('section', 'deck');

    var ring = el('div', 'deck-ring');
    ring.innerHTML = '<svg viewBox="0 0 36 36" width="38" height="38" aria-hidden="true">'
      + '<circle class="track" cx="18" cy="18" r="15"></circle>'
      + '<circle class="fill" cx="18" cy="18" r="15" stroke-dasharray="' + CIRC
      + '" stroke-dashoffset="' + CIRC + '"></circle></svg>';
    var ringFill = ring.querySelector('.fill');

    var head = el('div', 'deck-head');
    var headText = doc.createElement('div');
    headText.appendChild(el('p', 'deck-eyebrow', 'Review ' + MIDDOT + ' ' + label));
    headText.appendChild(el('h3', 'deck-title',
      list.length + (list.length === 1 ? ' question' : ' questions') + ' on what you just read'));
    head.appendChild(headText);
    head.appendChild(ring);

    var stage = el('div', 'deck-stage');
    var stack = el('div', 'deck-stack');
    var cardEl = el('div', 'deck-card');
    cardEl.setAttribute('role', 'button');
    cardEl.setAttribute('tabindex', '0');
    cardEl.setAttribute('aria-label', 'Show answer');
    var numEl = el('span', 'deck-num');
    var qEl = el('div', 'deck-q');
    var aEl = el('div', 'deck-a');
    var hint = el('p', 'deck-hint', 'Click the card to reveal');
    cardEl.appendChild(numEl);
    cardEl.appendChild(qEl);
    cardEl.appendChild(aEl);
    cardEl.appendChild(hint);
    stack.appendChild(cardEl);
    stage.appendChild(stack);
    var summary = el('div', 'deck-summary');
    summary.hidden = true;
    stage.appendChild(summary);

    var controls = el('div', 'deck-controls');
    var missBtn = el('button', 'deck-btn miss', 'Didn' + APOS + 't remember');
    missBtn.type = 'button';
    var hitBtn = el('button', 'deck-btn hit', 'Remembered');
    hitBtn.type = 'button';
    controls.appendChild(missBtn);
    controls.appendChild(hitBtn);

    var progress = el('p', 'deck-progress');
    progress.setAttribute('aria-live', 'polite');

    sec.appendChild(head);
    sec.appendChild(stage);
    sec.appendChild(controls);
    sec.appendChild(progress);

    var all = list.map(function (_, i) { return i; });
    var queue = all.slice();
    var pos = 0;
    var missed = [];
    var done = false;

    function ringFor() {
      // fraction of THIS deck's cards that the scheduler has seen, not session position
      var seen = list.filter(function (it) { return sched[it.num]; }).length;
      var frac = done ? 1 : (list.length ? seen / list.length : 0);
      ringFill.setAttribute('stroke-dashoffset', (CIRC * (1 - frac)).toFixed(2));
    }

    function paint() {
      var it = list[queue[pos]];
      numEl.textContent = it.num;
      qEl.innerHTML = it.q;
      aEl.innerHTML = it.a;
      cardEl.classList.remove('open');
      cardEl.setAttribute('aria-label', 'Show answer ' + it.num);
      missBtn.disabled = true;
      hitBtn.disabled = true;
      progress.textContent = 'Question ' + (pos + 1) + ' of ' + queue.length;
      ringFor();
    }

    function reveal() {
      if (done || cardEl.classList.contains('open')) return;
      cardEl.classList.add('open');
      cardEl.setAttribute('aria-label', 'Answer shown');
      missBtn.disabled = false;
      hitBtn.disabled = false;
    }

    function grade(hit) {
      if (done || !cardEl.classList.contains('open')) return;
      var it = list[queue[pos]];
      gradeCard(it.num, hit);
      if (!hit) missed.push(queue[pos]);
      pos++;
      ringFor();
      refresh();
      if (pos < queue.length) paint();
      else finish();
    }

    function finish() {
      done = true;
      var total = queue.length;
      var hits = total - missed.length;
      stack.hidden = true;
      controls.hidden = true;
      summary.hidden = false;
      summary.innerHTML = '';
      var score = el('p', 'deck-score');
      score.innerHTML = '<b>' + hits + '</b> of ' + total + ' remembered';
      summary.appendChild(score);
      var again = el('div', 'deck-controls');
      if (missed.length) {
        var mb = el('button', 'deck-btn miss', 'Review the ' + missed.length + ' you missed');
        mb.type = 'button';
        mb.addEventListener('click', function () { restart(missed.slice()); });
        again.appendChild(mb);
      }
      var ab = el('button', 'deck-btn plain', 'Start over');
      ab.type = 'button';
      ab.addEventListener('click', function () { restart(all.slice()); });
      again.appendChild(ab);
      summary.appendChild(again);
      progress.textContent = 'Deck complete.';
      ringFor();
      if (opts.onDone) opts.onDone();
    }

    function restart(l) {
      queue = l;
      pos = 0;
      missed = [];
      done = false;
      stack.hidden = false;
      controls.hidden = false;
      summary.hidden = true;
      paint();
      cardEl.focus();
    }

    cardEl.addEventListener('click', reveal);
    cardEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        reveal();
      }
    });
    missBtn.addEventListener('click', function () { grade(false); });
    hitBtn.addEventListener('click', function () { grade(true); });

    paint();
    return sec;
  }

  /* --------------------------------------------- B. one deck after each Part */
  var footer = doc.querySelector('p.small');
  parts.forEach(function (p, i) {
    if (!p.items.length) return;
    var deck = buildDeck(p.items, partLabel(p.title));
    if (!deck) return;
    if (i < parts.length - 1) {
      var next = parts[i + 1].el;
      next.parentNode.insertBefore(deck, next);
    } else if (footer && footer.parentNode) {
      footer.parentNode.insertBefore(deck, footer);
    } else {
      doc.body.appendChild(deck);
    }
    p.deck = deck;
  });

  /* ------------------------------------------------- C. the sticky sidebar */
  var tocRows = [];
  var dueEl, dueBtn, ladderRows = [], sidebar;

  function cardNums() { return items.map(function (it) { return it.num; }); }

  function dueNums() {
    var t = Date.now();
    return cardNums().filter(function (num) {
      var c = sched[num];
      return c && c.due <= t;
    });
  }

  function buildSidebar() {
    sidebar = el('aside', 'toc');
    sidebar.setAttribute('aria-label', 'Contents and review progress');

    sidebar.appendChild(el('p', 'toc-title', 'On this page'));
    var listEl = el('ol', 'toc-list');

    var pi = 0;
    [].slice.call(doc.querySelectorAll('.part, h2')).forEach(function (h) {
      if (h.classList.contains('part')) {
        pi++;
        if (!h.id) h.id = 'part-' + pi;
        var li = el('li', 'toc-part');
        var a = el('a', null, partLabel(h.textContent));
        a.href = '#' + h.id;
        var count = el('span', 'toc-count', '');
        li.appendChild(a);
        li.appendChild(count);
        listEl.appendChild(li);
        tocRows.push({ part: h, count: count });
      } else {
        if (!h.id) h.id = 'sec-' + h.id || ('sec-' + Math.random().toString(36).slice(2, 8));
        var sub = el('li', 'toc-sub');
        var sa = el('a', null, h.textContent.replace(/^[0-9]+\s*[^A-Za-z0-9]*/, ''));
        sa.href = '#' + h.id;
        sub.appendChild(sa);
        listEl.appendChild(sub);
      }
    });
    sidebar.appendChild(listEl);

    sidebar.appendChild(el('div', 'toc-sep'));
    sidebar.appendChild(el('p', 'toc-title', 'Review'));
    dueEl = el('p', 'toc-due', '');
    sidebar.appendChild(dueEl);
    dueBtn = el('button', 'toc-btn', 'Review due cards');
    dueBtn.type = 'button';
    dueBtn.addEventListener('click', openDue);
    sidebar.appendChild(dueBtn);

    var ladder = el('ul', 'ladder');
    ['In-text', '1 day', '1 week', '1 month', 'Long-term'].forEach(function (name) {
      var li = el('li', 'ladder-row');
      li.appendChild(el('span', 'rung', name));
      var bar = el('span', 'bar');
      var fill = el('i', null);
      bar.appendChild(fill);
      li.appendChild(bar);
      var n = el('span', 'n', '0');
      li.appendChild(n);
      ladder.appendChild(li);
      ladderRows.push({ fill: fill, n: n });
    });
    sidebar.appendChild(ladder);
    sidebar.appendChild(el('p', 'toc-note',
      'Intervals follow SM-2: 1 day, then 6, then the previous interval times an ease factor. Stored on this device only.'));

    doc.body.appendChild(sidebar);
  }

  function refresh() {
    if (!sidebar) return;

    var nums = cardNums();
    var dues = dueNums();
    dueEl.innerHTML = '<b>' + dues.length + '</b> ' + (dues.length === 1 ? 'card due' : 'cards due');
    dueBtn.hidden = dues.length === 0;

    var b = bucketed(nums);
    var max = Math.max.apply(null, b) || 1;
    for (var i = 0; i < ladderRows.length; i++) {
      ladderRows[i].n.textContent = String(b[i]);
      ladderRows[i].fill.style.width = Math.round((b[i] / max) * 100) + '%';
    }

    tocRows.forEach(function (row) {
      var p = parts.filter(function (x) { return x.el === row.part; })[0];
      if (!p) { row.count.textContent = ''; return; }
      var seen = p.items.filter(function (it) { return sched[it.num]; }).length;
      row.count.textContent = seen + '/' + p.items.length;
      row.count.className = 'toc-count' + (seen === p.items.length ? ' done' : '');
    });
  }

  /* --------------------------------------------------- D. the due-card deck */
  var overlay = null;
  function openDue() {
    var dues = dueNums();
    if (!dues.length) return;
    var byNum = {};
    items.forEach(function (it) { byNum[it.num] = it; });
    var list = dues.map(function (n) { return byNum[n]; }).filter(Boolean);

    overlay = el('div', 'due-overlay');
    var box = el('div', 'due-box');
    var close = el('button', 'due-close', 'Close');
    close.type = 'button';
    close.addEventListener('click', closeDue);
    box.appendChild(close);
    var deck = buildDeck(list, 'due now', { onDone: function () { refresh(); } });
    if (deck) box.appendChild(deck);
    overlay.appendChild(box);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeDue(); });
    doc.addEventListener('keydown', escClose);
    doc.body.appendChild(overlay);
    close.focus();
  }
  function escClose(e) { if (e.key === 'Escape') closeDue(); }
  function closeDue() {
    if (!overlay) return;
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = null;
    doc.removeEventListener('keydown', escClose);
    refresh();
  }

  if (doc.querySelector('.part')) {
    buildSidebar();
    refresh();
  }
})();
