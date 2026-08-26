# Brief — Editorial Verification Lead — Verify the twelve unreviewed articles

**Status:** APPROVED — executing. Owner directive, 25 Aug 2026: verify the facts
of every article we are publishing.

**Dispatch with `-PermissionMode bypassPermissions`.**

---

## The gap

Twenty-eight articles are in the publishing pipeline. **Twelve of them have had
no verification of any kind** — they were written today and went straight into
the queue:

| Pillar | Articles |
|---|---|
| **P3** Ucapan, Doa & Adab Majlis | `P3-A1`, `P3-A2-doa-pengantin-baru`, `P3-A3-doa-majlis-perkahwinan` |
| **P4** Busana & Penampilan | `C4-1-A1-baju-pengantin-sewa-atau-beli`, `C4-1-A2-songket-tenunan-tangan-atau-cetak`, `C4-2-A1-inai-tangan-pengantin` |
| **P5** Pelamin, Kad & Cenderahati | `C5-1-A1-pelamin`, `C5-2-A1-contoh-kad-jemputan-kahwin`, `C5-4-A1-bunga-telur` |
| **P7** Sebelum Nikah | `P7-A1-cincin-tunang`, `P7-A2-taaruf-maksud`, `P7-A3-doa-majlis-pertunangan` |

All in `docs/plans/aug-23-2026-session-01/drafts/`.

**Nothing here publishes until you have ruled on it.** That is not a formality —
your first two outings found a fabricated quotation printed as a direct quote, a
false premise a writer built a thesis on, a non-existent RM45 fee that came out
of our own "verified" table, and a Perak figure that only surfaced because a PDF
was read by word coordinate.

## Carry forward what you learned this morning

**`pdftotext -layout` silently misaligns government fee columns.** You found two
of four blocks only because you read the PDFs by word coordinate instead. That
is now a standing rule and it applies to everything in this batch that quotes a
government figure.

## What to check, in priority order

1. **Religious content is the highest risk in this batch.** P3 is doa and adab;
   P7 is taaruf, istikharah and pertunangan. **Every Arabic text,
   transliteration and translation must be verified against a reliable published
   source.** A wrong doa is worse than no doa. The writer already reports leaving
   out a lafaz that only circulates on blogs, and omitting JAKIM Arabic that
   carries a reproduction restriction — confirm both judgements and check nothing
   similar slipped through.
2. **Hukum versus adat.** The writers were told to separate religious obligation
   from Malay custom, and to say when practice varies by state or family. Check
   they did, and that nothing presents custom as obligation. This is our
   differentiator on P3 and P7 and it is also where being wrong causes real harm.
3. **Every price and material claim on P4 and P5, with its date.** Songket
   pricing, sewa versus beli, inai, pelamin, kad, bunga telur. The C2.4 run found
   three figures dominating Google's page one with **no official backing
   anywhere**; bridal and decor pricing is at least as unreliable. The P7 writer
   reports using Bank Negara's Kijang Emas figure with the arithmetic **labelled
   as ours** rather than quoting retail ring prices — verify that labelling is
   honest and visible to a reader.
4. **No fabricated quotations, authorities, hadith or attributions.** Character by
   character.
5. **Internal links resolve to published articles.** The parser refuses dead
   links in the body as well as the front matter, so a bad link is a hard publish
   failure. Eight C2.4 URLs are live under `/artikel/hantaran-mas-kahwin/`; the
   P1 and P6 articles are **not published yet**, so a link to them will fail.
6. **`/humanizer` was applied.** You already caught a house tic — *"Satu nota
   kecil yang menjimatkan masa:"* opening paragraphs in two articles by two
   different writers. Check whether it recurs here.

## How to report

Per article: **PASS**, **PASS WITH FIXES** (list them, minimal), or **BLOCK**
(what is wrong, and what would unblock it).

**Do not soften a block because publishing is urgent, and do not invent findings
to look diligent.** If an article is clean, say so — that is a real outcome and I
will believe it. Where a fix is small and unambiguous, make it and say what you
changed. Where it needs the writer, name what they must do.

## When done

Log to `docs/work-done/aug-23-2026-session-01/`. Report the verdict per article,
every block with its evidence, what you fixed yourself, and anything a writer
must return to.
