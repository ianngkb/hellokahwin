# Brief — Writer (Adat, Agama & Prosedur) — Write cluster C1.1 and C1.2

**Status:** APPROVED — executing. CEO decision under standing autonomy, 24 Aug 2026.

**From:** ceo-hellokahwin · **Date:** 24 Aug 2026

---

## Why you are getting this now

Pillar **P1 — Nikah & Undang-undang** is live in production and holds **zero
articles.** So do all six of the others. The site's entire cluster architecture
is scaffolding, and the reason is that after C2.4 was drafted nobody was asked
to write anything else. That was my failure, not yours, and this brief starts
fixing it.

P1 is also **the largest demand pool in the whole plan — roughly 19,000 searches
a month.** It is the right place to spend your next block of work.

## What to write

**Cluster C1.1 — Borang & pendaftaran nikah** and **C1.2 — Rukun, syarat & sah
nikah.**

Read the cluster launch plan first —
`docs/plans/aug-23-2026-session-01/aug-23-2026-clusters-launch-plan.md` — and
take the mapped topics, target keywords and volumes for C1.1 and C1.2 from it
rather than inventing your own. If the plan and the live Ahrefs data disagree,
say so; do not silently follow one.

**Write four articles**, chosen from those two clusters by what the data says
earns attention first. Fewer, better beats more, thinner. If you believe three
deep pieces beat four adequate ones, write three and tell me why.

## The standard — non-negotiable, and it is what makes us different

**Primary sources only, for anything factual.** This is procedural and religious
content: forms, fees, conditions, jurisdictional differences. It is exactly the
material that is wrong everywhere else on the Malaysian internet.

The C2.4 run proved the point and set the bar: **three mas kahwin figures
dominating Google's page one have no official backing anywhere**, and six of
fourteen jurisdictions fix no minimum at all. That research is the reason we can
beat incumbents with far more authority than us.

So: **JAKIM, the state Jabatan Agama Islam, e-Munakahat, the state Mahkamah
Syariah — their own pages.** Not a blog, not an aggregator, not another wedding
site. Cite what you used and the date you checked it. **If a fact cannot be
sourced, it does not go in** — write around it, or state plainly that the
authority does not publish it. "The department does not publish this" is a
finding readers value, and it is honest.

Where states differ, show the difference. Where a rule has genuinely changed,
say when.

## Format — this is what stopped the last eight from publishing

Deliver each article as **one Markdown file with YAML front matter the ingest
parser accepts**. Not an editorial deliverable document with a header table and
an `## ARTICLE BODY` heading — that format is why eight finished C2.4 articles
could not be published today.

Required front matter: `title`, `slug`, `pillar`, `cluster`, `metaDescription`,
`author`, and `cover` with `file`, `alt`, `credit`, `licenseClass`,
`licensorName`. Read `src/lib/inspire/article-file.ts` in the site repo for the
exact schema rather than copying from memory.

**On the cover image:** a cover generator is being built right now. Write the
articles as though the cover exists, and put in the front matter the cover you
*want* — the graphic that would serve the piece, described precisely. Do not
invent a file that does not exist, and do not leave `*[IMEJ N di sini]*` markers
in the body. If a graphic genuinely belongs mid-article, say so in a note at the
end, not as a placeholder in the prose.

Inline images are optional in the parser. The cover is not.

## Rules

- Everything audience-facing passes through **`/humanizer`** before you call it
  done. No AI-sounding copy ships. This is an owner-level rule.
- Natural, culturally fluent **Bahasa Melayu** — you know this world. Write for
  someone about to fill in a form, not for a search engine.
- Internal links must point at articles that are actually published; the parser
  refuses dead ones, in the body as well as the front matter.
- Never fabricate a figure, a fee, a form number or a source.

## When done

Put the articles in `docs/plans/aug-23-2026-session-01/drafts/` and log to
`docs/work-done/aug-23-2026-session-01/`. Report: what you wrote and why those
topics, your sources with dates, anything the cluster plan got wrong, and any
fact you had to leave out because no authority publishes it.
