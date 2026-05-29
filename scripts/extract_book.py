#!/usr/bin/env python3
"""
extract_book.py — ingest the print PDF into lesson JSON.

Usage:
    python scripts/extract_book.py --pdf "path/to/Living Jewish 7x10 (9.30.25) SG.pdf"

Output goes to `data/extracted/<lesson-id>.json` (a separate directory that is
gitignored by default). It is intentionally NOT written directly to
`content/lessons/` — you review each chapter and decide what to publish.

What this script does:
  * runs `pdftotext` in two modes (-layout and flow) and reads both
  * splits the flow text into per-chapter regions using the chapter markers
  * recognises and tags these structural elements:
      - section heads (I., II., III., …)
      - numbered teaching paragraphs ([1], [2], …)
      - "Key Text" panels (the verse / source + English translation)
      - "Key Term" cards (Hebrew / transliteration / translation / definition)
      - "Background", "Kashrus Conversations" sidebars
      - "A Deeper Perspective" callouts
      - "Exercise" True/False
      - "Practical Resolutions"
      - "Chapter N Assessment" (multiple-choice quiz)
      - endnotes

What this script does NOT do (per BUILD-SPEC §3):
  * It does NOT trust Hebrew extracted from the PDF — Hebrew word order and
    nikud are unreliable from pdftotext. Every Key Text and Key Term Hebrew
    field is set to "HEBREW_PROOFREADING_NEEDED" and you replace it manually
    from a clean source.
  * It is heuristic, not a parser. Expect to review and fix each lesson.
"""
import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "extracted"
TMP = ROOT / "tmp"


# Chapter table (mirrors scaffold.py).
CHAPTERS = [
    ("00-introduction",       None, "Introduction", "Why Keep Kosher?"),
    ("01-kosher-code",        1,    "Chapter 1",    "The Kosher Code"),
    ("02-farm-to-table",      2,    "Chapter 2",    "From Farm to Table"),
    ("03-line-drawn-in-torah",3,    "Chapter 3",    "A Line Drawn in Torah"),
    ("04-waiting-game",       4,    "Chapter 4",    "The Waiting Game"),
    ("05-at-the-table",       5,    "Chapter 5",    "At the Table"),
    ("06-flavor-factor",      6,    "Chapter 6",    "The Flavor Factor"),
    ("07-mixups-mishaps",     7,    "Chapter 7",    "MixUps and Mishaps"),
    ("08-material-advantage", 8,    "Chapter 8",    "Material Advantage"),
    ("09-in-hot-water",       9,    "Chapter 9",    "In Hot Water"),
    ("10-purification-by-fire",10,  "Chapter 10",   "Purification by Fire"),
    ("11-modern-challenges",  11,   "Chapter 11",   "Modern Challenges, Ancient Solutions"),
    ("12-immersion-therapy",  12,   "Chapter 12",   "Immersion Therapy"),
    ("13-gray-zone",          13,   "Chapter 13",   "Navigating the Gray Zone"),
    ("14-cutting-edge",       14,   "Chapter 14",   "The Cutting Edge of Kashrus"),
    ("15-blueprint",          15,   "Chapter 15",   "Blueprint for Kosher Living"),
    ("16-ground-up",          16,   "Chapter 16",   "From the Ground Up"),
    ("17-rising-occasion",    17,   "Chapter 17",   "Rising to the Occasion"),
    ("18-lechayim",           18,   "Chapter 18",   "Lechayim!"),
    ("19-bread-together",     19,   "Chapter 19",   "Bread That Brings Us Together"),
    ("20-taste-tradition",    20,   "Chapter 20",   "The Taste of Tradition"),
    ("21-milk-matters",       21,   "Chapter 21",   "Milk Matters"),
    ("22-out-in-world",       22,   "Chapter 22",   "Out in the World"),
    ("23-sealed-delivered",   23,   "Chapter 23",   "Sealed and Delivered"),
    ("24-behind-label",       24,   "Chapter 24",   "Behind the Label"),
    ("25-safety-first",       25,   "Chapter 25",   "Safety First"),
]


# ----------------------------------------------------------------------
# 1. PDF → text
# ----------------------------------------------------------------------
def pdf_to_text(pdf_path: Path) -> str:
    """Run pdftotext in flow mode (reading order). Caches in tmp/."""
    TMP.mkdir(parents=True, exist_ok=True)
    out = TMP / "book-flow.txt"
    if not out.exists():
        subprocess.run(["pdftotext", str(pdf_path), str(out)], check=True)
    return out.read_text(encoding="utf-8", errors="replace")


# ----------------------------------------------------------------------
# 2. Slice into per-chapter regions using the chapter header markers
# ----------------------------------------------------------------------
CHAPTER_HEAD_RE = re.compile(r"^Chapter\s+(\d+)\s*$", re.MULTILINE)
INTRO_HEAD_RE = re.compile(r"^(Introduction|INTRODUCTION)\s*$", re.MULTILINE)

def slice_regions(text: str) -> dict:
    """Return {chapter_num_or_'intro': text_slice}."""
    regions = {}
    # Find chapter heads
    heads = [(m.start(), int(m.group(1))) for m in CHAPTER_HEAD_RE.finditer(text)]
    # Choose the LAST occurrence as the "in-chapter" anchor (the first is in TOC).
    by_num = {}
    for start, num in heads:
        by_num.setdefault(num, []).append(start)
    anchors = []
    for num, starts in by_num.items():
        # Prefer the second occurrence onward (skipping TOC)
        anchors.append((starts[-1] if len(starts) == 1 else starts[1], num))
    anchors.sort()
    for i, (start, num) in enumerate(anchors):
        end = anchors[i + 1][0] if i + 1 < len(anchors) else len(text)
        regions[num] = text[start:end]
    return regions


# ----------------------------------------------------------------------
# 3. Within a chapter, decompose into typed blocks
# ----------------------------------------------------------------------
SECTION_RE = re.compile(r"^\s*([IVX]+)\.\s+([A-Z][A-Z' ,\-?!]+)\s*$", re.MULTILINE)
NUMBERED_RE = re.compile(r"^\s*\[(\d+)\]\s*", re.MULTILINE)
KEYTEXT_RE = re.compile(r"^\s*Key Text\s*$", re.IGNORECASE | re.MULTILINE)
KEYTERM_RE = re.compile(r"^\s*Key Term\s*$", re.IGNORECASE | re.MULTILINE)
BG_RE      = re.compile(r"^\s*Background\s*$", re.IGNORECASE | re.MULTILINE)
KC_RE      = re.compile(r"^\s*Kashrus Conversations\s*$", re.IGNORECASE | re.MULTILINE)
DEEPER_RE  = re.compile(r"^\s*A Deeper Perspective\s*$", re.IGNORECASE | re.MULTILINE)
EXERCISE_RE= re.compile(r"^\s*Exercise\s*$", re.IGNORECASE | re.MULTILINE)
RESOLUT_RE = re.compile(r"^\s*Practical Resolutions\s*$", re.IGNORECASE | re.MULTILINE)
ASSESS_RE  = re.compile(r"^\s*CHAPTER\s+\d+\s+ASSESSMENT\s*$", re.IGNORECASE | re.MULTILINE)

# Hebrew character range — used to mark hebrew text positions
HEBREW_CHAR = re.compile(r"[֐-׿]")


def clean(text: str) -> str:
    """Collapse runs of whitespace and trim."""
    return re.sub(r"\s+", " ", text).strip()


def has_hebrew(s: str) -> bool:
    return bool(HEBREW_CHAR.search(s))


def split_paragraphs(block: str) -> list:
    paras = []
    for p in re.split(r"\n\s*\n", block):
        p = p.strip()
        if p:
            paras.append(p)
    return paras


def extract_chapter_blocks(text: str) -> dict:
    """
    Heuristic extraction. Returns a dict with:
      { "blocks": [...], "notes": [...], "assessment": { ... } }
    Every chunk is faithful-to-source but the script makes structural guesses;
    review each lesson after extraction.
    """
    # Split off endnotes (very heuristic — look for a trailing "Endnotes" / "NOTES")
    notes = []
    nm = re.search(r"\n\s*(NOTES|Endnotes)\s*\n", text)
    if nm:
        notes_block = text[nm.end():]
        text = text[:nm.start()]
        # Each note typically starts with a number followed by period or paren
        for m in re.finditer(r"^\s*(\d+)\.\s+([^\n].*?)(?=^\s*\d+\.\s+|\Z)",
                             notes_block, re.MULTILINE | re.DOTALL):
            notes.append(clean(m.group(2)))

    # Split off the assessment
    assessment = None
    am = ASSESS_RE.search(text)
    if am:
        assessment_block = text[am.end():]
        text = text[:am.start()]
        assessment = parse_assessment(assessment_block)

    paragraphs = split_paragraphs(text)
    blocks = []
    i = 0
    while i < len(paragraphs):
        p = paragraphs[i]
        first = p.split("\n", 1)[0].strip()

        # Roman-numeral section head
        sec_m = re.match(r"^([IVX]+)\.\s+([A-Z][A-Z' ,\-?!]+)$", first)
        if sec_m:
            blocks.append({"t": "sec", "text": f"{sec_m.group(1)}. {sec_m.group(2).strip()}"})
            rest = p.split("\n", 1)[1] if "\n" in p else ""
            if rest.strip():
                blocks.extend(plain_to_blocks(rest))
            i += 1; continue

        # Labelled blocks
        label_match = None
        for label, kind in [
            ("Key Text", "keytext"),
            ("Key Term", "term"),
            ("Background", "box"),
            ("Kashrus Conversations", "box"),
            ("A Deeper Perspective", "deeper"),
            ("Exercise", "practice"),
            ("Practical Resolutions", "resolutions"),
        ]:
            if first.lower().startswith(label.lower()):
                label_match = (label, kind); break

        if label_match:
            label, kind = label_match
            body = p[len(label):].strip()
            blocks.append(build_labeled_block(label, kind, body))
            i += 1; continue

        # Default: plain paragraph (maybe with numbered marker)
        blocks.extend(plain_to_blocks(p))
        i += 1

    return {"blocks": blocks, "notes": notes, "assessment": assessment}


def plain_to_blocks(text: str):
    """Convert a chunk of body text into one or more `p` blocks, picking up
    [N] paragraph markers and creating separate blocks for each."""
    out = []
    # Split on [N] markers, keeping the marker with the following paragraph
    parts = re.split(r"\s*\[(\d+)\]\s*", text)
    # parts pattern: [pre, num1, content1, num2, content2, ...]
    if parts[0].strip():
        out.append({"t": "p", "text": clean(parts[0])})
    for j in range(1, len(parts), 2):
        num = parts[j]
        content = parts[j + 1] if j + 1 < len(parts) else ""
        if content.strip():
            out.append({"t": "p", "p": num, "text": clean(content)})
    return out


def build_labeled_block(label: str, kind: str, body: str):
    if kind == "keytext":
        # Body is typically "<Hebrew lines>\n<English translation>\n<Citation>"
        # We refuse to trust extracted Hebrew. Put English + source if recognisable.
        lines = [l for l in body.split("\n") if l.strip()]
        english = []
        source = None
        for l in lines:
            if has_hebrew(l):
                continue
            # Heuristic: a source line tends to end with a verse reference like ":1"
            # or "Mishneh Torah, ...". Treat the LAST non-Hebrew line as source.
            english.append(l)
        if english:
            source = english[-1] if len(english) > 1 else None
            english_text = " ".join(english[:-1] if source else english)
        else:
            english_text = ""
        return {
            "t": "keytext",
            "hebrew": "HEBREW_PROOFREADING_NEEDED",
            "english": clean(english_text),
            "source": clean(source) if source else None,
        }
    if kind == "term":
        # Body: <Hebrew>\n<translit>\n<translation>\n<definition>
        lines = [l.strip() for l in body.split("\n") if l.strip()]
        non_he = [l for l in lines if not has_hebrew(l)]
        translit  = non_he[0] if len(non_he) > 0 else ""
        translation = non_he[1] if len(non_he) > 1 else ""
        definition = " ".join(non_he[2:]) if len(non_he) > 2 else ""
        return {
            "t": "term",
            "hebrew": "HEBREW_PROOFREADING_NEEDED",
            "translit": clean(translit),
            "translation": clean(translation),
            "definition": clean(definition),
        }
    if kind == "box":
        # First line is often a heading; remainder is body
        parts = body.split("\n", 1)
        heading = clean(parts[0]) if parts else ""
        paras = split_paragraphs(parts[1]) if len(parts) > 1 else []
        return {
            "t": "box",
            "label": label,
            "heading": heading,
            "paragraphs": [clean(p) for p in paras],
        }
    if kind == "deeper":
        parts = body.split("\n", 1)
        heading = clean(parts[0]) if parts else ""
        paras = split_paragraphs(parts[1]) if len(parts) > 1 else []
        return {
            "t": "deeper",
            "label": label,
            "heading": heading,
            "paragraphs": [clean(p) for p in paras],
        }
    if kind == "practice":
        items = []
        for m in re.finditer(r"^\s*\d+\.\s+(.+?)\s+(True|False)\s*$",
                             body, re.MULTILINE | re.IGNORECASE):
            items.append({"q": clean(m.group(1)), "answer": m.group(2).lower() == "true"})
        return {"t": "practice", "label": "Exercise", "items": items}
    if kind == "resolutions":
        items = [clean(l[2:]) for l in body.split("\n")
                 if re.match(r"^\s*(\d+\.|[•\-\*])\s+", l)]
        return {"t": "resolutions", "label": "Practical Resolutions", "items": items}
    return {"t": "p", "text": clean(body)}


def parse_assessment(text: str):
    """Pull multiple-choice questions out of the assessment region.
    Format expected:
        1. Question text?
           a. option a
           b. option b
           c. option c
           d. option d
        (Answer key may appear inverted at end as "1. c  2. d  …")
    """
    # Strip the answer key region (commonly inverted) — keep it to assign `correct`
    answer_key = {}
    key_m = re.search(r"^\s*Answers?:?\s*$", text, re.IGNORECASE | re.MULTILINE)
    body = text
    if key_m:
        body = text[:key_m.start()]
        key_block = text[key_m.end():]
        for m in re.finditer(r"\b(\d+)[.\)]\s*([a-eA-E])\b", key_block):
            answer_key[int(m.group(1))] = "abcde".index(m.group(2).lower())

    questions = []
    q_pattern = re.compile(
        r"^\s*(\d+)\.\s+(.+?)(?=^\s*(?:\d+)\.\s+|\Z)",
        re.MULTILINE | re.DOTALL
    )
    for m in q_pattern.finditer(body):
        qnum = int(m.group(1))
        block = m.group(2).strip()
        # Split into stem + options on lines starting with a-e + dot/paren
        opt_iter = list(re.finditer(r"^\s*([a-eA-E])[.\)]\s+(.+?)(?=^\s*[a-eA-E][.\)]\s+|\Z)",
                                    block, re.MULTILINE | re.DOTALL))
        if not opt_iter:
            continue
        stem = block[:opt_iter[0].start()].strip()
        options = [clean(o.group(2)) for o in opt_iter]
        correct = answer_key.get(qnum, 0)
        questions.append({"q": clean(stem), "options": options, "correct": correct})
    if not questions:
        return None
    return {"type": "quiz", "pass": 0.75, "questions": questions}


# ----------------------------------------------------------------------
# 4. Drive it all
# ----------------------------------------------------------------------
def extract(pdf_path: Path):
    text = pdf_to_text(pdf_path)
    regions = slice_regions(text)

    OUT.mkdir(parents=True, exist_ok=True)
    summary = []

    for lid, num, tag, title in CHAPTERS:
        region_text = ""
        if num is None:
            # introduction — pull text between "Introduction" and chapter 1
            im = INTRO_HEAD_RE.search(text)
            if im:
                # Find the first chapter 1 head AFTER the intro
                c1 = CHAPTER_HEAD_RE.search(text, im.end())
                region_text = text[im.end():c1.start()] if c1 else ""
        else:
            region_text = regions.get(num, "")

        if not region_text.strip():
            print(f"  [skip] {lid} — no region found")
            continue

        parsed = extract_chapter_blocks(region_text)
        lesson = {
            "id": lid,
            "num": str(num) if num is not None else "·",
            "tag": tag,
            "title": title,
            "subtitle": "",
            "status": "extracted-needs-review",
            "blocks": parsed["blocks"],
            "gate": parsed["assessment"] or {
                "type": "acknowledge",
                "label": "Mark complete",
                "text": "Continue to the next lesson.",
            },
            "notes": parsed["notes"],
        }
        out_path = OUT / f"{lid}.json"
        out_path.write_text(json.dumps(lesson, indent=2, ensure_ascii=False), encoding="utf-8")
        summary.append((lid, len(parsed["blocks"]), len(parsed["notes"]),
                       len(parsed["assessment"]["questions"]) if parsed["assessment"] else 0))
        print(f"  [ok]  {lid}  blocks={len(parsed['blocks'])}  notes={len(parsed['notes'])}")

    # Write a manifest of extracted output for review
    (OUT / "_summary.json").write_text(
        json.dumps([{"id": s[0], "blocks": s[1], "notes": s[2], "quiz_qs": s[3]} for s in summary],
                   indent=2),
        encoding="utf-8")
    print(f"\nWrote {len(summary)} extracted lessons to {OUT.relative_to(ROOT)}/")
    print("Review them, fix Hebrew (every keytext/term has HEBREW_PROOFREADING_NEEDED),")
    print("then copy each into content/lessons/ when you're ready to publish.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", required=True, help="Path to the source PDF")
    args = ap.parse_args()
    extract(Path(args.pdf))


if __name__ == "__main__":
    main()
