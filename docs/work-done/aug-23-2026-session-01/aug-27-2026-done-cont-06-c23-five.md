# Work done — CONT-06: C2.3 Gubahan & dulang hantaran, cluster completed 8/8

**Item:** Sprint 02, CONT-06. Brief:
`docs/plans/aug-23-2026-session-01/aug-26-2026-brief-cont-06.md`
**Writer:** writer-inspirasi-vendor-venue
**Dates:** drafted and reviewed 26 Aug 2026; ingested to production 26 Aug 2026
17:24–17:27 UTC; verified and closed 27 Aug 2026.

**How this item actually ran:** one session took the five articles through
drafting, the Editorial Review Board, `/humanizer`, the asset register and the
production ingest, then died on an auth failure before committing the ingest
write-backs, the undo record, this log, or any verification. A second session
resumed from git + production state, verified everything from the outside, and
closed the item. Nothing was re-ingested.

---

## Per-article: CLAIM + EVIDENCE + LIVE LINK

Verification commands were run 27 Aug 2026 from outside the site
infrastructure (plain `curl` against production).

### A4 — Gubahan hantaran simple

- **CLAIM:** live on production, 200 on first request, in the sitemap, DB row exists.
- **EVIDENCE:** `curl -s -o /dev/null -w "%{http_code}"` on first request →
  `gubahan-hantaran-simple -> 200`. Sitemap:
  `<loc>https://hellokahwin.com/artikel/hantaran-mas-kahwin/gubahan-hantaran-simple</loc>`.
  Production row `a4f8800a-c62c-461c-98ee-c8a8d9002fce`, `status: published`,
  `published_at: 2026-08-26T17:25:29.285Z`, 8 media rows, 2 category links.
- **LIVE LINK:** https://hellokahwin.com/artikel/hantaran-mas-kahwin/gubahan-hantaran-simple

### A5 — Hantaran tema warna

- **CLAIM:** live, 200 on first request, in the sitemap, DB row exists.
- **EVIDENCE:** first request → `hantaran-tema-warna -> 200`. Sitemap entry
  present. Row `7a4e6c59-36b8-41e6-b438-ec618a2d3f86`, `published`,
  `published_at: 2026-08-26T17:26:05.658Z`, 4 media rows.
- **LIVE LINK:** https://hellokahwin.com/artikel/hantaran-mas-kahwin/hantaran-tema-warna

### A6 — Hantaran coklat

- **CLAIM:** live, 200 on first request, in the sitemap, DB row exists.
- **EVIDENCE:** first request → `hantaran-coklat -> 200`. Sitemap entry present.
  Row `147cbfb2-0de5-483b-ae9c-027606424591`, `published`,
  `published_at: 2026-08-26T17:26:49.696Z`, 3 media rows.
- **LIVE LINK:** https://hellokahwin.com/artikel/hantaran-mas-kahwin/hantaran-coklat

### A7 — Hidden hantaran

- **CLAIM:** live, 200 on first request, in the sitemap, DB row exists, og:image
  set, visible image credits render.
- **EVIDENCE:** first request → `hidden-hantaran -> 200`. Sitemap entry present.
  Row `44118ddc-6aa7-492d-833c-dce7d52723a7`, `published`,
  `published_at: 2026-08-26T17:27:24.884Z`, 4 media rows. Live HTML carries
  `<meta property="og:image" content="https://images.hellokahwin.com/inspire/hidden-hantaran/...crop-16x9-og.webp...">`
  and visible credit lines, e.g. `Kredit: mohd hasan / Pexels`,
  `Kredit: MyLifeStory (CC BY 2.0)`.
- **LIVE LINK:** https://hellokahwin.com/artikel/hantaran-mas-kahwin/hidden-hantaran

### A8 — Hantaran: tempah atau buat sendiri

- **CLAIM:** live, 200 on first request, in the sitemap, DB row exists.
- **EVIDENCE:** first request → `hantaran-tempah-atau-buat-sendiri -> 200`.
  Sitemap entry present. Row `c348bb71-6aef-4d70-a38e-ed2263f0135a`,
  `published`, `published_at: 2026-08-26T17:24:59.361Z`, 8 media rows.
- **LIVE LINK:** https://hellokahwin.com/artikel/hantaran-mas-kahwin/hantaran-tempah-atau-buat-sendiri

---

## Cluster: CLAIM + EVIDENCE + LIVE LINK

- **CLAIM:** C2.3 is complete at 8/8, all eight 200 on first request, the pillar
  page shows all eight, and the cluster is cross-linked in both directions.
- **EVIDENCE:**
  - All eight first-request codes, literal output:
    ```
    dulang-hantaran -> 200
    gubahan-hantaran -> 200
    sirih-junjung -> 200
    gubahan-hantaran-simple -> 200
    hantaran-tema-warna -> 200
    hantaran-coklat -> 200
    hidden-hantaran -> 200
    hantaran-tempah-atau-buat-sendiri -> 200
    pillar hantaran-mas-kahwin -> 200
    ```
  - Pillar page HTML greps: each of the eight slugs appears exactly once as a
    card link (`... on pillar: 1` for all eight).
  - Forward cross-links: each of the five new articles links to all seven
    cluster siblings (body `internalLinks` plus the related-articles module),
    literal check output `links to: <seven siblings>` for each.
  - Reverse cross-links: all three Sprint 01 articles link to all five new ones
    through the related-articles module, which renders cluster siblings from the
    category. First fetch of two of them returned a stale cached render without
    the links; a re-fetch minutes later showed all five on each. Their DB rows
    were untouched by this run (`updated_at` 25–26 Aug, all before the 17:24
    ingest window).
- **LIVE LINK:** https://hellokahwin.com/artikel/hantaran-mas-kahwin

---

## Repo records

- Drafts + review board + humanizer: commit `3998f76`. Asset register rows
  HK-P-0077..0082: commit `7f24c4d`. (Both by the first session.)
- `publishedAt` write-backs from the ingest, verified identical to production
  `published_at` to the millisecond: commit `b2799e6`.
- Undo record, reconstructed from production after the fact and labeled as such:
  `docs/work-done/aug-23-2026-session-01/aug-26-2026-undo-cont-06-c23-five/UNDO.md`,
  commit `db64a57`. **Deviation from the standing rule:** the rule is undo
  committed BEFORE the write; the first session wrote to production and died
  before committing anything. The reconstruction is exact (ids, timestamps and
  row counts read from production), but the window in which a session death
  could have left an undocumented production write is precisely what the rule
  exists to close. See retrospective.

## What cannot be verified from outside

- That the Editorial Review Board and `/humanizer` passes happened as described
  is attested only by commit `3998f76` and its message; the session that ran
  them died. The commit diff shows board-shaped revisions, which is evidence of
  the edit, not of the room.
- "200 on FIRST request" was measured 27 Aug, the day after ingest. The genuinely
  first-ever requests were the prior session's `--revalidate-url` warmup; those
  logs died with it. What is verifiable — and quoted above — is that a cold
  external client's first request returns 200 today.
