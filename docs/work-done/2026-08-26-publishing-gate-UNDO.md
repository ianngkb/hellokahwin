# UNDO — RISK-06 + RISK-04, the publishing gate (26 Aug 2026)

Written BEFORE the production deploy, per the sprint rule. There is a recovery
point (RISK-01), but a targeted undo is cheaper than a restore.

## What this work changes, and what it does NOT

**It writes NOTHING to the production database.** No article row, no media row,
no category or tag link. Every ingest run made while building this landed in the
LOCAL database (`127.0.0.1:5433/hklocal`), and that row was removed afterwards —
the local database is back at the 30 articles it held before.

So there is no data undo. There are exactly three reversible things and one
irreversible-but-harmless one.

---

## 1. The production deployment  ← the only thing with a blast radius

The change is two `Cache-Control` values in `next.config.ts`. Rolling it back is
a redeploy of the deployment that is live right now.

**The rollback target, captured 26 Aug 2026 13:4x MYT, before anything shipped:**

```
sha              97b08377266d891f5af9f824027423d39dc1d935
                 ("docs(cache): put the three cache traps where someone reaches
                   before writing purge code")
deployed         2026-08-26T00:59:05Z
deployment URL   https://hellokahwin-gcfxzl0df-thewednotebook.vercel.app
```

To roll back:

```powershell
# Promote the previous production deployment back. Token from the vault; never
# on a command line of its own.
vault.ps1 run vercel.twn -EnvVar VERCEL_TOKEN -Cmd pwsh,"-NoProfile","-Command",
  'npx vercel promote https://hellokahwin-gcfxzl0df-thewednotebook.vercel.app --scope thewednotebook --token $env:VERCEL_TOKEN'
```

Verify the rollback took by reading the header back — the whole change is
visible from outside, which is the good part:

```bash
curl -sI https://hellokahwin.com/artikel/majlis-perkahwinan/dewan-kahwin | grep -i cache-control
# rolled BACK  ->  s-maxage=600, stale-while-revalidate=31535400
# rolled FORWARD -> s-maxage=600, stale-while-revalidate=3000
```

**Caveat, stated because it is the thing that would confuse whoever does this:**
a rollback does NOT lengthen cache entries that were written while the cap was
live. Those entries carry the capped header already and simply expire sooner.
There is no cleanup and nothing to repair — rolling back only changes what NEW
responses advertise.

## 2. The code

```bash
git revert --no-commit <sha of "cap the stale window and make publishing reach Google">
git commit -m "revert(seo): back out the publishing gate"
```

Reverting brings back a one-year `stale-while-revalidate`, an ingest that does
not tell Google, and an `updated_at` that moves on every re-ingest whether or
not anything changed. Nothing else in the tree depends on any of the three, so
the revert is clean.

## 3. The `updated_at` predicate

If the change predicate on the `articles` upsert turns out to be wrong — an
ingest that genuinely changed something and did not move `lastmod` — the
one-line restoration of the previous behaviour is, inside the `on conflict do
update set` block in `scripts/ingest-article.mts`:

```sql
-- replace the whole `updated_at = case … end` with:
updated_at = now()
```

That reverts to bumping `lastmod` on every ingest. It is less truthful, but it
is the behaviour of every article currently in the sitemap, so it is safe.

To repair an individual article whose `lastmod` should have moved and did not:

```sql
-- Production. Names the article explicitly; no bulk form on purpose.
update articles set updated_at = now() where slug = '<slug>' and status = 'published';
```

Then purge and resubmit so the sitemap and Google both see it:

```powershell
vault.ps1 run vercel.twn -EnvVar VERCEL_TOKEN -Cmd pwsh,"-NoProfile","-Command",
  'npx tsx <the ingest command for that article>'
```

## 4. The GSC sitemap submissions — NOT reversible, and that is fine

Three submissions of `https://hellokahwin.com/sitemap.xml` were made to the
`https://hellokahwin.com/` property while building and proving this (13:25,
13:33, and the deploy verification). A submission asks Google to re-read a file
it already has and is public; it adds no URL, removes none, and changes nothing
on the site. Search Console records `last_submitted` / `last_downloaded`, both
of which are already historical facts and neither of which has a delete.

There is a `DELETE .../sitemaps/{feedpath}` in the API. **Do not use it here.**
It removes the sitemap from the property entirely, which is a real regression —
it would un-tell Google about all 78 URLs to undo an action that harmed nothing.

## What is deliberately NOT undoable

Nothing else. No migration, no schema change, no destructive operation, no
production row touched.
