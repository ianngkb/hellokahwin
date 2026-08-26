# Brief — Writer (Adat, Agama & Prosedur) — P3 and P7. Both pillars, this run.

**Status:** APPROVED — executing. CEO decision under standing autonomy.

---

## Where we actually are

Eight C2.4 articles went live last night. **P2 is the only pillar out of
`noindex`.** P1 and P6 have eight articles written and in review right now.

**P3, P4, P5 and P7 have nothing written at all.** Not blocked — never
commissioned. That is on me: I ran one cluster at a time with myself as the
bottleneck while you sat idle. This brief and its twin fix that by commissioning
all four remaining pillars at once.

**You have two of them. Both in this run.**

## What to write

**P3 — Ucapan, Doa & Adab Majlis**
- C3.1 Ucapan pengantin baru
- C3.2 Doa perkahwinan
- C3.3 Ulang tahun perkahwinan, pantun & adab tetamu
- C3.4 Aturcara & pengacara majlis

**P7 — Sebelum Nikah: Jodoh, Merisik & Tunang**
- C7.1 Jodoh, taaruf & istikharah jodoh
- C7.2 Merisik & meminang
- C7.3 Cincin tunang, nikah & merisik
- C7.4 Majlis pertunangan & doa
- C7.5 Adat perkahwinan Melayu & mandi bunga

**Write six articles: three per pillar.** Three is enough to take a pillar out of
`noindex` with real depth beneath it, and it is the fastest route to a visible
architecture. Pick the three per pillar that the data says earn attention first,
from `docs/plans/aug-23-2026-session-01/aug-23-2026-clusters-launch-plan.md`.

**One thing worth knowing:** `ppsignature.com` — the incumbent that matters, ~31,400
MY visits/month — earns almost all of it on **religious and procedural content**.
`solat istikharah` alone is 7,148/mo. C7.1 sits directly in that territory. Read
the venue-gap memo's competitor section before you plan.

## The standard

**Primary sources for anything factual.** Doa and their transliteration, adat
sequence, what a wali actually does, which parts are religious obligation and
which are custom. JAKIM, state Jabatan Agama, recognised kitab — not other
wedding blogs.

**The distinction that will define these articles: what is `hukum` and what is
`adat`.** Malay wedding content routinely presents custom as religious
requirement. Getting this right is our differentiator on P3 and P7 in the same
way that "six of fourteen states fix no minimum" was on C2.4 — say plainly when
something is culture rather than obligation, and say when practice varies by
state or family.

**Arabic text, transliteration and translation must all be correct.** If you
cannot verify a doa's wording against a reliable source, leave it out and say
the source does not publish it. A wrong doa is worse than no doa.

Never fabricate a hadith, a source, or an attribution.

## Format — non-negotiable

**One Markdown file per article with YAML front matter the parser accepts** —
exactly the format you used for the C1 articles, which was correct and is why
they are in review rather than stuck. Read `src/lib/inspire/article-file.ts` if
you need the schema again.

- **No `*[IMEJ N di sini]*` markers.** Ever.
- **Name the cover you want** precisely in the front matter — the generator is
  parameterised and covers are produced from your description.
- **In-article images:** if a graphic genuinely helps — an adat sequence, an
  aturcara timeline, a doa card — describe it in an `images:` entry with real
  Malay alt text and `credit: HelloKahwin`, `licenseClass: G`. Those are being
  built. Do not describe a photograph we do not have the rights to.

## Rules

- **`/humanizer` on everything** before you call it done.
- Natural, culturally fluent Bahasa Melayu.
- Internal links must point at published articles. **Eight new C2.4 URLs went
  live last night under `/artikel/hantaran-mas-kahwin/`** and are valid targets.
- Never fabricate.

## When done

Articles into `docs/plans/aug-23-2026-session-01/drafts/`, log to
`docs/work-done/aug-23-2026-session-01/`. Report: what you wrote and why, sources
with dates, every place you had to separate hukum from adat, and anything you
left out for lack of a reliable source.
