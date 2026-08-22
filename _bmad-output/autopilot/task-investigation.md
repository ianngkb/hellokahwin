# Task: Investigate 4 reported admin/inspire bugs (READ-ONLY)

You are a bug investigator working in this git worktree (the HelloKahwin Next.js app: App Router, Drizzle ORM + Supabase Postgres, Clerk auth, Cloudflare R2 media storage, content imported from a WordPress site). The live site is hellokahwin.com; the admin area is under /admin/inspire. A `.env.local` with real credentials is present in the worktree root.

Do READ-ONLY investigation (no code edits, no destructive commands). Root-cause these four user-reported issues:

## 1. Author attribution error on save
When saving an EXISTING article in the admin editor, the user gets the error "That author is not available for attribution." Find the exact error source (grep for the message), the validation logic behind it, and why an existing article's author would fail it (e.g., author list filtered to active/Clerk-linked users while imported WordPress articles reference legacy authors; case/id mismatch; author list not loaded). State the precise root cause with file:line references.

## 2. /admin/inspire/media is empty
The media library page shows nothing, but the site has existing media (imported from WordPress, stored in R2 and/or referenced in the DB). Trace the page → its data fetch → the DB table/queries → how imported media was recorded during the WordPress import. Determine whether it's a code bug (wrong query/filter/table), a data gap (import never wrote media rows), or an env issue. Check the import scripts under scripts/ for what they wrote. Read-only DB inspection using the configured DATABASE_URL is allowed (SELECT/count queries only) to confirm whether media rows exist.

## 3. Site structure shows no existing navigations
There is an admin "site structure" (or navigation) screen that should list the site's existing navigation menus/structure but shows none. Find that page, its data source, and why existing navigation isn't there (never seeded from the live site's actual nav? separate table empty? public site header nav defined in code while admin reads a DB table?). State root cause; read-only DB checks allowed.

## 4. Editor formatting functions (Bold, Italic, etc.)
Statically review the article editor component (likely TipTap/ProseMirror/Lexical or similar). List every toolbar function it offers, and check each is actually wired: extension/plugin registered, command bound to the button, output rendered/sanitized on the public side. Flag any that are visibly broken in code (missing extension, dead handler, stripped on save/render). This will also be verified live later — your job is the code-level audit.

## Deliverable
For each issue record: Symptom, Root cause (with file:line evidence), Confidence (high/medium/low), Proposed fix, Files to touch, and whether the fix needs data/backfill work (e.g., a script to register imported media or seed navigation) rather than pure code changes.

Write the full findings to `_bmad-output/autopilot/investigation-inspire-fixes.md` in this worktree. That file is your completion artifact — the run is not done until it exists. Never paste secrets from .env.local into the report. End your session's final message with a compact summary of the four root causes plus anything that blocks a fix (missing env, needs live DB check, ambiguity needing a product decision).
