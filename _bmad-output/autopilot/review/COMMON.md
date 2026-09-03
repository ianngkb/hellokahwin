# Review context — HelloKahwin Ahrefs Phase 3.3 (image presets + R2 backfill)

Repo: hellokahwin-site. Worktree: `C:\Users\Ian Ng\orca\workspaces\hellokahwin\ahrefs-images`.
Branch: `ianngkb/ahrefs-images`, based on `master`.

Read the diff with:
    git diff master...HEAD
Read whole files where you need context. DO NOT modify anything — read only.

## The brief this implements
`C:\Users\Ian Ng\Documents\Code\tmp\2026-09-04-ahrefs-audit\hk-images-task.md`
and the common rules it names,
`C:\Users\Ian Ng\Documents\Code\tmp\2026-09-04-ahrefs-audit\phase23-common.md`.
Read BOTH.

## What the change does, in brief
Ahrefs flagged 39 oversized images. Two causes:
 1. Article body figures request the `high` variant (q80 @ 2400px) and paint it
    into a 680px box. `next.config.ts` sets `images.unoptimized = true`, so the
    stored file is what the browser downloads. 1,423,024 B measured live.
 2. Cover crops (`CROP_TARGETS`) are encoded at a bare q100 with no ceiling.

The change adds a `mid` preset (q72 @ 1400px, 350 KB ceiling), points the four
680px render sites at it, adds `CROP_CEILING` (300 KB) for cover crops, extracts
the quality ladder into `encodeUnderCeiling`, makes `getDefaultPresets` merge
over the defaults, and adds a production backfill script plus an audit script.

## Facts established against PRODUCTION (do not re-derive; you may challenge)
- `admin_settings` has ZERO `image_%` rows. Production runs `DEFAULT_PRESETS`.
- media: 1,087 rows; 1,074 carry `high`; 0 carry `mid`; 318 `high` over 350 KB.
- crops over the 300 KB ceiling: 309 of 408, across 102 articles.
- `images.hellokahwin.com` is Cloudflare-fronted, `cf-cache-status: HIT`,
  served `max-age=31536000, immutable`.
- `GEOMETRY_VERSION` is `sha1(JSON.stringify(CROP_TARGETS))` = `48c0b959` on
  production. Changing it re-cuts every cover through Rekognition (AWS cost,
  owner's decision). The change deliberately keeps the ceiling OUT of that array.
- The backfill has NOT yet been run. Nothing has been written to production.

## Output format — REQUIRED
Return ONLY a JSON object, no prose around it:
{
  "layer": "<your layer name>",
  "findings": [
    {"severity":"critical|major|minor","file":"<repo-relative path>","line":<int>,
     "title":"<one line>","description":"<what is wrong and why it matters>",
     "fix":"<the concrete change to make>"}
  ]
}
An empty `findings` array is a valid and welcome answer. Do not invent findings
to look thorough. Do not report style preferences. Report only defects that
would cause wrong behaviour, data loss, a broken page, or a violation of the
brief's stated acceptance criteria.
