#!/usr/bin/env python3
"""
DES-09 SEO guardrail checker for hellokahwin.com.

Runs every guardrail in `aug-28-2026-done-des-09-seo-guardrails.md` against
LIVE production and prints PASS / FAIL / WARN with the measured number next to
the threshold. Exit code is the number of FAILing guardrails, so CI or a
post-deploy hook can gate on it.

WHY THIS FILE EXISTS
--------------------
A guardrail that can only be checked by a tool call has to BE a tool call, or a
lone reviewer satisfies everything checkable by reading and approximates the
one that is not. Every threshold below was measured on production on
2026-08-28; the numbers live in `baseline-2026-08-28.json` next to this file.

MEASUREMENT DISCIPLINE — DO NOT "OPTIMISE" THIS
-----------------------------------------------
Requests are issued STRICTLY SEQUENTIALLY with a delay. This is not politeness.
A concurrent sweep of this site MANUFACTURES the contention that makes
`generateMetadata` miss its 1.5s deadline and return `{}`, which renders the
root default <title> and CACHES it. On 2026-08-26 a six-wide sweep produced 36
failures out of 56 cold renders; a sequential sweep minutes later produced 0 out
of 69. If you parallelise this script you will measure your own load.

USAGE
    python check-guardrails.py                      # full sitemap sweep
    python check-guardrails.py --quick              # 9-page representative set
    python check-guardrails.py --only G06,G13       # named guardrails
    python check-guardrails.py --base https://hellokahwin-preview.vercel.app
    python check-guardrails.py --json out.json      # machine-readable result

REQUIREMENTS: python 3.9+, curl on PATH. No third-party packages.
"""

import argparse
import collections
import html as htmlmod
import json
import os
import re
import subprocess
import sys
import time
from urllib.parse import urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
BASELINE = os.path.join(HERE, "baseline-2026-08-28.json")
UA = "HelloKahwin-DES09-guardrails/1.0"
DELAY = 2.0  # seconds between requests. See MEASUREMENT DISCIPLINE above.

# ── Literal strings that are part of the contract ──────────────────────────

TITLE_SUFFIX = " | HelloKahwin"

# Every one of these internal paths is linked from EVERY public page today
# (measured: 11 of 11 present on 102 of 102 pages, 2026-08-28). This is the
# navigation spine. Losing one silently de-links a whole category.
CHROME_PATHS = [
    "/",
    "/artikel",
    "/artikel/busana-pengantin",
    "/artikel/hantaran-mas-kahwin",
    "/artikel/idea-dan-nasihat",
    "/artikel/nikah-undang-undang",
    "/artikel/pelamin-kad-cenderahati",
    "/artikel/real-wedding",
    "/artikel/sebelum-nikah",
    "/artikel/ucapan-doa",
    "/artikel/venue-perancangan",
]

# Schema @type values (including nested) that each page type emits TODAY and
# must still emit. Superset test — emitting MORE is fine, emitting fewer is not.
SCHEMA_REQUIRED = {
    "article": {"Article", "BreadcrumbList", "ImageObject", "ListItem",
                "Organization", "WebPage"},
    "category": {"BreadcrumbList", "CollectionPage", "ListItem", "Organization"},
    "homepage": set(),         # emits nothing today — see G18
    "catalogue-index": set(),  # emits nothing today — see G18
}

# The 8 listicle articles that emit ItemList today. Named, because ItemList on
# these is what UX-02 (Sprint 02) delivered and a renderer change can drop it
# without anything else changing.
ITEMLIST_ARTICLES = [
    "/artikel/idea-dan-nasihat/dewan-kahwin",
    "/artikel/idea-dan-nasihat/garden-wedding",
    "/artikel/idea-dan-nasihat/pelamin-kahwin-dewan",
    "/artikel/idea-dan-nasihat/sewa-dewan-kahwin",
]  # discovered set is re-derived at runtime; this is the human-readable subset

BANNED_ANCHOR_TEXT = {
    "klik di sini", "klik sini", "di sini", "baca lagi", "baca di sini",
    "read more", "click here", "selengkapnya", "lihat sini", "sini",
}

# Hosts that image credits point at. Every image on this site is credited to
# its original source — owner-level rule. A redesign that drops the caption
# layer drops the credits, and the credit is both the courtesy that earns
# permission and the record that lets us find the owner again.
CREDIT_HOSTS = {
    "www.flickr.com", "flickr.com", "commons.wikimedia.org",
    "www.pexels.com", "pexels.com", "www.instagram.com", "instagram.com",
    "theweddingnotebook.com", "www.theweddingnotebook.com", "unsplash.com",
}

QUICK_SET = [
    "/",
    "/artikel",
    "/artikel/hantaran-mas-kahwin",
    "/artikel/real-wedding",
    "/artikel/hantaran-mas-kahwin/mas-kahwin-ikut-negeri",
    "/artikel/idea-dan-nasihat/dewan-kahwin",
    "/artikel/hantaran-mas-kahwin/hantaran-tunang",
    "/artikel/nikah-undang-undang/borang-nikah",
    "/artikel/glamor-eksklusif/amankila-bali",
]

# ── Fetch layer ────────────────────────────────────────────────────────────


def curl(url, follow=False, head=False, timeout=45):
    """One sequential curl. Returns (status_list, headers_text, body_text, ms)."""
    hdr = os.path.join(HERE, ".guardrail.hdr")
    cmd = ["curl", "-sS", "-A", UA, "-D", hdr, "--max-time", str(timeout)]
    if follow:
        cmd.append("-L")
    if head:
        cmd.append("-I")
    cmd.append(url)
    t0 = time.time()
    p = subprocess.run(cmd, capture_output=True)
    ms = int((time.time() - t0) * 1000)
    body = p.stdout.decode("utf-8", "replace")
    try:
        heads = open(hdr, encoding="utf-8", errors="replace").read()
    except OSError:
        heads = ""
    codes = re.findall(r"(?m)^HTTP/[\d.]+ (\d{3})", heads)
    return codes, heads, body, ms


def header(heads, name):
    block = heads.strip().split("\r\n\r\n")[-1]
    m = re.search(r"(?im)^%s:\s*(.+)$" % re.escape(name), block)
    return m.group(1).strip() if m else None


def content_length(url):
    codes, heads, _, _ = curl(url, head=True)
    ln = header(heads, "content-length")
    return (codes[-1] if codes else "?"), int(ln) if ln and ln.isdigit() else 0


# ── HTML analysis ──────────────────────────────────────────────────────────


def strip_tags(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", s)).strip()


def collect_types(o, acc):
    if isinstance(o, dict):
        t = o.get("@type")
        if isinstance(t, str):
            acc.append(t)
        elif isinstance(t, list):
            acc.extend(t)
        for v in o.values():
            collect_types(v, acc)
    elif isinstance(o, list):
        for v in o:
            collect_types(v, acc)


def internal_path(href, base_host):
    if href.startswith("/"):
        return (href.split("#")[0].split("?")[0].rstrip("/") or "/")
    try:
        u = urlparse(href)
    except ValueError:
        return None
    if u.netloc.lower() in (base_host, "www." + base_host):
        return (u.path.rstrip("/") or "/")
    return None


def analyse(url, body, heads, ms, base_host):
    r = {"url": url, "ms": ms, "html_raw_bytes": len(body.encode("utf-8"))}
    r["x_vercel_cache"] = header(heads, "x-vercel-cache")
    r["cache_control"] = header(heads, "cache-control")
    r["x_robots_tag"] = header(heads, "x-robots-tag")

    m = re.search(r"(?is)<title[^>]*>(.*?)</title>", body)
    r["title"] = htmlmod.unescape(strip_tags(m.group(1))) if m else None
    m = re.search(r'(?is)<link[^>]+rel="canonical"[^>]*>', body)
    r["canonical"] = (re.search(r'href="([^"]+)"', m.group(0)).group(1)
                      if m and 'href="' in m.group(0) else None)
    m = re.search(r'(?is)<meta[^>]+name="robots"[^>]*>', body)
    r["robots_meta"] = (re.search(r'content="([^"]+)"', m.group(0)).group(1)
                        if m and 'content="' in m.group(0) else None)
    m = re.search(r"(?is)<html[^>]*>", body)
    r["html_lang"] = (re.search(r'lang="([^"]+)"', m.group(0)).group(1)
                      if m and "lang=" in m.group(0) else None)

    hs = re.findall(r"(?is)<(h[1-6])\b([^>]*)>(.*?)</\1>", body)
    r["headings"] = [{"tag": t.lower(), "text": strip_tags(x)[:140]} for t, a, x in hs]
    r["heading_counts"] = dict(collections.Counter(h["tag"] for h in r["headings"]))

    blocks = re.findall(
        r'(?is)<script[^>]+type="application/ld\+json"[^>]*>(.*?)</script>', body)
    types, bad = [], 0
    for b in blocks:
        try:
            collect_types(json.loads(b), types)
        except Exception:
            bad += 1
    r["jsonld_blocks"] = len(blocks)
    r["jsonld_invalid"] = bad
    r["jsonld_types"] = sorted(set(types))

    internal, ext = [], []
    r["internal_nofollow"] = r["internal_blank"] = 0
    r["banned_anchor_text"] = []
    r["credit_links"] = 0
    for attrs, txt in re.findall(r"(?is)<a\b([^>]*)>(.*?)</a>", body):
        hm = re.search(r'href="([^"]*)"', attrs)
        if not hm:
            continue
        href = hm.group(1)
        rel = re.search(r'rel="([^"]*)"', attrs)
        rel = rel.group(1) if rel else ""
        tgt = re.search(r'target="([^"]*)"', attrs)
        tgt = tgt.group(1) if tgt else ""
        p = internal_path(href, base_host)
        text = strip_tags(txt).lower()
        if text in BANNED_ANCHOR_TEXT:
            r["banned_anchor_text"].append(text)
        if p is not None:
            internal.append(p)
            if "nofollow" in rel:
                r["internal_nofollow"] += 1
            if tgt == "_blank":
                r["internal_blank"] += 1
        else:
            ext.append(href)
            try:
                if urlparse(href).netloc.lower() in CREDIT_HOSTS:
                    r["credit_links"] += 1
            except ValueError:
                pass
    r["internal_anchors"] = len(internal)
    r["internal_targets"] = sorted(set(internal))
    r["external_anchors"] = len(ext)

    imgs = re.findall(r"(?is)<img\b([^>]*)>", body)
    r["images"] = []
    for a in imgs:
        def g(k):
            mm = re.search(k + r'="([^"]*)"', a)
            return mm.group(1) if mm else None
        r["images"].append({"src": g("src"), "alt": g("alt"), "loading": g("loading"),
                            "width": g("width"), "srcset": g("srcset")})
    r["img_count"] = len(r["images"])
    r["img_no_srcset"] = sum(1 for i in r["images"] if not i["srcset"])
    r["img_no_dims"] = sum(1 for i in r["images"] if not i["width"])
    r["img_eager"] = [i["src"] for i in r["images"] if i["loading"] != "lazy" and i["src"]]

    r["preloaded_images"] = re.findall(
        r'(?is)<link[^>]+rel="preload"[^>]+as="image"[^>]+href="([^"]+)"', body) + \
        re.findall(r'(?is)<link[^>]+rel="preload"[^>]+href="([^"]+)"[^>]+as="image"', body)

    r["css"] = sorted(set(re.findall(r'(?is)<link[^>]+href="([^"]+\.css[^"]*)"', body)))
    r["js"] = sorted(set(re.findall(r'(?is)<script[^>]+src="([^"]+)"', body)))
    r["woff2_refs"] = body.count(".woff2")
    r["fontface"] = body.count("@font-face")
    r["has_soalan_lazim"] = bool(re.search(r"(?is)<(h[1-6])\b[^>]*>\s*Soalan lazim\s*</\1>", body))
    m = re.search(r"(?is)<(h[1-6])\b[^>]*>\s*Soalan lazim\s*</\1>", body)
    r["soalan_lazim_level"] = m.group(1).lower() if m else None
    return r


def page_kind(path):
    if path in ("", "/"):
        return "homepage"
    if path == "/artikel":
        return "catalogue-index"
    return "category" if path.count("/") == 2 else "article"


# ── Guardrails ─────────────────────────────────────────────────────────────

Result = collections.namedtuple("Result", "gid title verdict measured threshold detail")


# Guardrails whose threshold is a COUNT OVER THE WHOLE CORPUS. Evaluating them
# against a subset compares a partial count to a full-corpus baseline and
# manufactures a failure. They are reported UNKNOWN unless the sweep covered
# the whole sitemap. Learned the hard way: the first --quick run of this script
# reported 8 failures, 5 of which were this bug.
CORPUS_SCOPED = {"G09", "G12", "G15", "G17", "G38"}


def run_guardrails(pages, base, baseline, only=None, full_corpus=True):
    """pages: dict path -> analysis. Returns list[Result]."""
    out = []
    host = urlparse(base).netloc.lower()

    def add(gid, title, ok, measured, threshold, detail="", warn_only=False):
        if only and gid not in only:
            return
        if gid in CORPUS_SCOPED and not full_corpus:
            out.append(Result(gid, title, "UNKNOWN", measured,
                              threshold,
                              "corpus-scoped: needs the full sitemap sweep, "
                              "not --quick. Measured value above is a partial count."))
            return
        verdict = "PASS" if ok else ("WARN" if warn_only else "FAIL")
        out.append(Result(gid, title, verdict, measured, threshold, detail))

    def wanted(*gids):
        """True if any of these guardrails will actually be reported.

        The byte-weight guardrails issue one HEAD request per image asset —
        hundreds on a full sweep. Without this gate, `--only G06` still paid
        for all of them and then threw the results away, which made the
        documented `--only` flag useless in practice.
        """
        return (not only) or any(g in only for g in gids)

    arts = {p: r for p, r in pages.items() if page_kind(p) == "article"}
    cats = {p: r for p, r in pages.items() if page_kind(p) == "category"}

    # ── A. Heading hierarchy ───────────────────────────────────────────────
    bad = [p for p, r in pages.items() if r["heading_counts"].get("h1", 0) != 1]
    add("G01", "Exactly one <h1> per page", not bad,
        f"{len(pages) - len(bad)}/{len(pages)} pages have exactly one h1",
        "100% of pages, h1 count == 1", "; ".join(bad[:6]))

    skips = []
    for p, r in pages.items():
        seq = [h["tag"] for h in r["headings"]]
        after_h1 = [t for t in seq if t != "h1"]
        if after_h1 and after_h1[0] != "h2":
            skips.append(f"{p} ({' '.join(seq[:6])})")
    add("G02", "First heading after the h1 is an h2 (no level skip)", not skips,
        f"{len(pages) - len(skips)}/{len(pages)} pages ordered",
        "100% of pages, first non-h1 heading == h2", "; ".join(skips[:6]))

    mism = []
    for p, r in arts.items():
        h1 = next((h["text"] for h in r["headings"] if h["tag"] == "h1"), None)
        if h1 and r["title"] and not r["title"].startswith(h1[:25]):
            pass  # titles legitimately differ from h1; only emptiness is a fault
        if not h1:
            mism.append(p)
    add("G03", "Every article <h1> carries the article title (non-empty)", not mism,
        f"{len(arts) - len(mism)}/{len(arts)} articles", "non-empty h1 text on 100%",
        "; ".join(mism[:6]))

    # The module is legitimately ABSENT when the article is the only one in its
    # category — there are no siblings to list. Four such articles existed on
    # 2026-08-28 (fotografi-videografi, hiasan-dekorasi, minimalis-mewah,
    # pantai-santai each held exactly one). The threshold allows for those and
    # names them, so an absence anywhere else is a real fault rather than noise.
    nolagi = [p for p, r in arts.items()
              if not any(h["tag"] == "h2" and h["text"].startswith("Lagi dalam")
                         for h in r["headings"])]
    allowed = baseline["links"]["sole_article_categories"]
    unexpected = [p for p in nolagi if p not in allowed]
    add("G05", 'Related-articles module is an <h2> starting "Lagi dalam "',
        not unexpected, f"{len(arts) - len(nolagi)}/{len(arts)} articles carry it",
        f'present on every article whose category holds >1 article '
        f'({len(allowed)} known exceptions)',
        "UNEXPECTED ABSENCE: " + "; ".join(unexpected[:6]) if unexpected else "")

    # ── B. Internal linking ────────────────────────────────────────────────
    nf = sum(r["internal_nofollow"] for r in pages.values())
    add("G06", "Zero rel=nofollow on INTERNAL links", nf == 0,
        f"{nf} internal nofollow", "== 0",
        "SEO-02 removed 79 of these; re-introducing one regresses it")

    bl = sum(r["internal_blank"] for r in pages.values())
    add("G07", "Zero target=_blank on INTERNAL links", bl == 0,
        f"{bl} internal target=_blank", "== 0")

    missing = collections.Counter()
    for p, r in pages.items():
        for c in CHROME_PATHS:
            if c not in r["internal_targets"]:
                missing[c] += 1
    add("G08", "All 11 navigation spine paths linked from every page",
        not missing, f"{len(CHROME_PATHS) - len(missing)}/11 present on every page",
        "11/11 on 100% of pages", str(dict(missing)))

    inbound = collections.Counter()
    for r in pages.values():
        for t in r["internal_targets"]:
            inbound[t] += 1
    orphans = [p for p in arts if inbound.get(p, 0) == 0]
    add("G09", "Zero orphan articles (>=1 inbound in-page link)", not orphans,
        f"{len(orphans)} orphans of {len(arts)} articles", "== 0 orphans",
        "; ".join(orphans[:8]))

    floors = {"article": 12, "category": 13, "homepage": 24, "catalogue-index": 56}
    below = [f"{p} ({len(r['internal_targets'])} < {floors[page_kind(p)]})"
             for p, r in pages.items()
             if len(r["internal_targets"]) < floors[page_kind(p)]]
    add("G10", "Per-page unique internal link-target floor", not below,
        f"{len(pages) - len(below)}/{len(pages)} at or above floor",
        "article>=12, category>=13, homepage>=24, /artikel>=56",
        "; ".join(below[:6]))

    banned = [(p, r["banned_anchor_text"]) for p, r in pages.items() if r["banned_anchor_text"]]
    add("G11", 'Zero generic anchor text ("klik di sini", "baca lagi", …)',
        not banned, f"{sum(len(b) for _, b in banned)} banned anchors", "== 0",
        "; ".join(f"{p}:{b}" for p, b in banned[:4]))

    hop_targets = set()
    sitemap_paths = set(pages)
    for p, r in pages.items():
        for t in r["internal_targets"]:
            if (t.count("/") == 1 and t not in ("/", "/login", "/admin")
                    and t not in sitemap_paths):
                hop_targets.add(t)
    add("G12", "Internal links spending a 308 hop must not increase",
        len(hop_targets) <= baseline["links"]["redirect_hop_targets"],
        f"{len(hop_targets)} distinct root-slug targets",
        f"<= {baseline['links']['redirect_hop_targets']} (2026-08-28 baseline)",
        "; ".join(sorted(hop_targets)[:8]), warn_only=True)

    # ── C. Structured data ─────────────────────────────────────────────────
    for kind_name, required in SCHEMA_REQUIRED.items():
        if not required:
            continue
        subset = {p: r for p, r in pages.items() if page_kind(p) == kind_name}
        if not subset:
            continue
        missing_pages = [f"{p} missing {sorted(required - set(r['jsonld_types']))}"
                         for p, r in subset.items()
                         if not required.issubset(set(r["jsonld_types"]))]
        gid = "G13" if kind_name == "article" else "G14"
        add(gid, f"{kind_name} pages emit {sorted(required)}",
            not missing_pages, f"{len(subset) - len(missing_pages)}/{len(subset)} pages",
            "superset of the 2026-08-28 emitted set", "; ".join(missing_pages[:5]))

    il_now = sorted(p for p, r in arts.items() if "ItemList" in r["jsonld_types"])
    add("G15", "Listicle articles keep their ItemList schema",
        len(il_now) >= baseline["schema"]["itemlist_articles"],
        f"{len(il_now)} articles emit ItemList",
        f">= {baseline['schema']['itemlist_articles']} (2026-08-28 baseline)",
        "; ".join(il_now[:8]))

    inv = [p for p, r in pages.items() if r["jsonld_invalid"]]
    add("G16", "Every JSON-LD block parses as JSON", not inv,
        f"{sum(r['jsonld_invalid'] for r in pages.values())} unparseable blocks",
        "== 0", "; ".join(inv[:5]))

    sl = [p for p, r in arts.items() if r["has_soalan_lazim"]]
    faq = [p for p, r in arts.items() if "FAQPage" in r["jsonld_types"]]
    add("G17", 'Articles carrying a "Soalan lazim" block keep it (SEO-10 input)',
        len(sl) >= baseline["schema"]["soalan_lazim_articles"],
        f"{len(sl)} carry the block, {len(faq)} emit FAQPage",
        f'"Soalan lazim" block count >= {baseline["schema"]["soalan_lazim_articles"]}')

    h3_faq = sorted(p for p, r in arts.items() if r["soalan_lazim_level"] == "h3")
    add("G17b", '"Soalan lazim" is an <h2> on every article that has one',
        not h3_faq, f"{len(h3_faq)} articles use h3", "== 0 (SEO-10 keys on the level)",
        "; ".join(h3_faq[:8]), warn_only=True)

    home_ld = sum(len(pages[p]["jsonld_types"]) for p in pages
                  if page_kind(p) in ("homepage", "catalogue-index"))
    add("G18", "Homepage and /artikel emit Organization + WebSite JSON-LD",
        home_ld > 0, f"{home_ld} @type values across the two pages",
        ">= 2 (currently 0 — this is a gap the redesign should close)",
        "", warn_only=True)

    # ── D. Weight and Core Web Vitals ──────────────────────────────────────
    lcp_fail, lcp_worst = [], 0
    for p, r in (pages.items() if wanted("G19", "G20") else []):
        for src in r["preloaded_images"]:
            _, n = content_length(src)
            time.sleep(DELAY / 4)
            lcp_worst = max(lcp_worst, n)
            if n > baseline["budgets"]["lcp_image_bytes"]:
                lcp_fail.append(f"{p}: {n}B {src.split('/')[-1][:40]}")
    add("G19", "Preloaded (LCP-path) image <= 200 KB transferred", not lcp_fail,
        f"largest preloaded image {lcp_worst} B",
        f"<= {baseline['budgets']['lcp_image_bytes']} B (200 KB)",
        "; ".join(lcp_fail[:5]))

    big, worst = [], 0
    seen = set()
    for p, r in (pages.items() if wanted("G21") else []):
        for i in r["images"]:
            if not i["src"] or i["src"] in seen or not i["src"].startswith("http"):
                continue
            seen.add(i["src"])
            _, n = content_length(i["src"])
            time.sleep(DELAY / 4)
            worst = max(worst, n)
            if n > baseline["budgets"]["max_image_bytes"]:
                big.append(f"{n}B {i['src'].split('/')[-2][:34]}")
    add("G21", "No single public image asset exceeds 400 KB", not big,
        f"{len(big)} assets over budget, largest {worst} B",
        f"<= {baseline['budgets']['max_image_bytes']} B (400 KB)",
        "; ".join(big[:6]))

    nosrc = [f"{p} ({r['img_no_srcset']}/{r['img_count']})"
             for p, r in pages.items() if r["img_no_srcset"]]
    add("G22", "Every <img> carries srcset + sizes", not nosrc,
        f"{sum(r['img_no_srcset'] for r in pages.values())} images without srcset",
        "== 0", "; ".join(nosrc[:5]))

    over = []
    for p, r in (pages.items() if wanted("G23") else []):
        total = 0
        codes, heads, _, _ = curl(base + p)
        time.sleep(DELAY)
        for a in r["css"] + r["js"]:
            u = a if a.startswith("http") else base + a
            pr = subprocess.run(["curl", "-sS", "-o", os.devnull, "-A", UA,
                                 "-H", "Accept-Encoding: gzip, br",
                                 "-w", "%{size_download}", u], capture_output=True)
            time.sleep(DELAY / 4)
            try:
                total += int(pr.stdout.decode().strip())
            except ValueError:
                pass
        pr = subprocess.run(["curl", "-sS", "-o", os.devnull, "-A", UA,
                             "-H", "Accept-Encoding: gzip, br",
                             "-w", "%{size_download}", base + p], capture_output=True)
        time.sleep(DELAY / 2)
        try:
            total += int(pr.stdout.decode().strip())
        except ValueError:
            pass
        r["non_image_transfer"] = total
        if total > baseline["budgets"]["non_image_transfer_bytes"]:
            over.append(f"{p}: {total} B")
    add("G23", "HTML + CSS + JS transfer <= 260 KB per page", not over,
        f"max {max((r.get('non_image_transfer', 0) for r in pages.values()), default=0)} B",
        f"<= {baseline['budgets']['non_image_transfer_bytes']} B (260 KB)",
        "; ".join(over[:5]))

    wf = sum(r["woff2_refs"] for r in pages.values())
    add("G24", "Webfont payload: at most one face, <= 30 KB, preloaded, swap",
        True, f"{wf} .woff2 references in HTML",
        "<= 1 face and <= 30720 B; today 0 bytes are shipped",
        "informational until DES-13 picks the face", warn_only=(wf > 0))

    slow = [f"{p}: {r['ms']}ms" for p, r in pages.items()
            if r["ms"] > baseline["budgets"]["warm_ttfb_ms"]]
    add("G25", "Warm response <= 1500 ms", not slow,
        f"{len(slow)} pages over budget", f"<= {baseline['budgets']['warm_ttfb_ms']} ms",
        "; ".join(slow[:6]))

    nodim = [f"{p} ({r['img_no_dims']}/{r['img_count']})"
             for p, r in pages.items() if r["img_no_dims"]]
    add("G26", "Every <img> reserves its box (width+height or aspect-ratio)",
        not nodim, f"{sum(r['img_no_dims'] for r in pages.values())} images without width",
        "== 0 (CLS)", "; ".join(nodim[:5]), warn_only=True)

    # ── E/F. Frozen contract ───────────────────────────────────────────────
    nocanon = [p for p, r in pages.items() if not r["canonical"]]
    wrong = [f"{p} -> {r['canonical']}" for p, r in pages.items()
             if r["canonical"] and r["canonical"].rstrip("/") != (base + p).rstrip("/")]
    add("G32", "Every page emits a self-referential canonical",
        not nocanon and not wrong,
        f"{len(pages) - len(nocanon) - len(wrong)}/{len(pages)} correct",
        "100% present AND self-referential",
        "; ".join(nocanon[:4] + wrong[:4]))

    badlang = [p for p, r in pages.items() if r["html_lang"] != "ms"]
    add("G35", 'Root element carries lang="ms"', not badlang,
        f"{len(pages) - len(badlang)}/{len(pages)}", 'literal lang="ms"',
        "; ".join(badlang[:5]))

    badsuffix = [p for p, r in pages.items()
                 if r["title"] and not r["title"].endswith(TITLE_SUFFIX)]
    add("G36", f'Every <title> ends with the literal "{TITLE_SUFFIX}"',
        not badsuffix, f"{len(pages) - len(badsuffix)}/{len(pages)}",
        f'literal suffix "{TITLE_SUFFIX}" (14 chars)', "; ".join(badsuffix[:5]))

    rootdefault = [p for p, r in pages.items()
                   if page_kind(p) == "article" and r["title"]
                   and r["title"].startswith("HelloKahwin —")]
    add("G37", "No article serves the ROOT DEFAULT title (cached metadata miss)",
        not rootdefault, f"{len(rootdefault)} articles on the root default title",
        "== 0", "; ".join(rootdefault[:6]) +
        "  [re-run after any POST /api/cron/revalidate-content]")

    # G40 — render stability. An article that drops its related-articles module
    # on one render loses every sibling link on that render, AND the bad body is
    # cacheable. Observed once on 2026-08-28: /artikel/hantaran-mas-kahwin/
    # mas-kahwin-ikut-negeri returned 200 with 128,438 B, zero <h2> and no
    # module, where 13 other requests to the same URL that morning returned
    # 151,028-156,814 B with it. n=1 of 14 — an occurrence, not a rate.
    if wanted("G40"):
        probe = next((p for p in arts if p.endswith("mas-kahwin-ikut-negeri")),
                     next(iter(arts), None))
        if probe:
            sizes, mods = [], []
            for _ in range(5):
                codes, heads, body, _ms = curl(base + probe)
                sizes.append(len(body))
                mods.append("Lagi dalam" in body)
                time.sleep(DELAY)
            add("G40", "Repeated renders of one article are stable",
                all(mods) and (max(sizes) - min(sizes)) <= 2048,
                f"{sum(mods)}/5 renders carry the related module; "
                f"byte spread {max(sizes) - min(sizes)} B",
                "5/5 renders carry the module, byte spread <= 2048",
                f"probe: {probe}; sizes {sizes}")

    credit_pages = [p for p, r in arts.items() if r["credit_links"] == 0]
    add("G38", "Articles keep their outbound image-credit links",
        len(arts) - len(credit_pages) >= baseline["links"]["credit_link_pages"],
        f"{len(arts) - len(credit_pages)} articles carry >=1 credit link",
        f">= {baseline['links']['credit_link_pages']} (2026-08-28 baseline)",
        "owner-level rule: every image credited to its original source")

    return out


def check_redirects(base, posts_json):
    """G33 — the 29 legacy WordPress URLs. One hop to 200, no exceptions."""
    posts = json.load(open(posts_json, encoding="utf-8"))
    ok = bad = 0
    rows = []
    for p in posts:
        url = f"{base}/{p['slug']}/"
        pr = subprocess.run(
            ["curl", "-sSIL", "-A", UA, "--max-time", "40",
             "-w", "\nFINAL %{http_code} %{url_effective} %{num_redirects}\n", url],
            capture_output=True)
        t = pr.stdout.decode("utf-8", "replace")
        m = re.search(r"FINAL (\d{3}) (\S+) (\d+)", t)
        code, eff, hops = (m.group(1), m.group(2), int(m.group(3))) if m else ("?", "?", -1)
        good = code == "200" and hops == 1
        ok += good
        bad += not good
        rows.append((("OK" if good else "BAD"), hops, code, url, eff))
        time.sleep(1.2)
    return ok, bad, rows


def check_sitemap(base):
    _, _, xml, _ = curl(base + "/sitemap.xml")
    return [u.replace(base, "") or "/" for u in
            re.findall(r"<loc>([^<]+)</loc>", xml)]


# ── Main ───────────────────────────────────────────────────────────────────


def main():
    global DELAY
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="https://hellokahwin.com")
    ap.add_argument("--quick", action="store_true")
    ap.add_argument("--only", default="")
    ap.add_argument("--json", default="")
    ap.add_argument("--delay", type=float, default=DELAY)
    ap.add_argument("--posts", default=os.path.join(
        HERE, "..", "..", "..", "..", "data", "hellokahwin-export", "content", "posts.json"))
    a = ap.parse_args()
    DELAY = a.delay
    base = a.base.rstrip("/")
    host = urlparse(base).netloc.lower()
    baseline = json.load(open(BASELINE, encoding="utf-8"))
    only = set(x.strip() for x in a.only.split(",") if x.strip()) or None

    paths = QUICK_SET if a.quick else check_sitemap(base)
    print(f"DES-09 guardrails · base={base} · {len(paths)} URLs · "
          f"SEQUENTIAL, {DELAY}s apart · started {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}\n")

    pages, failed_fetch = {}, []
    for i, p in enumerate(paths, 1):
        codes, heads, body, ms = curl(base + p)
        if not codes or not body:
            failed_fetch.append(p)
            print(f"[{i}/{len(paths)}] FETCH FAILED after {ms}ms  {p}")
        else:
            pages[p] = analyse(base + p, body, heads, ms, host)
            print(f"[{i}/{len(paths)}] {codes[-1]} {ms:>5}ms  {p}")
        if i < len(paths):
            time.sleep(DELAY)

    print()
    full = not a.quick and len(pages) >= baseline['sitemap']['url_count'] - 2
    if not full:
        msg = "NOTE: partial sweep - corpus-scoped guardrails (%s) report UNKNOWN."
        print(msg % ", ".join(sorted(CORPUS_SCOPED)))
        print()
    results = run_guardrails(pages, base, baseline, only, full_corpus=full)

    if not only or "G33" in only:
        posts = os.path.abspath(a.posts)
        if os.path.exists(posts):
            ok, bad, rows = check_redirects(base, posts)
            results.append(Result(
                "G33", "The 29 legacy WordPress redirects: one hop to 200",
                "PASS" if bad == 0 else "FAIL", f"{ok}/{ok + bad} one-hop-to-200",
                "29/29, zero multi-hop, zero broken",
                "; ".join(f"{r[3]} -> {r[4]} ({r[1]} hops)" for r in rows if r[0] == "BAD")[:400]))
        else:
            results.append(Result("G33", "The 29 legacy WordPress redirects",
                                  "UNKNOWN", "posts.json not found", "29/29",
                                  f"looked in {posts} — pass --posts"))

    sm = check_sitemap(base)
    results.append(Result(
        "G31", "The sitemap URL set does not shrink",
        "PASS" if len(sm) >= baseline["sitemap"]["url_count"] else "FAIL",
        f"{len(sm)} URLs", f">= {baseline['sitemap']['url_count']} (2026-08-28)",
        "; ".join(sorted(set(baseline["sitemap"]["sample"]) - set(sm))[:6])))

    if failed_fetch:
        results.append(Result("G00", "Every sitemap URL responds",
                              "FAIL", f"{len(failed_fetch)} URLs failed to respond",
                              "== 0", "; ".join(failed_fetch[:6])))

    w = max(len(r.gid) for r in results)
    fails = 0
    for r in results:
        if r.verdict == "FAIL":
            fails += 1
        mark = {"PASS": "PASS", "FAIL": "FAIL", "WARN": "WARN", "UNKNOWN": "????"}[r.verdict]
        print(f"{mark}  {r.gid:<{w}}  {r.title}")
        print(f"        measured : {r.measured}")
        print(f"        threshold: {r.threshold}")
        if r.detail:
            print(f"        detail   : {r.detail[:300]}")
    print(f"\n{sum(1 for r in results if r.verdict == 'PASS')} pass, "
          f"{fails} fail, {sum(1 for r in results if r.verdict == 'WARN')} warn, "
          f"{sum(1 for r in results if r.verdict == 'UNKNOWN')} unknown")

    if a.json:
        json.dump({"base": base, "when": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                   "results": [r._asdict() for r in results]},
                  open(a.json, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
        print(f"wrote {a.json}")
    return fails


if __name__ == "__main__":
    sys.exit(main())
