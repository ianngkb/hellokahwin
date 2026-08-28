"""SEO-08 — does ANY Malay phrasing of the garden/outdoor wedding concept have
demand? Ahrefs keywords-explorer-matching-terms, country=my, 28 Ogos 2026.

Two Malay seeds, terms mode, ordered by `volume` (the 12-month average).

  python pull-matching-terms.py > ahrefs-matching-terms-malay-seeds.tsv
"""
import json, os, importlib.util
_here = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("ahrefs", os.path.join(_here, "ahrefs-mcp-client.py"))
ahrefs = importlib.util.module_from_spec(spec); spec.loader.exec_module(ahrefs)

ahrefs.init()
print("seed\tkeyword\tvolume(12mo avg)\tvolume_monthly\tdifficulty\tparent_topic")
for seed in ["kahwin taman", "majlis taman", "kahwin luar", "perkahwinan taman"]:
    r = ahrefs.call("keywords-explorer-matching-terms", {"country": "my",
        "select": "keyword,volume,volume_monthly,difficulty,parent_topic",
        "keywords": seed, "match_mode": "terms", "limit": 100, "order_by": "volume:desc"})
    rows = json.loads(r["result"]["content"][0]["text"])["keywords"]
    print(f"# seed '{seed}' returned {len(rows)} ideas")
    for x in rows:
        print(f'{seed}\t{x["keyword"]}\t{x["volume"]}\t{x["volume_monthly"]}\t{x["difficulty"]}\t{x["parent_topic"]}')
