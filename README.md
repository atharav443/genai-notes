# Generative AI — Cheat Sheets

Static study notes for GANs, VAEs, diffusion and RLHF: each topic is a
self-contained interactive cheat sheet plus an undergraduate-level PDF, and RLHF
also has a long-form essay in the mnemonic medium. No framework, no bundler, no
runtime dependencies — the published site is plain HTML.

## Layout

| path | role |
|---|---|
| `index.html` | **generated** landing page — do not edit by hand |
| `content.json` | source of truth for the landing page |
| `assets/site.css` | shared styles for the landing page and 404 |
| `build/` | three zero-dependency Node scripts (see below) |
| `build/chrome/` | `chrome.css` + `chrome.js` — the single source for everything injected into the articles (postcards, decks, nav) |
| `html/` | rendered articles (KaTeX pre-rendered, fonts base64-inlined) |
| `pdf/` | print exports of each topic |
| `notes/rlhf/` | `FULL.md` reference and the Anki-importable `flashcards.tsv` |
| `viz/` | build inputs for the articles + the original render scripts |
| `video/`, `blockdiagrams/` | GAN/WGAN training animations and diagrams |

## Design

The visual language is borrowed in spirit — not copied — from
[Quantum Country](https://quantum.country): one accent colour used sparingly, an
oversized display title, a serif reading column with sans meta, and generous
whitespace. Two things are ours: the palette is warm paper rather than their
lavender, and the accent changes per topic instead of being one brand colour.

| surface | stylesheet | notes |
|---|---|---|
| landing page, 404 | `assets/site.css` | `:root` design tokens, hero, grouped card grids |
| article chrome | `build/chrome/chrome.css` | accent palettes, postcards, review deck |
| article behaviour | `build/chrome/chrome.js` | reveal, decks, grading, progress ring |

**Per-article accents.** `build/inject-nav.js` holds an `ACCENTS` map and sets
`data-accent` on `<html>` as part of the `site-js` block — GAN violet, VAE teal,
diffusion orange, RLHF rose. `chrome.css` declares those palettes as `--accent`,
`--accent-ink` and `--accent-wash`. Unmapped files fall back to indigo, and with JS
off the fallback applies too, so nothing breaks.

**Card grids.** `.grid` fits as many columns as the width allows (used for the three cheat
sheets); `.grid--wide` is fixed at two columns for the essays, whose blurbs are longer, and
collapses to one below 720px.

**Review progress ring.** The `deck-ring` in `chrome.js` is an SVG circle of
circumference 2π×15 = 94.25; `updateRing()` moves `stroke-dashoffset` as cards are
graded. It is the equivalent of Quantum Country's review orb.

Numbers on the landing page (essays, cards, cheat sheets, PDFs) are derived in
`build/build-index.js` from `content.json`, so they cannot drift out of date.
## Local preview

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

Open the site through the server, not `file://` — the article chrome links to
`../index.html`, and `file://` redirect/mime behaviour differs from Pages.

## Add a topic

1. Drop the rendered article in `html/` and its PDF in `pdf/`.
2. Add one entry to `content.json`:

   ```json
   { "id": "flows", "status": "ready", "tag": "Flows", "tagColor": "#475569",
     "title": "Normalising Flows", "blurb": "Change of variables → coupling layers.",
     "html": "html/Flows.html", "cta": "Open cheat sheet",
     "extras": [{ "label": "PDF", "href": "pdf/Flows.pdf" }] }
   ```

   Use `"status": "planned"` + `"html": null` for a placeholder card, and
   `"status": "ready"` to make it clickable.
3. Rebuild and commit:

   ```bash
   node build/build-index.js
   node build/inject-nav.js      # only needed for new files in html/
   git add -A && git commit -m "content: add normalising flows"
   ```

## Build scripts

| script | what it does |
|---|---|
| `build/build-index.js` | `content.json` → `index.html` |
| `build/inject-nav.js` | adds the site chrome to every `html/*.html`: an `← All topics` bar, a `.js` marker, and the recall-card reveal control. Each block sits between `<!--site-X:start-->` and `<!--site-X:end-->`, so a later run **replaces** it instead of skipping: edit the block in the script, re-run, and every article follows |
| `build/render-math.js` | pre-renders raw \(…\) / \[…\] into static KaTeX markup, in place |

`inject-nav.js` reads `build/chrome/chrome.css` and `build/chrome/chrome.js` and inlines them, so the
articles stay self-contained (no extra requests, works offline).

`inject-nav.js` touches exactly three places: right after `<head>`, right after `<body>`, and right before `</body>`.
Everything else in the article stays byte-identical, which is what keeps the print
exports reproducible. Re-run it after any rebuild — a rebuild regenerates the file
from `viz/*.src.html` and therefore drops the chrome.

## Recall cards

The RLHF essay has 47 question/answer boxes, drawn in the spirit of
[Quantum Country](https://quantum.country)'s mnemonic medium. Two things happen on
screen, both built at runtime from the same markup:

**1. Inline postcards — currently switched off.** Each `.card-qa` used to
become a white card with a soft shadow and a **Reveal answer** button. That
duplicated every question, because the deck at the end of the Part asks the same
card — so `@media screen { .js .card-qa { display:none } }` hides them on screen and
`SHOW_INLINE = false` in `chrome.js` stops building the reveal UI. They stay in
the DOM for two reasons: the decks read their question and answer from those
nodes, and they are the only question content that survives into print, since
decks are print-hidden. Set `SHOW_INLINE = true` and drop that CSS rule to bring
the postcards back. With JS off the `.js` gate never matches, so the cards
reappear and the article stays readable.

**2. A review deck per Part.** After each `<div class="part">` the essay gets a
stacked-postcard deck holding that Part's cards — one card dealt at a time, click
to reveal, then grade **Didn't remember** / **Remembered**. When the deck empties it
reports `n of m remembered` and offers to replay only the ones missed. The per-Part
split is derived from the DOM (`7, 16, 9, 7, 6, 2` for the six Parts), not from any
build-time list, so adding cards to the source needs no wiring — re-run the
injector and the decks pick them up.

Grades persist in `localStorage` under `genai-review:<page-name>` (the key is derived from the
URL, so a future VAE or diffusion essay cannot collide on card ids). There is no
backend, so this is a local record of what you last answered — **not** a real spaced-
repetition scheduler. Quantum Country's is server-side; replicating it would need
storage plus a queue, and is deliberately out of scope here.

Three constraints keep this safe:

- Hiding is scoped to `.js .card-qa .a`, and the `js` class is added by a script in `<head>`. If JS never runs, no class is set and every
  answer stays visible — 47 readable cards, not 47 dead ones. The decks simply
  never appear.
- `@media print` forces answers visible and drops every button,
  deck and hint, so the PDF is unchanged (verified: 32 pages, and searching the text
  layer finds no deck UI).
- If the chrome script throws it removes the `js` class again, so a bug cannot
  strand the answers behind controls that were never created.

Styling and behaviour live in `build/chrome/chrome.css` and `build/chrome/chrome.js`.
Edit those, then run `node build/inject-nav.js` and every article picks up the
change — do not edit the injected copy inside `html/*.html`.

The essay's opening prose still says “cover the answer with your hand”. That is now
only true of the printed PDF; on screen the card and the deck do it. Reword if you
want the two to agree.

## Writing style

Every essay follows the same pattern, borrowed from the RLHF one:

1. Open the section with a concrete situation in plain words, before any notation
   ("Picture a machine with a dial on the front"), not with a definition.
2. Name the difficulty explicitly — *because here is the trouble* — so the reader
   knows what the mathematics is for before it arrives.
3. Give the analogy that maps onto the actual structure, not a decorative one. The
   sheets of paper in a dark room are the manifold and the saturation problem; the
   forger and the detective are the two networks; the foggy hillside walked east
   then north is coordinate ascent in EM.
4. Admit where the analogy breaks, in an aside, rather than letting it quietly lie.
5. Close with a **Beyond the notes** section: name what the source pages leave out,
   then actually teach those concepts instead of deferring to "the literature". It
   opens by stating plainly that everything above the line came from the notes and
   nothing below it did, so a reader can always tell which claims are sourced. RLHF
   does the same inside section 29 (Scale / Evaluation / Alternatives).


The rule of thumb: if a passage could be deleted without losing any intuition, it is
decoration and should go. Analogies earn their place by predicting the next piece of
mathematics.
## Review scheduling and the sidebar

Grading writes to a small SM-2 scheduler in `localStorage` under
`genai-review:<page>` (keyed by the URL, so essays cannot collide):

- **Remembered** — `n += 1`; the interval becomes 1 day, then 6 days, then
  previous × ease; ease drifts up to a ceiling of 2.8.
- **Didn't remember** — `n = 0`, interval 0 (due immediately), ease drifts down
  to a floor of 1.3, `lapses` increments.
- Each card stores `{ n, ef, ivl, due, lapses }`. The v1 format (a bare
  `"hit"` / `"miss"` string) is migrated on load, so existing progress survives.

Above 1320px a sidebar appears with the contents (Parts and their sections),
per-Part `graded/total`, the number of cards due, a button that opens a deck of
just those due cards, and a five-rung **memory ladder**. Every number there is read
from the scheduler — nothing is decorative. The deck's progress ring counts cards
the scheduler has seen, not session position.

Two honest limitations. A single grading button is a coarser signal than SM-2's
six-point scale, so the ease factor only ever moves by ±0.1/0.2. And progress lives
in the browser: clearing site data resets it, and it does not follow you between
devices. A real scheduler needs storage, which means a backend.

**Namespace rule:** everything the chrome injects uses a `qa-` prefix
(`.qa-side`, `.qa-rung`, `.qa-due-overlay`). An earlier pass used plain
`.toc`, which silently collided with an existing `.toc` in both the essays and the
cheat sheets — the injected rules were restyling the articles' own contents lists.
Keep the prefix.
**Watch out:** the ladder bars deliberately have no CSS transition. A transition
makes the rendered width impossible to verify in a headless snapshot — the bar reads
as 0px under `--virtual-time-budget` because the animation clock never advances.
## Rebuilding an RLHF article

Both RLHF articles are rendered from the `.src.html` files in `viz/`. See
`viz/README.md` for the full pipeline. The commands:

```bash
cd viz/build
node build-curious.js ../RLHF-Curious.src.html ../../html/RLHF-Curious.html \
                       ../../notes/rlhf/flashcards.tsv
node build-notes.js   ../RLHF-Study-Notes.src.html ../../html/RLHF-Study-Notes.html
cd ../.. && node build/inject-nav.js
```

Both print `katex_failures=0` on success. **A rebuild strips the nav bar**, so
always re-run `inject-nav.js` afterwards.

## Deploy to GitHub Pages

Branch-based deploy: no Actions workflow and no CI build step, because every
artifact is committed.

```bash
git remote add origin git`github.com:USER/REPO.git
git push -u origin main
```

Then on GitHub: **Settings → Pages → Source: _Deploy from a branch_ →
Branch `main`, folder `/ (root)` → Save**. The site appears at
`https://USER.github.io/REPO/` after a minute or two.

Every path in the repo is relative, so it works unchanged from a `/REPO/`
subpath. `.nojekyll` is present so Pages serves the files verbatim instead of
passing them through Jekyll.

## Two rendering modes

The articles do the same job by different means, and it matters when you edit one:

| files | math | JS at runtime | print-to-PDF |
|---|---|---|---|
| `html/RLHF-*.html` | pre-rendered at build time | none | reliable |
| `html/GAN.html`, `VAE.html`, `Diffusion.html` | rendered in the browser by an inlined KaTeX + auto-render bundle (~277 KB) | yes (also drives the canvas visualisers) | works, but needs the page to finish rendering first |

Both work offline — nothing is fetched from a CDN. The three client-side pages
still contain literal `\(q_\phi(z|x)\)` in the markup and typeset it on load;
that is expected, not a bug.

If you want the client-side pages to match the RLHF ones, run:

```bash
node build/render-math.js html/GAN.html html/VAE.html html/Diffusion.html
```

That bakes the math in and leaves the existing KaTeX bundle in place (now
unused, ~277 KB of dead weight you can strip afterwards). `render-math.js`
refuses files that are already rendered, so it is safe to re-run.

## Known issues

- `video/` (~25 MB) is committed but not yet linked from any page. Drop it from
  the branch if you would rather not publish it.
- Do not count KaTeX spans with macOS `grep`: it silently gives up on these
  multi-hundred-KB single-line files and reports 0. Use `python3 -c` or
  `perl` for anything longer than ~64 KB per line.
