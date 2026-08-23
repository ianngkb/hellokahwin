# Your task — HelloKahwin pillar pages, ingest path, single-hop redirects

You are the dev worker for this run. Implement the spec, in full, in this worktree.

**Read first, completely:**
`_bmad-output/autopilot/spec-pillars-ingest-redirects.md`

That spec is the plan. It was written from a live read of this codebase and a
live read of the production site and database — the facts table in §0 is
observed, not assumed. Follow it. If you believe part of it is wrong, say so in
your report rather than silently doing something else.

## Non-negotiables

1. **NO PRODUCTION DEPLOY. NO PRODUCTION DATABASE WRITE.** Do not push to
   `master`. Do not run any script against Supabase. Do not run
   `drizzle-kit push`/`migrate` against anything but the local database below.
   The `.env` file in this worktree holds production credentials — it exists
   only so `.env.local` can override it. Never print, echo, log, or commit a
   credential, and never paste one into a file you create.
2. **A local Postgres is already running and already holds a full mirror of
   production content** (24 categories, 29 articles, 623 media rows, 65
   article-category links). It is at
   `postgresql://postgres:postgres@127.0.0.1:5433/hklocal`, already wired via
   `.env.local`, which Next and the scripts pick up automatically and which
   overrides `.env`. Use it for everything. If it stops answering, restart it:
   `wsl -d Ubuntu -u root -e bash -lc "pg_ctlcluster 16 main start"`
   and keep a WSL session alive (the distro shuts down when idle).
3. **Verify with real runs.** Every claim in your report must name the command
   you ran and what it printed. Do not report a number you did not observe. If
   you could not run something, say you could not run it.
4. **Extend, never rebuild, the image pipeline.** `generateVariants` in
   `src/lib/storage/image-variants.ts` and the smart-crop generator already run
   in production against the `hellokahwin-images` R2 bucket under the
   `inspire/<slug>/…` prefix. Ingest calls them. Do not write a second uploader
   and do not attempt any Cloudflare admin API call — that token is known
   invalid and the brief says stop and report rather than work around it.
5. **Never change a URL that currently ranks.** Nothing in the spec does; keep
   it that way. The one deliberate behavioural change is the `noindex` narrowing
   in §A6 — implement it exactly as written and call it out in your report.

## Order of work

Do them in this order; each is independently committable.

1. **Chunk C (redirects)** — smallest, highest confidence, and it unblocks a
   clean verification loop early.
2. **Chunk A (pillars + sitemap)** — the gate. This is the priority item.
3. **Chunk B (ingest)** — largest.

Commit after each chunk with a clear message. Local commits only.

## The verification gate (spec §4, V1–V10)

Run all ten. V4, V5, V6, V7, V8 and V9 need the local database and a real
server — `pnpm build` then `pnpm start`, then curl the actual URLs. V5 must
count redirect hops, not assume them: use `curl -sIL` and count the 3xx lines.

Two of these checks exist because the obvious implementation gets them wrong:

- **V9** — the brief says "add the four missing category hubs to the sitemap".
  Four is wrong; there are six (the audit missed `minimalis-mewah` and
  `pantai-santai`). And all six currently emit `noindex`, so adding them to the
  sitemap without also fixing the noindex rule would make the site's SEO worse,
  not better. Both halves ship together or neither does.
- **V8** — the image-credit refusal is an owner-level requirement. It must be a
  hard refusal with nothing written, covered by a test.

## When you are done

Write `_bmad-output/autopilot/dev-result.md` containing:

- What you built, per chunk.
- **The exact command and the exact output** for each of V1–V10.
- Anything in the spec you did not do, and why.
- Anything you found that the spec got wrong.

That file is your completion signal. An unreported result does not exist —
if you finish and do not write it, the work does not count as done.
