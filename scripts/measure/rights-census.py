#!/usr/bin/env python3
"""Re-derive the live image census for hellokahwin.com, grouped by photographer/source.

Fetches every article URL in the sitemap, enumerates the images the page actually
renders (excluding related-article card thumbnails), reads the on-page credit the
reader sees, and joins each asset to docs/asset-register/asset-register.csv.

Usage:
  python scripts/measure/rights-census.py --fetch --out <dir>     # fetch + build
  python scripts/measure/rights-census.py --out <dir>             # rebuild from cache

Writes <dir>/census.json and prints the headline counts.
"""
import argparse
import collections
import csv
import json
import os
import re
import sys
import urllib.request
from html.parser import HTMLParser

SITE = "https://hellokahwin.com"
IMG_HOST = "https://images.hellokahwin.com/"


def fetch(url, timeout=60):
    req = urllib.request.Request(url, headers={"User-Agent": "hellokahwin-rights-census/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.read().decode("utf-8", "replace")


def article_urls():
    _, xml = fetch(SITE + "/sitemap.xml")
    locs = re.findall(r"<loc>([^<]+)</loc>", xml)
    pat = re.compile(r"^https://hellokahwin\.com/artikel/[^/]+/[^/]+$")
    return [u for u in locs if pat.match(u)]


class Page(HTMLParser):
    """Collect the rendered images that belong to THIS article.

    Images nested inside <a href="/artikel/..."> are cards linking to other
    articles: that is another article's cover, not this page's use of the image.
    Counting them inflates the census by ~350 placements.
    """

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.anchor_art = 0
        self.astack = []
        self.imgs = []            # (r2 key, on-page credit caption)
        self.fig_depth = 0
        self.cur_fig = None
        self.in_cap = 0
        self.capbuf = []
        self.text = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "a":
            is_art = a.get("href", "").startswith("/artikel/")
            self.astack.append(is_art)
            if is_art:
                self.anchor_art += 1
            return
        if tag == "figure":
            self.fig_depth += 1
            self.cur_fig = {"key": None, "cap": None}
        elif tag == "figcaption":
            self.in_cap += 1
            self.capbuf = []
        elif tag == "img":
            src = a.get("src", "")
            if src.startswith(IMG_HOST) and self.anchor_art == 0:
                key = "/".join(src.split("/")[3:-1])
                if self.fig_depth and self.cur_fig and self.cur_fig["key"] is None:
                    self.cur_fig["key"] = key
                else:
                    self.imgs.append((key, ""))

    def handle_endtag(self, tag):
        if tag == "a":
            if self.astack and self.astack.pop() and self.anchor_art:
                self.anchor_art -= 1
            return
        if tag == "figcaption" and self.in_cap:
            self.in_cap -= 1
            if self.cur_fig is not None:
                self.cur_fig["cap"] = "".join(self.capbuf).strip()
        elif tag == "figure" and self.fig_depth:
            self.fig_depth -= 1
            if self.cur_fig and self.cur_fig["key"]:
                self.imgs.append((self.cur_fig["key"], self.cur_fig["cap"] or ""))
            self.cur_fig = None

    def handle_data(self, d):
        if self.in_cap:
            self.capbuf.append(d)
        self.text.append(d)


def norm(s):
    s = s.lower()
    s = re.sub(r"\.(jpe?g|png|webp|gif|avif)$", "", s)
    # WordPress filenames carrying an em dash reach R2 as its UTF-8 bytes spelled
    # out (_E2_80_94); the register holds the character itself. Fold both to "-".
    s = s.replace("_e2_80_94", "-")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def load_register(path):
    reg = collections.defaultdict(list)
    for r in csv.DictReader(open(path, encoding="utf-8")):
        f = r["fail"]
        if f in ("BELUM DIISI", "TIDAK BERKENAAN", ""):
            continue
        reg[norm(f)].append(r)
    return reg


# The R2 object key truncates the filename, and WordPress size suffixes
# (-1024x683) survive into it while the register normalised them back to the
# original. Both directions therefore need a prefix test, and the size suffix
# needs stripping even when truncation cut it in half (-1024x6, -1024).
SIZE_SUFFIX = re.compile(r"-\d{2,5}(x\d{0,4})?$")


def variants(stem):
    n = norm(stem)
    out = []
    for base in ([n, n[7:]] if n.startswith("images-") else [n]):
        out.append(base)
        stripped = SIZE_SUFFIX.sub("", base)
        if stripped and stripped != base:
            out.append(stripped)
    return [v for i, v in enumerate(out) if v and v not in out[:i]]


# A prefix match on a short stem is worthless and actively dangerous. Twelve
# article covers whose R2 object is named only "cover" prefix-matched
# cover-borang-nikah.png and were classified as HelloKahwin's own graphics —
# i.e. twelve uncredited legacy covers read as cleared. Nothing under this many
# characters is allowed to match on a prefix.
MIN_PREFIX = 12


def match(reg, keys, stem):
    cands = variants(stem)
    for c in cands:
        if c in reg:
            return reg[c][0], "exact"
    for c in cands:
        if len(c) < MIN_PREFIX:
            continue
        # register filename extends the (truncated) live key
        pre = sorted(k for k in keys if k.startswith(c))
        if len(pre) == 1:
            return reg[pre[0]][0], "prefix"
        if len(pre) > 1:
            return reg[pre[0]][0], "prefix-ambiguous"
    for c in cands:
        # live key extends the register filename (WP size suffix on the live file)
        pre = sorted((k for k in keys if c.startswith(k) and len(k) >= MIN_PREFIX), key=len)
        if pre:
            longest = [k for k in pre if len(k) == len(pre[-1])]
            if len(longest) == 1:
                return reg[longest[0]][0], "suffix"
            return reg[longest[0]][0], "suffix-ambiguous"
    return None, "unmatched"


def jurugambar(text_nodes):
    """Read the photographer out of the article's `Kredit Vendor` block.

    The label and the name are sometimes one text node ("Jurugambar: X") and
    sometimes two, because the name is wrapped in its own element. Both shapes
    occur across the 14 Real Wedding articles.
    """
    t = [x.strip() for x in text_nodes if x.strip()]
    for i, x in enumerate(t):
        if not x.startswith("Jurugambar"):
            continue
        rest = x.split(":", 1)[1].strip() if ":" in x else ""
        if rest:
            return rest
        if i + 1 < len(t) and ":" not in t[i + 1]:
            return t[i + 1].strip()
    return ""


NO_CREDIT = "(TIADA KREDIT)"
UNKNOWN_REG = ("TIDAK DIKETAHUI", "TIDAK BERKENAAN", "BELUM DIISI", "")

# The two files decision 167 ruled institutional. Kept as ids, not names, so the
# classification cannot drift when a credit string is edited on the page.
RIGHTS_03_TWO = ("HK-L-0347", "HK-L-0592")


def page_credit(caption):
    """Pull the credited source and any licence note out of a rendered caption."""
    m = re.search(r"Kredit:\s*(.+)$", caption, re.S)
    if not m:
        return None, None
    s = re.split(r"Lihat semua foto", m.group(1))[0].strip()
    lic = None
    m2 = re.search(r"\((CC[^)]*|[Dd]omain [Aa]wam)\)\s*$", s)
    if m2:
        lic = m2.group(1)
        s = s[:m2.start()].strip()
    return (s.strip(" .,") or None), lic


def derive_source(asset, pages):
    """Who this image is credited to, and how we know. Page first, register second.

    The page is preferred because it is what a reader and a rights holder both
    see; the register is a record of an audit and is one merge behind production.
    """
    for cap in asset["captions"]:
        src, lic = page_credit(cap)
        if src:
            return src, lic, "kapsyen-halaman"
    jg = {pages[s]["jurugambar"] for s in asset["slugs"] if pages[s]["jurugambar"]}
    if len(jg) == 1:
        return jg.pop(), None, "kredit-vendor-halaman"
    for field, how in (("licensor_name", "daftar-licensor"), ("pencipta", "daftar-pencipta")):
        v = asset.get(field, "")
        if v and v not in UNKNOWN_REG:
            return v, None, how
    return None, None, "tiada"


def rights_state(name, group, studios):
    if any(i in RIGHTS_03_TWO for i in group["asset_ids"]):
        return "institusi"
    if name in studios:
        return "kebenaran-jurugambar"
    if any(l.startswith("CC") or "omain" in l for l in group["licences"]):
        return "lesen-terbuka"
    if "reg:S" in group["licences"]:
        return "lesen-terbuka"
    if name == "HelloKahwin" or "reg:G" in group["licences"]:
        return "karya-sendiri"
    return "tidak-diketahui"


def build_groups(assets, pages):
    studios = {d["jurugambar"] for d in pages.values() if d["jurugambar"]}
    groups = {}
    for a in assets.values():
        src, lic, how = derive_source(a, pages)
        a["source"], a["source_licence"], a["source_evidence"] = src, lic, how
        g = groups.setdefault(src or NO_CREDIT,
                              {"count": 0, "slugs": collections.Counter(),
                               "licences": set(), "asset_ids": [], "stems": []})
        g["count"] += 1
        for s in a["slugs"]:
            g["slugs"][s] += 1
        if lic:
            g["licences"].add(lic)
        if a.get("license_class"):
            g["licences"].add("reg:" + a["license_class"])
        if a.get("asset_id"):
            g["asset_ids"].append(a["asset_id"])
        g["stems"].append(a["stem"])
    for name, g in groups.items():
        g["state"] = rights_state(name, g, studios)
        g["licences"] = sorted(g["licences"])
        g["slugs"] = dict(g["slugs"])
    return groups


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fetch", action="store_true")
    ap.add_argument("--out", default="census-out")
    ap.add_argument("--register", default="docs/asset-register/asset-register.csv")
    ap.add_argument("--gate", action="store_true",
                    help="exit 1 if any live image has no asset-register row")
    args = ap.parse_args()
    cache = os.path.join(args.out, "pages")
    os.makedirs(cache, exist_ok=True)

    if args.fetch:
        urls = article_urls()
        json.dump(urls, open(os.path.join(args.out, "urls.json"), "w"), indent=1)
        for u in urls:
            code, body = fetch(u)
            fn = u.split("/artikel/")[1].replace("/", "__") + ".html"
            open(os.path.join(cache, fn), "w", encoding="utf-8").write(body)
            print(code, len(body), u, file=sys.stderr)
    urls = json.load(open(os.path.join(args.out, "urls.json")))

    reg = load_register(args.register)
    keys = list(reg)
    pages = collections.OrderedDict()
    for u in urls:
        slug = u.split("/artikel/")[1]
        fn = slug.replace("/", "__") + ".html"
        p = Page()
        p.feed(open(os.path.join(cache, fn), encoding="utf-8").read())
        seen = collections.OrderedDict()
        for k, c in p.imgs:
            if k not in seen or (not seen[k] and c):
                seen[k] = c
        pages[slug] = {"jurugambar": jurugambar(p.text), "assets": seen}

    assets = {}
    for slug, d in pages.items():
        for k, cap in d["assets"].items():
            stem = k.split("/")[-1]
            mm = re.match(r"^\d{10,}-(.*)$", stem)
            a = assets.setdefault(k, {"stem": mm.group(1) if mm else stem,
                                      "slugs": [], "captions": []})
            a["slugs"].append(slug)
            if cap and cap not in a["captions"]:
                a["captions"].append(cap)
    for a in assets.values():
        r, how = match(reg, keys, a["stem"])
        a["match"] = how
        if r:
            a.update({"asset_id": r["asset_id"], "fail": r["fail"],
                      "pencipta": r["pencipta"], "licensor_name": r["licensor_name"],
                      "license_class": r["license_class"],
                      "status_guna": r["status_guna"], "credit": r["credit"]})

    groups = build_groups(assets, pages)
    out = {"articles": len(pages),
           "placements": sum(len(d["assets"]) for d in pages.values()),
           "distinct_assets": len(assets), "pages": pages, "assets": assets,
           "groups": groups}
    json.dump(out, open(os.path.join(args.out, "census.json"), "w"), indent=1)
    unmatched = [a for a in assets.values() if not a.get("asset_id")]
    print("articles           %d" % out["articles"])
    print("placements         %d" % out["placements"])
    print("distinct assets    %d" % out["distinct_assets"])
    print("register matched   %d" % (len(assets) - len(unmatched)))
    print("register unmatched %d" % len(unmatched))
    print("source groups      %d" % len(groups))
    by_state = collections.Counter()
    grp_state = collections.Counter()
    for name, g in groups.items():
        by_state[g["state"]] += g["count"]
        grp_state[g["state"]] += 1
    for st, n in by_state.most_common():
        print("  %-22s %4d assets in %3d groups" % (st, n, grp_state[st]))

    if args.gate and unmatched:
        print("\nREGISTER DRIFT: %d live images have no asset-register row." % len(unmatched))
        for a in sorted(unmatched, key=lambda x: x["stem"]):
            print("  %-56s %s" % (a["stem"][:56], a["slugs"][0]))
        print("\nCENSUS EXIT: 1")
        return 1
    if args.gate:
        print("\nCENSUS EXIT: 0")
    return 0


if __name__ == "__main__":
    sys.exit(main())
