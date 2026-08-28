#!/usr/bin/env python3
"""Re-run the DES-07 state-set measurements against live production.

    python reproduce.py

No credentials needed: every URL is public. Fetches the sitemap, all 15 category
pages, all 86 articles, the error surfaces and the served stylesheet, then prints
the findings table from section 2 of docs/design/des-07-set-keadaan.html.

The browser-side numbers (title truncation at 360 px, nav width, breadcrumb cut,
navigation feedback, target sizes) need a real layout engine and live in
probe.mjs / measure.js next to this file.

Numbers reported on 28 Ogos 2026, deploy dpl_CV6piQmHcTjeP1p5nSmH3tffd4MS:

    articles                            86
    categories                          15   (8 grid template, 7 cluster template)
    categories absent from the nav       6
    empty "akan datang" sections         6   across 4 categories
    articles with no related block       4
    articles >4000 chars with no TOC    12
    homepage items from one category  13/13
    404 <main> characters, no JS         0
    skeleton/loading markup found        0   in 102 server-rendered pages
"""
import json
import re
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

BASE = "https://hellokahwin.com"
UA = {"User-Agent": "Mozilla/5.0 (DES-07 reproduce; hellokahwin design)"}


def get(url, timeout=120):
    req = urllib.request.Request(url, headers=UA)
    t = time.time()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, round(time.time() - t, 2), r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, round(time.time() - t, 2), e.read().decode("utf-8", "replace")
    except Exception as e:  # noqa: BLE001
        return -1, round(time.time() - t, 2), repr(e)


def strip_scripts(html):
    return re.sub(r"<script.*?</script>", "", html, flags=re.S)


def main_of(html):
    m = re.search(r"<main.*?</main>", strip_scripts(html), flags=re.S)
    return m.group(0) if m else ""


def text(s):
    s = re.sub(r"<!--.*?-->", "", s, flags=re.S)
    s = re.sub(r"<[^>]+>", "", s)
    s = re.sub(r"\s+", " ", s)
    for a, b in [("&amp;", "&"), ("&#x27;", "'"), ("&quot;", '"'), ("&nbsp;", " ")]:
        s = s.replace(a, b)
    return s.strip()


def main():
    out = sys.stdout

    st, _, sm = get(f"{BASE}/sitemap.xml")
    urls = re.findall(r"<loc>(.*?)</loc>", sm)
    cats = [u for u in urls if u.count("/") == 4 and "/artikel/" in u]
    arts = [u for u in urls if u.count("/") == 5]
    print(f"sitemap {st}: {len(urls)} urls, {len(cats)} categories, {len(arts)} articles", file=out)

    targets = cats + [f"{BASE}/artikel", f"{BASE}/"] + arts
    with ThreadPoolExecutor(max_workers=6) as pool:
        pages = dict(zip(targets, pool.map(lambda u: get(u), targets)))

    slow = sorted(((t, u) for u, (s, t, _) in pages.items()), reverse=True)[:5]
    print("\nfirst-request render time, slowest five", file=out)
    for t, u in slow:
        print(f"  {t:6.2f}s  {u}", file=out)

    # --- categories -------------------------------------------------------
    grid = cluster = empty_sections = 0
    cat_rows = []
    for u in cats:
        m = main_of(pages[u][2])
        h1 = text(re.search(r"<h1[^>]*>(.*?)</h1>", m, flags=re.S).group(1))
        cards = len(re.findall(r'<h3 class="hk-card-title', m))
        secs = re.findall(r"<section aria-labelledby.*?</section>", m, flags=re.S)
        empties = sum(1 for s in secs if "akan datang" in s)
        empty_sections += empties
        tmpl = "grid" if cards or "Kategori</span>" in m else "cluster"
        grid += tmpl == "grid"
        cluster += tmpl == "cluster"
        cat_rows.append((u.split("/")[-1], tmpl, h1, len(h1), cards, len(secs), empties,
                         len(re.findall(r'<a class="hk-chip"', m))))

    print(f"\ncategory templates: {grid} grid, {cluster} cluster", file=out)
    print(f'empty "akan datang" sections: {empty_sections}', file=out)
    longest_cat = max(cat_rows, key=lambda r: r[3])
    print(f"longest category name: {longest_cat[3]} chars  {longest_cat[2]}", file=out)

    _, _, home = pages[f"{BASE}/"]
    nav = re.findall(r'<nav aria-label="Kategori".*?</nav>', strip_scripts(home), flags=re.S)
    nav_links = len(re.findall(r'href="/artikel/[^"/]+"', nav[0])) if nav else 0
    print(f"categories in the nav: {nav_links} of {len(cats)}", file=out)

    # --- homepage concentration ------------------------------------------
    hm = main_of(home)
    cards = re.findall(r'<h3 class="hk-card-title[^"]*"[^>]*>\s*<a[^>]*href="([^"]+)"', hm, flags=re.S)
    hero = re.findall(r'<a class="group block" href="([^"]+)"', hm)
    items = hero + cards
    from collections import Counter
    conc = Counter(u.split("/")[2] for u in items)
    top, n = conc.most_common(1)[0]
    print(f"\nhomepage: {len(items)} items, {n} of them from '{top}' "
          f"({len(conc)} distinct categories)", file=out)

    # --- articles ---------------------------------------------------------
    no_related = big_no_toc = dbl_h1 = 0
    longest_title = ("", 0)
    longest_body = ("", 0)
    shortest_body = ("", 10 ** 9)
    for u in arts:
        m = main_of(pages[u][2])
        h1s = re.findall(r"<h1[^>]*>(.*?)</h1>", m, flags=re.S)
        dbl_h1 += len(h1s) > 1
        title = text(h1s[0]) if h1s else ""
        if len(title) > longest_title[1]:
            longest_title = (title, len(title))
        toc = len(re.findall(r'<nav aria-label="Isi kandungan".*?</nav>', m, flags=re.S))
        prose = re.search(r'<div class="inspire-prose[^"]*">(.*?)</article>', m, flags=re.S)
        body = sum(len(text(p)) for p in re.findall(r"<p>(.*?)</p>", prose.group(1), flags=re.S)) if prose else 0
        if body > longest_body[1]:
            longest_body = (u, body)
        if body < shortest_body[1]:
            shortest_body = (u, body)
        if not toc and body > 4000:
            big_no_toc += 1
        if 'aria-labelledby="related-articles-heading"' not in m:
            no_related += 1

    print(f"\narticles with two <h1>: {dbl_h1} of {len(arts)}", file=out)
    print(f"articles with no related block: {no_related}", file=out)
    print(f"articles over 4000 chars with no contents list: {big_no_toc}", file=out)
    print(f"longest title: {longest_title[1]} chars  {longest_title[0]}", file=out)
    print(f"longest body: {longest_body[1]} chars  {longest_body[0]}", file=out)
    print(f"shortest body: {shortest_body[1]} chars  {shortest_body[0]}", file=out)

    # --- loading markup ---------------------------------------------------
    skeleton = sum(1 for s, _, b in pages.values() if re.search(r"animate-pulse|data-skeleton", b or ""))
    print(f"\npages shipping any skeleton markup: {skeleton} of {len(pages)}", file=out)

    # --- error surfaces ---------------------------------------------------
    print("\nerror surfaces", file=out)
    for label, path in [
        ("article 404", "/artikel/nikah-undang-undang/tiada-artikel-ini"),
        ("category 404", "/artikel/kategori-tiada"),
        ("root 404", "/halaman-yang-tidak-wujud"),
        ("bogus filter", "/artikel/real-wedding?sub=tidak-wujud"),
        ("/cari (DES-06 wants this)", "/cari?q=mas+kahwin"),
        ("filter matching zero", "/artikel/real-wedding?sub=bertema"),
    ]:
        s, t, b = get(BASE + path)
        m = main_of(b)
        empties = re.findall(r"akan datang[^<]*", text(m))
        print(f"  {label:28} {s}  {t:5.2f}s  <main> chars: {len(text(m)):5}"
              + (f'   copy: "{empties[0][:60]}"' if empties else ""), file=out)

    # --- webfonts ---------------------------------------------------------
    css_href = re.search(r'href="(/_next/static/chunks/[^"]+\.css[^"]*)"', home)
    if css_href:
        _, _, css = get(BASE + css_href.group(1).replace("&amp;", "&"))
        print(f"\n@font-face rules in the served stylesheet: {css.count('@font-face')}", file=out)
        print(f"woff2 references: {len(re.findall('woff2', css))}", file=out)
        fam = re.findall(r"--font-cormorant:([^;}]*)", css)
        print(f"--font-cormorant declarations: {sorted(set(fam))}", file=out)

    print("\nThe 360 px browser measurements are in probe.mjs / measure.js.", file=out)


if __name__ == "__main__":
    main()
