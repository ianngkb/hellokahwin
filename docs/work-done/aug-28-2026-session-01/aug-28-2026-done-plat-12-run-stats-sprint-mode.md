# PLAT-12 — the empty card was a wrong key and a crash, not missing data

**Sprint 03 · platform · 2pt · owner BMAD · 28 Aug 2026**
**Shipped:** buddy PR [#47](https://github.com/ianng89/buddy/pull/47), squash-merged to `main` as `11e40e6`.

## Claim

`run-stats.py` keys off a sprint now. Run against Sprint 02's real data it
produces a non-empty card: **7h 02m of working time across 3,674 steps**, three
phases, two sessions, 13 helper agents, 8 skill invocations. Sprint 01, also
never measured, reports 8h 27m across 8,237 steps.

## What was wrong

Carried forward once already and reported honestly as empty a second time. By
the retro's own rule, twice is the signal that the template is wrong rather than
the run. There were **two** causes and both were in our own files.

**1. The instruction passed a sprint number as a batch id.** `endsprint/SKILL.md`
Step 4b said:

```
python ~/.claude/skills/buildit/lib/run-stats.py --batch "<sprint-NN>" --repo-root "<repo>"
```

`--batch` filters `/buildit`'s ship-log for a matching `batch` field. `/buildit`
writes that file; `/startsprint` never calls `/buildit`; so a sprint has no entry
and `"sprint-02"` matched zero rows. The tool did exactly what it was told and
the answer was a blank card, twice. **A tool pointed at the wrong key does not
fail loudly — it succeeds at nothing.**

**2. `load_batch` crashed on the no-ship-log path.** Three early returns yielded
**four** values into a call site that unpacks **five**:

```python
return None, [], None, None          # x3
...
batch_id, branches, first_ts, prev_end, own_end = load_batch(repo_root, args.batch)
```

So the documented behaviour — *"a missing stats card must not take down a ship
report"*, "emitting empty card" — was never reached. It raised
`ValueError: not enough values to unpack (expected 5, got 4)` first, and
`/buildit` swallowed the traceback, so the failure mode read as "no data" when it
was "no run".

## What changed

`skillcentral/skills/buildit/lib/run-stats.py`:

- **The arity bug fixed.** All three returns are now 5-tuples, so the empty-card
  path is reachable — and it now names the likely cause: *"If you are measuring a
  SPRINT, it never wrote one — use `--sprint N` instead of `--batch`."*
- **`--sprint N`**, which reads the window from the tracker itself via the new
  `sprint velocity N --json`, not from a sprint file. The file is what was
  planned; the tracker is what happened, and PLAT-10 put the moved-out ledger
  only in the tracker. Screen-scraping the human output was the alternative and
  it breaks the first time a label moves.
- **KL dates converted properly.** `started_at` and `ended_at` are `date` columns
  holding Kuala Lumpur calendar days. `since` is 00:00 KL on the start day;
  `until` is **23:59:59 KL on the end day, not 00:00** — a sprint closed on the
  27th includes the work done on the 27th, and midnight would silently discard
  the final day, which is the day most of a sprint's shipping happens.
- **`--repo-root` is repeatable.** A sprint spans three working trees — buddy, the
  hellokahwin docs repo, and the site worktree agents are dispatched into — so
  passing one measures a third of the run. The old workaround ("run it once per
  repo and label each") double-counted any session whose cwd sat under two of
  them; one invocation de-duplicates by transcript path.
- **`--since` / `--until`** as the raw primitive underneath both modes.
- **The card states its own attribution.** With `--sprint` there is no branch
  list, so rows are matched by time window and working directory alone. That is
  genuinely weaker than a branch match and the card says so rather than
  presenting the two as the same thing.

`scripts/sprint.ts`: `sprint velocity N --json` emits the velocity plus
`plannedAt` / `startedAt` / `endedAt` / `departures` / `timezone`, with the dates
exactly as stored and no timezone applied — attaching one is what turns "the
sprint started on the 26th" into "the sprint started at 16:00 on the 25th".

`endsprint/SKILL.md` Step 4b item 7 rewritten: `--sprint N` not `--batch`, the
three repo roots spelled out, and a sanity gate — check `--format text` first,
and if the total is 0, **say so as a defect rather than pasting an empty card.**

**Also fixed while rendering the evidence:** model names were not HTML-escaped,
so the model `<synthetic>` was parsed as a tag and *silently dropped from the
rendered card*. A stats card that quietly loses a row of its own data is the same
class of defect as the empty card this work replaces.

## Evidence

`aug-28-2026-plat-12-EVIDENCE/`

**The crash, before** — the pre-fix tool against a repo with no ship-log, which
is the path every sprint takes:

```
Traceback (most recent call last):
  File "run-stats-BEFORE.py", line 539, in main
    batch_id, branches, first_ts, prev_end, own_end = load_batch(repo_root, args.batch)
ValueError: not enough values to unpack (expected 5, got 4)
OLD EXIT=1
```

Same repo, after: the empty card renders and stderr names the fix. `NEW EXIT=0`.

**Sprint 02, non-empty** (`sprint02-card.txt`, `sprint02-card.html`):

```
Sprint 02 — Close the publishing hole, then earn a click  active 7h 02m  elapsed 29h 31m
  window 2026-08-25T16:00:00+00:00 .. 2026-08-27T15:59:59+00:00
  branches: (none - matched by window and cwd)
  Building & conversation    6h 17m   <synthetic>,Fable 5,Opus 5  steps=3254  out=1.88M  think=688.7k
  Bmad Agent Dev            42m 50s   Opus 5                      steps= 368  out=356.0k think=134.6k
  Humanizer                  2m 56s   Opus 5                      steps=  52  out= 55.4k think= 12.1k
  TOTAL                      7h 02m                               steps=3674  out=2.29M  think=835.5k
sessions:
  main checkout          <synthetic>,Fable 5,Opus 5  steps=2000  out=1.81M
  main checkout helper   <synthetic>,Fable 5,Opus 5  steps=1674  out=476.0k
agents: managing-editor x4, writer-inspirasi-vendor-venue x3,
        editorial-verification-lead x3, head-of-seo-content x3
```

**Sprint 01, also never measured** (`sprint01-card.txt`): 8h 27m active, 8,237
steps, 3.15M written.

The rendered HTML card is `sprint02-card.html` — two `<div class="card">` blocks,
ready to splice into a sprint report. Escaping verified: zero unescaped
`<synthetic>`, four `&lt;synthetic&gt;`.

## Caveat, stated rather than buried

With `--sprint` the attribution is time window + working directory, because a
sprint has no branch list. Anything else running in those three trees during the
sprint's window is counted too. The card prints that sentence itself. It is a
weaker rule than the batch mode's branch match and the number should be read as
"effort in these trees during this sprint", not "effort provably caused by this
sprint's items".

## Live link

Local tooling, not a URL. On `origin/main` and live on this machine:

```
git cat-file -e origin/main:skillcentral/skills/buildit/lib/run-stats.py   # exists
python3 ~/.claude/skills/buildit/lib/run-stats.py --sprint 2 --format text \
  --repo-root ~/Documents/Code/buddy \
  --repo-root ~/Documents/Code/hellokahwin/hellokahwin
```

Source: <https://github.com/ianng89/buddy/blob/main/skillcentral/skills/buildit/lib/run-stats.py>

## Retrospective

**1. What did we learn that is not written down anywhere?**

**"Report it honestly as empty" is a diagnosis, and we kept accepting it as an
observation.** For two sprints the card was reported as empty and nobody asked
what "empty" meant. It meant two different bugs — a wrong key in our own
instructions and an unhandled crash — and either was a few minutes' work once
somebody ran the tool by hand instead of reading its output. An empty result
from a tool that cannot distinguish "no data" from "wrong question" is not a
finding; it is an unrun test.

The crash is the sharper half. `/buildit` swallowed a traceback, and a swallowed
traceback presented as an empty card is worse than a crash, because a crash gets
investigated.

**2. Which document must change, and who owns that edit?**

`skillcentral/skills/endsprint/SKILL.md`, Step 4b item 7 — owned by whoever runs
`/endsprint`, the owner. **Done in this change**, including the sanity gate that
turns "the total is 0" into a defect to fix rather than a card to paste.

The general form belongs there too and now does: **if a required artefact comes
out empty, that is a defect report, not a section.**

**3. What did we do twice that we should never repeat?**

Accepted an empty required artefact. Twice, exactly as the brief said. The rule
that catches the third occurrence is in Step 4b now, phrased as a refusal rather
than a preference.

**4. What did we nearly ship, and what caught it?**

An HTML card that silently drops its own data. The model label `<synthetic>`
went into the card unescaped and would have been parsed as a tag and disappeared
in the browser — the totals row would have disagreed with the visible rows and
nothing would have said why. What caught it was reading the generated HTML
before pasting it rather than trusting that a card that prints is a card that
renders. That is the same mistake as "a 200 carrying the right string is not
health", one level down.
