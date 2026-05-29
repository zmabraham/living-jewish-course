# Living Jewish — *The Complete Guide to Keeping Kosher* online course

A self-paced, one-idea-per-screen course built on the Living Jewish design
system and the book *The Complete Guide to Keeping Kosher* (Living Jewish 2).

> **Status: platform complete · content pending ingestion.** The dashboard,
> stepper, gating, design tokens, endnotes drawer and assessment harness are
> all wired up. The 26 lesson shells exist with structural placeholders. Run
> `scripts/extract_book.py` (see [`scripts/README.md`](scripts/README.md)) to
> ingest content from the book PDF.

## Quick start

```sh
# 1. Generate / reset lesson scaffolding (already done once; safe to re-run)
python scripts/scaffold.py

# 2. Serve the static site
python -m http.server 8000
# open http://localhost:8000

# 3. (Optional) Ingest chapter content from the PDF
python scripts/extract_book.py --pdf "/path/to/Living Jewish 7x10 (9.30.25) SG.pdf"
# Review data/extracted/*.json, then copy into content/lessons/.
```

## File layout

```
index.html                # entry point
css/
  tokens.css              # design system tokens + @font-face
  course.css              # course UI (dashboard, stepper, gate, callouts)
js/
  app.js                  # boot + hash routing + endnotes drawer
  state.js                # progress state (localStorage; swap for API in prod)
  dashboard.js            # lesson grid (locked/available/completed)
  lesson.js               # lesson view + stepper controller
  stepper.js              # decomposes blocks → one-idea-per-screen steps
  blocks.js               # one renderer per content block type
  quiz.js                 # gate (acknowledge or multiple-choice)
fonts/                    # licensed brand fonts (see NOTICE.md)
assets/                   # brand imagery (cover illustration)
content/
  manifest.json           # list of lessons shown on the dashboard
  lessons/                # one JSON per lesson — schema in scripts/README.md
scripts/
  scaffold.py             # generates manifest + 26 lesson shells
  extract_book.py         # heuristic PDF → lesson JSON ingester
data/                     # gitignored — extraction output lands here
```

## Content schema

Each lesson is one JSON file:

```jsonc
{
  "id": "01-kosher-code",
  "num": "1",
  "tag": "Chapter One",
  "title": "The Kosher Code",
  "subtitle": "",
  "status": "draft | extracted-needs-review | published",
  "blocks": [
    { "t": "p", "text": "…", "p": "1" },
    { "t": "sec", "text": "I. Land Animals" },
    { "t": "keytext", "hebrew": "…", "english": "…", "source": "…" },
    { "t": "term", "hebrew": "…", "translit": "…", "translation": "…", "definition": "…" },
    { "t": "box", "label": "Background", "heading": "…", "paragraphs": ["…"] },
    { "t": "deeper", "heading": "…", "paragraphs": ["…"] },
    { "t": "summary", "headers": ["Col 1","Col 2"], "rows": [["…","…"]] },
    { "t": "resolutions", "items": ["…","…"] },
    { "t": "practice", "items": [{ "q": "…", "answer": true }] },
    { "t": "caption", "text": "…", "image": "assets/…", "alt": "…" }
  ],
  "gate": {
    "type": "quiz", "pass": 0.75,
    "questions": [{ "q": "…", "options": ["A","B","C","D"], "correct": 0 }]
  },
  "notes": ["First endnote text…", "Second endnote text…"]
}
```

Add a new block type? Add it to the `BUILD-SPEC §2` table, define a renderer
in `js/blocks.js`, add a decomposition case in `js/stepper.js`. No layout
changes elsewhere.

## How the stepper decomposes a lesson

Per `BUILD-SPEC §2`: each lesson is rendered **one idea per screen**.
Decomposition rules (implemented in `js/stepper.js`):

- a `sec` block is *contextual* — it labels the steps that follow, not a
  step of its own
- each numbered `p` (with `p` set) opens a new step
- each `keytext`, `box`, `deeper`, `practice`, `summary`, `resolutions`
  opens its own step
- a `term` attaches to the step that introduces it
- an unnumbered `p` attaches to the current step
- the gate (`acknowledge` or `quiz`) is always the final step

## Gating

- Lesson 0 is always unlocked.
- Lesson *N* unlocks when the prior lesson's gate resolves positively.
- In-chapter `practice` is **ungraded** (instant feedback, never blocks).
- A `quiz` gate uses `pass` (default `0.75`) — pass → mark complete; fail →
  show right/wrong feedback, allow retry.

### Important: this build's gating is client-side

`BUILD-SPEC §4` requires server-side enforcement so answers and lock state
aren't shippable in the bundle. This deployment runs entirely from static
files on GitHub Pages, so all gating is in the client. The swap points are:

| Concern | Static (this repo) | Production target |
|---|---|---|
| Progress | `localStorage` in `js/state.js` | API `GET/PUT /progress` |
| Lock state | Computed in `dashboard.js` | API refuses locked lesson JSON |
| Quiz grading | `wireGate()` in `js/quiz.js` | API `POST /grade` |
| Auth | none | Managed auth (Clerk / Auth0 / Supabase) |

`js/state.js` is intentionally the only state touchpoint — swap it for an
API wrapper and the rest of the app keeps working.

## Hebrew

Per `BUILD-SPEC §3` and reinforced by the design system docs: Hebrew sources
must be letter- and vowel-perfect, and must come from a clean typesetting
file — *not* PDF text extraction (`pdftotext` scrambles nikud and word
order). The extractor never writes Hebrew text; it fills every Hebrew slot
with the sentinel `"HEBREW_PROOFREADING_NEEDED"` and the UI renders that as
a visible warning until you replace it.

## Design system

All visual tokens come from the Living Jewish design system (`css/tokens.css`):

- Burgundy `#603048` primary, dusty rose `#c07890`, warm cream `#faf7f2`
- Freight Display Pro / Heldane Text (display serif)
- Freight Text Pro (body serif)
- Founders Grotesk (sans, labels, eyebrows)
- Fb Tehila / FbLivorna Pro (Hebrew)
- Minion Pro (citations, footnotes)

See [NOTICE.md](NOTICE.md) for content and font licensing.

## Deployment

See [DEPLOY.md](DEPLOY.md) for GitHub Pages setup and the path to a
production deploy with a real backend.
