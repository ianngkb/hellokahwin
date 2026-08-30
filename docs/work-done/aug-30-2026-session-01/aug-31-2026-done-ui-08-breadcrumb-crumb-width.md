# UI-08: the crumb that hid 60% of itself at every width — and it was never an attribution link — 31 Ogos 2026

**Session:** aug-30-2026-session-01 · **Owner:** design-systems-engineer · **Status:** completed
**Plan:** [aug-31-2026-brief-ui-08.md](../../plans/aug-30-2026-session-01/aug-31-2026-brief-ui-08.md)

## What was done

The final segment of the site's breadcrumb was a **fixed 200px box with
`text-overflow: ellipsis`, unchanged from 390 to 1440**. It now shows its whole
label at every width, on every template that renders a breadcrumb.

Measured on production before the fix, in a rendered viewport with `innerWidth`
and `matchMedia('(width: Npx)')` asserted **inside the page** at each width:

| URL | Box (`clientWidth`) | Text (`scrollWidth`) | Hidden | Widths |
|---|---|---|---|---|
| `/artikel/idea-dan-nasihat/garden-wedding` | 200px | 332px | **132px (40%)** | identical at 390 · 768 · 1024 · 1440 |
| `/dewan-kahwin` | 200px | 503px | **303px (60%)** | identical at 390 · 768 · 1024 · 1440 |

The box never grew. At 1440 the column offers 888px and 60% of the crumb was
still discarded.

### The element is not what the ticket says it is

The tracker calls this "the source-attribution link" and argues the fix on
rights grounds — RIGHTS-01 had just standardised every credit to `Kredit:`, so a
credit line hiding 60% of itself reads as a rights problem. **It is neither an
attribution nor a link.** Read out of the rendered page at all four widths:

```
nav[aria-label="Breadcrumb"] > ol > li > span[aria-current="page"]
href: null · no <a> ancestor · text === the page's own <h1>
```

The credits RIGHTS-01 shipped are present and untouched on both pages — **21
`Kredit:` on the article, 7 on `/dewan-kahwin`**, before and after. The
mislabel originates in UI-04's rendered audit §5 and propagated from there into
the tracker's DoD and into this item's brief.

The DoD's **measurable clause** is unaffected and unambiguous — `scrollWidth <=
clientWidth` at four widths on two URLs, with 200/332/503 pinning exactly this
element — so it was satisfied exactly, not narrowed. Only the rationale is
corrected, and it is corrected here rather than silently.

### The fix

`src/components/common/breadcrumbs.tsx`:

- `max-w-[200px] truncate` removed from the final crumb.
- `min-w-0` on the `<li>` so it can shrink inside its flex row — the `<ol>`
  already `flex-wrap`s, but a flex item's default `min-width: auto` stops it
  shrinking below max-content, which would have moved the clip from the span to
  the page.
- `break-words` for the one state that could still overflow: a single token
  longer than the column.
- **The wrap state my own fix created, finished:** with the box gone the crumb
  wraps at 390, and a chevron on `items-center` then sat at the mid-height of a
  two-line block, belonging to neither line. It now sits in an `h-5` box on
  `items-start` — 20px is the `text-sm` line-height this `<ol>` already sets, so
  the icon lands on the optical centre of the **first** line and single-line
  crumbs render exactly as before. Derived from the type scale, not nudged by
  eye, and **measured**: chevron mid-point is 0.5px from the first line's
  mid-point at both 390 (2 lines) and 1440 (1 line).

### The reference page, in the same change

The long final crumb had **never been on `/admin/design-system`**. Every crumb
DES-03 draws (§5.1, §5.2, §7) ends in a short category — `Hantaran & Mas
Kahwin` — so nothing on the reference page ever rendered a label long enough to
expose a 200px box. It now renders one, in **both** breadcrumbs:

- `.s-crumb`, the design-system component; and
- `components/common/breadcrumbs.tsx`, **the one public pages actually render**,
  which the reference page had never shown at all. That divergence — a
  reference page displaying a component the site does not use, while the
  component the site does use goes unreviewed — is where the defect lived.
  Reconciling them into one component is a follow-up, not UI-08.

The `.s-crumb` docstring asserted "truncates at the container edge; never wraps
to a second line". The component has always been `flex-wrap: wrap` with no
truncation, so the docstring described a behaviour it did not have; corrected.

### Two gate defects found and fixed while verifying

Both in `scripts/ui-layout-gate.mjs`, which UI-06 shipped the same day. See the
Retrospective.

## Ship state

**Commits:**
- `a08fcd4` UI-08: the breadcrumb's final crumb was a fixed 200px box at every width
- `789c945` merge: origin/master (UI-05, UI-06 layout gate) into UI-08
- `9302658` Merge pull request #20 — [PR #20](https://github.com/ianngkb/hellokahwin/pull/20)
- `a06a009` UI-08 follow-through: the wrap state finished, and the gate stopped passing on somebody else's login page
- `8100908` Merge pull request #25 — [PR #25](https://github.com/ianngkb/hellokahwin/pull/25)

**On `origin/master`:** yes — both PRs merged with merge commits, not squashes.
**Deployed:** Vercel Production `6170154301`, sha `8100908`, state `success`,
2026-08-30T19:03:51Z (the UI-08 fix itself went out with `9302658` earlier).
**Still uncommitted in the tree:** none.

```
$ git status --porcelain -- src/ scripts/ && git log --oneline origin/master..HEAD
(both empty)
```

## Evidence

`aug-31-2026-ui-08-EVIDENCE/`

**`harness/`** — reruns anything here.
- `identify.mjs <base> <out.json>` — enumerates every horizontally-clipping
  element and prints its full ancestor chain, `aria-current`, `href` and
  `outerHTML`. This is what proved the element is a breadcrumb. Deliberately
  does **not** filter to leaf nodes: UI-04 recorded that filter as the blind
  spot that hid a real truncation.
- `dod.mjs <base> <out.json>` — asserts the DoD verbatim and prints
  `DOD EXIT: 0|1`. Asserts `innerWidth` and `matchMedia` in-page at each width,
  records the **final** URL after redirects, and carries a structural control
  (`h1`, image count, link count, breadcrumb `li` count, `Kredit:` count) and a
  negative control (count of any *other* ellipsis-clipped element).
- `shots.mjs <dir>` · `chevron.mjs`.

**`measurements/`**
- `identify-before-production.json` — the before state.
- `dod-after-production.json` — **8 pass / 0 fail, `DOD EXIT: 0`.**
- `uilint-after-production.txt` — UI-06's gate on production after the fix:
  **`clipped-text 0`** and **`viewport-overflow 0`** on all three targets at all
  four widths.
- `article-h1-lengths-31-ogos-2026.tsv` — all 86 article URLs from
  `sitemap.xml` with their rendered `<h1>` length. Longest is 95 characters.

**`screens/`** — 16 PNGs at deviceScaleFactor 2. `*-after-live` is production.
`*-before-reconstructed` is the same live page with the exact CSS the fix
removed re-applied in the browser, **labelled as a reconstruction** because
production no longer carries the defect; each is stamped with the numbers
measured in that same page.

### Before → after, on production

| URL | Width | Before `client`/`scroll` | After `client`/`scroll` | Hidden |
|---|---|---|---|---|
| `/artikel/idea-dan-nasihat/garden-wedding` | 390 | 200 / 332 | **332 / 332** | 132 → **0** |
| | 768 | 200 / 332 | **332 / 332** | 132 → **0** |
| | 1024 | 200 / 332 | **332 / 332** | 132 → **0** |
| | 1440 | 200 / 332 | **332 / 332** | 132 → **0** |
| `/dewan-kahwin` | 390 | 200 / 503 | **332 / 332** (wraps to 2 lines, 40px) | 303 → **0** |
| | 768 | 200 / 503 | **503 / 503** | 303 → **0** |
| | 1024 | 200 / 503 | **503 / 503** | 303 → **0** |
| | 1440 | 200 / 503 | **503 / 503** | 303 → **0** |

Independently reproduced by a second tool: UI-06's gate reported
**`clipped-text ×8`** before (4 widths × 2 URLs, 132px and 303px) and
**`clipped-text 0`** after.

**I measured the build I shipped.** The CSS bundle hash moved with each deploy:
`58b3f058ca4a06ea.css` (before) → `fbc0e6fba65a1ae7.css` (UI-08 fix) →
`4f3c021c4479d324.css` (follow-through). All measurements above are against
`200 HIT` responses from `sin1` carrying the expected hash.

The `image-upscale 7 · image-aspect 8` the gate still reports on these pages are
**not mine and are unchanged by this work** — 5 and 6 respectively over the same
two targets both before and after. They belong to the open image items.

## What it changed

- A reader of `/dewan-kahwin` sees the whole title in the breadcrumb instead of
  `10 Dewan Kahwin Murah di S…` — 60% of the string, at every width including a
  1440px desktop with 888px of column going spare.
- The visible crumb now matches the `BreadcrumbList` JSON-LD's last `name`
  exactly, on every page checked. They disagreed before, which is a
  structured-data inconsistency nobody had noticed.
- `scripts/ui-layout-gate.mjs` can no longer return green over a page that is
  not this site, and its article template is exercised at the corpus's longest
  title instead of one roughly half that length.
- `/admin/design-system` renders the breadcrumb state that the whole DES-03
  spec omits, in both implementations.

## Follow-ups

| # | What | Owner |
|---|---|---|
| 1 | **DES-03 §8 says the breadcrumb "truncates at the container edge, never wraps to a second line".** Every §5/§7 drawing ends in a short category; the article-title crumb was never drawn. At 390 the `/dewan-kahwin` crumb needs 503px, so "show it in full" and "never wraps" cannot both hold — the DoD won and it wraps. Whether §8 keeps the never-wrap rule for article-length crumbs needs a deliberate decision, in `docs/design/des-03-spesifikasi.html` and the table row in `docs/design/des-03-evidence/tpl/08-components.html`. | `creative-director` |
| 2 | **Two breadcrumbs.** `.s-crumb` (design system, on the reference page) and `components/common/breadcrumbs.tsx` (Tailwind, on every public page). One component, one style, one place to change. | `design-systems-engineer` |
| 3 | **UI-04 §5 mislabels this element** as "the source-attribution link". The audit is the source the tracker quotes; correcting it stops the mislabel being re-imported. | `product-designer` (owns UI-04's entry) |
| 4 | **Re-measure the gate's "longest title" instance when the corpus grows.** A stale "longest" silently becomes an ordinary one. Command is in the Retrospective. | `design-systems-engineer` |

---

## Retrospective

### What we nearly shipped, and what caught it

**A claim that UI-06's gate was wrong about `/[slug]`.** The gate's manifest
says `/[slug] — legacy WordPress resolver, 301s, renders no template`. My own
Playwright run had `/dewan-kahwin` returning **status 200 with an `<h1>`, 14
images, 47 links and 4 breadcrumb items** — which reads as a rendering template
and a false note in somebody else's gate. It was one `curl -I` from being
written up.

`curl -I` showed `308 → /artikel/idea-dan-nasihat/dewan-kahwin`, and
`src/app/(public)/[slug]/page.tsx` only ever calls `redirect`,
`permanentRedirect` or `notFound`. **The gate was right; my check was reading
the *final* response of a redirect chain and reporting it against the
*requested* URL.** Playwright's `response.status()` is the end of the chain, and
nothing in my harness printed where it had ended up.

The general shape — *a green measurement taken against a document that is not
the URL you asked for* — is the same defect as the login-page hole below, found
twice in one item from opposite directions.

**Form of the fix:** code, twice. `harness/dod.mjs` records and prints
`finalUrl` on every row. `scripts/ui-layout-gate.mjs` now **errors** when the
final origin is not the origin requested. Shipped, `8100908`.

### The gate could not tell this site from vercel.com

Pointed at the PR's own preview deployment, `pnpm ui:gate --url <preview>`
printed **`0 violation(s)` at three of four widths**. The preview has Vercel
deployment protection on: every request 302s to `vercel.com/login`, which
answers **200** with a valid, well-formed HTML document containing no clipped
text, no narrow columns and no images. The fourth width errored — on a network
timeout, not on the substitution. Without that flake the run prints
`UILINT EXIT: 0`.

The gate is the tool that enforces this sprint's standing rule *"a status code
is not evidence"*, and it was the one thing not enforcing it on itself. Its
build fingerprint already **printed** the tell — eight Vercel-hashed stylesheets
where this site has three — but nothing asserted on it, and **a number nobody
compares is decoration.**

**Form of the fix:** a precondition in the gate, not a warning in prose. Every
target proves it is this site before a single check runs — same final origin as
requested, and `<html lang="ms">` (every public template sets it; the login page
is `en-US`). Failing is an ERROR, exit 2, never a clean run. A legitimate
preview passes both markers, so this rejects the protection wall without
rejecting previews.

Seen firing at all four widths on the protected preview
(`NOT THIS SITE — asked https://…vercel.app, got https://vercel.com`), seen
**not** firing on production, and the 59-case fixture self-test still passes.
Owner: `design-systems-engineer`. File: `scripts/ui-layout-gate.mjs`. **Done.**

### One instance per template is a sample, not a manifest

This defect was **content-length dependent**. The same component, on two pages
of the same template, hid 132px on one and 303px on the other. No structural
difference between the pages existed to find — only the length of a string. The
gate's manifest carried one article instance, `garden-wedding`, at **48
characters**. All 86 article URLs in `sitemap.xml` were fetched and their `<h1>`
counted: **the longest is 95 characters.** The manifest had been exercising
roughly half the string the template must survive.

**Form of the fix:** a second manifest entry, chosen by measurement and labelled
with what makes it extreme — `article (longest title on the site, 95 chars)` →
`/artikel/fotografi-videografi/lokasi-pre-wedding-photoshoot-terbaik`. Measured
on production after the fix: `clipped-text 0`, `viewport-overflow 0` at all four
widths. Owner: `design-systems-engineer`. File: `scripts/ui-layout-gate.mjs`.
**Done.**

Re-measure when the corpus grows — the command is:

```bash
curl -s https://hellokahwin.com/sitemap.xml | grep -o '<loc>[^<]*</loc>' | sed 's/<[^>]*>//g' \
  | grep '/artikel/[^/]*/[^/]*$' \
  | while read -r u; do t=$(curl -s "$u" | grep -o '<h1[^>]*>[^<]*</h1>' | head -1 | sed 's/<[^>]*>//g'); \
      printf '%s\t%s\t%s\n' "${#t}" "$t" "$u"; done | sort -rn | head -5
```

### A reference page that only shows nominal content is not a regression test

My own standing rule is *"the reference page is the regression test for
taste"*. It was on the reference page, it was reviewed, and a 200px box that
threw away 60% of a title survived — because **every crumb it rendered was
short enough to fit.** A component shown only at its comfortable content length
tests nothing about the state that breaks it.

**Form of the fix:** the long-crumb entries shipped with the change itself,
`9302658`. The generalisation — *a component's reference-page entry renders its
content-extreme state, not a nominal one* — belongs in the brief that governs
this role.

**I have not made that edit, deliberately.** The file is
`.claude/agents/design-systems-engineer.md`, an agent definition, and I do not
edit my own configuration on the instruction of another agent. It is handed to
whoever runs `/endsprint`, with the clause ready to paste:

> **A reference-page entry renders the state that breaks the component, not the
> state that flatters it.** The longest real string, the missing image, the
> empty list — measured from the live corpus, not invented. A component
> reviewed only at its comfortable content length has not been reviewed. UI-08:
> a 200px breadcrumb box hid 60% of a title on a page that was on the reference
> page the whole time, because every crumb drawn there was short enough to fit.

### The ticket's word for an element is not evidence of what it is

"The source-attribution link" was wrong in three documents before it reached me
— UI-04 §5, the tracker's DoD, and this item's brief — and it carried a rights
argument that does not apply to a breadcrumb. Nobody checked; the phrase was
just quoted forward. Had I fixed "the attribution link" I would have gone
looking at `Kredit:`, which RIGHTS-01 had just made correct.

**Form of the fix:** a checklist item in the document that governs what an entry
must contain. Owner: me. File: `docs/work-done/README.md`. **Made in this
change** — see the new bullet under "Code work is not done until it is
deployed".

### What we did twice

- **Measured the same element with two independent tools**, deliberately, and it
  paid: UI-06's gate reproduced UI-04's 132px and 303px exactly, from a
  different codebase, which is why the before-numbers in this entry need no
  caveat.
- **Captured the after-screenshots twice**, because I shipped the chevron
  alignment after the first capture. Avoidable: look at the render before
  photographing it.
- **Judged the chevron by eye and got it wrong.** The downscaled PNG read as
  mid-block at both 390 and 1440; measuring the SVG's box against the first
  line's client rect gave **0.5px**. The screenshot was the artefact, the
  measurement was the evidence — and this is the third time in this item that
  looking at a rendered thing beat reasoning about it, and the second time that
  *only* measuring it settled the question.
