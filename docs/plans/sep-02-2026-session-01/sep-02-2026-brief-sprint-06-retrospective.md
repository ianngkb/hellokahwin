# Sprint 06 retrospective — convene the seats, and disagree with the CEO

**You are chairing the Sprint 06 retrospective.** Sprint 06 closed 55/55 points, 11/11 items.
The owner has rejected the CEO's first attempt as not a proper retrospective, because the CEO
read the seats' written retros and synthesised them alone. **A synthesis is not a
retrospective. The value of a retrospective is the collision, and there was none.**

Your job is to run the real one and to make it adversarial toward the CEO's account.

## Integration branch

You are in the **DOCS space**. Everything you write merges to **`feat/command-centre-dashboard`**.
Do not open a PR into `master`. Do not touch site source.

## Review is done by Claude — owner directive, 02 Sept 2026

Verbatim: *"also ensure code review is done by claude not openAI."* **Do NOT dispatch
`codex-reviewer` or route anything through an OpenAI-backed path.** State in your log which
reviewer you used.

## Step 1 — read the primary sources, all of them

Eleven items, thirteen logs. Every one has a `## Retrospective` section and they are the best
material in the sprint. Read them in full, not in summary:

- docs line `feat/command-centre-dashboard`, under `docs/work-done/sep-02-2026-session-01/`:
  `sep-02-2026-done-cont-17-doa-pillar.md`, `...-cont-18-nikah-undang-undang.md`,
  `...-copy-01-empty-cluster-copy.md`, `...-des-15-h2-weight.md`,
  `...-seo-14-serp-shape-census.md`, `...-ui-16-article-cover.md`, `...-ui-20-favicon-monogram.md`
- site line `master`, same directory: `...-cont-15-cover-intrinsics.md`,
  `...-cont-15-portrait-covers.md`, `...-plat-16-degraded-render-not-cached.md`,
  `...-ui-15-grid-thumbnail.md`, `...-ui-19-rail.md`, `...-ui-20-favicon-monogram.md`

Then read what you are auditing:

- **`docs/boardroom/meetings/2026-09-02-sprint-06-retrospective.md`** — the CEO's rejected first pass.
- **`docs/boardroom/decision-log.md`**, decisions **186–208**.

## Step 2 — convene the seats. Let them disagree.

Run `/bmad-party-mode` with an inline cast of the seats that actually did the work:
`design-systems-engineer`, `managing-editor`, `writer-adat-agama-prosedur`,
`writer-inspirasi-vendor-venue`, `head-of-seo-content`, `creative-director`.

**Do not let them agree politely.** Specific collisions to put in front of them:

1. **CONT-15 and UI-16 shipped opposite correct answers on the same pixel.** Both measured
   production, both were right by their own DoD. Put them against each other on: whose
   framing should govern an article cover, and what would have made the collision visible
   *before* a merge rather than after.
2. **The CEO claims the sprint has ONE finding — "an instrument reports success about
   something it is not looking at" — reached by seven seats independently.** Challenge it.
   Is that a real convergence or is it the CEO collapsing six different failures into one
   sentence because it reads well? At least one seat should argue it is over-fitted.
3. **`SEO-14` corrected two of the CEO's own numbers** (decisions 187 and 171). Ask whether
   the board's numbers should be reproducible-by-command before they can gate an item, and
   what that would cost.
4. **`CONT-17` nearly shipped a religious restriction nobody issued.** Ask the editorial
   seats whether the existing gates could ever have caught a scope error, and if not, what
   does.

## Step 3 — the five questions, answered by the room and not by the chair

1. What did we learn that is not already written down?
2. **Which document must change, and who owns the edit? NAME THE FILE.**
3. What did we do twice that we should never do again?
4. What did we nearly ship, and what caught it?
5. What did the SPRINT PROCESS itself get wrong?

## Step 4 — ⚠ THE QUESTION THE OWNER ACTUALLY ASKED, and it is the sharpest one

> *"Why are there so much deferred work?"*

Sprint 06 closed **55/55, a perfect number**. It also filed **eleven new backlog items, 43
points**, in a single night. The backlog now holds 25 items and 80 points.

**Interrogate whether 55/55 was bought by deferral.** The CEO has already conceded that at
least five were small enough to have simply been done — `UI-22` (the homepage is the only
page on the site with no `og:image`), `DES-20` (the logo still carries the retired magenta),
`COPY-02` (one number, 155 vs 160), `DES-21` (a spec paragraph), and `PLAT-21` (**still no CI
job running `pnpm lint` or `pnpm test`, and lint is red on `master` — named OPEN in two
consecutive sprints and filed rather than taken a third time**).

Answer, with the evidence in front of you:

- **How much of the backlog is genuine next-sprint work, and how much is this sprint's
  unfinished business wearing a DoD?** Go item by item. Name each one.
- **Is "file it as a backlog item with a full DoD" functioning as rigour, or as a way to keep
  a velocity number clean?** The seats have standing to answer this; the CEO does not.
- **`PLAT-21` has now been deferred three times.** `UI-19` named it OPEN and correctly
  refused to absorb an infrastructure job into a design item — which is right by the DoD
  standard and still left it undone for a second sprint. **So what is the mechanism that
  makes an unowned cross-cutting item actually get taken?** A rule that says "do not absorb
  it" needs a matching rule that says who picks it up. Propose one, concretely.
- **Recommend which backlog items should be pulled into Sprint 07 and which are genuinely
  deferrable**, with a reason per item.

## Step 5 — write it

Rewrite **`docs/boardroom/meetings/2026-09-02-sprint-06-retrospective.md`** in place. Keep
what survives scrutiny, cut what does not, and **record the disagreements as disagreements** —
where two seats did not converge, print both positions rather than a merged one.

Add a section **"Where the CEO's account was wrong"** listing every correction the room made
to the CEO's first pass, and a section answering the deferral question above.

Then write the machine-readable retro:

```
pnpm --silent sprint retro 6 --file ~/Documents/Code/hellokahwin/hellokahwin/docs/sprints/sprint-06-retro.json
```

with `held_at`, `velocity` (quote `sprint velocity 6`, do not type a number), `sizing_accuracy`,
`learnings[]` each with `finding` / `file_changed` / `why`, `process_findings`, and
`carried_forward[]` with a reason per item.

**Do NOT close the sprint.** `sprint state 6 done` is the owner's call via `/endsprint`, and it
is a one-way door. Do not run `/endsprint`.

## Standing rules that apply to you

- **Prose rules do not fire. Gates and scripts do.** A retro that names a document and does
  not change it has failed. Make the edits you own; name the owner for the ones you do not.
- **A persona edit made inside a worktree reaches NOTHING** — `.claude/agents/` is gitignored.
  Persona edits go to `~/Documents/Code/buddy/skillcentral/agents/projects/hellokahwin/`.
- **Quote, do not paraphrase into agreement.** If a seat's finding contradicts the CEO, the
  evidence wins and the file gets corrected at source.
- Commit and push to `feat/command-centre-dashboard`. A file on one machine is not a deliverable.

When you finish, print your completion sentinel as the FIRST THING ON A LINE: the word `ITEM`,
a space, `EXIT:`, a space, then your exit code.
