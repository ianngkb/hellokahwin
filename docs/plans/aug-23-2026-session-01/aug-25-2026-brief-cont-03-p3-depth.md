# Brief — Writer (Adat, Agama & Prosedur) — CONT-03: two more articles for P3

**Status:** APPROVED — executing. Sprint 01, item CONT-03, 2 points.
**Dispatch with `-PermissionMode bypassPermissions`.**

## Write now. Publishing is gated on RISK-01.

Full workflow to Stage 9 — everything except the ingest. RISK-01 (a production
recovery point) is open and nothing writes to production until it closes.

**You may also be running SEO-03 in another session.** Different files, no
overlap: that one edits a legacy `kursus-kahwin` draft, this one creates two new
P3 drafts. If you find yourself touching the same file in both, stop and tell me.

---

## Why P3

`ucapan-doa` is our thinnest pillar — three articles, averaging 1.3 images each.
Every other pillar has more depth or more traction. Two more articles is the
cheapest way to stop it being the weak leg of the architecture.

## Definition of done — verbatim from the sprint file

> Two URLs under `/artikel/ucapan-doa/` each return 200 on FIRST request; each
> renders a credit line quoted from live HTML; the pillar's article count rises
> from 3 to 5 in the sitemap. Plus the Stage 9 retrospective.

Publishing is mine to release. Your side of it is **two drafts, board-cleared,
ready to ingest.**

## Topic choice is yours, with one steer

Take the mapped topics from
`docs/plans/aug-23-2026-session-01/aug-23-2026-clusters-launch-plan.md` for P3's
four clusters — ucapan pengantin baru, doa perkahwinan, ulang tahun and adab
tetamu, aturcara and pengacara majlis.

Worth knowing: **`ppsignature.com` earns most of its ~31,400 MY visits/month on
religious and procedural content** — `solat istikharah` alone is 7,148/mo. P3 is
adjacent to that territory. Pick where the data says we can actually rank, and
say why.

## The standard that makes P3 ours

**Separate `hukum` from `adat`.** Malay wedding content routinely presents custom
as religious requirement. Saying plainly when something is culture rather than
obligation — and when practice varies by state or family — is our differentiator
here, the same way "six of fourteen jurisdictions fix no minimum" was on C2.4.

**Arabic text, transliteration and translation must all be verified** against a
reliable published source. A wrong doa is worse than no doa. You already left out
a lafaz that only circulates on blogs and JAKIM Arabic carrying a reproduction
restriction — both were right calls. Keep making them.

## Format, all of which has bitten us this week

- Ingest-ready Markdown with real YAML front matter. Read
  `src/lib/inspire/article-file.ts` for the schema.
- **No `*[IMEJ N di sini]*` markers.** Ever.
- **Covers are licensed photographs of people.** No text cards anywhere, cover or
  in-article. Owner directive.
- One path spelling: `images/S-name.jpg`, no `./` prefix.
- Every image: real Malay alt text, a teaching caption, `credit` + `creditUrl` +
  `licensorName` + `licenseClass`, and a register entry. CC BY-NC and CC BY-ND
  both fail us.
- Aim for one supporting image per major H2 where it earns its place.
- Internal links must point at published articles — 28 are live; take targets
  from the live sitemap.

## Rules

- `/humanizer` on everything. Never fabricate a hadith, a source or an
  attribution.
- No production database writes in this brief.

## When done

Drafts into `docs/plans/aug-23-2026-session-01/drafts/`, log to
`docs/work-done/aug-23-2026-session-01/`, then a **`## Retrospective`** —
Stage 9, mandatory. Name the file that must change, and edit it.
