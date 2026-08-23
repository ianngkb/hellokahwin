# Org Design & The Editorial Review Board

**Status:** CEO decision — hires proceeding
**From:** ceo-hellokahwin · **Date:** 23 Aug 2026
**Board directive:** *"Operate as if you are running a billion dollar company
and there are no limits to who you can hire… smartly raise the right agents
for the right job."*

---

## The decision

Five roles, hired in dependency order. I am applying the billion-dollar
framing the way a real media company would — **not by hiring more people, but
by refusing to let one person hold two jobs that need different instincts.**
Every role below exists because something in our system currently has no
owner, and I can name what breaks without it.

| # | Role | Exists because | Order |
|---|---|---|---|
| 1 | **Managing Editor** | Nobody owns voice, and 80 articles cannot be written without one. Also owns the review board. | **First — blocks writing** |
| 2 | **Editorial Verification Lead** | Nobody independently checks accuracy; nothing detects stale facts (R19 is traffic-triggered). | Before publish |
| 3 | **Writer — Adat, Agama & Prosedur** | ~67,000 searches/mo of procedural and religious content, the majority of the map. | With #1 done |
| 4 | **Writer — Inspirasi, Vendor & Venue** | The directory/venue engine that carries 40%+ of competitors' traffic. | With #1 done |
| 5 | **Full-Stack Engineer** | The Next.js site has no content-ingest path, and the board wants a tracking dashboard. Nobody owns the codebase. | Parallel, independent |

**Deferred, deliberately:** Visual Content Lead. The visual asset strategy is
still in production. I will not hire against a gap whose shape I do not yet
know. If that work recommends the role, it comes with evidence.

**On the human reviewer:** dropped, per board. Everything stays in-agent.
The Editorial Verification Lead therefore carries the full weight of accuracy
— which raises the bar on that hire rather than lowering it.

---

## Why a Managing Editor, and why first

The board asked for a tone "applicable to the general mass" and asked that
tone be researched rather than assumed. That is not an SEO job. Search
strategy decides *what* we write; voice decides *how it reads*, and a site
publishing 80 articles in 13 weeks without a defined voice produces 80
different voices.

The Managing Editor owns:
- **The voice**, derived from researching how mass-market publishers actually
  write for a general Malaysian audience — not invented from taste.
- **The style guide** every writer works to: reading level, sentence length,
  how much Arabic/religious terminology a general reader can carry, formality
  register, how to be warm without being a brochure.
- **Simplification** — the board's explicit third goal. Our content is
  procedural and legally dense; the default failure mode is writing that is
  accurate and unreadable.
- **The review board** below.

They report to me. Voice and QC authority sitting under the person who owns
the traffic target would lose every argument with the calendar — the same
reason verification reports to me.

---

## The Editorial Review Board (`/bmad-party-mode`)

**Board directive:** *"create an opportunity for a 'review' process, which
will generate the /bmad-party-mode and get them to critique and update every
article written. The goal is to ensure accuracy, up-to-date (do research
online) and also to simplify it."*

Every article passes a convened review before it can publish. Not a checklist
run by one person — a room, with four seats that genuinely disagree.

| Seat | Critiques for | The question they ask |
|---|---|---|
| **Editorial Verification Lead** | Accuracy & currency | "Is this true, is it attributed to the right state's enactment, and is it *still* true as of today?" — **researches online during the review**, not from memory |
| **Managing Editor** | Clarity & simplification | "Would a reader with no background understand this on one pass? What can be cut?" |
| **Head of SEO & Content** | Coverage & intent | "Does this answer what the searcher wanted, does it beat what ranks now, does it cannibalise a sibling?" |
| **The writer** | Defends and revises | Answers the room, then makes the changes |

**Rules of the room**
1. **Every article goes through it.** No exceptions for deadline pressure.
2. **The verification seat can block.** Accuracy is not weighed against the
   calendar.
3. **Live research is mandatory** on any claim that can expire — rates, fees,
   procedures, prices. "It was true when written" is not a defence.
4. **Simplification is a required output, not optional feedback.** Every
   review names at least one thing to cut or make plainer.
5. **The room produces an updated article**, not a list of notes. The writer
   revises inside the session.
6. **/humanizer runs after revision**, not before — otherwise the review
   undoes it.
7. **Output is logged** to `docs/work-done/` with what changed and why, so we
   can see over time which failure modes recur and fix them upstream in the
   brief.

This board is also our answer to the incumbents. ppsignature is a dress shop
with a blog; nikahsatu is a blog. None of them convenes four specialists per
article. That is a quality gap they cannot close cheaply.

---

## The tracking dashboard

**Board directive:** *"an interactive html website that will list it all out,
track it, update it… our own dashboard to track history of our chats, what
has been updated and so on."*

Owned by the Full-Stack Engineer (hire #5), first task. Requirements:

- Reads the real files — `docs/boardroom/` (memory, decision log, minutes),
  `docs/plans/`, `docs/work-done/` — so it can never drift from the truth.
- **Timeline view**: every meeting, decision, plan and completed piece of
  work in date order, filterable by session, owner and status.
- **Decision tracker**: what was decided, on what evidence, what was
  predicted, and — the valuable part — **what actually happened**, so
  predictions get scored.
- **Plan status**: DRAFT / APPROVED / SUPERSEDED at a glance.
- **Live metrics** where we have them: GSC clicks, impressions, position,
  and the weekly article count, which is our leading indicator.
- Regenerates on demand so it stays current rather than becoming another
  stale document.

---

## Hiring method

Every hire goes through `/raiseagents`, one invocation each, as the owner
mandated — no shortcuts, no batching. Each new agent is filed into the
HelloKahwin project org chart and dispatched in a visible Orca terminal.
