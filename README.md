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
| `html/` | rendered articles (KaTeX pre-rendered, fonts base64-inlined) |
| `pdf/` | print exports of each topic |
| `notes/rlhf/` | `FULL.md` reference and the Anki-importable `flashcards.tsv` |
| `viz/` | build inputs for the articles + the original render scripts |
| `video/`, `blockdiagrams/` | GAN/WGAN training animations and diagrams |

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
| `build/inject-nav.js` | prepends the `← All topics` bar to every `html/*.html`; **idempotent** — it marks the file with ``<!--site-nav-->`` and later runs are no-ops |
| `build/render-math.js` | pre-renders raw \(…\) / \[…\] into static KaTeX markup, in place |

`inject-nav.js` only inserts a block immediately after `<body>`; everything else
in the article stays byte-identical, which is what keeps the print exports
reproducible.

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
