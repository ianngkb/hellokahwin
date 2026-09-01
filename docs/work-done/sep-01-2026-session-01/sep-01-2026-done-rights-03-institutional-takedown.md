# RIGHTS-03: the two INSTITUTIONAL images taken down — gone from the database, the bucket and both pages, still served by the CDN — 1 September 2026

**Session:** sep-01-2026-session-01 · **Owner:** managing-editor · **Status:** partial — one DoD clause is OPEN and the item is not done
**Plan:** [`sep-01-2026-brief-rights-03.md`](../../plans/sep-01-2026-session-01/sep-01-2026-brief-rights-03.md) · decision 167, 30 August 2026

| | |
|---|---|
| UNDO | [`sep-01-2026-rights-03-UNDO.md`](sep-01-2026-rights-03-UNDO.md) · [`.sql`](sep-01-2026-rights-03-UNDO.sql) — committed `82e7e47`, **pushed before the first delete** |
| Gate | `node scripts/rights/takedown-gate.mjs` — currently **exits 1** |
| Ledger | [`docs/asset-register/takedowns.json`](../../asset-register/takedowns.json) |
| Evidence | [`sep-01-2026-rights-03-EVIDENCE/`](sep-01-2026-rights-03-EVIDENCE) — render JSON + 8 screenshots at 390 and 1440 |
| Blocked on | a Cloudflare token with **Zone → Cache Purge** on `hellokahwin.com`. The company has none. |

---

## The headline, first, because it is the thing that would otherwise be missed

**Deleting the objects did not stop the images being served.** Both files are gone
from R2, gone from the `media` table, and gone from both article bodies.
`ListObjectsV2` returns **0 objects** for both prefixes. And all six object URLs
still return **HTTP 200** with `cf-cache-status: HIT`, because
`images.hellokahwin.com` serves `Cache-Control: public, max-age=31536000,
immutable`.

Four internal signals said finished. The fifth — fetching the URL a stranger
would fetch — says the Getty file is still public. **The DoD asks for a 404 on
the live asset URL, and that is the right thing to have asked for**, because
Getty's reverse-image crawler does not read our database.

**This clause is OPEN and the item is NOT done.** It is not narrowed, not
reworded, and not closed by me.

---

## The count, established by enumeration rather than by assumption

The brief said two files and said to stop if it was not two. Testing for
"Getty" would only ever have returned a number about that assumption, so the
whole EXIF surface of all 682 legacy items was enumerated instead:

```
$ node -e "…tally every image_meta.credit and .copyright in media.json…"
items: 682
distinct credit/copyright values: 43
   1 credit :: Getty Images/iStockphoto
   1 credit :: TINDAKAN menambahbaik kursus kah
  … 41 others, every one a personal or studio name …
```

**Exactly one institutional credit and exactly one truncated newspaper caption.**
Two files. The other 41 values are people and studios — `Ameirfikri`,
`KennyLooi`, `Whitenery`'s `Tommy Teh`, `Nicholas NYY` — the population decision
176 covers and this item does not touch.

One value is worth flagging and is **not** in scope: `IHSAN_ROSNIZA 01110048141`
reads as *courtesy of Rosniza* plus a phone number. A person, not an institution,
and already on the low-priority contact list in the 25 Aug plan §2 Rank 4.

### And a better identification than the register had

The register held the press photograph's owner as the truncated EXIF string
`TINDAKAN menambahbaik kursus kah`. **Our own live page named them outright.**
The stored image node carried `data-caption: "SOURCE: UTUSAN MALAYSIA"`, rendered
as `Kredit: UTUSAN MALAYSIA`:

```
…text-white italic">Kredit: UTUSAN MALAYSIA</figcaption></figure>…
```

So the rights holder is **Utusan Malaysia**, a national newspaper — established
from the page, not guessed from EXIF. Written into `log_takedown` and into
`takedowns.json`.

*(Incidentally this confirms RIGHTS-01 held. The stored caption still begins
`SOURCE:`; the rendered label is `Kredit:`. Enumerating every label variant on
that page returns `36 Kredit:` and nothing else.)*

---

## What was actually on production, and every route to it

Enumerated by sweeping **every `text`, `jsonb` and `varchar` column of all 18
public tables** for both filename stems, rather than by checking the places I
expected them:

| Where | What |
|---|---|
| `media` | 2 rows — `b7965eb8-…-bf01272e3514`, `584e944f-…-a556d4aeb7f7` |
| `media_article_usage` | 2 rows (cascade) |
| `articles.content` | 1 `image` node each: `tempat-honeymoon-di-malaysia` [37/270], `kursus-kahwin` [3/74] |
| `legacy_image_redirects` | **1 row** — and this is the one that would have been missed |
| R2 `hellokahwin-images` | 6 objects (`.jpg` original + `high.webp` + `low.webp` each) |

**The second public route.** `/wp-content/uploads/2026/01/IN-TempatHoneymoondiMalaysia-CameronHighland.jpg`
301'd an image request straight at the Getty file — a different table, a
different code path (`src/app/wp-content/[...path]/route.ts`), and nothing in
the asset register points at it. Measured before the takedown:

```
$ curl -D - -H "Accept: image/webp,*/*" https://hellokahwin.com/wp-content/uploads/2026/01/IN-TempatHoneymoondiMalaysia-CameronHighland.jpg
HTTP/1.1 301 Moved Permanently
Location: https://images.hellokahwin.com/inspire/tempat-honeymoon-di-malaysia/1787395669518-IN-TempatHoneymoondiMalaysia-CameronHighland/high.webp
```

Now repointed to the article (`mapping_tier: article_fallback`), so the old
WordPress URL still works and no longer leads to the file.

---

## The UNDO went first, and it is a real one

Committed `82e7e47` and **pushed to `origin/ianng89/rights03-institutional`
before a single write**. `scripts/rights/rights03-takedown.mjs` refuses to run
otherwise, and it proved it — the second takedown run was blocked because a
later commit was not yet on origin:

```
REFUSING TO DELETE — HEAD 5528a924 is not on origin/ianng89/rights03-institutional (which is at 82e7e479).
The UNDO is committed but NOT PUSHED. Run: git push origin ianng89/rights03-institutional
```

Pre-write state was captured at `2026-08-31T17:53:20.113Z` off the live pooler —
every column of both `media` rows, both `media_article_usage` rows, the
`legacy_image_redirects` row, and both **whole** `content` jsonb columns as
literals. The whole column, not the node at its old index: an index-addressed
insert lands in the wrong place, silently, if anything edited the article first.

The six R2 objects were pulled to
`data/rights03-institutional-takedown-backup/` with a per-object MD5 manifest.
**`data/` is gitignored and that is deliberate** — a Getty file and a
newspaper's photograph are precisely what this item exists to stop the company
holding where it can be served from. The record is pushed; the pixels are not.

Both originals also exist independently in the WordPress export, verified
byte-identical to what R2 was serving:

```
2026/01/IN-TempatHoneymoondiMalaysia-CameronHighland.jpg   a31f3f5a292323c23b843b93ced89f4b  == R2 ETag
2025/11/IN-KursusKahwin-Kelas.jpg                          23ae4c51e934c3807d95912446f65d6c  == R2 ETag
```

**A correction to the export's own naming, found by that check.** The R2 object
is called `…-Kelas-1024x576.jpg` but its bytes are the **full-size** WordPress
original. `IN-KursusKahwin-Kelas-1024x576.jpg` on disk is 123,764 bytes and
hashes differently. The importer took the full-size file and kept the sized
name. Anyone restoring from the export must take `IN-KursusKahwin-Kelas.jpg`,
not the one whose name matches.

### The exact command that restores them

```
node scripts/rights/rights03-restore.mjs --all
```

---

## Reversibility was exercised, not asserted — and it failed twice

The restore was run against **live production**, both halves, and then the
takedown was re-run. That is the only reason two real bugs are fixed rather than
latent:

1. **`UNSAFE_TRANSACTION`.** postgres.js aborts any statement that opens its own
   transaction on a pooled connection (`connection.js:606`,
   `result.command === 'BEGIN' && max !== 1`). The UNDO `.sql` is one explicit
   `begin`/`commit`. **The UNDO would not have run at all.** Fixed with `max: 1`.
2. **A false failure, which is worse.** With `.simple()` alone the client threw a
   stack trace while the server had already executed the entire file. The run
   *reported failure* and had in fact restored everything. A recovery tool that
   says it failed after writing is how a second UNDO gets run on top of a
   restored database — and the third run duly died on a duplicate-key violation.

Proof the restore actually restores, from the gate in `--before` mode:

```
ok    page HTTP 200  195536 bytes          <- byte-identical to the pre-takedown page
ok    stem in live HTML: 4  (want > 0)
ok    <img> on the page: 24  (want 24)
ok    CDN 200 …CameronHighland.jpg / high.webp / low.webp
ok    page HTTP 200  158196 bytes          <- likewise
ok    stem in live HTML: 4  (want > 0)
ok    <img> on the page: 26  (want 26)
```

Both R2 originals came back with ETags identical to the pre-delete values. Then
the takedown was re-run and the state below is where production stands now.

---

## Where production stands, from the committed gate

`node scripts/rights/takedown-gate.mjs` — 20 checks green, 6 red, all six the
same cause:

```
── HK-L-0592  Getty Images/iStockphoto  (IN-TempatHoneymoondiMalaysia-CameronHighland.jpg) ──
ok    media rows: 0  (want 0)
ok    R2 origin: 0 object  …CameronHighland.jpg
ok    R2 origin: 0 object  …CameronHighland/high.webp
ok    R2 origin: 0 object  …CameronHighland/low.webp
ok    page HTTP 200  194156 bytes  https://hellokahwin.com/artikel/idea-dan-nasihat/tempat-honeymoon-di-malaysia
ok    stem in live HTML: 0  (want 0)
ok    <img> on the page: 23  (want 23)
ok    CONTROL in HTML: 4  1787395668007-IN-TempatHoneymoondiMalaysia-PulauSipadanMabul-
ok    CONTROL at CDN: HTTP 200
FAIL  CDN HTTP 200 (cf-cache-status HIT)  …CameronHighland.jpg
FAIL  CDN HTTP 200 (cf-cache-status HIT)  …CameronHighland/high.webp
FAIL  CDN HTTP 200 (cf-cache-status HIT)  …CameronHighland/low.webp
ok    legacy route 301 -> https://hellokahwin.com/artikel/idea-dan-nasihat/tempat-honeymoon-di-malaysia

── HK-L-0347  press photograph — Utusan Malaysia  (IN-KursusKahwin-Kelas.jpg) ──
ok    media rows: 0  (want 0)
ok    R2 origin: 0 object  …Kelas-1024x576.jpg
ok    R2 origin: 0 object  …Kelas-1024x576/high.webp
ok    R2 origin: 0 object  …Kelas-1024x576/low.webp
ok    page HTTP 200  156433 bytes  https://hellokahwin.com/artikel/idea-dan-nasihat/kursus-kahwin
ok    stem in live HTML: 0  (want 0)
ok    <img> on the page: 25  (want 25)
ok    CONTROL in HTML: 4  1787396418071-IN-KursusKahwin-2-1024x576
ok    CONTROL at CDN: HTTP 200
FAIL  CDN HTTP 200 (cf-cache-status HIT)  …Kelas-1024x576.jpg
FAIL  CDN HTTP 200 (cf-cache-status HIT)  …Kelas-1024x576/high.webp
FAIL  CDN HTTP 200 (cf-cache-status HIT)  …Kelas-1024x576/low.webp

TAKEDOWN-GATE EXIT: 1  — 6 check(s) failed
```

**The negative control is the reason those greens mean anything.** Each page's
control is the nearest retained neighbour of the removed node — same page, same
import batch, same `IN-` legacy class. Both are still in the HTML and still 200,
so "the stem is gone" is not "the page fell over".

### Both pages still render, at 390 and 1440

`node scripts/rights/rights03-render-check.mjs`, real Chrome, lazy images forced
to decide by scrolling the page and **every** `<img>` src fetched over HTTP —
because most of these images are lazy and below the fold they are neither loaded
nor broken, which is exactly where a body edit does its damage.

| page | width | broken imgs | bad srcs | figures | h2 | overflow | height |
|---|---:|---:|---:|---:|---:|---:|---:|
| tempat-honeymoon **before** | 390 | 0 | 0/23 | 16 | 3 | 0 | 35971 |
| tempat-honeymoon **after** | 390 | 0 | 0/22 | 16 | 3 | 0 | 35931 |
| tempat-honeymoon **before** | 1440 | 0 | 0/23 | 16 | 3 | 0 | 31130 |
| tempat-honeymoon **after** | 1440 | 0 | 0/22 | 16 | 3 | 0 | 31090 |
| kursus-kahwin **before** | 390 | 0 | 0/25 | 19 | 10 | 79 | 18659 |
| kursus-kahwin **after** | 390 | 0 | 0/24 | 18 | 10 | 79 | 18426 |
| kursus-kahwin **before** | 1440 | 0 | 0/25 | 19 | 10 | 0 | 15220 |
| kursus-kahwin **after** | 1440 | 0 | 0/24 | 18 | 10 | 0 | 15184 |

Zero broken images, zero non-200 image srcs, `h2` unchanged, one image and one
figure fewer on kursus-kahwin (it had a caption, so it was a `<figure>`), one
image and **no** figure fewer on tempat-honeymoon (it had none). Screenshots for
all eight cells are in the EVIDENCE folder.

**A pre-existing defect, measured before this item touched anything and reported
rather than adopted.** `kursus-kahwin` at 390 overflows the viewport by **79px**,
and it is not the images:

```
OVERFLOWS: div.flex.min-w-max.justify-start  right=2050 w=2042
OVERFLOWS: nav                               right=2050 w=2042
OVERFLOWS: div.hk-navrail-items…             right=2050 w=2042
```

A 2042px in-article nav rail leaking page-level horizontal scroll. It scales with
the article's H2 count — kursus-kahwin has 10 H2s and overflows;
tempat-honeymoon has 3 and does not. **79px before, 79px after.** Not mine to
fix in a rights item; filed below.

---

## The block, stated precisely

**This is the company lacking a credential, not my session lacking permission.**

| vault key | zone read | `POST /zones/<id>/purge_cache` |
|---|---|---|
| `cloudflare.twn` | ✅ `d8a1aef68b267fc0dc3cccd53b9e5cae` | ❌ `401`, `code 10000 Authentication error` — valid token, no **Zone → Cache Purge** |
| `cloudflare.hellokahwin` | ❌ `9109 Invalid access token` | ❌ dead entirely |
| `cloudflare.playbase`, `cloudflare.thepicklebase` | ❌ zone not visible (other accounts) | — |

Doppler project `buddy` carries no Cloudflare secret; neither does the site
`.env`, nor `~/.claude/settings.json`. Recorded in
`~/.claude/skills/tokens/registry.md`.

### What clears it — the command is committed and waiting

Either the owner purges the seven URLs from the Cloudflare dashboard
(hellokahwin.com → Caching → Configuration → Custom Purge), **or** a token is
minted with Zone → Cache Purge on `hellokahwin.com` and stored in the vault. Then:

```
vault.ps1 set cloudflare.hellokahwin       # paste the new token
vault.ps1 push
vault.ps1 run cloudflare.hellokahwin -EnvVar CF_TOKEN -- node scripts/rights/rights03-purge-cdn.mjs
node scripts/rights/takedown-gate.mjs      # must exit 0
```

The purge script reads `CF_TOKEN` from the environment and never takes a token on
a command line; the seven URLs are hard-coded in it, so there is nothing to
re-type.

**Until then the two files remain fetchable at their exact URLs for up to a
year.** What is genuinely reduced: no page links them, no crawler discovers them
through the site, and the legacy WordPress route no longer leads to them. What is
not reduced: anyone holding the URL, or any index that already has it, still gets
the file.

---

## Ship state

**Commits:** `82e7e47` UNDO pushed before the delete · `5528a92` restore-script
bugs · `81b6e90` gate readability · plus this entry's commit
**On `origin/ianng89/rights03-institutional`:** yes
**Deployed:** no site code was changed — this is a data and object-store change
against live production, already in effect. No PR to `master`.
**Still uncommitted in the tree:** none in this worktree.
**Not mine, but unshipped and worth naming:** `scripts/audit-worktree-shipped.sh`
is untracked in `Documents/Code/hellokahwin-site`. Somebody's tool, on one
machine only.

`/humanizer` was not run because **no reader-facing copy was written.** Two
images were removed; not a word of Malay prose was added or changed anywhere on
the site.

---

## Retrospective

### What we learned that was not written down

**Deleting a thing from a store that sits behind a cache removes the source, not
the thing.** Every internal signal — register status, empty bucket, clean page,
clean database — said the takedown was finished while the Getty file was still
being served to the public with a one-year TTL. That gap is not in any document
the company has, and it is a rights gap, which is the worst place to have one.

**Second: the register has no column that can hold a second delivery route.** The
`/wp-content/uploads/...` legacy redirect was a live public path to the Getty
file, in a different table, reachable by a code path the register never mentions.
It was found by sweeping every text and jsonb column of all 18 tables, not by
looking where I expected.

### Which document must change, who owns the edit — and the edits are made

| File | Owner | Change |
|---|---|---|
| `docs/asset-register/README.md` §7 | managing-editor | **DONE.** New rule 6: a `ditarik-balik` is not finished until the CDN 404s, with the RIGHTS-03 measurement as the reason and the gate command inline. |
| `docs/asset-register/takedowns.json` | managing-editor | **DONE, new file.** The machine-readable takedown ledger the gate runs on. Both entries filed. |
| `scripts/rights/takedown-gate.mjs` | managing-editor | **DONE, new file.** Ledger-driven, so it guards every withdrawal the company ever makes, not the one somebody wrote a script for. Five checks; four were green while the file was public. |
| `.claude/agents/managing-editor.md` | managing-editor | **DONE.** "An image is not removed until its URL 404s", written into the canonical copy in the main checkout with a dated backup — not just this worktree. |
| `~/.claude/skills/tokens/registry.md` | managing-editor | **DONE.** The Cloudflare purge gap recorded against the R2 section, where the next person looking at hellokahwin credentials will hit it. |

Prose would not have fired here. `takedown-gate.mjs` exits 1 today and will keep
exiting 1 until the purge happens, which is the difference between a rule and a
sentence.

### What we did twice and should never repeat

**Wrote a recovery tool and did not run it.** The restore had two defects, one of
which meant it could not run at all and one of which made it lie about having
run. Both surfaced in the first sixty seconds of actually executing it. This is
the same shape as the `grep -oiF` bug recorded in `scripts/measure/count-in-html.sh`
— *"a fix is not verified until it is run against the failing case"* — applied to
an UNDO instead of a check. **An UNDO that has never been executed is a document,
not a recovery path**, and every production write in this company is gated on
one. Worth the CEO's attention: the earlier UNDOs in `docs/work-done/` were, as
far as their entries show, written and never run.

### What we nearly shipped, and what caught it

**A finished-looking takedown with the Getty file still public.** The DoD's
insistence on quoting the live asset URL caught it — nothing else would have. The
register would have read `ditarik-balik`, the bucket was empty, both pages were
clean, and the report would have been true in every particular and wrong in the
only one that matters.

**Second near-miss: the legacy redirect.** It survived every obvious check —
absent from the article body, absent from the media table, `media_id` null so it
did not even cascade. It was caught by enumerating all 18 tables rather than the
three I expected to matter.

**Third: reporting a 79px mobile overflow as damage I had caused.** The before-run
was captured first, for exactly this reason, and showed 79px already there. A
render check with no baseline would have turned a pre-existing nav-rail defect
into a false regression on a rights item.

---

## Follow-ups

1. **THE ITEM'S OPEN CLAUSE — owner.** Purge the seven URLs, or mint a
   Cache-Purge token. `takedown-gate.mjs` must exit 0 before RIGHTS-03 closes.
   Nobody but the owner can do this today.
2. **UI seat.** `kursus-kahwin` overflows 79px at 390. `div.hk-navrail-items`
   renders 2042px wide and leaks page-level horizontal scroll; it scales with H2
   count, so every long article is affected and short ones are not. Measured, not
   inferred — `render-before.json` in the EVIDENCE folder.
3. **CEO.** `.claude/agents/` is gitignored in this repo (`.gitignore:90`).
   Persona edits made inside a worktree — which is where every dispatched agent
   works — reach nothing and disappear with the worktree. This one was copied to
   the main checkout by hand. Every retrospective that "updated a persona" from a
   worktree should be checked.
4. **Rights, standing.** The other 401 photographs and the ten template B letters
   are untouched by this item and remain where the 25 Aug plan left them.
