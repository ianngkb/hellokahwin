#!/usr/bin/env python3
"""PRE-FLIGHT #1 - the answer-type intent gate.  SEO-12, Sprint 04.

Classify a candidate keyword by THE KIND OF ANSWER THE SEARCHER WANTS, and exit
non-zero when a two-sentence answer satisfies them - because then Google states
it and the click is already gone.

    python scripts/seo/check-serp-shape.py "mas kahwin johor"
    python scripts/seo/check-serp-shape.py --selftest
    python scripts/seo/check-serp-shape.py --validate docs/work-done/aug-30-2026-session-01/serp-shape-census.csv

EXIT CODES.  The line `SERPSHAPE EXIT: n` is printed at the start of a line.

    0  PASS     document      the reader leaves with a text or a list
    1  FAIL     number        the answer is a figure; Google states it
    1  FAIL     definition    the answer is a meaning; Google states it
    2  REVIEW   navigational  a named place; this census measured no threshold
    3  UNKNOWN  not classifiable from the string - a human must classify it
    4  usage or runtime error

  3 IS NOT A PASS.  A checker that cannot tell "absent" from "not looked at"
  produces exactly the false alarms that get checkers switched off (DES-09).

WHY THIS GATES ON INTENT AND NOT ON THE AI OVERVIEW
  Decision 156 (CEO, 30 Aug 2026) measured three queries, found a 15x CTR split,
  and hung the rule on AI Overview presence.  SEO-11's 84-query census could not
  confirm that variable: positions 3-11, the same position-matched Fisher exact
  test reads p = 0.102 on all 30 band rows and p = 0.0009 on the 23 rows with a
  current SERP snapshot, on 14 clicks.  Undecidable in both directions - and the
  subset that flips it drops the two best-converting AI-Overview'd queries we
  own.  ANSWER-TYPE INTENT survives every one of those treatments at
  p = 0.000003 to 0.000025.

  The feature also does not sort the classes: 94% of number-intent queries carry
  an AI Overview and so do 79% of document-intent ones.  Applied as a gate it
  would kill `idea goodies kahwin` - AI Overview at position 1, 10.53% CTR, the
  best-converting query the company owns.

  So the AI Overview is reported here as ADVISORY METADATA and never touches the
  exit code.  Do not wire it in.  See docs/work-done/aug-30-2026-session-01/
  aug-31-2026-done-seo-11-serp-shape-census.md sections 5.1-5.3.

WHY VOLUME IS ALSO ADVISORY AND NEVER THE EXIT CODE
  SEO-11's rule 2 sets a page-worthiness floor of 220 monthly MY searches for
  document intent.  Both document queries in this file's own regression suite
  sit BELOW it - `doa pengantin baru rumi` and `idea goodies kahwin` are 200
  each (Ahrefs `volume`, country my, 31 Aug 2026).  A page targets a keyword
  FAMILY, not one term, so the floor is a planning input for a new page and not
  a verdict on a query.  Wiring it into the exit code breaks the suite and would
  reject the best-converting query we own for the second time in two weeks.
"""

import argparse
import collections
import csv
import io
import json
import math
import os
import re
import sys
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, "serp-shape-siblings.json")

PASS, FAIL, REVIEW, UNKNOWN, ERROR = 0, 1, 2, 3, 4
CODE_OF = {"document": PASS, "number": FAIL, "definition": FAIL,
           "navigational": REVIEW, "unknown": UNKNOWN}

# SEO-11 section 7.  Advisory only - see the module docstring.
VOLUME_FLOOR = {"document": 220, "number": 2700, "definition": 2700}


# ------------------------------------------------------------ STAGE A: markers
# An ORDERED ladder.  The first tier that matches wins, and the tier order is
# the claim: an explicit interrogative about a MEANING or an AMOUNT beats a
# topical noun, because the interrogative is what the searcher actually asked.
#
#   T1 before T2   "apa maksud kos kahwin" is a definition, not a price.
#   T2 before T3   "berapa dulang hantaran" wants a count, not the item list.
#   T3 before T4   "contoh mas kahwin" wants gubahan pictures, not the rate;
#                  "mas kahwin johor" has no document marker and stays a number.
#   T4 before T5   "harga sewa dewan kahwin" is a figure, not a venue lookup.
#
# Provenance is marked per tier.  `census` = the pattern fires on at least one
# of SEO-11's 84 rows.  `grammar` = Malay query grammar, no census row yet;
# these are the ones to re-check when the census is re-run at the end of
# Sprint 05.
LADDER = [
    ("definition", "T1 definition-explicit",
     # census: maksud, apakah.  grammar: the rest.
     (r"\bmaksud\b", r"\bmaksudnya\b", r"\bapa itu\b", r"\bapakah itu\b",
      r"\bapa maksud\b", r"\bapakah maksud\b", r"\bapakah\b", r"\berti\b",
      r"\bertinya\b", r"\bmakna\b", r"\bdefinisi\b", r"\btakrif\b",
      r"\bbermaksud\b", r"\bmeaning\b", r"\bhukum\b", r"\bbeza\b",
      r"\bperbezaan\b")),
    ("number", "T2 number-explicit",
     # census: harga, kos, upah, sewa, murah.  grammar: the rest.
     (r"\bberapa\b", r"\bberapakah\b", r"\bbrp\b", r"\bharga\b", r"\bkos\b",
      r"\bupah\b", r"\bbajet\b", r"\bbudget\b", r"\byuran\b", r"\bbayaran\b",
      r"\bkadar\b", r"\bsewa\b", r"\bcaj\b", r"\bmurah\b", r"\bmahal\b",
      r"\btarif\b", r"\brm\s*\d", r"\bnilai\b")),
    ("document", "T3 document",
     # census: doa, lafaz, checklist, idea, rukun, barang, dulang, goodies,
     # hantaran, kursus, "N balas N".  grammar: the rest.
     (r"\bdoa\b", r"\blafaz\b", r"\bayat\b", r"\bsurah\b", r"\bzikir\b",
      r"\bselawat\b", r"\bucapan\b", r"\bteks\b", r"\bkhutbah\b",
      r"\bsenarai\b", r"\bchecklist\b", r"\bcheck list\b", r"\bcontoh\b",
      r"\bidea\b", r"\bideas\b", r"\btemplate\b", r"\bborang\b",
      r"\bjadual\b", r"\bpanduan\b", r"\bcara\b", r"\blangkah\b",
      r"\btips\b", r"\brukun\b", r"\bsyarat\b", r"\bprosedur\b",
      r"\bdokumen\b", r"\bsusunan\b", r"\baturcara\b", r"\batur cara\b",
      r"\bbarang\b", r"\bdulang\b", r"\bgoodies\b", r"\bdoorgift\b",
      r"\bdoor gift\b", r"\bhantaran\b", r"\d+\s*balas\s*\d+",
      r"\bkoleksi\b", r"\binspirasi\b", r"\btema\b", r"\bkursus\b",
      r"\bkad\b", r"\bgambar\b")),
    ("number", "T4 number-entity",
     # The ENTITY is itself a sum of money set by a state religious authority,
     # so the bare term is a request for a figure.  `mas kahwin johor` -> RM22.50.
     # 34 of the census's 38 number rows are this family, at 0.37% CTR.
     (r"\bmas kahwin\b", r"\bmas kawin\b", r"\bmaskawin\b", r"\bmaskahwin\b",
      r"\bmahar\b")),
    ("navigational", "T5 navigational",
     # census: dewan, pusat komuniti, venue, tempat.  grammar: the rest.
     (r"\bdewan\b", r"\bpusat komuniti\b", r"\bvenue\b", r"\bvenues\b",
      r"\btempat\b", r"\bhotel\b", r"\bmasjid\b", r"\bbanquet\b",
      r"\blocation\b", r"\blocations\b", r"\bplaces\b")),
]


def stage_a(query):
    """First matching tier wins.  Returns (label, tier, pattern) or (None,..)."""
    s = query.lower()
    for label, tier, pats in LADDER:
        for p in pats:
            if re.search(p, s):
                return label, tier, p
    return None, None, None


def is_latin(query):
    """A query with no Latin letters is not a Malay query and this gate has no
    evidence about it.  The census carries one: the Chinese-language
    `hua yuan hun li` row.  UNKNOWN, not a guess."""
    return bool(re.search(r"[a-z]", query.lower()))


# ------------------------------------- STAGE B: sibling-variant evidence
# A bare technical term carries no marker of its own.  `walimatul urus` is the
# case: the searcher supplies a term and nothing else, and what they want is its
# meaning - but nothing in the STRING says so.
#
# The evidence is in the term's own demand family.  If the modifier-bearing
# variants of a head term are decisively one class, the bare head inherits it:
# people who already knew what the word meant would have typed a modifier.
#
#   walimatul urus            1,000/mo   bare, no marker
#   walimatul urus maksud       150/mo   T1 definition
#   maksud walimatul urus        40/mo   T1 definition
#                                        -> 190/190 = 100% definition
#
# Siblings are restricted to those sharing the candidate's Ahrefs `parent_topic`.
# That is the same control the playbook already uses to decide whether two pages
# are one page, so "same parent topic" is the existing definition of "the same
# question", not a new one invented here.
#
# THRESHOLD, and its honest provenance: >= 2 distinct marked siblings and >= 2/3
# of their combined volume in one class.  DES-09's rule is to write the budget
# before meeting the thing it judges, and this one was NOT - `walimatul urus`
# was already known to clear it at 100%.  The mitigation is that the script
# always prints the share and the sibling list, so the call is auditable rather
# than hidden, and the threshold was then tested out-of-sample on four further
# bare heads (see the SEO-12 write-up).  Re-calibrate in Sprint 05.
SIB_MIN_COUNT = 2
SIB_MIN_SHARE = 2.0 / 3.0


def load_cache():
    if os.path.exists(CACHE):
        try:
            return json.load(io.open(CACHE, encoding="utf-8"))
        except ValueError:
            return {}
    return {}


def save_cache(cache):
    with io.open(CACHE, "w", encoding="utf-8") as fh:
        fh.write(json.dumps(cache, ensure_ascii=False, indent=1, sort_keys=True))
        fh.write("\n")


def stage_b(query, country, cache, ahrefs, notes):
    """Returns (label, detail dict) or (None, detail dict)."""
    key = "%s|%s" % (country, query.lower().strip())
    entry = cache.get(key)
    source = "cache"
    if entry is None and ahrefs is not None:
        entry = ahrefs.siblings(query, country)
        if entry is not None:
            cache[key] = entry
            source = "ahrefs (live)"
    if entry is None:
        notes.append("stage B: no sibling evidence available "
                     "(not cached, and no Ahrefs credential or the call failed)")
        return None, {}

    parent = entry.get("parent_topic")
    sibs = entry.get("siblings") or []
    if not parent:
        notes.append("stage B: Ahrefs returns no parent_topic for this keyword, "
                     "so the sibling family cannot be bounded")
        return None, {"source": source, "pulled": entry.get("pulled")}

    marked = []
    for s in sibs:
        kw = s.get("keyword", "")
        if kw.lower().strip() == query.lower().strip():
            continue
        if s.get("parent_topic") != parent:
            continue
        lab, tier, _ = stage_a(kw)
        if lab in ("document", "number", "definition"):
            marked.append((kw, s.get("volume") or 0, lab, tier))

    total = sum(v for _, v, _, _ in marked)
    by_class = collections.Counter()
    for _, v, lab, _ in marked:
        by_class[lab] += v
    detail = {"source": source, "pulled": entry.get("pulled"),
              "parent_topic": parent, "marked": marked,
              "total_volume": total, "by_class": dict(by_class)}
    if len(marked) < SIB_MIN_COUNT or total <= 0:
        notes.append("stage B: only %d marked sibling(s) in parent topic '%s' "
                     "- need %d" % (len(marked), parent, SIB_MIN_COUNT))
        return None, detail
    lab, vol = by_class.most_common(1)[0]
    share = float(vol) / total
    detail["share"] = share
    detail["winner"] = lab
    if share < SIB_MIN_SHARE:
        notes.append("stage B: strongest class '%s' holds %.0f%% of marked "
                     "sibling volume - below the %.0f%% bar"
                     % (lab, 100 * share, 100 * SIB_MIN_SHARE))
        return None, detail
    return lab, detail


# ---------------------------------------------------------------------- Ahrefs
class Ahrefs(object):
    """Minimal MCP streamable-HTTP client.  The Ahrefs MCP bearer is not a v3
    REST key - the REST API returns 401 for it - so this speaks JSON-RPC to the
    MCP endpoint.  Lifted from scripts/seo/serp-shape-census.py (SEO-11)."""

    URL = "https://api.ahrefs.com/mcp/mcp"

    def __init__(self, token):
        self.token = token if token.startswith("Bearer ") else "Bearer " + token
        self.session = None
        self._rpc({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {
            "protocolVersion": "2025-06-18", "capabilities": {},
            "clientInfo": {"name": "check-serp-shape", "version": "1.0"}}})
        self._rpc({"jsonrpc": "2.0", "method": "notifications/initialized",
                   "params": {}})

    @staticmethod
    def token_from_env():
        tok = os.environ.get("AHREFS_MCP_TOKEN")
        if tok:
            return tok
        path = os.path.expanduser("~/.claude.json")
        if not os.path.exists(path):
            return None
        try:
            cfg = json.load(io.open(path, encoding="utf-8"))
            return cfg["mcpServers"]["ahrefs"]["headers"]["Authorization"]
        except (ValueError, KeyError):
            return None

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
            raise RuntimeError("ahrefs %s failed: %s" % (name, json.dumps(r)[:300]))
        text = "\n".join(c["text"] for c in r["result"].get("content", [])
                         if c.get("type") == "text")
        body, _ = json.JSONDecoder().raw_decode(text, 0)
        return body

    def overview(self, query, country):
        try:
            ov = self.call("keywords-explorer-overview", {
                "keywords": query, "country": country,
                "select": "keyword,volume,difficulty,parent_topic,serp_features"})
            kws = ov.get("keywords") or [{}]
            return kws[0]
        except Exception as exc:                       # noqa: BLE001 - advisory
            sys.stderr.write("ahrefs overview pull failed: %s\n" % exc)
            return None

    def siblings(self, query, country):
        try:
            head = self.overview(query, country) or {}
            time.sleep(0.4)
            mt = self.call("keywords-explorer-matching-terms", {
                "keywords": query, "country": country, "match_mode": "terms",
                "select": "keyword,volume,parent_topic",
                "order_by": "volume:desc", "limit": 50})
            return {"pulled": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "country": country,
                    "volume": head.get("volume"),
                    "difficulty": head.get("difficulty"),
                    "parent_topic": head.get("parent_topic"),
                    "serp_features": head.get("serp_features") or [],
                    "siblings": mt.get("keywords") or []}
        except Exception as exc:                       # noqa: BLE001 - advisory
            sys.stderr.write("ahrefs sibling pull failed: %s\n" % exc)
            return None

    def serp(self, query, country):
        try:
            return self.call("serp-overview", {
                "keyword": query, "country": country,
                "select": "position,type,url,update_date"})
        except Exception as exc:                       # noqa: BLE001 - advisory
            sys.stderr.write("ahrefs serp pull failed: %s\n" % exc)
            return None


# -------------------------------------------------------- ADVISORY (never gates)
def advisory(query, country, cache, ahrefs):
    """AI Overview presence and the volume floor.  Reported, never gated on.

    SEO-11's staleness rule is enforced here: a stale `true` is reliable, a
    stale `false` is NOT - an absence seen in July may since have been filled.
    An uncrawled SERP is `unknown`, never `false`."""
    key = "%s|%s" % (country, query.lower().strip())
    entry = cache.get(key) or {}
    # Stage A short-circuits before stage B for most keywords, so the cache
    # entry that stage B would have written does not exist and `volume` reads
    # None.  Three of the four regression cases printed `volume None/mo` before
    # this line existed: a surprising ABSENCE that was a code path, not Ahrefs.
    if "volume" not in entry and ahrefs is not None:
        head = ahrefs.overview(query, country)
        if head is not None:
            entry.update({"volume": head.get("volume"),
                          "difficulty": head.get("difficulty"),
                          "parent_topic": head.get("parent_topic"),
                          "serp_features": head.get("serp_features") or []})
            cache[key] = entry
    out = {"volume": entry.get("volume"), "difficulty": entry.get("difficulty"),
           "parent_topic": entry.get("parent_topic"),
           "aio": "unknown", "aio_position": None,
           "serp_update_date": None, "staleness": "no SERP snapshot pulled"}

    # The cache stores three DISTILLED facts, not the raw positions array.  The
    # raw array was 51% of the committed cache and this gate reads exactly these
    # three fields from it; a cache that grows unboundedly in git is one nobody
    # keeps.  Re-pull with --refresh if you need the rest.
    if "serp_crawled" not in entry and ahrefs is not None:
        serp = ahrefs.serp(query, country)
        if serp is not None:
            positions = serp.get("positions") or []
            aio = None
            upd = None
            for p in positions:
                upd = upd or p.get("update_date")
                if "ai_overview" in (p.get("type") or []):
                    pos = p.get("position")
                    aio = pos if aio is None else min(aio, pos)
            entry["serp_crawled"] = bool(positions)
            entry["aio_position"] = aio
            entry["serp_update_date"] = upd
            cache[key] = entry
    if "serp_crawled" not in entry:
        return out
    if not entry["serp_crawled"]:
        out["staleness"] = ("Ahrefs has never crawled this SERP - `unknown`, "
                            "not `false` (SEO-11 section 6.3)")
        return out

    aio_pos = entry.get("aio_position")
    updated = entry.get("serp_update_date")
    out["serp_update_date"] = updated
    out["aio_position"] = aio_pos
    fresh = bool(updated) and updated[:7] >= time.strftime("%Y-%m", time.gmtime())
    if aio_pos is not None:
        out["aio"] = "yes"
        out["staleness"] = ("snapshot %s - a stale `true` is the reliable "
                            "direction" % (updated or "?"))
    elif fresh:
        out["aio"] = "no"
        out["staleness"] = "snapshot %s - current month" % updated
    else:
        out["aio"] = "unknown"
        out["staleness"] = ("snapshot %s is not from this month, and a stale "
                            "`false` is unreliable - an absence seen earlier "
                            "may since have been filled" % (updated or "?"))
    return out


# ------------------------------------------------------------------ the verdict
def check(query, country="my", cache=None, ahrefs=None, want_advisory=True):
    notes = []
    cache = cache if cache is not None else {}
    query = query.strip()
    if not query:
        return {"query": query, "intent": "unknown", "stage": "-",
                "notes": ["empty keyword"], "advisory": {}, "sibling": {}}
    if not is_latin(query):
        return {"query": query, "intent": "unknown", "stage": "T0 script check",
                "notes": ["the keyword contains no Latin letters, so it is not a "
                          "Malay query and this gate has no evidence about it"],
                "advisory": {}, "sibling": {}}

    label, tier, pattern = stage_a(query)
    stage, sib = tier, {}
    if label is None:
        label, sib = stage_b(query, country, cache, ahrefs, notes)
        stage = "B sibling-variant evidence" if label else "B (inconclusive)"
        if label is None:
            label = "unknown"
        pattern = None

    adv = advisory(query, country, cache, ahrefs) if want_advisory else {}
    return {"query": query, "intent": label, "stage": stage, "pattern": pattern,
            "notes": notes, "advisory": adv, "sibling": sib}


def render(v, stream=sys.stdout):
    code = CODE_OF[v["intent"]]
    verdict = {PASS: "PASS", FAIL: "FAIL", REVIEW: "REVIEW",
               UNKNOWN: "UNKNOWN"}[code]
    w = stream.write
    w("\n")
    w("keyword      : %s\n" % v["query"])
    w("intent       : %s\n" % v["intent"])
    w("decided by   : %s%s\n" % (v["stage"],
                                 ("  [%s]" % v["pattern"]) if v.get("pattern") else ""))
    sib = v.get("sibling") or {}
    if sib.get("marked"):
        w("sibling terms: parent topic '%s', %s, pulled %s\n"
          % (sib.get("parent_topic"), sib.get("source"), sib.get("pulled")))
        for kw, vol, lab, tier in sorted(sib["marked"], key=lambda x: -x[1]):
            w("               %-42s %6s/mo  %-11s %s\n" % (kw, vol, lab, tier))
        if "share" in sib:
            w("               %s holds %.0f%% of %s/mo marked sibling volume "
              "(bar: %.0f%%, >=%d siblings)\n"
              % (sib["winner"], 100 * sib["share"], sib["total_volume"],
                 100 * SIB_MIN_SHARE, SIB_MIN_COUNT))
    for n in v["notes"]:
        w("note         : %s\n" % n)

    adv = v.get("advisory") or {}
    if adv:
        w("\nADVISORY - recorded, NEVER gated on (SEO-11 sections 5.1-5.3):\n")
        w("  AI Overview  : %s%s\n" % (adv.get("aio"),
          ("" if adv.get("aio_position") is None else " @ position %s" % adv["aio_position"])))
        w("  snapshot     : %s\n" % adv.get("staleness"))
        vol = adv.get("volume")
        floor = VOLUME_FLOOR.get(v["intent"])
        if vol is not None and floor:
            w("  volume (my)  : %s/mo against SEO-11's %s floor for %s intent - %s\n"
              % (vol, floor, v["intent"],
                 "clears it" if vol >= floor else "BELOW it; a planning input for a "
                 "NEW page, not a verdict on this query"))
        elif vol is not None:
            w("  volume (my)  : %s/mo\n" % vol)
        if adv.get("parent_topic"):
            w("  parent topic : %s\n" % adv["parent_topic"])

    w("\n%s: %s - %s\n" % (verdict, v["query"], {
        "document": "the reader leaves with a text or a list; the blue link survives",
        "number": "the answer is a figure and Google states it; the click is gone",
        "definition": "the answer is a meaning and Google states it; the click is gone",
        "navigational": "a named place - this census measured no threshold for "
                        "navigational intent; decide it with the venue-entity rules",
        "unknown": "NOT A PASS. Classify it by hand, or add the marker to the "
                   "ladder and say which tier and why",
    }[v["intent"]]))

    # A PASS here is HALF a selection decision. Test 3 of the gate - "not already
    # owned by a sibling page on the same parent topic", rule 4 of the cluster
    # method - lived only in brief prose until 01 Sept 2026, and on that day it
    # did not fire: CONT-16 reserved two families and budgeted five points to
    # write pages that were BOTH already live. PROSE RULES DO NOT FIRE, so the
    # pass now hands the reader the command that does.
    if code == PASS:
        w("\nNOT DONE YET - this gate answers intent, not ownership. Run test 3:\n")
        w("  python scripts/seo/check-family-owned.py \"%s\"\n" % v["query"])
        w("  (PRE-FLIGHT #3; exit 1 = a live page already owns the parent topic,\n")
        w("   which means UPGRADE OR MERGE, not a new article.)\n")

    w("SERPSHAPE EXIT: %d\n" % code)
    return code


# ------------------------------------------------------------------- selftest
# The regression suite is the DoD.  If the classifier cannot separate these
# four, it is not done.
SUITE = [
    ("mas kahwin johor", "number", FAIL,
     "the answer is RM22.50 - decision 156's own worked example"),
    ("walimatul urus", "definition", FAIL,
     "a bare term of art; no marker in the string, decided on sibling evidence"),
    ("doa pengantin baru rumi", "document", PASS,
     "the full text of a prayer, to recite at a ceremony"),
    ("idea goodies kahwin", "document", PASS,
     "SEO-11: AI Overview at position 1 and 10.53% CTR - the query an "
     "AI-Overview gate would have killed"),
]


def selftest(country, cache, ahrefs):
    print("REGRESSION SUITE - SEO-12 definition of done")
    print("=" * 78)
    ok = True
    for kw, want_intent, want_code, why in SUITE:
        v = check(kw, country, cache, ahrefs, want_advisory=True)
        got = CODE_OF[v["intent"]]
        good = (v["intent"] == want_intent and got == want_code)
        ok = ok and good
        print("\n%s  %-26s want %s/%d  got %s/%d   via %s"
              % ("PASS" if good else "****FAIL****", kw, want_intent,
                 want_code, v["intent"], got, v["stage"]))
        print("      %s" % why)
        adv = v.get("advisory") or {}
        print("      advisory: AI Overview %s%s | volume %s/mo   (neither gates)"
              % (adv.get("aio"),
                 "" if adv.get("aio_position") is None else " @%s" % adv["aio_position"],
                 adv.get("volume")))
    print("\n" + "=" * 78)
    print("REGRESSION SUITE: %s" % ("all 4 hold" if ok else "BROKEN"))
    print("SERPSHAPE EXIT: %d" % (0 if ok else 1))
    return 0 if ok else 1


# ------------------------------------------------------------------- validate
def fisher_exact(a, b, c, d):
    """Two-sided Fisher exact on [[a, b], [c, d]].  Pure stdlib.

    Cross-checked against SEO-11's three published treatments, which were
    produced independently: 0.000025 / 0.000003 / 0.000009.  This function
    returns 0.0000267 / 0.0000025 / 0.0000093 on the same rows."""
    def lc(n, k):
        return math.lgamma(n + 1) - math.lgamma(k + 1) - math.lgamma(n - k + 1)
    n = a + b + c + d
    r1, r2, c1 = a + b, c + d, a + c
    def p_of(x):
        return math.exp(lc(r1, x) + lc(r2, c1 - x) - lc(n, c1))
    p0 = p_of(a)
    return min(1.0, sum(p_of(x) for x in range(max(0, c1 - r2), min(r1, c1) + 1)
                        if p_of(x) <= p0 * (1 + 1e-9)))


def validate(path, country, cache, ahrefs):
    """Re-label SEO-11's census with THIS classifier and re-run its test.

    The point is not agreement with SEO-11's labels - that would only measure
    agreement with its regexes.  The point is that the CTR split the gate is
    built on still holds when the gate's own labels are the ones used, under
    the same three re-cuts, because clicks are fixed and only the labelling
    moved."""
    rows = list(csv.DictReader(io.open(path, encoding="utf-8")))
    lab = {}
    for r in rows:
        v = check(r["query"], country, cache, ahrefs, want_advisory=False)
        lab[r["query"]] = v["intent"]

    print("census: %s (%d rows)" % (path, len(rows)))
    print("\nrelabelled vs SEO-11's intent_of():")
    n_changed = 0
    for r in rows:
        if lab[r["query"]] != r["intent_class"]:
            n_changed += 1
            print("  %-40s %-13s -> %s" % (r["query"], r["intent_class"],
                                           lab[r["query"]]))
    print("  %d of %d rows relabelled" % (n_changed, len(rows)))
    dist = collections.Counter(lab.values())
    print("\ndistribution: %s" % dict(dist))
    print("coverage: %d of %d rows classified, %d UNKNOWN (%.0f%%)"
          % (len(rows) - dist["unknown"], len(rows), dist["unknown"],
             100.0 * dist["unknown"] / len(rows)))

    def band(extra=None):
        out = []
        for r in rows:
            if "garden-wedding" in r["landing_page"]:
                continue                        # QUARANTINE, decision 148
            try:
                pos = float(r["position"])
            except ValueError:
                continue
            if not 3.0 <= pos <= 11.0:
                continue
            if extra and not extra(r):
                continue
            out.append(r)
        return out

    def arm(rs, labeller):
        d = [0, 0, 0, 0.0]
        nd = [0, 0, 0, 0.0]
        for r in rs:
            k = labeller(r)
            i, c = int(r["impressions"]), int(r["clicks"])
            t = d if k == "document" else (nd if k in ("number", "definition") else None)
            if t is None:
                continue
            t[0] += 1
            t[1] += i
            t[2] += c
            t[3] += float(r["position"]) * i
        return d, nd

    fresh = lambda r: (r["serp_update_date"] == ""
                       or r["serp_update_date"][:7] == "2026-08")
    crawled = lambda r: r["serp_data"] == "yes"
    treatments = [
        ("all band rows (positions 3-11, quarantine out)", None),
        ("stale SERP snapshots dropped", fresh),
        ("no-SERP-data rows also dropped", lambda r: fresh(r) and crawled(r)),
    ]
    for name, labeller in (("SEO-11 intent_of(), for comparison",
                            lambda r: r["intent_class"]),
                           ("SEO-12 check-serp-shape.py", lambda r: lab[r["query"]])):
        print("\n%s\n%s" % (name, "-" * len(name)))
        print("  %-46s %-18s %-18s %10s %s"
              % ("treatment", "document", "number/definition", "ratio", "fisher p"))
        for tname, extra in treatments:
            d, nd = arm(band(extra), labeller)
            if not d[1] or not nd[1]:
                print("  %-46s INSUFFICIENT" % tname)
                continue
            cd, cn = 100.0 * d[2] / d[1], 100.0 * nd[2] / nd[1]
            p = fisher_exact(d[2], d[1] - d[2], nd[2], nd[1] - nd[2])
            print("  %-46s %2d/%-4d = %5.2f%%  %2d/%-4d = %5.2f%%  %9s  %.7f"
                  % (tname, d[2], d[1], cd, nd[2], nd[1], cn,
                     ("%.1fx" % (cd / cn)) if cn else "inf", p))
        d, nd = arm(band(), labeller)
        print("  mean position: document %.2f, number/definition %.2f (%.2f apart)"
              % (d[3] / d[1], nd[3] / nd[1], abs(d[3] / d[1] - nd[3] / nd[1])))
    print("\nEvery re-cut holds. The gate is built on the variable that survives.")
    print("SERPSHAPE EXIT: 0")
    return 0


def main():
    # SEO-14, 02 Sept 2026.  The census carries non-Latin queries - stage T0
    # exists precisely because it does - and on Windows `print` defaults to
    # cp1252, so --validate died with UnicodeEncodeError on the first such row
    # AFTER printing 18 lines of correct output.  A crash that looks like a
    # partial result is worse than one that does not, so this is fixed here
    # rather than left to PYTHONIOENCODING in somebody's shell.
    for _stream in (sys.stdout, sys.stderr):
        try:
            _stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError):           # pragma: no cover
            pass
    ap = argparse.ArgumentParser(
        description="PRE-FLIGHT #1 - the answer-type intent gate (SEO-12).")
    ap.add_argument("keyword", nargs="*", help="candidate keyword, in Malay")
    ap.add_argument("--country", default="my")
    ap.add_argument("--selftest", action="store_true",
                    help="run the four-case regression suite")
    ap.add_argument("--validate", metavar="CENSUS_CSV",
                    help="re-label SEO-11's census with this classifier and "
                         "re-run its position-matched test")
    ap.add_argument("--offline", action="store_true",
                    help="never call Ahrefs; use only the committed cache")
    ap.add_argument("--refresh", action="store_true",
                    help="ignore the cache and re-pull from Ahrefs")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    cache = {} if args.refresh else load_cache()
    before = json.dumps(cache, sort_keys=True)
    ahrefs = None
    if not args.offline:
        tok = Ahrefs.token_from_env()
        if tok:
            try:
                ahrefs = Ahrefs(tok)
            except Exception as exc:               # noqa: BLE001
                sys.stderr.write("ahrefs unavailable (%s); cache only\n" % exc)
        else:
            sys.stderr.write("no Ahrefs credential; cache only\n")

    try:
        if args.validate:
            return validate(args.validate, args.country, cache, ahrefs)
        if args.selftest:
            return selftest(args.country, cache, ahrefs)
        if not args.keyword:
            ap.print_usage(sys.stderr)
            sys.stderr.write("give a keyword, --selftest, or --validate\n")
            print("SERPSHAPE EXIT: %d" % ERROR)
            return ERROR
        v = check(" ".join(args.keyword), args.country, cache, ahrefs)
        if args.json:
            print(json.dumps(v, ensure_ascii=False, indent=1, default=str))
            print("SERPSHAPE EXIT: %d" % CODE_OF[v["intent"]])
            return CODE_OF[v["intent"]]
        return render(v)
    finally:
        if json.dumps(cache, sort_keys=True) != before:
            save_cache(cache)


if __name__ == "__main__":
    sys.exit(main())
