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

## The third clause, which cost a false green the next hour (UI-13, 01 Sept 2026)

All six fixtures above exercise a VERDICT. None exercises an ERROR, and
`check-h6.sh` promises three exit codes, not two — `3` is "could not fetch, or
usage error. NOT a verdict about the page."

It could not deliver that. `fetch()` is called only inside a command
substitution, so it runs in a subshell and `die`'s `exit 3` killed the subshell
alone; the parent read an empty description and carried on over an empty file.
On the first live run of UI-13 the sitemap fetch failed on this machine's known
TCP stall, and the script printed a verdict anyway:

```
corpus:                                    <- silently blank
H6.3  FLOOR       pass — 2 distinct categories, floor min(4,K,N-cap+1)=1
corpus: 0 published articles across 1 categories
        H6 IS NOT SATISFIABLE at N=13. H6.5's fallback applies: ...
```

Both lines false, and **both lenient in the same direction**. An empty corpus
makes `K=1`, which drags H6.3's floor from 4 to 1, so H6.3 reported PASS on a
two-category homepage — near enough the exact page the rule exists to reject.
And the satisfiability line inverted: it blamed a corpus of 89 articles for a
build defect and pointed at H6.5's truncation ladder, which is the instruction
to ship a SHORTER homepage rather than a fixed one.

Fixed in `check-h6.sh` (`fetch` returns 3; the caller dies in the parent; a
corpus that parses to zero article URLs is also exit 3, because `printf '%s\n'
""` emits one line and `wc -l` therefore reports `1` for the empty case and
cannot detect it). Proved against the failing case, and the four controls now
run on every push from the blocking `ui-layout-gate` CI job rather than living
here as prose.

So the sentence above is one clause short. It should read:

> A rule is not written until a case it should reject has actually been
> rejected, a case it should accept has actually been accepted, **and a case it
> cannot judge has actually been refused.**

An error path that has never been executed is not an error path. It is a
comment, and this one was silently lenient — which is the only kind that
survives, because the loud kind gets fixed the first time anyone runs it.
