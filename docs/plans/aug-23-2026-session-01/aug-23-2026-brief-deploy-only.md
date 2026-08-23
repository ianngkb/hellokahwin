# Brief — Full-Stack Engineer — DEPLOY ONLY

**From:** ceo-hellokahwin · **Date:** 23 Aug 2026
**Board status:** deploy **APPROVED**. The code is already written and
committed. This brief is the ship, nothing else.

---

## Why the last run failed, so you do not repeat it

The previous attempt was blocked by the permission system on **every** file
write into the site worktree — four attempts, two tools, all refused. **That
was my dispatch error, not a code problem:** I started the agent with its
working directory set to the docs repo
(`~/Documents/Code/hellokahwin/hellokahwin`) while the site code lives in the
worktree, so every write was outside the session's root.

**You are now started inside the worktree itself**, so writes land normally:

```
C:\Users\Ian Ng\orca\workspaces\hellokahwin-site\pillars-ingest-redirects
```

Branch `ianng89/pillars-ingest-redirects`, HEAD `7b8f5a7`, working tree clean.

## What is already done — do not rebuild any of it

| Work | State |
|---|---|
| Seven pillar pages + category hubs in sitemap | committed |
| Content-ingest path with mandatory image credit | committed |
| Single-hop redirect fix | committed |
| **AI authorship tag** — `article_authorship` + `article_review_status` enums, four columns on `articles`, `articles_review_queue_idx` | committed in `7b8f5a7` |

The migration in `7b8f5a7` is **hand-ordered deliberately**: drizzle-kit's
generated form emits `DEFAULT 'ai' NOT NULL` inside `ADD COLUMN`, which would
back-stamp all 29 legacy WordPress posts as AI-written. It instead creates the
types, adds nullable, backfills, then constrains. **Do not regenerate it.**

## Your job — ship it

1. **Local build gate.** Must pass before anything else.
2. **Back up production Supabase**, then apply the migration. This is the
   irreversible step; treat it as such.
3. **Deploy to Vercel production.**
4. **Verify against the LIVE site, not the build output:**
   - The seven pillar pages resolve — `curl -I https://hellokahwin.com/artikel/<pillar>` returns 200, not 404. Right now every one of them 404s; that is the before-state.
   - The four category hubs appear in the live sitemap.
   - The redirect chain is genuinely ONE hop — `curl -I` a legacy URL and count them. Two hops means it did not work.
   - The articles admin view shows the AI badge, the filters, and one-click mark-reviewed.
   - The 29 legacy posts are `human`, not `ai`. Check the actual rows.

**Do NOT publish the eight C2.4 articles.** They stay held; that is a separate
decision I will make once the pillars are verified live.

## Rules

- Ship through **/autopilot**.
- Credentials from the vault via `vault.ps1 run` — never hardcoded, never
  printed.
- **Report only what you observed.** "The build implies it works" is not
  verification; a `curl` output is.
- If the migration looks riskier than this brief anticipates, **stop and tell
  me**. Do not work around it.
- Prefer non-interactive flags. If you must ask me something, ask it as your
  final message, not mid-run — the last two runs stalled on prompts I could
  not answer from outside.

## When done

Log to `docs/work-done/aug-23-2026-session-01/` and report: what is live, the
literal verification output, the ship report location, and anything blocking
publication of the eight articles.
