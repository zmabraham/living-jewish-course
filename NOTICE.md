# Licensing & content notice

## Book content

The text of *The Complete Guide to Keeping Kosher* (Living Jewish series) is
the publisher's copyrighted material. This repository ships **no book text
by default** — `content/lessons/*.json` are structural shells. `scripts/extract_book.py`
writes its extraction output to `data/extracted/`, which is `.gitignore`d.

If you intend to publish the book's text — even on a paywalled course —
confirm you have the publisher's authorization before committing extracted
content to this (or any) repository. The `BUILD-SPEC.md` itself anticipates
paywalled access (Stripe enrollment + server-side gating in §5/§6); shipping
the full text behind a static public GitHub Pages site is **not** the
intended publishing model.

## Fonts

The `fonts/` directory contains the Living Jewish brand typefaces (Founders
Grotesk, Freight Text Pro, Freight Display Pro, Heldane Text, Minion Pro,
Fb Tehila, FbLivorna Pro). These are commercial fonts licensed for the
Living Jewish print product. **Confirm your web-font license terms before
hosting these on a public URL.** If your license doesn't cover web use,
either:

- restrict the repo (private), or
- remove the OTF/TTF files from `fonts/` and let the CSS fall through to
  the Google Fonts equivalents already declared in the stacks
  (`Frank Ruhl Libre` for Hebrew, Georgia/serif for English).

## Design system

Visual tokens, colors, type scales and assets are sourced from the Living
Jewish design system bundle. Used here for the Living Jewish online course.

## This codebase

The platform code (HTML, CSS, JavaScript, Python ingestion scripts) is your
project's code. No external license is asserted by this repository; treat
it as you would any internal product code.
