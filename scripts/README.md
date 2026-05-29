# Content scripts

Two tools live here:

## `scaffold.py`
Generates `content/manifest.json` and 26 lesson shells (`content/lessons/*.json`)
with just chapter titles and an empty draft body.

```
python scripts/scaffold.py            # creates missing shells; preserves existing
python scripts/scaffold.py --force    # overwrites all shells
```

Safe to re-run; never overwrites existing lessons unless `--force` is passed.

## `extract_book.py`
Heuristically ingests the source PDF into per-chapter JSON.

```
python scripts/extract_book.py --pdf "/path/to/Living Jewish 7x10 (9.30.25) SG.pdf"
```

Output goes to `data/extracted/<lesson-id>.json` — a directory that is
**gitignored**. The script never overwrites `content/lessons/` directly.

### How to publish a chapter

1. Run the extractor.
2. Open `data/extracted/<lesson-id>.json` and review it block-by-block.
3. **Fix every Hebrew passage** — every `keytext.hebrew` and `term.hebrew`
   field is filled with `"HEBREW_PROOFREADING_NEEDED"`. Replace these with
   the clean Hebrew from your typesetting source. Do not trust PDF-extracted
   Hebrew (the spec is explicit about this — nikud and word order get
   scrambled).
4. Verify the structural classification (sec / box / deeper / keytext / etc.)
   matches the book.
5. Copy the file into `content/lessons/<lesson-id>.json` to publish it.
6. Set `"status": "published"` (or remove the field) so the dashboard stops
   showing the "Content pending" badge.

### What the extractor recognises

| Source element | Block type |
|---|---|
| Roman-numeral section heads (`I.`, `II.`, …) | `sec` |
| Bracketed paragraph numbers `[N]` | `p` with `p: "N"` |
| `Key Text` panels | `keytext` (Hebrew left as TODO) |
| `Key Term` cards | `term` (Hebrew left as TODO) |
| `Background`, `Kashrus Conversations` | `box` |
| `A Deeper Perspective` | `deeper` |
| `Exercise` T/F | `practice` |
| `Practical Resolutions` | `resolutions` |
| `CHAPTER N ASSESSMENT` | `gate` (multiple-choice) |
| Trailing `NOTES` / `Endnotes` | `notes[]` |

### What it does *not* do
- Summary tables (no consistent textual marker in the PDF) — add manually
- Captions for figures (the PDF doesn't carry image positioning) — add manually
- Hebrew of any kind — see step 3 above
- The exact step decomposition is performed at runtime by `js/stepper.js`,
  not by the extractor.
