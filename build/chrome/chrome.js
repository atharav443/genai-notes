/* Shared article chrome — injected by build/inject-nav.js.
   A. inline recall cards become postcards with click-to-reveal
   B. each Part gets a review deck built from those same cards
   No backslash escapes and no literal script-close tag, so this file can be
   inlined into any article without escaping. */
(function () {
  'use strict';

  var doc = document;
  // keyed per article so a future VAE or diffusion essay cannot collide on card ids
  var PAGE = location.pathname.split('/').pop() || 'index';
  if (PAGE.slice(-5) === '.html') PAGE = PAGE.slice(0, -5);
  var STORE_KEY = 'genai-review:' + PAGE;
  var NBSP = String.fromCharCode(160);
  var EMDASH = String.fromCharCode(8212);
  var MIDDOT = String.fromCharCode(183);
  var APOS = String.fromCharCode(8217);

  function readStore() {
    try { return JSON.parse(window.localStorage.getItem(STORE_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function writeStore(obj) {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(obj)); } catch (e) { /* private mode */ }
  }

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

  var inlineCards = [].slice.call(doc.querySelectorAll('.card-qa'));

  /* ------------------------------------------- A. inline cards as postcards */
  inlineCards.forEach(function (card, i) {
    var q = card.querySelector('.q');
    var a = card.querySelector('.a');
    if (!q || !a) return;

    a.id = 'answer-' + i;
    var btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'reveal-btn';
    btn.textContent = 'Reveal answer';
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
  });

  /* --------------------------------------------- B. per-Part review decks */
  var groups = [];
  var current = null;
  [].slice.call(doc.querySelectorAll('.part, .card-qa')).forEach(function (n) {
    if (n.classList.contains('part')) {
      current = { partEl: n, title: n.textContent.trim(), cards: [] };
      groups.push(current);
    } else if (current) {
      current.cards.push(n);
    }
  });
  if (!groups.length) return;

  var store = readStore();
  var footer = doc.querySelector('p.small');

  groups.forEach(function (g, gi) {
    if (!g.cards.length) return;
    var deck = makeDeck(g);
    if (!deck) return;

    if (gi < groups.length - 1) {
      var nextPart = groups[gi + 1].partEl;
      nextPart.parentNode.insertBefore(deck, nextPart);
    } else if (footer && footer.parentNode) {
      footer.parentNode.insertBefore(deck, footer);
    } else {
      doc.body.appendChild(deck);
    }
  });

  function makeDeck(group) {
    var items = group.cards.map(function (card) {
      var q = card.querySelector('.q');
      var a = card.querySelector('.a');
      if (!q || !a) return null;
      return { num: numOf(q), q: strippedHtml(q), a: strippedHtml(a) };
    }).filter(Boolean);
    if (!items.length) return null;

    var label = partLabel(group.title);
    var sec = doc.createElement('section');
    sec.className = 'deck';

    var eyebrow = doc.createElement('p');
    eyebrow.className = 'deck-eyebrow';
    eyebrow.textContent = 'Review ' + MIDDOT + ' ' + label;

    // Progress ring, in place of a bare "3 of 7": circumference is 2*pi*15.
    var CIRC = 94.25;
    var ring = doc.createElement('div');
    ring.className = 'deck-ring';
    ring.innerHTML = '<svg viewBox="0 0 36 36" width="38" height="38" aria-hidden="true">'
      + '<circle class="track" cx="18" cy="18" r="15"></circle>'
      + '<circle class="fill" cx="18" cy="18" r="15" stroke-dasharray="' + CIRC
      + '" stroke-dashoffset="' + CIRC + '"></circle></svg>';
    var ringFill = ring.querySelector('.fill');

    function updateRing() {
      var frac = done ? 1 : (queue.length ? pos / queue.length : 0);
      ringFill.setAttribute('stroke-dashoffset', (CIRC * (1 - frac)).toFixed(2));
    }

    var heading = doc.createElement('h3');
    heading.className = 'deck-title';
    heading.textContent = items.length + (items.length === 1 ? ' question' : ' questions')
      + ' on what you just read';

    var stage = doc.createElement('div');
    stage.className = 'deck-stage';

    var stack = doc.createElement('div');
    stack.className = 'deck-stack';

    var cardEl = doc.createElement('div');
    cardEl.className = 'deck-card';
    cardEl.setAttribute('role', 'button');
    cardEl.setAttribute('tabindex', '0');
    cardEl.setAttribute('aria-label', 'Show answer');

    var numEl = doc.createElement('span');
    numEl.className = 'deck-num';
    var qEl = doc.createElement('div');
    qEl.className = 'deck-q';
    var aEl = doc.createElement('div');
    aEl.className = 'deck-a';
    var hint = doc.createElement('p');
    hint.className = 'deck-hint';
    hint.textContent = 'Click the card to reveal';

    cardEl.appendChild(numEl);
    cardEl.appendChild(qEl);
    cardEl.appendChild(aEl);
    cardEl.appendChild(hint);
    stack.appendChild(cardEl);
    stage.appendChild(stack);

    var summary = doc.createElement('div');
    summary.className = 'deck-summary';
    summary.hidden = true;
    stage.appendChild(summary);

    var controls = doc.createElement('div');
    controls.className = 'deck-controls';
    var missBtn = doc.createElement('button');
    missBtn.type = 'button';
    missBtn.className = 'deck-btn miss';
    missBtn.textContent = 'Didn' + APOS + 't remember';
    var hitBtn = doc.createElement('button');
    hitBtn.type = 'button';
    hitBtn.className = 'deck-btn hit';
    hitBtn.textContent = 'Remembered';
    controls.appendChild(missBtn);
    controls.appendChild(hitBtn);

    var progress = doc.createElement('p');
    progress.className = 'deck-progress';
    progress.setAttribute('aria-live', 'polite');

    var head = doc.createElement('div');
    head.className = 'deck-head';
    var headText = doc.createElement('div');
    headText.appendChild(eyebrow);
    headText.appendChild(heading);
    head.appendChild(headText);
    head.appendChild(ring);

    sec.appendChild(head);
    sec.appendChild(stage);
    sec.appendChild(controls);
    sec.appendChild(progress);

    var priorGraded = items.filter(function (it) { return store[it.num]; }).length;
    var priorHits = items.filter(function (it) { return store[it.num] === 'hit'; }).length;
    if (priorGraded) {
      var note = doc.createElement('p');
      note.className = 'deck-note';
      note.textContent = 'Previously graded: ' + priorGraded + ' of ' + items.length
        + ' (' + priorHits + ' remembered)';
      sec.appendChild(note);
    }

    /* ---- state ---- */
    var all = items.map(function (_, i) { return i; });
    var queue = all.slice();
    var pos = 0;
    var missed = [];
    var done = false;

    function paint() {
      var it = items[queue[pos]];
      numEl.textContent = it.num;
      qEl.innerHTML = it.q;
      aEl.innerHTML = it.a;
      cardEl.classList.remove('open');
      cardEl.setAttribute('aria-label', 'Show answer ' + it.num);
      missBtn.disabled = true;
      hitBtn.disabled = true;
      progress.textContent = 'Question ' + (pos + 1) + ' of ' + queue.length;
      updateRing();
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
      var it = items[queue[pos]];
      store[it.num] = hit ? 'hit' : 'miss';
      writeStore(store);
      if (!hit) missed.push(queue[pos]);
      pos++;
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

      var score = doc.createElement('p');
      score.className = 'deck-score';
      score.innerHTML = '<b>' + hits + '</b> of ' + total + ' remembered';
      summary.appendChild(score);

      var again = doc.createElement('div');
      again.className = 'deck-controls';

      if (missed.length) {
        var missedBtn = doc.createElement('button');
        missedBtn.type = 'button';
        missedBtn.className = 'deck-btn miss';
        missedBtn.textContent = 'Review the ' + missed.length + ' you missed';
        missedBtn.addEventListener('click', function () { restart(missed.slice()); });
        again.appendChild(missedBtn);
      }

      var allBtn = doc.createElement('button');
      allBtn.type = 'button';
      allBtn.className = 'deck-btn plain';
      allBtn.textContent = 'Start over';
      allBtn.addEventListener('click', function () { restart(all.slice()); });
      again.appendChild(allBtn);

      summary.appendChild(again);
      progress.textContent = 'Deck complete.';
    }

    function restart(list) {
      queue = list;
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
})();
