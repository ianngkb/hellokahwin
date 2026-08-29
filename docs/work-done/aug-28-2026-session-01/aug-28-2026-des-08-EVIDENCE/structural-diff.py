#!/usr/bin/env python3
"""
DES-08 — structural comparison of the redesigned build against live production.

A 200 carrying the right marker string is NOT health. On 27 Ogos 2026 a preview
returned 200 with the exact marker and rendered ZERO articles, because the
database role read 0 rows from a table holding 74. So this script never asserts
on a status code. It counts the things that make the page a page — headings by
level, internal anchors, images, JSON-LD @types, the literal strings the SEO
guardrails are written against — on BOTH sides, and prints them side by side.

A page that differs only where it is supposed to differ is verified.

Usage:
    python structural-diff.py                       # default URL set
    python structural-diff.py --local http://localhost:3200
    python structural-diff.py --json out.json

Requests are issued STRICTLY SEQUENTIALLY, 2.0s apart, against production. This
is a correctness requirement, not courtesy: DES-09 §2 recorded that a six-wide
sweep of this site manufactures the contention that makes `generateMetadata`
miss its deadline and return `{}` — 36 root-default titles out of 56 cold
renders, against 0 of 69 on a sequential sweep. Anyone who parallelises this
measures their own load and reports it as a regression.
"""

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
import time

DELAY = 2.0
UA = "HelloKahwin-DES08-structural/1.0"

PATHS = [
    "/",
    "/artikel/hantaran-mas-kahwin",
    "/artikel/pantai-santai",
    "/artikel/hantaran-mas-kahwin/mas-kahwin-ikut-negeri",
    "/artikel/idea-dan-nasihat/dewan-kahwin",
    "/artikel/nikah-undang-undang/borang-nikah",
    "/artikel/glamor-eksklusif/amankila-bali",
    "/artikel/idea-dan-nasihat/garden-wedding",
]


def fetch(url):
    """Return (status, headers_lower, body, elapsed_ms). Never raises.

    Headers go to their own temp file rather than sharing stdout with the body.
    Sharing them truncated the body to 1 byte against production while working
    fine against localhost — a difference that would have been read as "prod
    renders nothing", which is exactly the false reading this script exists to
    prevent. Separate sinks, no parsing of a concatenated stream.
    """
    with tempfile.TemporaryDirectory() as td:
        hp, bp = os.path.join(td, "h"), os.path.join(td, "b")
        proc = subprocess.run(
            ["curl", "-sS", "-D", hp, "-o", bp, "-A", UA,
             "--compressed", "--max-time", "45",
             "-w", "%{http_code} %{time_total}", url],
            capture_output=True,
        )
        status, elapsed = 0, 0.0
        try:
            code, secs = proc.stdout.decode().strip().split()
            status, elapsed = int(code), float(secs) * 1000
        except Exception:
            pass
        head = ""
        if os.path.exists(hp):
            with open(hp, "rb") as f:
                head = f.read().decode("utf-8", "replace")
        body = ""
        if os.path.exists(bp):
            with open(bp, "rb") as f:
                body = f.read().decode("utf-8", "replace")
    headers = {}
    for line in head.splitlines():
        if ":" in line and not line.startswith("HTTP/"):
            k, v = line.split(":", 1)
            headers[k.strip().lower()] = v.strip()
    return status, headers, body, elapsed


def analyse(body):
    """Every number this script compares. Derived from the DELIVERED HTML."""
    r = {}

    # ── Headings, by level and in document order ────────────────────────────
    outline = re.findall(r"(?is)<h([1-6])\b", body)
    r["outline"] = " ".join("h" + h for h in outline)
    for lvl in range(1, 7):
        r[f"h{lvl}"] = outline.count(str(lvl))

    # ── Anchors ────────────────────────────────────────────────────────────
    anchors = re.findall(r"(?is)<a\b([^>]*)>", body)
    def attr(tag, name):
        m = re.search(rf'(?is){name}\s*=\s*"([^"]*)"', tag)
        return m.group(1) if m else ""

    internal, external = [], []
    for a in anchors:
        href = attr(a, "href")
        if not href or href.startswith("#"):
            continue
        if href.startswith("/") or "hellokahwin.com" in href:
            internal.append((href, a))
        elif href.startswith("http"):
            external.append((href, a))
    r["internal_anchors"] = len(internal)
    r["internal_unique"] = len({h for h, _ in internal})
    r["external_anchors"] = len(external)
    # G06 / G07 — the two things Sprint 01 bought that nothing on screen shows.
    r["internal_nofollow"] = sum(1 for _, a in internal if "nofollow" in a.lower())
    r["internal_blank"] = sum(1 for _, a in internal if "_blank" in a.lower())
    r["external_nofollow"] = sum(1 for _, a in external if "nofollow" in a.lower())

    # G08 — the eleven-path navigation spine, on every page.
    spine = ["/", "/artikel", "/artikel/busana-pengantin", "/artikel/hantaran-mas-kahwin",
             "/artikel/idea-dan-nasihat", "/artikel/nikah-undang-undang",
             "/artikel/pelamin-kad-cenderahati", "/artikel/real-wedding",
             "/artikel/sebelum-nikah", "/artikel/ucapan-doa", "/artikel/venue-perancangan"]
    hrefs = {h.split("?")[0].rstrip("/") or "/" for h, _ in internal}
    r["spine_present"] = sum(1 for p in spine if (p.rstrip("/") or "/") in hrefs)

    # ── Images ─────────────────────────────────────────────────────────────
    imgs = re.findall(r"(?is)<img\b([^>]*)>", body)
    r["img_count"] = len(imgs)
    r["img_srcset"] = sum(1 for i in imgs if attr(i, "srcset"))
    r["img_width"] = sum(1 for i in imgs if attr(i, "width"))
    r["img_lazy"] = sum(1 for i in imgs if attr(i, "loading") == "lazy")
    r["img_alt_missing"] = sum(1 for i in imgs if "alt=" not in i.lower())
    # G19/G20 — what the page asks the browser to fetch at high priority.
    preloads = re.findall(r'(?is)<link[^>]+rel="preload"[^>]+as="image"[^>]+>', body) + \
               re.findall(r'(?is)<link[^>]+as="image"[^>]+rel="preload"[^>]+>', body)
    r["preloaded_images"] = len(preloads)
    r["preload_srcs"] = [attr(p, "href") or attr(p, "imagesrcset")[:120] for p in preloads]

    # ── JSON-LD ────────────────────────────────────────────────────────────
    blocks = re.findall(
        r'(?is)<script[^>]+type="application/ld\+json"[^>]*>(.*?)</script>', body)
    types, unparseable = set(), 0
    faq_questions = 0
    for b in blocks:
        try:
            data = json.loads(b.replace("\\u003c", "<"))
        except Exception:
            unparseable += 1
            continue
        def walk(node):
            nonlocal faq_questions
            if isinstance(node, dict):
                t = node.get("@type")
                if isinstance(t, str):
                    types.add(t)
                    if t == "Question":
                        faq_questions += 1
                elif isinstance(t, list):
                    types.update(x for x in t if isinstance(x, str))
                for v in node.values():
                    walk(v)
            elif isinstance(node, list):
                for v in node:
                    walk(v)
        walk(data)
    r["jsonld_blocks"] = len(blocks)
    r["jsonld_types"] = sorted(types)
    r["jsonld_unparseable"] = unparseable
    r["faq_questions"] = faq_questions

    # ── The frozen contract, as literal strings ────────────────────────────
    t = re.search(r"(?is)<title[^>]*>(.*?)</title>", body)
    r["title"] = re.sub(r"\s+", " ", t.group(1)).strip() if t else ""
    r["title_suffix_ok"] = r["title"].endswith(" | HelloKahwin")
    # G37 — the root default title, which any revalidate-content run re-creates.
    r["is_root_default_title"] = r["title"].strip() in (
        "HelloKahwin", "HelloKahwin — Idea & Panduan Perkahwinan Malaysia | HelloKahwin",
        "HelloKahwin | HelloKahwin")
    c = re.search(r'(?is)<link[^>]+rel="canonical"[^>]+href="([^"]+)"', body)
    r["canonical"] = c.group(1) if c else ""
    lang = re.search(r"(?is)<html[^>]+lang=\"([^\"]+)\"", body)
    r["html_lang"] = lang.group(1) if lang else ""
    rob = re.search(r'(?is)<meta[^>]+name="robots"[^>]+content="([^"]+)"', body)
    r["robots"] = rob.group(1) if rob else ""

    # ── The literal strings the guardrails name ────────────────────────────
    r["lagi_dalam_h2"] = bool(re.search(r"(?is)<h2[^>]*>[^<]*Lagi dalam ", body))
    r["has_soalan_lazim"] = "Soalan lazim" in body or "Soalan Lazim" in body
    # G38 — image credits. The courtesy that earns the next licence.
    r["credit_anchors"] = len(re.findall(r"(?is)Kredit\s*:", body))
    # SEO-09's pillar up-link block — the literal text PillarUpLinkBlock emits
    # (src/components/inspire/pillar-up-link.tsx), not a guessed marker.
    r["pillar_uplink"] = "Sebahagian daripada panduan" in body

    # ── What tells the two designs apart, on the wire ──────────────────────
    # NOT a marker string we control — real rendered evidence of the system.
    r["ds_tokens"] = len(re.findall(r"--hk-parchment-100|--fs-h1|--a-boundary", body))
    r["ds_classes"] = len(re.findall(r'class="[^"]*\bs-(?:h1|rekod|row|card|label|deck|crumb)\b', body))
    r["old_hk_display"] = len(re.findall(r'class="[^"]*\bhk-display\b', body))
    r["geist_body"] = len(re.findall(r"--font-geist|Geist", body))

    r["bytes"] = len(body)
    return r


KEYS = [
    ("h1", "h1 count"), ("h2", "h2"), ("h3", "h3"), ("h4", "h4"),
    ("outline", "document outline"),
    ("internal_anchors", "internal anchors"), ("internal_unique", "unique internal targets"),
    ("internal_nofollow", "internal rel=nofollow  [G06]"),
    ("internal_blank", "internal target=_blank  [G07]"),
    ("spine_present", "nav spine paths /11  [G08]"),
    ("img_count", "images"), ("img_srcset", "images w/ srcset  [G22]"),
    ("img_width", "images w/ width     [G26]"), ("img_alt_missing", "images missing alt"),
    ("preloaded_images", "preloaded images    [G20]"),
    ("jsonld_blocks", "JSON-LD blocks"), ("jsonld_types", "JSON-LD @types  [G13/G14]"),
    ("jsonld_unparseable", "unparseable JSON-LD [G16]"),
    ("faq_questions", "FAQPage questions   [SEO-10]"),
    ("lagi_dalam_h2", "'Lagi dalam ' h2    [G05]"),
    ("has_soalan_lazim", "Soalan lazim block  [G17]"),
    ("credit_anchors", "image credits       [G38]"),
    ("pillar_uplink", "pillar up-link      [SEO-09]"),
    ("title", "title"), ("title_suffix_ok", "title suffix        [G36]"),
    ("is_root_default_title", "ROOT DEFAULT title  [G37]"),
    ("canonical", "canonical           [G32]"), ("html_lang", "lang                [G35]"),
    ("robots", "robots meta"),
    ("ds_tokens", "DES-05 tokens in HTML"), ("ds_classes", "DES-05 .s-* classes"),
    ("old_hk_display", "OLD .hk-display"), ("geist_body", "Geist references"),
    ("bytes", "body bytes"),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--local", default="http://localhost:3200")
    ap.add_argument("--prod", default="https://hellokahwin.com")
    ap.add_argument("--json", default=None)
    ap.add_argument("--paths", default=None, help="comma-separated override")
    args = ap.parse_args()

    paths = args.paths.split(",") if args.paths else PATHS
    out = {}
    fails = 0

    for path in paths:
        print("\n" + "=" * 78)
        print(path)
        print("=" * 78)

        ls, lh, lb, lms = fetch(args.local + path)
        time.sleep(0.2)
        ps, ph, pb, pms = fetch(args.prod + path)
        time.sleep(DELAY)

        # A status code is not a measurement — but a non-200 means the numbers
        # below describe an error page, so say so loudly rather than diffing it.
        print(f"  local  HTTP {ls}  {lms:7.0f} ms  {len(lb):>8} B")
        print(f"  prod   HTTP {ps}  {pms:7.0f} ms  {len(pb):>8} B"
              f"   x-vercel-cache={ph.get('x-vercel-cache', '-')}")
        if ls != 200 or ps != 200:
            print("  !! non-200 on one side — the comparison below is not meaningful")
            fails += 1

        la, pa = analyse(lb), analyse(pb)
        out[path] = {"local": la, "prod": pa,
                     "local_status": ls, "prod_status": ps,
                     "prod_cache": ph.get("x-vercel-cache", "")}

        print(f"\n  {'metric':<30} {'PROD (today)':<26} {'LOCAL (redesign)':<26}")
        print("  " + "-" * 76)
        for key, label in KEYS:
            pv, lv = pa.get(key), la.get(key)
            if isinstance(pv, list):
                pv, lv = ",".join(pv), ",".join(lv)
            pvs, lvs = str(pv)[:25], str(lv)[:25]
            mark = " " if pv == lv else "*"
            print(f" {mark}{label:<30} {pvs:<26} {lvs:<26}")

    if args.json:
        with open(args.json, "w", encoding="utf-8") as f:
            json.dump(out, f, indent=2, ensure_ascii=False)
        print(f"\nwrote {args.json}")

    return fails


if __name__ == "__main__":
    sys.exit(main())
