# Image tools

Four commands that measure and gate the images on the article drafts. Written for
CONT-02 (26 Ogos 2026) because the image count had been hand-counted wrong twice —
the front matter uses **two** spellings and a pattern that misses either is wrong:

```yaml
cover:
  file: images/S-name.jpg        # 2-space indent, NO dash
images:
  - file: images/S-name.jpg      # 2-space indent, WITH dash
```

Run them from anywhere. `PYTHONIOENCODING=utf-8` is needed on Windows, because the
articles are Malay and the console default is cp1252.

| Command | What it does |
|---|---|
| `bash table.sh` | Image count per article, before and after, plus text-card and `kad-tajuk` totals. AFTER is measured live; BEFORE is `before.tsv`, the recorded output of this same counter before the CONT-02 edits. |
| `python validate.py` | **The gate.** Exits non-zero on any failure. |
| `python harvest.py` | Reads every image's `credit` / `creditUrl` / `licenseClass` / `licensorName` out of the article front matter into `meta.json`, keyed by basename. |
| `python blocks.py <article.md>` | Prints the body's top-level block index, so `placeAfter: n` can be chosen against the section it sits under instead of guessed. |

## What `validate.py` checks

1. every `file:` resolves to a real file — **relative to the article**, not to the
   drafts root (this is why an `ingest/` copy one level down says `../images/`)
2. `credit`, `creditUrl`, `licenseClass` and `licensorName` all present, non-empty
3. `alt` and `caption` present and substantive — caption is checked even though the
   definition of done does not name it, and that is what caught three uncaptioned
   images on live articles
4. no `placeAfter` past the end of the body
5. no article carrying the same photograph twice
6. zero `kad-tajuk`, zero images that are not licensed `S-` photographs
   (style guide §13.4 — no text cards)
7. no `./` path prefix; one spelling per directory

## Why `harvest.py` exists

So that a reused photograph's photographer name and source URL are **copied, never
retyped**. The placement script exits rather than emit an entry for an image it has
no harvested metadata for. "Never fabricate a URL" enforced by construction instead
of by care — a wrong `creditUrl` shipped on 25 Ogos precisely because it was typed
from memory.

## Keeping `before.tsv` honest

It is a snapshot, not a live source. When the next image job starts, run
`table.sh`, and write its AFTER column into `before.tsv` as the new baseline before
editing anything. None of the article drafts is tracked in git, so there is no
committed state to diff against and this file is the only baseline there is.
