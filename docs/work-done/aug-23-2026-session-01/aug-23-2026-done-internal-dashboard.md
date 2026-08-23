# The HelloKahwin Command Centre — internal tracking dashboard — 23 Aug 2026
**Session:** aug-23-2026-session-01 · **Owner:** full-stack-engineer · **Status:** completed
**Plan:** `docs/plans/aug-23-2026-session-01/aug-23-2026-brief-internal-dashboard.md`
**Built through:** /autopilot (plan → build → self-review → local ship). **Not deployed** — internal artifact, per the brief.

## What was done

Built the company's single pane of glass: one interactive HTML page, generated
on demand by a dependency-free Node program that reads the **real files** and
the **live Search Console API** every run. Nothing on the page is hand-copied.

All six required sections, plus four of the CEO's brainstorm priorities and two
cheap wins:

| # | Section | State |
|---|---|---|
| 1 | Timeline | Built — 73 events, filterable by type, owner, session and status |
| 2 | Decision tracker | Built — 19 decisions, evidence, predictions, live scoring |
| 3 | Plans | Built — status, revision history, supersedes, full markdown in place |
| 4 | Work done | Built — evidence pulled out; partial/abandoned shown as prominently as completed |
| 5 | People & org chart | Built — 7 personas, reporting tree, ownership, blocking authority, every `.md` readable in-page |
| 6 | Metrics | Built — live GSC, checkpoints from the approved plan, weekly article count |
| B1 | Cluster progress | Built — 7 pillars, 26 clusters, 204 topics, coverage per cluster |
| B2 | Content pipeline | Built — the eight stages as a board, with each article's real position |
| B5 | Blocked items | Built — derived from DRAFT statuses, follow-ups, held work and open actions |
| B9 | Approvals queue | Built — with waiting-days |
| B10 | Search across everything | Built — one box over every document, persona, decision and cluster |
| B11 | What changed since you last looked | Built — per-browser, by file modification time |

Not built, and deliberately: review-board outcomes (B3), the currency register
(B4), competitor tracker (B6), keyword rank movement (B7) and the
decision-quality scorecard (B8). B3 and B4 have no machine-readable source yet;
B6 and B7 would spend Ahrefs units on every regeneration, which needs a budget
decision from the board.

## Where it lives and how to regenerate it

- **Page:** `docs/dashboard/index.html` — open it directly in a browser.
- **Regenerate:** `npm run dashboard` (or `node scripts/dashboard/generate.mjs`).
  Add `--open` to open it, `--offline` to use the last saved metrics snapshot.
- **Preview on a phone or another machine:** `npm run dashboard:serve` →
  `http://127.0.0.1:3037`.
- **Code:** `scripts/dashboard/` — `generate.mjs` plus eleven small modules and
  two test files. Documented in `scripts/dashboard/README.md`.
- **Committed:** branch `feat/command-centre-dashboard`, nine commits `c04c641` → `741e7fd`. Local only — nothing pushed, see the risk below.
  The generated HTML is gitignored; the generator is the artifact.

## Evidence

**It reads what it claims to read.** One run reports its own source coverage:

```
read 52 documents from docs
read 7 personas from …/skillcentral/agents/projects/hellokahwin
parsed 19 decisions; outcome register NOT created yet
pulling Search Console for https://hellokahwin.com/ …
  37 clicks, 2226 impressions, position 20.4  (2026-07-26 → 2026-08-22)
cluster plan: 26 clusters, 204 topics, 0 live, 8 drafted
wrote docs\dashboard\index.html  (1496 KB)
```

**The metrics are live and measured, not remembered.** Pulled from the Search
Console API at generation time for `https://hellokahwin.com/`: **37 clicks,
2,226 impressions, CTR 1.66%, average position 20.4** over 2026-07-26 →
2026-08-22, with 179 days of daily history behind the charts. The founding
baseline in `ceo-memory.md` (32 / 2,163 / 1.48% / 20.6 over 2026-07-25 →
2026-08-21) is the same shape over a near-identical window, which is the
cross-check that the connection is real.

**The parsers were verified against the actual documents**, not against
examples: 26 clusters and 204 topics parsed from the cluster plan, matching the
totals that plan states; all 26 clusters resolved to a priority tier
(5 / 6 / 8 / 7 across tiers 1–4, matching the plan's own lists); 7 personas with
correct reporting lines and hire dates; 19 decisions with basis and prediction
split out.

**Automated checks — 176 across five files**, run with `npm run dashboard:test`:
- `md.test.mjs` — 13 checks on the markdown renderer (tables with alignment,
  code spans containing pipes, nested lists, blockquotes, fenced code escaping).
- `safety.test.mjs` — 41 checks pinning the first five fixes, plus date
  arithmetic across month/year/leap boundaries, status and stage derivation,
  and eleven malformed-markdown inputs.
- `gaps.test.mjs` — 50 checks, one per gap the reviewer reported, plus the
  cases that must keep working (Malay and English dates, plain APPROVED and
  COMPLETED, ten timed hostile inputs).
- `page.test.mjs` — 37 checks on the generated page: all eleven sections
  present, all 7 personas embedded, 26 cluster rows, 8 pipeline columns, charts
  drawn, balanced tags, no leaked credential material, no unresolved template
  holes, and — added after the second audit — that every search target (106),
  every changed-document row (59) and every in-page link resolves to a real
  element. All three currently report zero dead ends.

**Code review — the gate, in full.** Three verdicts, four fix-check rounds, and
twenty defects. The sequence matters more than the conclusion, because this
record has been wrong twice and the reasons are worth keeping.

| Stamp | Against | Result |
|---|---|---|
| 10:17 | `c04c641` build | `findings` — 0 critical, **6 major**, 10 minor |
| 10:34 | `da1fe41` | `findings` — 0 critical, **0 major**, 11 minor · 8 FIX_OK |
| 10:44 | `573b225` | `findings` — 2 closed, 9 still open |
| 10:54 | `c7a0250` | `findings` — 5 closed, 4 still open |
| 11:03 | `c210fbb` | `findings` — 2 closed, 2 still open, **with measurements** |
| 11:11 | `741e7fd` | `clean` — all 16 closed, but stamped with a malformed sha |
| 11:12 | `741e7fd` | **`clean`, re-stamped against the exact commit — gate closed** |

**The gate is closed.** The first clean stamp carried a malformed `sha` — 39
characters, sharing only `741e7fdc` with HEAD — which a ship gate verifying the
verdict against HEAD would have rejected. It was re-stamped on request with the
exact commit:

```
sha 741e7fdc9f08bf061a9de53cd468efc8e3693f59 · verdict "clean"
critical 0 · major 0 · minor 0 · all 16 findings closed
```

That matches HEAD exactly. The gate is formally closed, not merely clean on
substance.

**Twenty defects, fixed across five passes.** Two would have made this dashboard
lie in the flattering direction, which is the exact failure it exists to
prevent. Three were live in versions demonstrated to the owner.

*Security and robustness (`da1fe41`)* — `startsWith` path containment in the
preview server; unvetted `javascript:`/`data:` URLs becoming live links; a
backtracking table-delimiter regex; one `NaN` poisoning an entire chart scale;
ids reaching JS string literals inside `onclick` attributes.

*Navigation (`9249003`)* — the "what changed" feed navigated to a bare document
id while the page emitted `doc-<id>`, so **52 of its 59 rows scrolled nowhere**;
three search hits targeted anchors never rendered; person ids were normalised in
the handler but not the matching attribute — a gap created by the previous fix.

*Correctness (`573b225`)* — **`normaliseStatus` read "not yet approved" as
APPROVED**; **`parseStage` marked articles live on "nothing published, by
design"**, the literal phrase in the C2.4 record, which would have turned eight
held drafts into coverage; **Malay month names were not understood at all**, so
every draft dated "23 Ogos 2026" fell back to its file timestamp; impossible
dates rolled over instead of being rejected; neither Search Console call had a
deadline; symlink containment; an escaper missing `'` and backtick; nested lists
emitted as siblings rather than children.

*Status semantics (`d3be1c4`)* — the negation fix made the pillar-pages record
read DRAFT. Both available answers were wrong: COMPLETED oversells work that is
not live, DRAFT undersells work that is finished. **HELD** was added, and that
record now sits in the approvals queue where it belongs.

*Structural (`c7a0250`)* — **79 duplicated element ids**: the timeline and the
document disclosure both emitted `id="doc-<id>"`, so `getElementById` returned
whichever came first and half the navigation landed on the timeline row instead
of the document. Heading ids collided across embedded documents. **The approvals
queue was double-counting** — a bare "what i need" re-filed requests already
claimed by "what i need from the board", showing **27 open approvals when the
true number is 19**. Also: `barChart` NaN, a mid-run file deletion killing the
generator, unplaced articles silently vanishing, unbounded blockquote recursion.

*The last three (`c210fbb`, `741e7fd`)* — the search-result builder interpolated
its target into two attributes with **no escaping**; an earlier patch meant to
fix exactly that had aborted before writing, and the test added to prove it
checked the *feed's* attribute instead, so it passed regardless. `addDays` threw
a `RangeError` on a non-finite offset, taking the whole generator down. And the
two **quadratic regexes**, held open across three rounds while this engineer
insisted they were not reproducible.

**On that last one, for the record.** The reproduction needs a *run* of brackets
and a *run* of colons; the hostile-input corpus here used a single bracket
followed by 40,000 letters and found nothing. "No slow results" was read as "no
bug" rather than "wrong inputs". Once the reviewer supplied measurements, the
figures reproduced almost exactly — 3,000 brackets 2.32ms, 6,000 8.84ms, 12,000
35.3ms, 24,000 **136.7ms**.

**The reviewer was right on every contested point, and self-review was
structurally incapable of catching several of them** — most sharply the
duplicated ids, which a self-written test declared safe because *an* element
with that id existed. It was simply the wrong one.

**Verified in a browser**, not just asserted: rendered at
`http://127.0.0.1:3037`, screenshotted section by section. Global search
returns 40 matches for "mas kahwin"; the timeline owner filter narrows 73
events to 12; the Tier 1 chip narrows 26 clusters to 5. Console is clean on a
fresh load — no errors, no exceptions.

**No secret is exposed.** The Search Console credential is read from a path
(`GSC_SERVICE_ACCOUNT_PATH`, defaulting to the location in the `/tokens`
registry) and never printed, logged or embedded. Checked: the generated HTML
and the metrics snapshot contain no key material.

## What it changed

- The board can now see the whole company in one page — what was decided, on
  what evidence, what was predicted, what has been produced and by whom, and
  what is stuck — without opening a single file.
- **It immediately surfaced the most important fact in the company right now:**
  eight articles for cluster C2.4 are finished — reviewed, humanized, SEO-QC'd —
  and every one is stuck at stage 7 because the P2 pillar page is built but not
  deployed. That is one board approval standing between finished work and
  traffic, and it now has its own banner on the pipeline board.
- Coverage reads **0% live, 8 drafted**. That distinction is deliberate: a
  publish-ready draft is not coverage, and a dashboard that counted it as such
  would flatter the company by exactly the amount that matters.
- Predictions from the decision log are now tracked with due dates and measured
  against live traffic: 150 clicks by 2026-09-22, 500 by 2026-10-22, 1,500 by
  2026-11-21 — currently 37, 37 and 37.

## Risk raised to the board

**The company memory is wrong about the repo, in a dangerous direction.**
`ceo-memory.md` states "the live-site repo is NOT cloned on this machine." It
is. `~/Documents/Code/hellokahwin/hellokahwin` has `origin` pointing at
`github.com/ianngkb/hellokahwin` — the live site — and its local `master` is
**30 commits behind and 1 ahead** on the old migration-tool history. A force
push from this folder would destroy the live site's history. Nothing was pushed
in this run. This needs a correction in `ceo-memory.md` and a decision on
whether to re-clone cleanly.

**Secondary, and worth a decision:** the entire `docs/` tree — the boardroom,
every plan, every completion record — is **untracked in git**. The company's
whole decision record exists only on this machine's disk, with no history and no
backup.

## Follow-ups

| Item | Owner |
|---|---|
| Correct `ceo-memory.md` on the two-repo facts above | ceo-hellokahwin |
| Decide whether `docs/` should be version-controlled, and where | ceo-hellokahwin |
| Approve deploying the pillar pages so the 8 held articles can publish | Board |
| Create `docs/boardroom/prediction-outcomes.md` to start scoring predictions | ceo-hellokahwin |
| Decide whether the dashboard may fetch Ahrefs (competitor tracker, rank movement) and on what unit budget | Board |
| Board approval before the dashboard is exposed anywhere public | Board |
