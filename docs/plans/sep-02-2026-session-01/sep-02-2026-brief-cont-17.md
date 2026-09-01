# CONT-17 — Deepen the doa pillar - the family that converts at 4.5% and sits at position 21.7

**Sprint 06** · `content` · **12 points** · owner `writer-inspirasi-vendor-venue`
**Dispatched:** 02 September 2026, AFTER SEO-14 reported · space: **DOCS** · integration branch **`feat/command-centre-dashboard`**
**Your row:** `pnpm --silent sprint get CONT-17 --sprint 6`

## DEFINITION OF DONE — verbatim, and it is not narrowed

SIX ARTICLES LIVE IN PRODUCTION, each returning 200 on FIRST request with the status line and X-Vercel-Cache quoted. Sitemap <loc> count rises from 109 to 115, quoted before and after. Each carries the COMPLETE artefact - the full doa in Arabic, DBP-method rumi and Malay meaning - verified by quoting the first and last line from LIVE HTML, never a summary. Every doa, Arabic string, transliteration and religious claim carries its NAMED AUTHORITY, THE EDITION, and the date checked, quoted from the live page. PRE-FLIGHT #1 (check-serp-shape.py) exit 0 and PRE-FLIGHT #3 (check-family-owned.py) exit 0 recorded per target; a target failing either is not written. Each article emits FAQPage where it has genuine Q&A and carries a contents list per UI-18's rule.

---

## ⚠ SEO-14 HAS REPORTED. YOU MAY PROCEED — AND YOUR TARGETING IS RE-AIMED.

**The gate is open.** The CEO ran it, not read it:
`python scripts/seo/census-restate.py docs/work-done/sep-02-2026-session-01/serp-shape-census-2026-09-02.csv`
→ **`CONT-17 MAY PROCEED — the document/number split has not collapsed`**, `RESTATE EXIT: 0`.

| | worst re-cut | vs floor | CI |
|---|---|---|---|
| frozen `intent_of` | **7.5×** | 2.3× | 3.00×–18.5× |
| gate classifier | **6.5×** | 2.3× | 2.74×–15.3× |

**12.2× → 7.5× is NOT a fall.** 7.5× sits inside SEO-11's own 3.39×–44.0× interval
and the band now carries 20 clicks against 13 — the estimate got *precise*, the
effect did not shrink. Do not read it as decay and do not re-litigate it.

### ⚠ TWO CORRECTIONS TO THE BRIEF THAT CHANGE WHAT YOU TARGET

**1. "The doa family sits at mean position 21.7" is WRONG as the CEO stated it.**
That is the *unweighted* mean of 34 per-query positions. **Impression-weighted it
is 9.8.** Twenty queries carrying 29 of the family's 221 impressions at a mean of
29.9 drag it out, while `doa pengantin baru rumi` alone sits at **position 3.74**
with 84 impressions and 8 of the family's 10 clicks. **So "we are barely competing
on our best territory" is false.** Do not build on it.

**2. The build signal survives in a better and more specific form — TARGET THIS:**

> **56 document-intent queries inside the cited CTR curve carry 191 impressions
> and ZERO clicks against 6.89 expected. P(zero) = 0.001.** The largest sit at
> positions **4.27, 4.67 and 10.60**.

**Weight toward queries WHERE WE ALREADY RANK AND DO NOT CONVERT — not toward
depth.** A query at position 4 earning nothing is a title, snippet or artefact
problem we can fix; a query at position 30 is a different, longer bet. The census
CSV names all 56; start there rather than from a keyword tool.

### ⚠ AND THE LIMIT SEO-14 VOLUNTEERED, WHICH YOU MUST NOT PAPER OVER

**Sprint 05's six doa articles have ZERO impressions in GSC** — in both data
states, across every window tested, including one run specifically to reach their
01 Sept publication date. All six return 200 from production, so the zero is
Google's, not the pipeline's. **This census re-measures the thesis; it does NOT
score Sprint 05's intervention.** The earliest window that can score it starts
2026-09-02 and is not final until roughly 05 September.

**What that means for you:** you are writing into a family whose most recent six
articles have no measured outcome yet. That is a real risk and the honest response
is to target the 56 zero-click queries above — where the evidence already exists —
rather than to assume the last six worked.

**BOTH GATES STILL APPLY, unchanged:** PRE-FLIGHT #1 (`check-serp-shape.py`,
exit 0 = document intent) and PRE-FLIGHT #3 (`check-family-owned.py`, exit 0 =
not already owned), exit code recorded per target. Decision 170's ≥220 monthly
floor for document intent. Decision 162's religious-text authority gate, and
decision 186's ratification: HelloKahwin produces its own rumi under DBP's
Pedoman Transliterasi, disclosed on the page, with the Arabic and its meaning from
a named authority — **carrying that authority's EDITION and the date checked**,
because the JAKIM PDF ranking at position 3 is the withdrawn 2007 edition.

**If fewer than six targets clear, STOP AND BRING IT BACK.** A parked CONT-17 with
a clear reason is a good outcome. CONT-16 did exactly that last sprint and was right.

---

## STANDING RULES

**DONE MEANS SHIPPED** — ingested to production, URL returns 200 on FIRST request,
and a reader can find it. Content merges to **`feat/command-centre-dashboard`**;
never open a PR into `master`, which is the SITE space and where DES-17's PR #37
nearly moved the company record last sprint.

**⚠ CODE REVIEW IS DONE BY CLAUDE, NOT OPENAI** — owner directive, 02 Sept 2026.
Do NOT dispatch `codex-reviewer`; do not route review through Codex, `/autopilot`'s
default reviewer, or any OpenAI-backed path. **State in your work-done log which
reviewer you used.**

**YOUR DoD IS NEVER NARROWED.** Park with a reason instead.

**VERIFY YOUR OWN CHECKS.** A surprising ABSENCE means verify the CHECK first.
Enumerate what IS there rather than testing for what you assume. Never combine
`grep -o -i -F`. Read exit codes directly, not through a pipe. Quote paths with
spaces.

**PRODUCTION WRITES: push a precise UNDO first**, naming exact slugs.

**STAGE 9 RETROSPECTIVE is part of this item** — name the file that must change and
**make the edit**. Persona edits go to
`~/Documents/Code/buddy/skillcentral/agents/projects/hellokahwin/`, never to
`.claude/agents/` in a worktree, which is gitignored and reaches nothing.

**All content passes `/humanizer` before it is done.**

## When you finish

Print your completion sentinel as the FIRST THING ON A LINE: the word `ITEM`, a
space, `EXIT:`, a space, then your exit code. Nothing else on that line.
