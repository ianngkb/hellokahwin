"""SEO-08 SERP-ownership pull. Ahrefs serp-overview, country=my, 28 Ogos 2026.

Prints EVERY position type, not just organic, because on these terms position 1
is a local pack and an organic-only read would report the wrong owner.

  python pull-serp.py > ahrefs-serp-head-terms.tsv
"""
import json, os, importlib.util
_here = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("ahrefs", os.path.join(_here, "ahrefs-mcp-client.py"))
ahrefs = importlib.util.module_from_spec(spec); spec.loader.exec_module(ahrefs)

TERMS = ["garden wedding", "garden wedding kl", "garden wedding malaysia",
         "garden wedding kuala lumpur", "wedding garden"]

ahrefs.init()
print("keyword\tposition\ttype\tdomain_rating\ttraffic\turl\ttitle\tserp_snapshot")
for kw in TERMS:
    r = ahrefs.call("serp-overview", {"country": "my", "keyword": kw,
        "select": "position,type,url,title,domain_rating,traffic,update_date",
        "top_positions": 10})
    for p in json.loads(r["result"]["content"][0]["text"])["positions"]:
        t = p.get("type")
        t = ",".join(t) if isinstance(t, list) else (t or "")
        title = (p.get("title") or "").replace("\t", " ")
        print(f'{kw}\t{p.get("position")}\t{t}\t{p.get("domain_rating")}\t{p.get("traffic")}\t{p.get("url")}\t{title}\t{p.get("update_date")}')
