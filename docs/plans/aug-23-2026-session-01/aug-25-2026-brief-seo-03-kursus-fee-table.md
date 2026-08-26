# Brief — Writer (Adat, Agama & Prosedur) — SEO-03: the kursus kahwin fee table

**Status:** APPROVED — executing. Sprint 01, item SEO-03, 2 points.
**Dispatch with `-PermissionMode bypassPermissions`.**

## Research and draft now. The production write is gated.

Do everything except the final update to the live article. RISK-01 (a production
recovery point) is still open, and nothing writes to the production database
until it closes. **That gate does not stop the actual work** — the research is
the item; the write is thirty seconds at the end.

---

## Why this is time-sensitive

`/artikel/idea-dan-nasihat/kursus-kahwin` used to claim fees run "RM120–RM150"
with no state, no authority and no date. It was wrong at the bottom — JAIS
Selangor publishes RM100 — and the sentence was **pulled on 25 Aug**, replaced
with an honest *"Yuran kursus ditetapkan oleh Jabatan Agama Islam negeri
masing-masing dan berbeza mengikut negeri."*

True, but thin. The real table was never built.

**Penang moves RM100 → RM120 on 1 September — six days away.** Whatever we
publish must state both figures and the changeover date, or it is wrong within
the week.

## Definition of done — verbatim from the sprint file

> Fourteen rows, each sourced primarily and dated, does-not-publish recorded
> where true, Penang's change stated with both figures and the changeover date.
> Government PDFs read by word coordinate, never `pdftotext -layout`.

## The methodology rule, and it is not advice

**Read government PDFs by word coordinate.** `pdftotext -layout` silently
misaligns fee columns — the verification lead found two of four blocks in the
P1/P6 batch that way, and the layout tool would have published a wrong Perak
figure. This is now a standing rule in your own persona.

## What the table must contain

Fourteen jurisdictions. Per row: the fee, the authority that publishes it, the
URL or document, and the date you checked.

**"This authority does not publish a rate" is a valid row and a valuable one.**
Six of fourteen jurisdictions fix no minimum mas kahwin at all, and saying so
plainly is what beat incumbents with far more authority than us on C2.4. Do the
same here. Do not fill a gap with a plausible number.

Two known frictions from earlier work: Pulau Pinang's e-Munakahat host was down
on 25 Aug — if it still is, say so and try JHEAIPP directly. JHEAINS Sabah
updated its FAQ on 25 Aug and still publishes no rate; that is a dated negative,
and it strengthens the article rather than weakening it.

## Deliverable

The updated article body, ready to ingest, in
`docs/plans/aug-23-2026-session-01/drafts/`. **Do not ingest it.** Report that it
is ready and I will release it once RISK-01 closes.

Keep everything else on that page untouched — its other content has not been
verified and is out of scope.

## Rules

- Primary sources only. `/humanizer` on anything audience-facing.
- Never fabricate a fee, an authority or a date.
- No production database writes in this brief.

## When done

Log to `docs/work-done/aug-23-2026-session-01/`, then a **`## Retrospective`** —
Stage 9, mandatory. Name the file that must change, and edit it.
