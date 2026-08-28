#!/usr/bin/env python3
"""Re-run the DES-06 search-coverage measurement against live production.

Takes the GSC query export in this folder, puts every query through
hellokahwin.com's own search API, and reports how much real demand the site's
search can actually answer.

    python reproduce.py

No credentials needed: the search API is public. The GSC export is a fixed
snapshot (31 Jul - 27 Aug 2026) so the number is comparable over time; pull a
fresh export to measure a different window.

Numbers reported on 28 Ogos 2026, deploy dpl_F5167dU7CpzegpfMXWnVDTB6Y8j2:
    zero results for 209 of 248 queries (84.3%)
    which is 1292 of 1823 impressions (70.9% of real demand)
"""
import json
import os
import sys
import urllib.parse
import urllib.request
from collections import Counter
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
QUERIES = os.path.join(HERE, "gsc-queries-2026-07-31-to-2026-08-27.tsv")
API = "https://hellokahwin.com/api/v1/search?type=articles&limit=20&q="


def load():
    rows = []
    with open(QUERIES, encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            q, clicks, imps, pos = line.rstrip("\n").split("\t")
            rows.append((q, int(clicks), int(imps), float(pos)))
    return rows


def probe(row):
    q, clicks, imps, pos = row
    url = API + urllib.parse.quote(q)
    for _ in range(2):
        try:
            with urllib.request.urlopen(url, timeout=25) as r:
                return (q, clicks, imps, pos, len(json.load(r)["data"]["articles"]))
        except Exception:
            pass
    return (q, clicks, imps, pos, -1)


def main():
    rows = load()
    with ThreadPoolExecutor(max_workers=8) as pool:
        res = list(pool.map(probe, rows))

    total = sum(r[2] for r in res)
    zero = [r for r in res if r[4] == 0]
    errors = [r for r in res if r[4] < 0]

    print(f"queries tested   {len(res)}")
    print(f"request errors   {len(errors)}")
    print(f"zero results     {len(zero)}/{len(res)} queries ({len(zero)/len(res):.1%})")
    zi = sum(r[2] for r in zero)
    print(f"                 {zi}/{total} impressions ({zi/total:.1%} of real demand)")

    print("\nbiggest zero-result queries")
    for r in sorted(zero, key=lambda x: -x[2])[:15]:
        print(f"  {r[2]:5d} imp  pos {r[3]:5.1f}   {r[0]}")

    print("\nresult-count distribution, impression weighted")
    buckets = Counter()
    for r in res:
        buckets[-1 if r[4] < 0 else min(r[4], 6)] += r[2]
    for k in sorted(buckets):
        label = "ERR" if k < 0 else ("6+" if k == 6 else str(k))
        print(f"  {label:>4} results  {buckets[k]:5d} imp ({buckets[k]/total:5.1%})")

    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())
