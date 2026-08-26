# Enforcing "always credit the original source" — what it would take, and what is worth doing

**Owner:** managing-editor · **Date:** 25 Ogos 2026
**Brief:** `aug-25-2026-brief-supporting-images-and-credit.md`, Task 3
**For:** the owner and the CEO
**Grounded in:** the shipping code on branch `ianng89/pillars-ingest-redirects`,
read 25 Ogos 2026. Every claim below carries a file and line.

---

## 1. The brief's premise is wrong, and the truth is worse

The brief says the rule is *"enforced only at ingest, for `cover`"*.

**It is enforced at ingest for `cover` and for every entry in `images[]`, and
four separate image-smuggling routes through the article body are closed too** —
the three markdown image forms plus raw HTML.
`article-file.ts:133-134` applies the same `imageSchema` to both. `:218-234`
blocks inline markdown images, full reference images, shortcut reference images
and raw `<img>` HTML, with the error naming the file that was smuggled. The
whitespace hole is closed — `credit: "   "` is refused, and the code comment
records that it passed once before review caught it (`:58-60`). It has a test
file with parameterised cases for every one of those (`__tests__/article-file.test.ts`).

**On the ingest road the rule is not half-enforced. It is thoroughly enforced,
better than most rules in this codebase.**

The problem is that there are three roads and only one of them has a gate.

| Road | Enforces credit? | Who uses it |
|---|---|---|
| `pnpm ingest` — the CLI | **Yes, completely** | The agent pipeline. Every article published since 24 Ogos |
| **The admin console** | **No. Not at any layer.** | Any human editor. The path of least resistance |
| `pnpm wp-import` — still a live npm script | **No** | How the 682 got here |

**So the honest statement is not "the rule binds new content but not the legacy
682". It is: the rule binds the robot and not the person.** The 682 are a closed
historical set. The admin console reproduces the identical defect today, in one
drag-and-drop, and nothing in the system would report it.

---

## 2. Every layer of the admin path, and what each one does

I went looking for one missing check. There are six, and they compound.

**1 · The insert omits the columns entirely.**
`(admin)/admin/inspire/media/actions.ts:411-431` builds the `media` row with
seventeen fields. `credit`, `creditUrl`, `licenseClass` and `licensorName` are
not among them — and they are not parameters of the function either
(`:389-405`), so they cannot be passed. Postgres writes NULL.

**2 · There is no validation.** No zod import in the file. The only guard is
`requireAdminSectionAction('media_library')`, which checks *who* may upload, not
*what* they must supply.

**3 · A credit cannot be added afterwards.** `updateMediaAction:199-216` takes
exactly three fields: `alt`, `caption`, `captionUrl`. **There is no path through
the product by which an editor can credit an image at all.**

**4 · Nobody can see the gap.** `getMediaListAction:88-112` and
`getMediaByIdAction:154-181` both enumerate their columns and neither selects any
of the four. An admin looking at the media library cannot tell a credited image
from an uncredited one.

**5 · The UI teaches the wrong thing.** `media-detail-panel.tsx:269-276` offers a
"Caption" field with the placeholder **`"Photo credit or caption"`** — against a
schema comment at `media.ts:44-46` that says: *"`caption` is NOT this field.
Captions describe the picture; some of the 682 imported rows have a
photographer's name stuffed into one, which is exactly the untraceable state
these columns replace."* The interface actively invites the failure the schema
was written to end.

**6 · The failure is swallowed.** `inspire-upload.ts:161-164` catches a failed
media-record creation and logs a warning: *"Media record creation failure is
non-blocking."* The image uploads and renders; the row may not exist at all.

**And placement writes no credit either.** `article-editor.tsx:1433-1455` sets
`src`, `data-original-src`, `data-quality` and `data-variants` on a body image.
It does not set `data-caption` or `data-caption-url` — which is what
`ingest-article.mts:306-307` sets. An admin-placed body image renders with no
credit line at all.

---

## 3. The renderer makes it invisible

`image-credit.tsx:30-31`:

```tsx
const text = credit?.trim();
if (!text) return null;
```

**A NULL credit renders as nothing, silently.** No fallback, no placeholder, no
warning. An uncredited image is visually identical to a correctly credited one.

That is deliberate and documented — *"the 682 imported library images have none
and never will, and an empty 'Foto oleh' line helps nobody"* — and it is right
for the public page. It is wrong everywhere else, because it removes the last
place a human could have noticed.

Three more, which matter for anyone planning a fix:

- **A cover credit can go missing three ways, all silent.** `pillar-queries.ts:173`
  returns null on a falsy credit; `:171` joins on `eq(media.url, coverImageUrl)`,
  an **exact string match** that yields nothing if the URL does not byte-match;
  and `page.tsx:546-556` wraps the read in a deadline and swallows a timeout —
  *"Non-critical — render the cover without the credit line."* **A slow database
  produces an uncredited-looking cover.**
- **In-body figures never read `media.credit` at all.** `article-renderer.tsx:875`
  destructures `src, alt, caption, captionUrl, captionHtml` and no credit. The
  credit reaches a body figure only as a snapshot baked into `data-caption` at
  ingest time. **Correcting a credit in the database fixes the cover and changes
  no body figure on the site.**
- **`licenseClass` and `licensorName` are never displayed anywhere** — not on the
  public site, not in the admin. Twenty-five references across the codebase and
  not one is a render. They are write-only columns, which is defensible for
  `licensorName` and is why nobody has ever noticed a NULL one.

---

## 4. The database has no constraint

`media.ts:52-71` — all four columns `text()`, nullable, **no default, no CHECK,
no trigger**. `alt` has `.default('')`; these four have nothing. Migration
`0002_pillars_and_image_credits.sql:5-8` added them bare. The V/C/O/S/G enum
exists only in zod, only on the ingest road.

The schema comment states the reasoning honestly (`media.ts:48-51`): NOT NULL
would have made the migration destructive against 682 legacy rows, so the gate
was put in the ingest script instead. **That was the right call in the moment and
it is the reason the admin road was never noticed** — the gate was placed where
the traffic was, and then a second road opened.

---

## 5. Tests

One file covers the credit rule: `src/lib/inspire/__tests__/article-file.test.ts`,
267 lines, and it is good — it refuses a missing credit, a missing licence class,
a missing licensor, whitespace-only values, unknown classes, and eight
body-smuggling shapes.

It tests **pure functions only.** Nothing tests `ImageCredit`, `getCoverCredit`,
either figure renderer, the admin insert, or `ingest-article.mts`.

**And `ingest-article.mts` cannot be tested under the current config**: the
vitest include glob is `scripts/**/*.{test,spec}.ts` and the script is `.mts`, so
a test file for it would not be collected. One character in
`vitest.config.ts`.

---

## 6. What it would take — four tiers, with real cost

### Tier 0 — make the gap visible. Half a day. Do this whatever else is decided.

- Add the four columns to the two `getMedia*` selects, and show credit status in
  the media library with an "uncredited" filter.
- Run one read-only count against production. **Nobody has ever run it.** The 682
  figure comes from a WordPress export, not from the live database, and the two
  are not guaranteed to agree.

Half a day. You cannot manage what nobody can see, and today the number is
unknown from inside the product.

### Tier 1 — close the admin door. Two to three days. **This is the one that matters.**

- Add the three fields to `createMediaRecordAction`'s signature and to
  `updateMediaAction`.
- Add a zod schema in `src/lib/validations/` that reuses the same rules as
  `imageSchema` — one source of truth for the licence enum, not two.
- Add the fields to the upload dialog and the media detail panel, and **change
  the caption placeholder**, which is currently teaching editors to do the wrong
  thing.
- Refuse an article publish where a referenced media row has no credit.

Two to three days, and it is the whole of the *ongoing* exposure. Everything else
in this document is about a closed set of 682. This is about whether that set
stays closed.

### Tier 2 — make the renderer honest. One day.

- Keep the public page silent on a NULL credit. A public "Kredit: tidak
  diketahui" helps no reader and advertises the gap.
- **Render it loudly in the admin preview.** That is where an uncredited image
  needs to be impossible to miss, and it is the cheapest detection we will ever
  get.
- Make body figures read `media.credit` at render, with the baked `data-caption`
  as the fallback. Otherwise a correction never reaches the page.

### Tier 3 — a database constraint. Half a day, and it goes AFTER Tier 1.

A `CHECK (credit IS NOT NULL)` cannot be added while 682 rows are NULL without
either backfilling a fabricated value or excluding them.

The honest form is `NOT VALID`: the constraint binds new and updated rows and the
existing 682 are grandfathered. One line, real enforcement, no fabrication.

**But it will hard-fail every admin upload until Tier 1 ships.** Adding it first
converts a silent gap into an outage. Order matters here more than anywhere else
in this document.

### Tier 4 — the legacy 682. **And here the answer is no.**

"Enforce credit on the 682" has no honest execution, because we do not know the
credits. You cannot retroactively enforce a rule on data whose true value is
unknowable. Four options, and three of them are bad:

| | Option | Verdict |
|---|---|---|
| a | Backfill `credit` from the EXIF-asserted name on the 120 | **No.** That promotes a file's claim about itself into a published credit. The register forbids it in §6 for exactly this reason, and those names already live in `pencipta`, which is where a lead belongs |
| b | Backfill all 682 with a literal `TIDAK DIKETAHUI` | **No.** It converts an honest NULL into a published statement of ignorance, and it destroys the distinction between "we looked and cannot establish it" and "nobody looked" — the single most important rule in the register |
| c | Unpublish everything we cannot credit | Satisfies the rule exactly, and costs 618 images across 29 legacy articles. A real option, and the owner's, not mine |
| d | **Grandfather them, with the register as the record** | **Recommended** |

**Why (d).** Retroactively enforcing a rule across 618 images competes directly
with Tier 1, and Tier 1 is the only work here that stops the uncredited set
growing. A closed set of 682 that is being recorded honestly is a smaller
problem than an open door.

**And some of those pages are going to be rewritten anyway, which reduces the
work further — though not by as much as I first wrote.** The cluster plan books
*"seven existing-article upgrades"* in P2 and names `pelamin-kahwin-dewan` and
the digital-card article as seeds for C5.1 and C5.2. **It does not schedule all
29**, and an upgrade does not automatically remove the images on the page. So
this is a reason to sequence the legacy work after Tier 1, not a reason to
believe it disappears on its own. Whoever picks it up later should count how many
of the 29 are actually in the rewrite queue rather than assume it.

Two exceptions, both from the rights-risk list and neither requiring engineering:
**the Getty/iStock image and the press photograph come down now.** Those are
deletes.

---

## 7. Two live hazards found on the way, unrelated to the tiers

**`wp-import.ts` still runs live by default.** It is a first-class npm script
(`package.json:18`) and its only guard is `--dry-run`, which is **opt-in**
(`wp-import.ts:145`). `backfill-media.ts` has it the right way round —
*"Dry run is the DEFAULT. Writing is the thing you have to ask for."*
(`:75-76`). Flipping `wp-import` to match is fifteen minutes and removes a script
that writes uncredited media rows to production if anybody runs it without
thinking.

**`.env.local` silently redirects production scripts to a local mirror.** A
`DATABASE_URL`-based count run from that worktree hits `127.0.0.1:5433`, not
Supabase, and reports wrong numbers **rather than erroring**. Anyone running the
Tier 0 count must use the `%TEMP%\hk_db_url.txt` idiom the existing recon scripts
use, or they will confidently report the wrong figure.

---

## 8. The answer, in one paragraph

**Yes, it is worth doing — but not the part the brief asked about.** The rule is
already enforced completely on the road the agent pipeline uses, and completely
absent on the road a human uses; a person can put an uncredited photograph on a
live page today with a drag-and-drop, and no layer of the system would record it,
display it, or object. **That is four to five days of work (Tiers 0 to 2) and it
is the only work here that changes the future.** Retroactive enforcement on the
682 is not worth doing, because it cannot be done honestly — every available
method either fabricates a provenance or destroys the distinction between an
honest gap and an unasked question, and both of those are worse than the NULL
they replace. The 682 stay grandfathered, the register carries the record, two
images come down today, and the legacy articles carrying the rest are being
replaced anyway. **A rule that binds the robot and not the person is not half a
rule. It is a rule pointed at the wrong half of the problem, and it costs about
a week to point it at the right one.**
