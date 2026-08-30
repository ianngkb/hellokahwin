#!/usr/bin/env python3
"""SERP-shape census: classify every ranking query by the shape of its SERP and
measure the click ceiling that shape implies.  SEO-11, Sprint 04.

WHY THIS EXISTS
  The 30 Aug 2026 board meeting measured three queries and found a 15x CTR split
  on AI Overview presence.  Three queries is an anecdote.  This turns it into a
  census, and it is the input SEO-12 turns into a runnable gate.

WHAT IT DOES
  1. Pulls our own performance from Search Console.  NEVER Ahrefs for our own
     traffic - decision 91: Ahrefs reported 9 organic keywords against GSC's
     2,869 impressions on the same day.  Ahrefs is used ONLY for the shape of
     the SERP.
  2. Pulls the SERP shape per query from Ahrefs `serp-overview`, country `my`.
  3. Joins them and writes one row per query.

REPRODUCING IT
  python scripts/seo/serp-shape-census.py \
      --start 2026-08-01 --end 2026-08-28 --min-impressions 5 \
      --out docs/work-done/aug-30-2026-session-01/serp-shape-census.csv

  Credentials, neither of which is stored in this repo:
    Search Console  service-account JSON at $GSC_SERVICE_ACCOUNT_PATH, else
                    ~/.claude/secrets/gsc-service-account.json
    Ahrefs          MCP bearer at $AHREFS_MCP_TOKEN, else read from the `ahrefs`
                    entry of ~/.claude.json

HONESTY RULES BUILT INTO THIS SCRIPT.  DO NOT REMOVE THEM.
  * Ahrefs holds no SERP snapshot for some keywords it nonetheless reports
    volume for.  An empty `positions` array means WE DO NOT KNOW, not "no AI
    Overview".  Those rows are written `unknown` and excluded from every rate.
    A checker that cannot tell "absent" from "not looked at" produces exactly
    the false alarms that get checkers switched off.
  * expected_ctr comes from ONE cited published curve that stops at position 10.
    Beyond position 10 this writes NA.  It never extrapolates.
"""

import argparse
import base64
import csv
import io
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

# --------------------------------------------------------------- expected CTR
# SOURCE CURVE, quoted verbatim and in full.
#   First Page Sage, "Google Click-Through Rates (CTRs) by Ranking Position"
#   https://firstpagesage.com/reports/google-click-through-rates-ctrs-by-ranking-position/
#   Publisher's stated last update: 28 May 2025.  Retrieved 31 August 2026.
#   Publisher's stated method: meta-analysis over Backlinko, Sistrix, Wordstream,
#   BrightLocal, LocalIQ and First Page Sage's own Search Console data.
#   The publisher does NOT disclose a sample size.  See the write-up for the
#   three alternative curves that were tested and rejected, with evidence.
CTR_CURVE = {1: 39.8, 2: 18.7, 3: 10.2, 4: 7.2, 5: 5.1,
             6: 4.4, 7: 3.0, 8: 2.1, 9: 1.9, 10: 1.6}
CURVE_NAME = ("First Page Sage, Google CTRs by Ranking Position "
              "(publisher update 2025-05-28, retrieved 2026-08-31), positions 1-10")


def expected_ctr(position):
    """Linear interpolation between integer positions of the cited curve.

    Our position is a Search Console AVERAGE and therefore fractional, so
    rounding it to an integer throws away real information.  Interpolating on a
    convex curve overestimates the expected value slightly; that bias makes our
    measured CTR look WORSE than it is, i.e. it runs against the conclusion this
    census reaches, so it is the safe direction to be wrong in.

    Returns None beyond position 10 - outside the cited curve.  NA, not a guess.
    """
    if position is None:
        return None
    if position <= 1:
        return CTR_CURVE[1]
    if position > 10:
        return None
    lo = int(position)
    hi = min(lo + 1, 10)
    return CTR_CURVE[lo] + (position - lo) * (CTR_CURVE[hi] - CTR_CURVE[lo])


# -------------------------------------------------------------- Search Console
def _b64url(raw):
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def gsc_access_token(cred_path):
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import padding
    cred = json.load(io.open(cred_path, encoding="utf-8"))
    now = int(time.time())
    header = _b64url(json.dumps({"alg": "RS256", "typ": "JWT"}).encode())
    claims = _b64url(json.dumps({
        "iss": cred["client_email"],
        "scope": "https://www.googleapis.com/auth/webmasters.readonly",
        "aud": "https://oauth2.googleapis.com/token",
        "iat": now, "exp": now + 3600}).encode())
    key = serialization.load_pem_private_key(cred["private_key"].encode(), password=None)
    sig = key.sign((header + "." + claims).encode(), padding.PKCS1v15(), hashes.SHA256())
    body = urllib.parse.urlencode({
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
        "assertion": header + "." + claims + "." + _b64url(sig)}).encode()
    req = urllib.request.Request(
        "https://oauth2.googleapis.com/token", data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"})
    return json.load(urllib.request.urlopen(req, timeout=60))["access_token"]


def gsc_query(token, site, body):
    url = ("https://searchconsole.googleapis.com/webmasters/v3/sites/"
           + urllib.parse.quote(site, safe="") + "/searchAnalytics/query")
    req = urllib.request.Request(
        url, data=json.dumps(body).encode(),
        headers={"Authorization": "Bearer " + token,
                 "Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=120)).get("rows", [])


# ---------------------------------------------------------------------- Ahrefs
class Ahrefs(object):
    """Minimal MCP streamable-HTTP client.

    The Ahrefs MCP bearer is NOT a v3 REST key - the REST API returns 401 for
    it - so this speaks JSON-RPC to the MCP endpoint, which is the authorised
    path for this workspace.
    """

    URL = "https://api.ahrefs.com/mcp/mcp"

    def __init__(self, token):
        self.token = token if token.startswith("Bearer ") else "Bearer " + token
        self.session = None
        self._rpc({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {
            "protocolVersion": "2025-06-18", "capabilities": {},
            "clientInfo": {"name": "serp-shape-census", "version": "1.0"}}})
        self._rpc({"jsonrpc": "2.0", "method": "notifications/initialized", "params": {}})

    def _rpc(self, payload):
        headers = {"Authorization": self.token,
                   "Content-Type": "application/json",
                   "Accept": "application/json, text/event-stream",
                   "MCP-Protocol-Version": "2025-06-18"}
        if self.session:
            headers["Mcp-Session-Id"] = self.session
        req = urllib.request.Request(self.URL, data=json.dumps(payload).encode(),
                                     headers=headers, method="POST")
        resp = urllib.request.urlopen(req, timeout=180)
        sid = resp.headers.get("Mcp-Session-Id")
        if sid:
            self.session = sid
        raw = resp.read().decode("utf-8", "replace")
        if not raw.strip():
            return None
        if raw.lstrip().startswith("{"):
            return json.loads(raw)
        out = None
        for line in raw.splitlines():
            if line.startswith("data:"):
                out = json.loads(line[5:].strip())
        return out

    def call(self, name, arguments):
        r = self._rpc({"jsonrpc": "2.0", "id": 9, "method": "tools/call",
                       "params": {"name": name, "arguments": arguments}})
        if r is None or "error" in r:
            raise RuntimeError("ahrefs %s failed: %s"
                               % (name, json.dumps(r)[:300] if r else "no response"))
        return "\n".join(c["text"] for c in r["result"].get("content", [])
                         if c.get("type") == "text")


def parse_ahrefs(text):
    """Ahrefs MCP returns <json body>, then a prose render hint, then a
    trailing {"apiUsageCosts": ...} object.  json.loads on the whole string
    raises "Extra data"; decode the first object and regex the cost."""
    body, _ = json.JSONDecoder().raw_decode(text, 0)
    cost = None
    m = re.search(r'\{"apiUsageCosts".*\}', text)
    if m:
        cost = json.loads(m.group(0))["apiUsageCosts"]
    return body, cost


def classify(positions):
    """Turn an Ahrefs positions array into SERP-shape flags.

    `image` is the image PACK.  `image_th` is a thumbnail hanging off another
    feature - it appears on ai_overview_sitelink rows - and is deliberately NOT
    counted as an image pack.
    """
    aio_pos = None
    paa = False
    image_pack = False
    our_pos = None
    update_date = None
    for p in positions:
        types = p.get("type") or []
        update_date = update_date or p.get("update_date")
        if "ai_overview" in types:
            pos = p.get("position")
            aio_pos = pos if aio_pos is None else min(aio_pos, pos)
        if "question" in types:
            paa = True
        if "image" in types:
            image_pack = True
        if "organic" in types and "hellokahwin.com" in (p.get("url") or ""):
            if our_pos is None:
                our_pos = p.get("position")
    return {"ai_overview_present": aio_pos is not None,
            "ai_overview_position": aio_pos,
            "paa_present": paa,
            "image_pack_present": image_pack,
            "ahrefs_our_position": our_pos,
            "serp_update_date": update_date}


CLUSTERS = [
    ("garden-wedding", lambda q, p: "/garden-wedding" in p),
    ("mas-kahwin", lambda q, p: ("mas-kahwin" in p or "mas kahwin" in q
                                 or "mas kawin" in q or "maskawin" in q
                                 or "mahar" in q)),
    ("walimatul-urus", lambda q, p: "walimatul" in q or "walimatul-urus" in p),
    ("doa-ucapan", lambda q, p: "/ucapan-doa/" in p or q.startswith("doa")),
    ("dewan-venue", lambda q, p: "/dewan-kahwin" in p or "dewan" in q),
    ("hantaran", lambda q, p: "hantaran" in q or "hantaran" in p or "dulang" in q),
    ("nikah-undang-undang", lambda q, p: "/nikah-undang-undang/" in p),
    ("perancangan-kos", lambda q, p: "/venue-perancangan/" in p),
    ("hiasan-dekorasi", lambda q, p: "/hiasan-dekorasi/" in p),
]


def cluster_of(query, page):
    for name, test in CLUSTERS:
        if test(query, page):
            return name
    return "lain-lain"


# Decision 159 (owner, 30 Aug 2026) splits the reported CTR metric between
# document-intent and number/definition queries, and says explicitly that
# SEO-11's census is what makes the classification "reproducible rather than a
# per-query judgement call by the CEO".  So it is decided here, by the grammar
# of the query itself, and not by anybody's reading of it.
#
#   document   the searcher leaves with a text or a list they will use at a
#              ceremony or while planning - a prayer, a checklist, an item list
#   number     the answer is a figure; Google can and does state it
#   definition the answer is a meaning; Google can and does state it
#   navigational a named place or venue
#
# Order matters: the first pattern that matches wins.
INTENT_PATTERNS = [
    ("definition", (r"\bmaksud\b", r"\bapa itu\b", r"\bapakah\b", r"\berti\b")),
    ("document", (r"\bdoa\b", r"\blafaz\b", r"\brukun\b", r"\bchecklist\b",
                  r"\bsenarai\b", r"\bidea\b", r"\bbalas\b", r"\bborang\b",
                  r"\bkursus\b", r"\bdulang\b", r"\bgoodies\b", r"\bbarang\b")),
    ("number", (r"\bmas kahwin\b", r"\bmas kawin\b", r"\bmaskawin\b",
                r"\bmahar\b", r"\bharga\b", r"\bkos\b", r"\bupah\b",
                r"\bberapa\b", r"\bbajet\b", r"\bsewa\b", r"\bmurah\b")),
    ("navigational", (r"\bdewan\b", r"\bpusat komuniti\b", r"\bvenue\b",
                      r"\btempat\b")),
]


# SUPERSEDED FOR GATING, 31 Ogos 2026 (SEO-12).  `scripts/seo/check-serp-shape.py`
# is the canonical answer-type classifier: it adds a tier ORDER, a stage-B rule
# that decides bare terms of art from their own demand family, and an UNKNOWN
# class instead of `other`.  It relabels 19 of this census's 84 rows.
#
# This function is deliberately FROZEN so the committed serp-shape-census.csv
# still reproduces byte-for-byte.  When the census is re-run at the end of
# Sprint 05, import the gate's classifier and re-issue the CSV; do not quietly
# edit this one and leave a file nobody can reproduce.
def intent_of(query):
    q = query.lower()
    for label, pats in INTENT_PATTERNS:
        for p in pats:
            if re.search(p, q):
                return label
    return "other"


COLUMNS = ["query", "cluster", "intent_class", "landing_page", "impressions", "clicks", "position",
           "actual_ctr_pct", "serp_data", "ai_overview_present",
           "ai_overview_position", "paa_present", "image_pack_present",
           "expected_ctr_pct", "ratio_actual_over_expected", "serp_update_date",
           "tier"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--site", default="https://hellokahwin.com/")
    ap.add_argument("--start", required=True)
    ap.add_argument("--end", required=True)
    ap.add_argument("--country", default="my")
    ap.add_argument("--min-impressions", type=int, default=5,
                    help="The DoD threshold is 20; 5 also fetches the extension tier.")
    ap.add_argument("--cache", default=".cache/serp")
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    cred = (os.environ.get("GSC_SERVICE_ACCOUNT_PATH")
            or os.path.expanduser("~/.claude/secrets/gsc-service-account.json"))
    token = os.environ.get("AHREFS_MCP_TOKEN")
    if not token:
        cfg = json.load(io.open(os.path.expanduser("~/.claude.json"), encoding="utf-8"))
        token = cfg["mcpServers"]["ahrefs"]["headers"]["Authorization"]

    sys.stderr.write("Search Console property : %s\n" % args.site)
    sys.stderr.write("window                  : %s to %s (dataState=final)\n"
                     % (args.start, args.end))
    sys.stderr.write("Ahrefs country          : %s\n" % args.country)
    sys.stderr.write("expected-CTR curve      : %s\n" % CURVE_NAME)

    tok = gsc_access_token(cred)
    by_query = gsc_query(tok, args.site, {
        "startDate": args.start, "endDate": args.end,
        "dimensions": ["query"], "rowLimit": 25000, "dataState": "final"})
    by_qp = gsc_query(tok, args.site, {
        "startDate": args.start, "endDate": args.end,
        "dimensions": ["query", "page"], "rowLimit": 25000, "dataState": "final"})

    top_page = {}
    for r in by_qp:
        q, p = r["keys"]
        if q not in top_page or r["impressions"] > top_page[q][1]:
            top_page[q] = (p, r["impressions"])

    rows = sorted([r for r in by_query if r["impressions"] >= args.min_impressions],
                  key=lambda r: -r["impressions"])
    sys.stderr.write("queries at >= %d impressions: %d\n"
                     % (args.min_impressions, len(rows)))

    os.makedirs(args.cache, exist_ok=True)
    ah = Ahrefs(token)
    units = 0
    out_rows = []
    for i, r in enumerate(rows, 1):
        q = r["keys"][0]
        page = top_page.get(q, ("", 0))[0]
        slug = re.sub(r"[^a-z0-9]+", "-", q.lower()).strip("-")[:80]
        path = os.path.join(args.cache, slug + ".json")
        if os.path.exists(path) and os.path.getsize(path) > 200:
            text = json.load(io.open(path, encoding="utf-8"))["raw"]
        else:
            text = ah.call("serp-overview", {
                "keyword": q, "country": args.country,
                "select": "position,type,url,title,domain_rating,traffic,update_date"})
            io.open(path, "w", encoding="utf-8").write(json.dumps(
                {"keyword": q, "country": args.country, "raw": text}, ensure_ascii=False))
            time.sleep(0.4)

        body, cost = parse_ahrefs(text)
        if cost:
            units += cost.get("units-cost-total", 0)
        positions = body.get("positions", [])
        have = len(positions) > 0
        f = classify(positions)

        # Round the position BEFORE computing expected CTR, so that the CSV is
        # self-verifying: a reader can recompute expected_ctr_pct from the
        # position column of the file itself and get the published number back.
        # Computing from full precision and publishing a rounded position makes
        # the two disagree in the third decimal and wastes a reviewer's hour.
        pos = round(r["position"], 2) if r.get("position") is not None else None
        exp = expected_ctr(pos)
        act = (r["clicks"] / r["impressions"] * 100.0) if r["impressions"] else 0.0

        out_rows.append({
            "query": q,
            "cluster": cluster_of(q, page),
            "intent_class": intent_of(q),
            "landing_page": page.replace("https://hellokahwin.com", ""),
            "impressions": r["impressions"],
            "clicks": r["clicks"],
            "position": pos if pos is not None else "",
            "actual_ctr_pct": round(act, 3),
            "serp_data": "yes" if have else "NO DATA",
            "ai_overview_present": str(f["ai_overview_present"]).lower() if have else "unknown",
            "ai_overview_position": (f["ai_overview_position"]
                                     if have and f["ai_overview_position"] is not None else ""),
            "paa_present": str(f["paa_present"]).lower() if have else "unknown",
            "image_pack_present": str(f["image_pack_present"]).lower() if have else "unknown",
            "expected_ctr_pct": round(exp, 3) if exp is not None else "NA",
            "ratio_actual_over_expected": round(act / exp, 3) if exp else "NA",
            "serp_update_date": f["serp_update_date"] or "",
            "tier": "dod" if r["impressions"] >= 20 else "extension",
        })
        if i % 20 == 0:
            sys.stderr.write("  %d/%d\n" % (i, len(rows)))

    outdir = os.path.dirname(args.out)
    if outdir:
        os.makedirs(outdir, exist_ok=True)
    with io.open(args.out, "w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=COLUMNS)
        w.writeheader()
        for row in out_rows:
            w.writerow(row)
    sys.stderr.write("wrote %s (%d rows)\n" % (args.out, len(out_rows)))
    sys.stderr.write("ahrefs units consumed this run: %d\n" % units)


if __name__ == "__main__":
    main()
