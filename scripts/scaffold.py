#!/usr/bin/env python3
"""
Scaffold the course content directory.

Writes:
  - content/manifest.json   (list of all 26 lessons)
  - content/lessons/*.json  (one shell per lesson; only created if absent)

Lesson shells are structural placeholders. The actual book content is
populated separately by `extract_book.py`. This script never overwrites
an existing lesson file — it's safe to re-run.
"""
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
LESSONS_DIR = CONTENT / "lessons"

# Lesson list. `id` is the JSON filename; `num` is shown in the card.
# Titles are the chapter titles from the book's table of contents.
LESSONS = [
    {"id": "00-introduction",      "num": "·",  "tag": "Introduction",            "title": "Introduction",                               "subtitle": "",                                "gate": "acknowledge"},
    {"id": "01-kosher-code",       "num": "1",  "tag": "Chapter One",             "title": "The Kosher Code",                            "subtitle": "",                                "gate": "quiz"},
    {"id": "02-farm-to-table",     "num": "2",  "tag": "Chapter Two",             "title": "From Farm to Table",                         "subtitle": "",                                "gate": "quiz"},
    {"id": "03-line-drawn-in-torah","num": "3", "tag": "Chapter Three",           "title": "A Line Drawn in Torah",                      "subtitle": "",                                "gate": "quiz"},
    {"id": "04-waiting-game",      "num": "4",  "tag": "Chapter Four",            "title": "The Waiting Game",                           "subtitle": "",                                "gate": "quiz"},
    {"id": "05-at-the-table",      "num": "5",  "tag": "Chapter Five",            "title": "At the Table",                               "subtitle": "",                                "gate": "quiz"},
    {"id": "06-flavor-factor",     "num": "6",  "tag": "Chapter Six",             "title": "The Flavor Factor",                          "subtitle": "",                                "gate": "quiz"},
    {"id": "07-mixups-mishaps",    "num": "7",  "tag": "Chapter Seven",           "title": "Mix-Ups and Mishaps",                         "subtitle": "",                                "gate": "quiz"},
    {"id": "08-material-advantage","num": "8",  "tag": "Chapter Eight",           "title": "Material Advantage",                          "subtitle": "",                                "gate": "quiz"},
    {"id": "09-in-hot-water",      "num": "9",  "tag": "Chapter Nine",            "title": "In Hot Water",                                "subtitle": "",                                "gate": "quiz"},
    {"id": "10-purification-by-fire","num":"10","tag": "Chapter Ten",             "title": "Purification by Fire",                        "subtitle": "",                                "gate": "quiz"},
    {"id": "11-modern-challenges", "num": "11", "tag": "Chapter Eleven",          "title": "Modern Challenges, Ancient Solutions",        "subtitle": "",                                "gate": "quiz"},
    {"id": "12-immersion-therapy", "num": "12", "tag": "Chapter Twelve",          "title": "Immersion Therapy",                           "subtitle": "",                                "gate": "quiz"},
    {"id": "13-gray-zone",         "num": "13", "tag": "Chapter Thirteen",        "title": "Navigating the Gray Zone",                    "subtitle": "",                                "gate": "quiz"},
    {"id": "14-cutting-edge",      "num": "14", "tag": "Chapter Fourteen",        "title": "The Cutting Edge of Kashrus",                 "subtitle": "",                                "gate": "quiz"},
    {"id": "15-blueprint",         "num": "15", "tag": "Chapter Fifteen",         "title": "Blueprint for Kosher Living",                 "subtitle": "",                                "gate": "quiz"},
    {"id": "16-ground-up",         "num": "16", "tag": "Chapter Sixteen",         "title": "From the Ground Up",                          "subtitle": "",                                "gate": "quiz"},
    {"id": "17-rising-occasion",   "num": "17", "tag": "Chapter Seventeen",       "title": "Rising to the Occasion",                      "subtitle": "",                                "gate": "quiz"},
    {"id": "18-lechayim",          "num": "18", "tag": "Chapter Eighteen",        "title": "Lechayim!",                                   "subtitle": "",                                "gate": "quiz"},
    {"id": "19-bread-together",    "num": "19", "tag": "Chapter Nineteen",        "title": "Bread That Brings Us Together",               "subtitle": "",                                "gate": "quiz"},
    {"id": "20-taste-tradition",   "num": "20", "tag": "Chapter Twenty",          "title": "The Taste of Tradition",                      "subtitle": "",                                "gate": "quiz"},
    {"id": "21-milk-matters",      "num": "21", "tag": "Chapter Twenty-One",      "title": "Milk Matters",                                "subtitle": "",                                "gate": "quiz"},
    {"id": "22-out-in-world",      "num": "22", "tag": "Chapter Twenty-Two",      "title": "Out in the World",                            "subtitle": "",                                "gate": "quiz"},
    {"id": "23-sealed-delivered",  "num": "23", "tag": "Chapter Twenty-Three",    "title": "Sealed and Delivered",                        "subtitle": "",                                "gate": "quiz"},
    {"id": "24-behind-label",      "num": "24", "tag": "Chapter Twenty-Four",     "title": "Behind the Label",                            "subtitle": "",                                "gate": "quiz"},
    {"id": "25-safety-first",      "num": "25", "tag": "Chapter Twenty-Five",     "title": "Safety First",                                "subtitle": "The Laws of Sakanah",             "gate": "quiz"},
]


def shell_for(L):
    """Build a structural shell for a lesson — no book content."""
    blocks = [
        {"t": "p",
         "text": "Content for this lesson has not yet been ingested from the book. "
                 "Run `python scripts/extract_book.py` (see scripts/README.md) to populate it. "
                 "Each lesson is rendered one idea per screen by the platform's stepper."}
    ]
    if L["gate"] == "acknowledge":
        gate = {
            "type": "acknowledge",
            "label": "Mark complete",
            "text": "When the content is ingested, this screen will introduce the lesson and let you continue.",
        }
    else:
        gate = {
            "type": "quiz",
            "pass": 0.75,
            "questions": [
                {
                    "q": "(Placeholder question — populate from the book's Chapter Assessment.)",
                    "options": ["A", "B", "C", "D"],
                    "correct": 0,
                }
            ],
        }
    return {
        "id": L["id"],
        "num": L["num"],
        "tag": L["tag"],
        "title": L["title"],
        "subtitle": L["subtitle"],
        "status": "draft",
        "blocks": blocks,
        "gate": gate,
        "notes": [],
    }


def main():
    LESSONS_DIR.mkdir(parents=True, exist_ok=True)
    overwrite = "--force" in sys.argv

    # Manifest
    manifest = [{
        "id": L["id"],
        "num": L["num"],
        "tag": L["tag"],
        "title": L["title"],
        "subtitle": L["subtitle"],
        "status": "draft",
    } for L in LESSONS]
    manifest_path = CONTENT / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"wrote {manifest_path.relative_to(ROOT)}")

    # Lesson shells
    created = 0
    skipped = 0
    for L in LESSONS:
        path = LESSONS_DIR / f"{L['id']}.json"
        if path.exists() and not overwrite:
            skipped += 1
            continue
        path.write_text(json.dumps(shell_for(L), indent=2, ensure_ascii=False), encoding="utf-8")
        created += 1
    print(f"shells: created {created}, skipped {skipped} (use --force to overwrite)")


if __name__ == "__main__":
    main()
