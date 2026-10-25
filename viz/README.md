# viz/ — sources and build scripts

Two kinds of file live here. If you opened an `.html` file expecting to read
something and got raw `\( \LaTeX \)`, this is why.

## Read these (final artifacts) → `../html/`

| file | what it is |
|---|---|
| `html/RLHF-Study-Notes.html` | reference sheet, 14 pp, tables + derivations |
| `html/RLHF-Curious.html` | essay in a mnemonic medium, 32 pp, 47 recall cards |
| `html/GAN.html`, `VAE.html`, `Diffusion.html` | the earlier cheat sheets |

All are **fully self-contained**: KaTeX output is pre-rendered into the HTML and
all 20 font files are base64-inlined. **No JavaScript and no network at runtime.**
You can open them from a USB stick with wifi off.

## Edit these (build inputs)

| file | role |
|---|---|
| `RLHF-Study-Notes.src.html` | LaTeX source for the reference sheet |
| `RLHF-Curious.src.html` | LaTeX source for the essay (also holds the flashcard Q&A) |
| `build/build-notes.js` | renders `\(...\)` / `\[...\]` with KaTeX, inlines the CSS |
| `build/build-curious.js` | same, plus harvests flashcards → TSV and builds the review index |

These contain **raw LaTeX** and a `/*KATEX_CSS*/` placeholder. Browsers show them
unrendered — that is expected. Each one starts with a yellow banner saying so, which
the build strips from the output.

## Build

```bash
cd viz/build

node build-curious.js ../RLHF-Curious.src.html ../../html/RLHF-Curious.html \
                       ../../notes/rlhf/flashcards.tsv

node build-notes.js   ../RLHF-Study-Notes.src.html ../../html/RLHF-Study-Notes.html
```

Both scripts print `katex_failures=0` when every formula parsed. If that number is
non-zero, the offending snippet is echoed — fix it before exporting.

## Export to PDF

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --disable-gpu --no-sandbox --no-pdf-header-footer \
  --run-all-compositor-stages-before-draw --virtual-time-budget=12000 \
  --print-to-pdf=../pdf/RLHF-Curious.pdf \
  "file://$PWD/../html/RLHF-Curious.html"
```

Verify afterwards with PyMuPDF: page count, per-page fill (aim >80%), and a check
that no block extends past the right text edge.

## KaTeX location

The scripts load KaTeX from `../../.genai-work/node_modules/katex` (v0.16.9). Use
`dist/katex.min.js` — the package-root `katex.js` is Flow-typed source and will
throw under Node.

## One trap worth remembering

Do not set `-webkit-font-feature-settings` on the body font. It makes Chrome emit
several subsets of the same face per page, and some of those subsets ship with a
broken ToUnicode map — the PDF then *looks* fine but loses a letter from its text
layer (we lost every `s`). Always check extraction after exporting:
`pymupdf.open(pdf)[0].get_text()` should contain ordinary words.
