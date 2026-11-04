# PROB-SPEC — authoring contract for the *Probability, from first principles* essays

Seven essays sit under this contract. They are written in the same **mnemonic medium**
as the rest of the series (Quantum Country's idea: small atomic recall prompts inside
the prose, a review deck per Part, an Anki-importable deck on disk). They are the
prerequisite layer under `Foundations-Curious` and the four algorithm essays.

Source of every claim: **Blitzstein & Hwang, *Introduction to Probability* (2nd ed.)**.
Cite chapter and section (`§1.4`), never a page of the IIT Madras notes — these essays
are *not* drawn from those pages.

---

## 1. File and build contract

Write exactly one file:

    viz/prob-N.body.html      (N = 1..7, given to you in the brief)

It is a **body fragment**, not a full document. No `<html>`, `<head>`, `<style>`,
`<script>`, no stylesheet link. A build script wraps it in `<html><head><style>` plus the
shared CSS (`viz/_essay.css`) and the inlined KaTeX CSS.

**Top of file, verbatim form:**

    <!--META
    { "title": "Your essay title, plain text, no HTML entities" }
    -->

Nothing before it. The META block is stripped from the output and used for `<title>`.

**Do not run any build.** The orchestrator runs `build/build-essay.js`, then
`viz/build/build-curious.js`, then `build/inject-nav.js`. Touching anything else in the
repo will collide with six other authors writing in parallel.

---

## 2. Document skeleton — follow this order exactly

    <!--META
    { "title": "..." }
    -->
    <h1>Short title,<br>broken over two or three<br>lines with &lt;br&gt;</h1>
    <h1 class="sub-title">One italic sentence: what the seven or eight tools in this
    essay are, and what the reader will be able to do afterwards</h1>

    <p class="lead">This essay is part of a series written in what we call a
    <i>mnemonic medium</i>. ...</p>

    <p>How to use the cards: say the answer out loud before you look; a failed recall
    is what makes the next one stick; the cards are deliberately one fact each.</p>

    <p>Where this essay sits: what the reader must already know, and which later essay
    stops making sense without it.</p>

    <hr class="rule">

    <div class="part">Part I &mdash; Title of this part in words</div>

    <h2>1 &middot; Section title</h2>
    ... prose, math, cards ...

    <h2>2 &middot; Section title</h2>
    ...

    <div class="part">Part II &mdash; ...</div>
    ...

    <hr class="rule">

    <h2>Appendix &middot; Every question in this essay</h2>

    <p>Each card you met is listed below. Try them cold: answer before you look, or
    better, use the companion file <span class="small">(flashcards.tsv)</span>, which
    imports directly into any spaced-repetition system.</p>

    <div id="cardindex"><!--CARDINDEX--></div>

    <p class="small" style="margin-top:22px;border-top:1px solid #e8e8e4;padding-top:12px">
    Built from Blitzstein &amp; Hwang, <i>Introduction to Probability</i>, chapters X&ndash;Y.
    Typeset with KaTeX. Source: <i>viz/prob-N.body.html</i>, assembled by
    <i>build/build-essay.js</i>.</p>

**`<!--CARDINDEX-->` is mandatory.** The build throws without it. It is replaced by a
generated list of every question, so write it exactly once, on its own line, inside
`<div id="cardindex">`.

**`<h2>` numbering is continuous across the whole essay** (1, 2, 3, … never restarting
at a new Part). Part banners carry roman numerals and are prose, not numbers.

**Length targets per essay:** 9–11 `<h2>` sections · 2–4 Parts · 30–38 cards ·
roughly 700–900 lines. Aim for the middle of each range.

---

## 3. Card markup — byte-exact

    <div class="card-qa">
      <p class="q"><span class="lbl">Question <span class="n">&nbsp;1.1</span></span>
      The question, one sentence, ending in a question mark.</p>
      <p class="a"><span class="lbl">Answer</span>
      The answer, one or two sentences, or a single formula.</p>
    </div>

Rules that the build depends on:

- **No nested `<div>` inside a card.** The harvester matches to the first `</div>`.
  Only `<p>`, `<span>`, `<i>`, `<b>`, inline math.
- **Numbering is `section.ordinal`** — cards in `<h2>4` are `4.1`, `4.2`, `4.3` in
  reading order. Keep `&nbsp;` before the number.
- Card numbering must be **dense and in order**; no gaps, no reuse.

**Card-writing rules (the mnemonic-medium standard, non-negotiable):**

1. **Atomic.** One fact, one step or one number per card. "List the three…" becomes
   three cards. A compound card gets graded "remembered" when only half was.
2. **Short answers.** One or two sentences, or a single formula. If the answer needs a
   paragraph, the question is too big.
3. **No give-aways.** The question must not contain the key symbol or word of its own
   answer.
4. **Mixed kinds**, in every section: definitions, *why* questions, and at least one
   *compute this* card next to every worked example in numbers.
5. **Cards test the claim the paragraph just made.** Place a card within a few
   paragraphs of the prose that earns it — never as a block of five at the end.

---

## 4. Math

- Inline: `\( ... \)`. Display: `\[ ... \]` inside `<div class="mathblock">`.
- **Never** use `$...$`, `$$...$$`, or Markdown.
- `\\` for a line break inside `aligned` works — the build protects it. Standard LaTeX
  macros are fine (`\frac`, `\sum`, `\int`, `\binom`, `\mathbb`, `\mid`, `\tfrac`).
  Avoid `\newcommand`, `\label`, `\begin{equation}`; use `\begin{aligned}` inside `\[`.
- KaTeX is strict about `\text{}` with unescaped `%`, and about `|` inside `\text`.
  Prefer `\mid`.
- Escape-free prose: write `<` as `&lt;` and `>` as `&gt;` when they are not part of a tag.

## 5. Typography and available classes

Entities, not raw Unicode punctuation: `&mdash;` `&ndash;` `&middot;` `&larr;` `&times;`
`&ge;` `&le;` `&rarr;`. Rupees are `&#8377;10`. Curly quotes are written as
`&ldquo;…&rdquo;`. Straight ASCII quotes inside prose are also fine.

These classes exist in the shared stylesheet — use them, invent nothing:

| markup | use |
|---|---|
| `<p class="lead">` | the opening paragraph, once |
| `<div class="part">` | Part banner; starts a review deck |
| `<h3>` | sub-head inside a section, italic; optional |
| `<div class="mathblock">` | wraps `\[ … \]` |
| `<hr class="rule">` | section break |
| `<table><tr><th>/<td>` | comparison tables; header row required |
| `<p class="beyond-note">` | provenance line: "Beyond the book &mdash; not in §2.4." |
| `<div class="aside">` | an aside where the analogy breaks or a warning lives |
| `<div class="fig"><div class="box"><pre class="d">…</pre></div><div class="cap">…</div></div>` | an ASCII diagram in a framed box with a caption |
| `<p class="small">` | fine print |
| `<i>`, `<b>`, `<code>` | inline |

**Use at least one `pre.d` ASCII diagram per essay** (a tree, a table of pebbles, a
density sketch). Two or three is better. Keep lines under 74 characters.

**Do not use** `.toc`, `.idxq`, `.idx-n`, `.card`, `.lbl` outside a card, or any
`style=""` attribute except the one provenance paragraph above.

---

## 6. Writing rules — the series style

A reader should be able to delete any paragraph and lose intuition. If they cannot, it
is decoration and should go.

1. **Open every section with a concrete situation in plain words**, before any
   notation. A fairground game, a hospital test, ten pebbles in a bag, a licence plate.
   Never open with a definition.
2. **Name the difficulty explicitly** — *because here is the trouble* — so the reader
   knows what the mathematics is for before it arrives.
3. **Give the analogy that maps onto the structure**, not a decorative one. It must
   predict the next piece of mathematics, not merely illustrate.
4. **Admit where the analogy breaks**, in a `div.aside`, rather than letting it
   quietly lie.
5. **Worked example in numbers next to every key formula.** A reader who can reproduce
   a number has understood the formula; one who can only restate it has not. Invent
   small, round, checkable numbers and show the arithmetic.
6. **Story proofs, in Blitzstein's sense**: prove an identity by counting the same
   object two ways, and say out loud that both counts describe one set. At least one per
   essay.
7. **Every essay ends with a Part that maps the maths onto generative AI** — one
   section, one table, and 3–5 cards — naming exactly where each tool reappears in
   `GAN-Curious`, `VAE-Curious`, `Diffusion-Curious`, `RLHF-Curious` and
   `Foundations-Curious`. This is why the essay exists. Be specific: not "expectation
   is used in VAEs" but "the reconstruction term is \(\mathbb{E}_{q(z\mid x)}\log p(x\mid z)\)
   — a Monte Carlo average of a conditional expectation, estimated with one sample per
   step".
8. **No filler openers.** Ban: "In this section we will", "It is important to note",
   "Let's dive in", "As we all know", "simply put". Ban exclamation marks. Ban emoji.
9. **Second person, present tense.** British-or-American spelling is fine but be
   consistent within the file; the series leans American ("normalizing", "behavior").
10. **Footnotes to the book**: a Part (usually the last before the AI Part) that
    collects places where a reader of the chapter commonly misreads it, or where the
    book compresses a step that would break an implementation. Correct it there, and
    mark non-book material with `p.beyond-note`.

---

## 7. Reference: how to read the source book

    /Users/anaik/Downloads/Introduction_to_Probability_by_Joseph_K_Blitzstein,_Jessica_Hwang.pdf

636 pages. **PDF page index = printed page number + 16.** Table of contents is at
indices 9–12.

| chapter | printed pages | PDF indices |
|---|---|---|
| 1 Probability and counting | 1–44 | 17–60 |
| 2 Conditional probability | 45–102 | 61–118 |
| 3 Random variables and their distributions | 103–148 | 119–164 |
| 4 Expectation | 149–212 | 165–228 |
| 5 Continuous random variables | 213–266 | 229–282 |
| 6 Moments | 267–302 | 283–318 |
| 7 Joint distributions | 303–366 | 319–382 |
| 8 Transformations | 367–414 | 383–430 |
| 9 Conditional expectation | 415–456 | 431–472 |
| 10 Inequalities and limit theorems | 457–496 | 473–512 |
| 11 Markov chains | 497–534 | 513–550 |
| 12 Markov chain Monte Carlo | 535–558 | 551–574 |

Section numbers you will cite: §1.2 sample spaces, §1.3 naive definition, §1.4 counting,
§1.5 story proofs, §1.6 non-naive; §2.2 definition, §2.3 Bayes and total probability,
§2.5 independence; §3.x distributions; §4.2 linearity, §4.4 indicators and the
fundamental bridge, §4.5 LOTUS, §4.6 variance; §5.1 densities, §5.2 uniform, §5.3
universality of the uniform, §5.4 normal, §5.5 exponential, §5.7 symmetry of i.i.d.;
§6.1–6.6 moments and MGFs; §7.1 joint/marginal/conditional, §7.2 2D LOTUS, §7.3
covariance, §7.5 multivariate normal; §8.1 change of variables, §8.2 convolutions; §9.1
conditional expectation given an event, §9.3 properties, §9.5 conditional variance;
§10.1 inequalities (Markov, Chebyshev, Cauchy–Schwarz, Jensen), §10.2 LLN, §10.3 CLT;
§12.1 Metropolis–Hastings.

Extract text with:

    python3 -c "
    import pymupdf
    d = pymupdf.open('/Users/anaik/Downloads/Introduction_to_Probability_by_Joseph_K_Blitzstein,_Jessica_Hwang.pdf')
    for i in range(START, END):
        print(d[i].get_text())
    "

Read your chapter(s) before writing. The book's own examples — the birthday problem,
the elk, the chess tournament, the communicable disease, Adam and Eve — are worth
reusing or adapting, and its "story" framing is the house style here.

---

## 8. The exemplar

Read `viz/foundations.body.html` end to end before writing. It is the closest sibling:
same length, same card density, same voice, same appendix. Match its rhythm — short
declarative paragraphs, one idea each, a card every three or four paragraphs.
