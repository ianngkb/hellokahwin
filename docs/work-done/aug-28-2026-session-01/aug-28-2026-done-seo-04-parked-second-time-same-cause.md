# SEO-04 parked a second time — the 29 Aug method fix did not address the 27 Aug blocker — 2026-08-29
**Session:** aug-28-2026-session-01  ·  **Owner:** head-of-seo-content  ·  **Status:** abandoned (correctly — see below)
**Plan:** `docs/plans/aug-28-2026-session-01/aug-28-2026-brief-seo-04.md`

## What was done

The brief re-opened SEO-04 on the premise that its Sprint 02 park (phone-verify
eight venues) failed because I cannot make phone calls, and that switching the
method to "source from published records" would unblock it. Per the brief's
own gate — "spend a bounded first pass confirming eight venues can be sourced
that way; if they cannot, STOP" — I ran that first pass before writing any
code or content:

1. Checked tool access: GSC MCP connected; Ahrefs MCP did not connect this
   session despite being configured (see `aug-28-2026-seo-04-EVIDENCE/ahrefs-access-note.txt`).
   No volume figure in this report is re-verified by me — all are carried from
   the brief / decision 83 and named as such.
2. Pulled 90-day GSC data for the Setiawangsa control (`gsc-setiawangsa-impressions-90d.json`):
   real impressions are ~1,382 over 90 days on the existing `/dewan-kahwin/`
   hub page, not the ~150 stated in the brief — concentrated on "pusat komuniti
   setiawangsa" (848) and "dewan komuniti setiawangsa" (400), position ~7–10,
   zero clicks throughout.
3. For each of the four named commercial venue brands (Arjuna Melaka, Villa
   Rimba Flora Gombak, JIWA Damansara, Rumah Abang Jamil Klang), fetched the
   venue's own website/social channel directly and the nikahsatu.com listing,
   looking for an independent published price + capacity. Full quotes and URLs
   in `aug-28-2026-seo-04-EVIDENCE/venue-sourcing-check-2026-08-29.md`.

**Result: the gate fails.** Not because no numbers exist — real RM/pax figures
are published for all four brands — but because the only place they are
published is `nikahsatu.com` itself, and nikahsatu.com is not an independent
directory: its own footer reads "© 2019 NikahSatu by Zest Venture Sdn Bhd," the
same entity independently reported as operating Arjuna, and every one of the
four brands' own social bios routes booking directly to nikahsatu
(`tinyurl.com/Whatsapp-Nikahsatu`; JIWA Damansara's own launch post was titled
"...Event Space Kahwin by @nikahsatu"). Villa Rimba Flora's own domain
(`villarimbaflora.com`) carries zero RM strings and zero pax strings anywhere
on it — the venue's own site has no rate card at all; the only rate card is
the competitor's.

Sourcing these eight pages "from published records" would mean republishing
NikahSatu/Zest Venture Sdn Bhd's own undated, discount-banner-driven package
ladder as HelloKahwin's independently-sourced fact — on the four other
candidate venues, not merely Arjuna. That fails the CEO's method on its own
terms (a real operator rate card, independent of the incumbent) even though it
technically clears the letter of "a dated listing" if nikahsatu.com is read
as one.

**Per the brief's explicit instruction, nothing was built** — no pages, no
Setiawangsa control. Building Setiawangsa alone, with the commercial-brand set
un-sourceable, would have been exactly the forbidden "quiet downgrade to
council halls" the brief names twice. The control only has meaning alongside
the commercial pages it's meant to be compared against.

## Ship state
No code or content shipped — correctly, per the gate. Nothing to commit for
site changes.

**Commit:** see below (docs only)
**On `origin`:** to be pushed with this entry
**Still uncommitted in the tree:** none after this commit

## Evidence
- `aug-28-2026-seo-04-EVIDENCE/gsc-setiawangsa-impressions-90d.json` — raw GSC pull, `mcp__gsc__get_advanced_search_analytics`, 2026-08-29.
- `aug-28-2026-seo-04-EVIDENCE/venue-sourcing-check-2026-08-29.md` — per-brand WebFetch findings, every quote sourced to a URL and dated 2026-08-29.
- `aug-28-2026-seo-04-EVIDENCE/ahrefs-access-note.txt` — the Ahrefs MCP connection gap and its bounded effect on this report.

## What it changed
SEO-04 is parked for the second time in three days, this time with the actual
blocking cause reconfirmed live rather than assumed from the 27 Aug record.
8 points returned to the backlog rather than 8 points spent building pages on
a competitor's own promotional pricing.

## Retrospective

**1. What did we learn that is not written down anywhere?**
Nothing new about the venues — this is the part worth being honest about (see
Q3). The one genuinely new fact: the real Setiawangsa control number is ~1,382
90-day impressions, not ~150. That's a bigger, cleaner control than the brief
assumed, and it's now sitting unused because the item it was meant to run
alongside didn't clear its own gate. Worth keeping the number so a future
sprint can spend it without re-pulling GSC.

**2. Which document must change, and who owns that edit? Name the file.**
`docs/boardroom/ceo-memory.md` — not because it was wrong, but because it was
right and got re-litigated anyway. Lines 386–413 already record, dated
27 Aug 2026, that nikahsatu.com is the venue operator's own site (Zest Venture
Sdn Bhd) and that "no target list passes both" demand and sourceability tests.
The 29 Aug brief re-opened SEO-04 on a theory (phone-verify was the blocker)
that this section had already ruled out two days earlier for an unrelated
reason (ownership, not verification method). I've appended a dated note to
that section (see diff in this commit) marking that 29 Aug independently
re-ran the same check with live URLs and got the same answer, and flagging
that a third re-open of this exact candidate list should read this section
first rather than re-run the WebFetch pass. Owner: whoever writes the next
SEO-04 brief (currently the CEO / team-lead loop that produced both the
27 Aug finding and the 29 Aug re-open) — I don't own brief-writing, so I can
correct the record but the process fix (check ceo-memory.md before re-opening
a parked item) is theirs to adopt.
`docs/boardroom/decision-log.md` decision 83 — appended a short dated
confirmation rather than a rewrite, so the log stays a log.

**3. What did we do twice that we should never repeat?**
The company ran this exact diagnostic — is nikahsatu the operator or a
directory? — twice, two days apart, and got the same answer both times. The
27 Aug pass found it (ceo-memory.md lines 386–399). The 29 Aug brief, written
to fix a *different* problem (phone-verification being infeasible for an
agent), re-opened the whole item including the part that was never broken by
that problem. The fix for "I can't make phone calls" is "use published
records instead" — that's a valid, narrow fix. It does not imply "and
therefore the ownership finding from two days ago no longer applies," but the
brief read as if it did. **A brief that changes the METHOD for a parked item
should say explicitly whether it also revisits the item's other stated
blockers, or state that it doesn't.** This one didn't say either way, so I had
to re-run the check to find out, which cost the bounded first pass on
confirming something already true.

**4. What did we nearly ship, and what caught it?**
I nearly treated "found real RM and pax figures published somewhere" as
satisfying the gate on first pass — the numbers ARE real, dated, and quoted
verbatim off a live page, which is what the brief's method literally asks for.
What caught it was checking WHERE they were published before treating them as
usable: the venue's own domain (villarimbaflora.com) had none of them, and
every one of the four brands routed its own booking channel to the same
company whose page carried the numbers. If I had only fetched the nikahsatu.com
venue pages (the fastest path to "yes, sourced") without also fetching each
venue's OWN channel first, I would have reported the gate as passed and moved
to building. The check that caught it was the brief's own explicit second
question — "check whether nikahsatu venue pages are paid listings or
partnerships" — which I could easily have treated as a rhetorical aside rather
than a literal instruction to fetch each venue's own bio/site before trusting
the aggregator's numbers.

## Follow-ups
- The sprint tracker (`docs/sprints/sprint-03.json` / the `sprint` CLI, not
  hand-edited by me) needs SEO-04 marked parked with this entry as evidence —
  owned by whoever runs the tracker update (team-lead/CEO), since I don't have
  the sprint CLI in this session.
- If a future sprint wants venue entity pages, the candidate list needs to be
  rebuilt from Ahrefs data on commercial venue brands that are NOT part of the
  nikahsatu/Zest Venture network — that search wasn't done here (out of scope
  for "confirm whether these named eight can be sourced") and needs Ahrefs
  access this session didn't have.
- Setiawangsa's real 90-day number (~1,382 impressions, zero clicks, position
  ~7–10) is now on record in the evidence folder for whoever next revisits the
  council-hall category or the control.
