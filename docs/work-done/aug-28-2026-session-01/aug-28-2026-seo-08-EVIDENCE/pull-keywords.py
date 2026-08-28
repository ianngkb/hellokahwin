"""SEO-08 keyword pull. Ahrefs Keywords Explorer, country=my, 28 Ogos 2026.

Prints `volume` (the 12-month average, the field quoted throughout the decision)
beside `volume_monthly` (the latest month) so the two can never be confused.
A keyword the API returns NO ROW for is not in the Ahrefs MY index at all, which
is a stronger statement than volume 0 and is printed separately.

  python pull-keywords.py > ahrefs-keywords-english-vs-malay.tsv
"""
import json, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib.util
spec = importlib.util.spec_from_file_location(
    "ahrefs", os.path.join(os.path.dirname(os.path.abspath(__file__)), "ahrefs-mcp-client.py"))
ahrefs = importlib.util.module_from_spec(spec); spec.loader.exec_module(ahrefs)

GROUPS = {
    "english-loanword (what the page ranks for today)": [
        "garden wedding", "garden wedding kl", "garden wedding malaysia",
        "garden wedding kuala lumpur", "wedding garden", "garden wedding venue kl",
        "garden wedding in kl", "garden wedding venue", "garden wedding venues",
        "outdoor wedding malaysia", "tema garden wedding",
    ],
    "malay-first rewrite candidates": [
        "majlis kahwin luar", "majlis perkahwinan taman", "tempat kahwin taman",
        "venue kahwin outdoor", "perkahwinan di taman", "majlis kahwin outdoor",
        "venue garden wedding", "konsep garden wedding", "garden wedding murah",
        "tempat kahwin outdoor", "tempat kahwin konsep garden", "majlis kahwin di taman",
        "pakej kahwin outdoor",
    ],
    "malay venue terms (the wider replacement option)": [
        "tempat kahwin", "venue kahwin", "tempat majlis kahwin", "tempat perkahwinan",
        "venue perkahwinan", "tempat kahwin murah", "tempat kahwin cantik", "dewan kahwin",
    ],
}

ahrefs.init()
print("group\tkeyword\tvolume(12mo avg)\tvolume_monthly\tdifficulty\tparent_topic\ttraffic_potential")
for group, kws in GROUPS.items():
    r = ahrefs.call("keywords-explorer-overview", {
        "country": "my",
        "select": "keyword,volume,volume_monthly,difficulty,parent_topic,traffic_potential",
        "keywords": ",".join(kws)})
    rows = json.loads(r["result"]["content"][0]["text"])["keywords"]
    got = {x["keyword"] for x in rows}
    for x in sorted(rows, key=lambda x: -(x["volume"] or 0)):
        print(f'{group}\t{x["keyword"]}\t{x["volume"]}\t{x["volume_monthly"]}\t{x["difficulty"]}\t{x["parent_topic"]}\t{x["traffic_potential"]}')
    for k in kws:
        if k not in got:
            print(f"{group}\t{k}\tNO ROW\tNO ROW\t-\t-\t-")
