# The HelloKahwin asset register

**Owner:** managing-editor (until a Visual & Rights Coordinator is hired)
**Created:** 24 Ogos 2026 · **Authority:** visual-asset strategy §3.2, brief of 24 Aug 2026

The register is the company's memory of where every image came from. One row per
image. It lives here, in git, outside the CMS, so it survives a platform change —
and so that changing a provenance record leaves a diff with a name on it.

`asset-register.csv` is the register. This file is its schema and its rules.

---

## 1. Why CSV

It opens in Excel and Google Sheets, so the person maintaining it does not need a
developer. It diffs line-by-line in git, so an edited provenance is visible in
review. Every language parses it. Those three together are the whole requirement.

RFC 4180 quoting: a value containing a comma, a quote or a newline is wrapped in
double quotes and internal quotes are doubled. Spreadsheets do this for you.

**Encoding is UTF-8 without a BOM.** Malay text is ASCII, but licensor names are
not always — `Ameir Fikri`, `Bonjo Terralogical` are, `Café` is not.

---

## 2. The three ways to say "we don't know", and why they are not one thing

The single most important rule in this document. An honest gap is a working
record; a fabricated provenance is worse than none.

| Value | Means | It is a… |
|---|---|---|
| `TIDAK DIKETAHUI` | **We looked, and it cannot be established.** | Finding. Someone did the work and this is the answer. |
| `BELUM DIISI` | **Nobody has looked yet.** | Task. It belongs on somebody's list. |
| `TIDAK BERKENAAN` | **The field does not apply to this class of asset.** | Neither. A generated graphic has no expiry date. |
| *(empty)* | **The field has no value and is not expected to** — an unagreed credit string, an empty takedown log. | Neither. |

A coordinator who writes `TIDAK DIKETAHUI` where they mean `BELUM DIISI` has
quietly closed a task. That is the failure this table exists to prevent. When in
doubt the answer is `BELUM DIISI`, because it costs an hour and the other costs a
photograph.

**Never** write `tiada maklumat`, `n/a`, `-`, `?`, `unknown`, or a guess. Never
copy a name out of a filename into `licensor_name` — a filename is a filing
convention, not a grant.

---

## 3. Columns

Where a column feeds the ingest parser, it carries the **parser's own field name**,
not a Malay one. That is deliberate: the register's job is to not drift from the
code, and the join between them is by name. Everything else is English snake_case
for consistency. **Values are Malay** wherever a human reads them, and every value
that reaches a page — `credit`, and the alt text quoted in `nota` — is Malay,
because that is what the reader sees.

| # | Column | Required | What goes in it |
|---|---|---|---|
| 1 | `asset_id` | always | Stable, never reused. `HK-L-nnnn` inherited WordPress library · `HK-G-nnnn` our own graphic · `HK-C-nnnn` article cover · `HK-P-nnnn` licensed photograph. |
| 2 | `status_guna` | always | `boleh-guna` · `kuarantin` · `jangan-guna` · `belum-dihasilkan` · `ditarik-balik`. See §4. |
| 3 | `fail` | always | Filename as stored. `BELUM DIISI` before the asset exists. |
| 4 | `r2_key` | always | The R2 object key. `TIDAK BERKENAAN` for anything never uploaded to our own storage. |
| 5 | `perihal_ms` | always | What the image shows, in Malay, for a human scanning the sheet. Not the alt text. |
| 6 | `pencipta` | always | **Who made it.** The photographer's or designer's name. |
| 7 | `bukti_pencipta` | always | **How we know that.** `exif-copyright` · `exif-credit` · `kapsyen-wordpress` · `blok-kredit-vendor` · `e-mel` · `karya asal, dihasilkan dalaman` · `tiada`. Ordered strongest to weakest; a caption is weaker than EXIF because the old site wrote it, not the camera. |
| 8 | `licensor_name` | always | **Who granted us the licence** — who to ask, years from now. Often the same person as `pencipta`; often not. → parser `licensorName`. |
| 9 | `license_class` | always | `V` `C` `O` `S` `G` or `TIADA`. See §5. → parser `licenseClass`. |
| 10 | `skop_lesen` | always | What was actually granted. *"laman hellokahwin.com dan akaun sosial HelloKahwin, tanpa had tempoh"*. Write the scope, not the word "penuh". |
| 11 | `tarikh_geran` | always | When the clock started. House date format: `23 Ogos 2026`. |
| 12 | `tarikh_semak_semula` | always | Review or expiry date. `TIDAK BERKENAAN` for a perpetual grant or our own work. A term licence nobody remembers is a liability. |
| 13 | `bukti_lesen` | always | **The evidence pointer.** The e-mail, the signed template, the receipt, the file path. This is the column an argument turns on. |
| 14 | `credit` | when publishable | The exact visible credit string, style guide §13.1. → parser `credit`. |
| 15 | `credit_url` | optional | Full URL. Rendered as a followed link. → parser `creditUrl`. |
| 16 | `digunakan_dalam` | always | Article slugs, semicolon-separated. Whether a grant covers reuse elsewhere is a question you can only answer if you know where it is. |
| 17 | `dijana_ai` | always | `tidak` · `ai-elemen` · `ai-penuh`. Strategy §2.7 — labelled whatever it depicts, so a future policy change is executable rather than archaeological. |
| 18 | `tarikh_diperoleh` | always | House date format. |
| 19 | `log_takedown` | optional | Every claim and its resolution, strategy §3.4. Dated. Append, never overwrite. |
| 20 | `nota` | optional | Anything the next person needs. Where a board-approved alt text exists, it is quoted here. |

---

## 4. `status_guna`

| Value | Meaning |
|---|---|
| `boleh-guna` | Licence recorded, evidence on file. May publish. |
| `kuarantin` | **Do not publish, do not delete.** Recoverable if a licence arrives. The 401 Real Wedding files. Deleting destroys the evidence trail and the only asset worth recovering. |
| `jangan-guna` | Presumed third-party. Not recoverable by asking, or not worth asking. |
| `belum-dihasilkan` | Commissioned or specified but not yet made. The register doubles as the production queue. |
| `ditarik-balik` | A licence was withdrawn, or a takedown succeeded. Row stays; the image goes. |

---

## 5. `license_class` — and how it cannot drift from the code

The five classes are policy (strategy §3.1) and they are also an enum in the
shipping code. Read from
`hellokahwin-site/src/lib/inspire/article-file.ts`, 24 Ogos 2026:

```
export const LICENSE_CLASSES = ['V', 'C', 'O', 'S', 'G'] as const;
```

| Class | Requires |
|---|---|
| `V` | vendor or photographer licence — a written grant naming the images, the scope and the credit wording |
| `C` | couple submission — a signed release from the couple **and** a licence from their photographer |
| `O` | commissioned — an agreement assigning or licensing the rights to us |
| `S` | stock — a retained receipt with the licence type and the purchase date |
| `G` | our own graphic — with any third-party font or icon licence recorded |

The parser trims and upper-cases before checking, so `v` and ` V ` both pass. It
rejects anything else, and the whole file with it.

**On the font licence that class `G` asks for: there is no font row, and there
should not be one.** The cover generator embeds no font file. It resolves
`'Segoe UI'`, Helvetica and Arial from the host at render time
(`scripts/covers/brand-tokens.mts` in the `hellokahwin-site` repo), so the PNG we
ship contains rasterised glyphs and no third-party font file is redistributed.
A rasterised glyph is not a font. There is nothing to license and nothing to
record.

*Verified 25 Ogos 2026 in the `hellokahwin-site` repo, worktree
`pillars-ingest-redirects`, `scripts/covers/brand-tokens.mts:38-47`. The file
says it outright:*

> `HelloKahwin ships zero webfont bytes on purpose ("an audience on cheap`
> `Android + slow connections"), so there is no brand font FILE in this repo to`
> `embed. librsvg resolves these against fonts installed on the host […]`
> `export const FONT_SANS = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";`

*A filesystem sweep of that repo found no `.ttf` or `.otf` outside
`node_modules`. If a webfont is ever embedded, this paragraph and a register row
change in the same commit.*

**The same finding has a cost the register has to carry: renders are
host-dependent.** librsvg resolves families from whatever the render box has
installed, so the same JSON on two machines can wrap differently. Until a font is
embedded, `nota` on a generated asset names the machine it was rendered on.

**`TIADA` is the sixth value in this register and it is deliberately not in the
parser's enum.** It means no licence class can be assigned, because no licence
exists. An asset carrying `TIADA` cannot pass ingest — which is the correct
outcome and the reason the sentinel was chosen to be one the code will refuse
rather than one it will accept. There is no way to describe an unlicensed image
in this register in terms the publishing path will take.

**If the enum in the code ever changes, this file and the register change in the
same commit.** Neither is allowed to move alone.

---

## 6. What the register says about the inherited library today

682 rows, `HK-L-0001` to `HK-L-0682`, generated 24 Ogos 2026 by direct parse of
`data/hellokahwin-export/content/media.json`. Nothing in them is inferred.

- **All 682 carry `license_class: TIADA`.** We cannot demonstrate a licence,
  a permission or ownership for a single one.
- **401 are `kuarantin`** (the `RW-` Real Wedding sets, strategy class A).
  **281 are `jangan-guna`** (269 `IN-` article imagery plus 12 loose items,
  classes B and C).
- **123 carry a creator name that the file asserts about itself.** 120 from the
  EXIF `copyright` or `credit` field, and **3 from a WordPress caption**
  (`kapsyen-wordpress`, added 25 Ogos 2026 — see §6.1). `bukti_pencipta` names
  which on every row. The other **559** read `TIDAK DIKETAHUI`, and that is a
  finding, not a gap.
- **Every `licensor_name` reads `TIDAK DIKETAHUI`.** Credit was given on the old
  site. Credit is not a licence.

A name in `pencipta` is what the file claims about itself. It is a lead for the
clearance programme, not a grant, and it must never be promoted into
`licensor_name` without evidence in `bukti_lesen`.

### 6.1 Corrections made 25 Ogos 2026, after a full usage audit

The 24 Ogos parse of `media.json` was accurate about the files. It was wrong
about where they are, and that is what rights exposure turns on.

- **`digunakan_dalam` was rebuilt from actual embedding.** It had been populated
  from the WordPress *attachment parent* — which post a file was uploaded to —
  rather than from whether it appears on a page. Resolving every
  `featured_media` id and every `/wp-content/uploads/` URL in every post body,
  with size suffixes normalised back to originals and **zero unresolved
  references**, gives: **618 of 682 embedded in a published post, 64 orphaned.**
  67 rows were wrong — 64 named an article for an image that is not on it, and
  3 under-reported cross-post reuse.
- **The 64 orphans carry `TIDAK BERKENAAN`**, because the column asks which
  articles use the image and the answer is none. Each one's `nota` names the
  post it was uploaded to.
- **An orphan is not proven unpublished.** Every one of the 682 has a public
  WordPress attachment URL in `media.json`, and whether those routes still
  resolve after the migration **cannot be established from the export**. Until
  somebody checks the live site, "orphaned" here means *not on an article* and
  does not mean *not served*.
- **`kapsyen-wordpress` added as an evidence class.** Six items carry a WP
  caption and four of them assert a creator the EXIF-only parse missed:
  `Reke Gubahan`, `Candid Photos`, `Ameir Fikri`, `Whitenery`. Recorded in
  `pencipta` where that field was `TIDAK DIKETAHUI`, appended to `nota` where
  EXIF already held a name. **Every `licensor_name` is still `TIDAK DIKETAHUI`.
  A caption is a claim the old site made about a file.**
- **The "22 alt strings read `wedding planner terbaik di malaysia`" figure was
  wrong. It is 17.** No case or whitespace variant reaches 22.
- **Zero of the 682 carry alt text that describes what the image shows.** Five of
  the six distinct strings are the article's target keyword repeated across every
  image on that page; the sixth is a raw filing path in the alt attribute.
- **There is no EXIF `artist` field in this export.** WordPress's `image_meta`
  block carries `copyright` and `credit` and nothing else rights-bearing. Any
  Artist or Usage-Terms EXIF in the originals would have to be re-read off disk
  with `exiftool`, which has not been done.

Ranked exposure and the request list built on these numbers:
`docs/plans/aug-23-2026-session-01/aug-25-2026-rights-risk-and-request-list.md`.

---

## 7. Maintaining it

1. **A row exists before the image is attached to a draft.** Not after.
2. **`bukti_lesen` is filled in the same sitting as `license_class`.** A class
   with no evidence pointer is the exact state the 682 are in.
3. **A takedown appends to `log_takedown`; it never overwrites.** Unpublish
   first, investigate second.
4. **Sorted by `asset_id`.** New rows append. Ids are never reused, including
   after a `ditarik-balik`.
5. **Nothing is deleted from this file.** A row for an image we no longer publish
   is the record that we once did.
