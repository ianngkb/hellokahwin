# Brief — BMAD — Publish the eight. Tonight.

**Status:** APPROVED — executing. CEO decision under standing autonomy, 24 Aug 2026.
**Dispatch with `-PermissionMode bypassPermissions`** in the site worktree.
**Production database CRUD is granted** — the owner granted it explicitly today.
Do not stop to ask for access.

---

## The situation, without decoration

Nothing new has published to hellokahwin.com all day. The live sitemap holds 39
URLs, every one of them from the 21 August WordPress migration. All seven
pillars serve `noindex` because nothing sits beneath them. The owner has asked
twice why, and the honest answer is that we kept solving adjacent problems.

**Both remaining blockers are now gone.** This brief is the last step.

## What already exists — verify each before using it

1. **The eight cover images are rendered.** I ran the generator myself:
   `pnpm --silent covers --out <dir>` from the site worktree produces all eight
   plus a contact sheet, in seconds, from the brand tokens in `globals.css`.
   Re-run it into the drafts directory rather than copying my throwaway output
   from `.tmp-covers/`.
2. **The eight articles are written and board-reviewed** —
   `docs/plans/aug-23-2026-session-01/drafts/A1..A8-*-REVIEWED.md` in the docs
   repo. The review board raised 27 blocks across them and every one was
   resolved. **This is the reviewed content; do not rewrite a sentence of it.**
3. **The alt text is written and board-approved** by the Managing Editor — see
   `docs/work-done/aug-23-2026-session-01/aug-24-2026-done-asset-register-and-graphic-kit-spec.md`.
   Use it verbatim. Do not invent alt text.

## The job

**Convert, ingest, publish.** The eight drafts are editorial deliverable
documents — an H1, a status paragraph, a `Deliverable header` markdown table,
an `## ARTICLE BODY` heading, an appendix. The ingest parser wants one Markdown
file with YAML front matter. **That format mismatch is the only thing left.**

For each of A1–A8:

1. **Transcribe the front matter from the deliverable header table** — title,
   slug, pillar, cluster, metaDescription, author. It is all already there. Read
   `src/lib/inspire/article-file.ts` for the exact schema.
2. **Body = everything under `## ARTICLE BODY`**, unchanged. Drop the appendix
   and the status paragraph. **The ten `*[IMEJ N di sini]*` markers are CUT** —
   the Managing Editor ruled on each one and nine of ten were a re-render of a
   table already on the page. A3 and A4 need a ten-minute prose edit where the
   marker carried a sentence; make it minimal and say what you changed.
3. **Attach the cover** with `credit: HelloKahwin`, `licenseClass: G`,
   `licensorName: HelloKahwin`, and the board-approved alt text.
4. **Ingest to production and publish.**

## The one trap that will bite you

**A1 collides with an article that already exists.** `mas-kahwin-ikut-negeri`
is a published article — live, ranking at position 11–14 on ~300 impressions.
A1 claims the identical slug and the parser will refuse it.

**A1 must UPDATE that article in place (`--update`), not create a second one.**
Same slug, same URL, better content. Publishing a second page on the same parent
topic would split the topic and abandon a real ranking signal. This also
re-parents it into P2 · C2.4, which is exactly what we want.

Everything else in the URL structure stays untouched. Article URLs are
`/artikel/{categorySlug}/{slug}` — confirmed at `sitemap.ts:101` — so do not
change any other article's parent in this run. That is a separate migration.

## Rules

- **Record a precise undo before writing** — the exact slugs you are about to
  create, and A1's before-state. Production has `pitr_enabled=false` and zero
  platform backups; a recovery point is being built separately and does not
  exist yet.
- `--revalidate-url` is mandatory against a non-local database. Use it.
- `pnpm --silent`, never `pnpm run`, for anything with a secret in argv — the
  runner's banner leaked the production password into a transcript today.
- Credentials from the vault. Never printed.
- **Wait five minutes after publishing before inviting any crawl.** The Vercel
  edge holds pillar pages up to 300s and the ingest-time purge is not built yet.

## Prove it

After publishing, report the literal output for:

- each of the eight article URLs — status code, **first request**;
- `/artikel/hantaran-mas-kahwin` — status, and whether `noindex` is **gone**;
- `sitemap.xml` — the URL count, which should rise from 39;
- A1's URL unchanged, and its content updated.

The pillar dropping `noindex` is the outcome that matters. That is the entire
cluster architecture becoming visible for the first time.

## When done

Log to `docs/work-done/` and report the proof above, what you changed in A3 and
A4, and anything that refused.
