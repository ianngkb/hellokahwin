# Brief — Full-Stack Engineer — AI Authorship Tag, then DEPLOY

**From:** ceo-hellokahwin · **Date:** 23 Aug 2026
**Board decision:** **APPROVED for production deploy**, with one addition
that ships in the same release.

> "approve and deploy it, please tag it as AI in the articles section so we
> can manually review it later"

Your branch `ianng89/pillars-ingest-redirects` (nine commits, pillar pages +
ingest path + single-hop redirects) is approved. **Do not deploy it yet** —
add the tag below first so the schema lands in one migration rather than two.

---

---

## ⚠ CEO AMENDMENT, 23 Aug 2026 — the review gate was mis-scoped. Read first.

A previous run of this brief stalled: the merged code review returned **20
major and 9 minor open findings** and, correctly following my instruction that
"clean means ZERO open findings", it refused to deploy. **I investigated the
findings myself and my instruction was wrong, not the agent.**

What I verified, by diffing `master...ianng89/pillars-ingest-redirects`:

- The findings sit in `scripts/wp-import.ts`, `scripts/backfill-media.ts`,
  `src/app/(admin)/admin/inspire/navigation/actions.ts`,
  `src/components/inspire/editor-toolbar.tsx`, `src/lib/authors/queries.ts`
  and `src/lib/inspire/content-media.ts`. **None of those files is in this
  branch's diff.** They arrived with the `inspire-fixes` workstream that was
  already on master when this branch was cut. We inherit them; we did not
  cause them.
- The single overlapping file is `src/components/inspire/article-renderer.tsx`,
  where this branch's *entire* change is extracting `safeHref` into
  `src/lib/utils/safe-href.ts` so the image-credit block shares one security
  guard. That is unrelated to findings 11, 14 and 15, which are pre-existing
  defects in that file.

**Therefore: zero of the findings are attributable to this diff.**

**The gate is now: ZERO open findings ATTRIBUTABLE TO THIS DIFF.** This branch
meets it. Proceed with the deploy.

**Also do this:** write the inherited findings to
`_bmad-output/autopilot/review/inherited-findings.md` as a clearly separate
workstream for me to schedule. Flag **finding #1 as critical** — `wp-import`
with `--clean` on a slug containing `%` or `_` lets SQL `LIKE` treat them as
wildcards and delete unrelated media rows. I want that fixed soon; I just will
not block pillar pages that never touch it.

**One operational note:** the previous run stalled on interactive prompts that
could not be answered from outside. Prefer non-interactive flags, and if you
must ask me something, ask it as your final message rather than mid-run.

---

## Task 1 — AI authorship tag (build this first)

Every article carries a record of how it was produced, so the owner can find
and manually review AI-produced content later.

**Schema.** Add to the article record:

- `authorship` — enum: `ai`, `ai_assisted`, `human`. Default `ai` for
  anything arriving through the agent pipeline. **Not nullable** — an article
  without an authorship value should be impossible, not merely discouraged.
- `review_status` — enum: `pending_review`, `reviewed`, `needs_changes`.
  Default `pending_review`. This is the field that makes the tag useful: the
  owner needs to know what they have *already* checked, not just what is AI.
- `reviewed_at` / `reviewed_by` — nullable, set when a human signs it off.

Pick names that match the existing Drizzle schema's conventions rather than
mine; the shape matters, the naming should fit the codebase.

**The articles section.** Surface it where the owner will actually use it:

- A clear **AI badge** on every article row in the articles list/admin view.
- **Filter by `authorship` and by `review_status`** — the primary workflow is
  "show me everything AI-produced that I have not reviewed yet".
- A way to mark an article **reviewed** from that view, stamping
  `reviewed_at`. One click; do not make the owner open a form.
- Sort so `pending_review` surfaces first.

**Scope of the tag.** This is **internal review tracking**, not a public
disclosure banner. Do not render it on the public article page. Build the
field so it *could* be surfaced publicly later if the board decides to, but
that is not this release.

**Backfill.** Every one of the eight C2.4 articles, and anything else the
agent pipeline has produced, lands as `authorship = ai` and
`review_status = pending_review`. The 29 legacy migrated posts are `human`
unless you have evidence otherwise — do not guess them into the AI bucket.

## Task 2 — Deploy

Once Task 1 is built and locally verified, ship the whole release through
`/autopilot`:

1. Local build gate passes.
2. Migration applied to production Supabase — **back up first**, and treat
   this as the irreversible step it is.
3. Deploy to Vercel production.
4. **Verify against the live site, not the build output:** the seven pillar
   pages resolve, the four category hubs are in the sitemap, the redirect
   chain is genuinely one hop (`curl -I` a legacy URL and count the hops),
   and the articles view shows the AI badge and filters.

**Do not publish the eight C2.4 articles in this release.** They are held at
stage 7 pending the pillar pages existing, which this release creates.
Publishing them is a separate decision I will make once the pillars are live
and verified.

## Rules

- Build through **/autopilot**, visible Orca terminal.
- Credentials from the vault (`vault.ps1 run`) — never hardcoded, never
  printed. R2 master keys are `r2.twn-master-keyid` / `r2.twn-master-secret`.
- **Verify with real requests against the live site.** Report what you
  actually observed, not what the build implies.
- If the production migration looks risky in a way this brief has not
  anticipated, **stop and tell me** rather than working around it.

## When done

Log to `docs/work-done/aug-23-2026-session-01/` and report: what is live, the
verification evidence, the ship report location, and anything that needs my
attention before the articles can publish.
