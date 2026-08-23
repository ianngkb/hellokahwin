# Brief — Full-Stack Engineer — Pillar Pages, Ingest Path & R2

**From:** ceo-hellokahwin · **Date:** 23 Aug 2026
**Priority:** HIGHEST — **this work gates article one.** No article can
publish without an inbound editorial link from its pillar, so until the
pillar pages exist the writers' output has nowhere to land.

**Build through `/autopilot`** — owner directive. Plan, build, self-review,
ship. Take this as a separate autopilot run from the dashboard work.

---

## What I have already verified for you (do not re-investigate)

**R2 is working. There is no need to create a bucket.**

- Bucket **`hellokahwin-images` already exists** in the TWN Cloudflare account
  `249af9c6ea41ab1c7cd049f2adf80eb2`, and the vault keys
  `r2.twn-rw-keyid` / `r2.twn-rw-secret` have **confirmed READ and WRITE**
  (put + delete probed 23 Aug 2026).
- A **derivative pipeline already runs** in that bucket. Each original yields
  `high.webp`, `low.webp` and named crops: `crop-16x9-og`,
  `crop-4.3x1-desktop-hero`, `crop-4x3-article-card`, `crop-4x5-mobile-cover`.
  Content sits under an `inspire/` prefix. **Extend this; do not rebuild it.**
  Find how it is generated in the live repo before writing anything new.
- The R2 keys are **bucket-scoped**: account-level `ListBuckets` and
  `CreateBucket` return AccessDenied by design. Probe a bucket by name.
- ⚠ Vault `cloudflare.twn` (the Cloudflare **API** token) is **INVALID** —
  `1000: Invalid API Token`. R2 admin operations (bucket creation, CORS,
  lifecycle rules) are unreachable until the owner reissues it. Object
  operations are unaffected, so this does not block you. **If you hit a task
  that genuinely needs the admin API, stop and tell me rather than working
  around it.**
- Credentials come from the vault via
  `skillcentral/skills/tokens/vault.ps1 run <key> -EnvVar <NAME> -- <cmd>`.
  Nest two calls for the key pair. **Never hardcode or print a credential.**

## Task 0 — Clone the live repo

`ianngkb/hellokahwin` is not on this machine. Clone it. Remember the two-repo
trap: the local `~/Documents/Code/hellokahwin/hellokahwin` folder is the old
Electron migration tool and the company's `docs/` tree — **not** the site.

## Task 1 — The seven pillar pages (the gate)

Build pillar pages at `/artikel/<pillar>` for the seven approved pillars, and
add the four missing category hubs to the sitemap. The pillar set is in
`docs/plans/aug-23-2026-session-01/aug-23-2026-clusters-launch-plan.md`:

1. Nikah & Undang-undang
2. Hantaran & Mas Kahwin
3. Ucapan, Doa & Adab Majlis
4. Busana & Penampilan Pengantin
5. Pelamin, Kad & Cenderahati Majlis
6. Venue, Kos & Perancangan
7. Sebelum Nikah: Jodoh, Merisik & Tunang

Each pillar page must link **down** to every cluster article beneath it and
accept links **back up** — the architecture is bidirectional, with the
pillar's Malay entity phrase as anchor text. Build it so adding an article to
a cluster wires the links automatically; hand-maintaining a link graph across
204 articles will not survive contact with the cadence.

## Task 2 — The content-ingest path

How a board-approved article file becomes a live page row in Supabase:
slug, meta description, category and cluster assignment, internal links,
media references and **image credits** (see below). Make publishing boring
and repeatable — the editorial team is about to produce 6–7 pieces a week and
currently has nowhere to put them.

**Owner-level requirement: every image carries a credit to its original
source** — photographer, studio, vendor or venue — stored with the asset and
rendered on the page. The company approaches image owners for permission, and
the credit is both the courtesy that earns it and the record that makes the
owner findable later. **The schema must have a field for it, and the ingest
path must refuse an image without one.**

## Task 3 — Fix the redirect chain

Collapse `/slug/` → `/slug` → `/artikel/…` to a single hop. Every historic
inbound link is currently paying for two.

## Rules

- Build through **/autopilot**; work in a **visible Orca terminal**.
- **Verify with real builds and real data** — never report a metric you did
  not observe.
- **No production deploy without board approval.** Bring me the ship report.
- Never change a URL that currently ranks without a redirect plan and my
  sign-off. This site has already lost its URL history once, on 21 Aug.

## When done

Log to `docs/work-done/aug-23-2026-session-01/`, and report: what is live,
what you verified and how, and anything you need from me.
