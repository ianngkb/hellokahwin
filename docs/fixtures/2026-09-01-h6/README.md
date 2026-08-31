# H6 fixtures — one per clause, so no clause is trusted untested

Six pages for `scripts/measure/check-h6.sh`, the checker for DES-03 §7.5
rule H6 (homepage category diversity). Each one isolates a single clause, so a
checker that passes everything, or fails everything, cannot hide inside a
plausible verdict.

Every `href` is a real published HelloKahwin article path, read off
`https://hellokahwin.com/sitemap.xml` on **01 September 2026** (86 articles
across 15 categories). No placeholder slugs: a fixture built from `/article/one`
would not have exposed that the extraction rule has to ignore two-segment
category links, which every one of these pages carries in its `<nav>`.

| Fixture | N | What it isolates | Expected |
|---|---|---|---|
| `pass.html` | 13 | Conforming set: 5 hantaran at the cap, nothing adjacent, 9 categories | exit 0 |
| `fail-run.html` | 13 | The same 13 articles, two hantaran items adjacent — **H6.2 only** | exit 1 |
| `fail-share.html` | 13 | 7 hantaran, perfectly alternated so no run — **H6.1 only** | exit 1 |
| `fail-floor.html` | 13 | 3 categories at 5+4+4, no run, nothing over cap — **H6.3 only** | exit 1 |
| `fail-empty.html` | 0 | Chrome and category links render, zero articles — **H6.0** | exit 1 |
| `pass-short.html` | 4 | Shortest set H6.5 permits, cap `ceil(4/3)=2`, floor drops to 3 | exit 0 |

Run all six:

```
for f in pass fail-run fail-share fail-floor fail-empty pass-short; do
  bash scripts/measure/check-h6.sh docs/fixtures/2026-09-01-h6/$f.html >/dev/null
  echo "$f exit=$?"
done
```

## What `pass-short.html` caught, before anything shipped

The first draft of H6.3 read *"at least min(4, K) distinct categories"*. At
N=4 that demands four categories across four items, while H6.1's cap of
`ceil(4/3)=2` explicitly permits two items from one — two clauses of the same
rule contradicting each other at the small end. Nothing in the prose showed it.
The N=4 fixture failed, and the floor became `min(4, K, N − cap + 1)`.

A rule is not written until a case it should reject has actually been rejected
and a case it should accept has actually been accepted.
