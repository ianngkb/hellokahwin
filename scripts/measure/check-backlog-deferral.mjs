#!/usr/bin/env node
/**
 * check-backlog-deferral.mjs — the deferral gate.
 *
 * WHY THIS EXISTS. Sprint 06 closed 55 of 55 points and filed ELEVEN new backlog
 * items worth 43 points in a single night — four of them in SIXTEEN SECONDS at
 * 08:13, after the work was finished. The owner asked "why is there so much
 * deferred work?" and the honest answer needed timestamps, not opinions.
 *
 * Two mechanisms were found, and both are invisible from the board:
 *
 *   R1  A backlog item can sit in `in_progress` with NOTHING ever claimed
 *       against it. On 02 Sept PLAT-21, DES-20 and COPY-02 were flipped to
 *       `in_progress` at 10:42:46, :49 and :52 — three seconds apart, zero
 *       evidence rows, no work-done log, no commit. `in_progress` on a backlog
 *       item has no closing mechanism: it is not `todo`, so it does not read as
 *       pending, and it is not `done`. It is a state that REPORTS WORK NOBODY
 *       CLAIMED — which is Sprint 06's own central finding, committed inside the
 *       tracker by the person writing that finding up.
 *
 *   R2  A finding refused for scope gets RE-FILED under a fresh key, and
 *       re-filing RESETS ITS APPARENT AGE. "There is no CI job running pnpm lint
 *       or pnpm test" was raised by UI-13, then UI-19, then UI-15, across three
 *       sprints. It became PLAT-21 on 2026-09-02T08:13:24. A three-sprint-old
 *       failure now reads as a one-day-old backlog item to anyone scanning the
 *       board. Carrying an item is allowed. Carrying it SILENTLY is not.
 *
 * THE ESCAPE HATCH IS DELIBERATELY EXACT, not a substring match. R2 clears only
 * on a literal `CARRIED: <KEY>` marker in the decision log. A bare mention of a
 * key does NOT exempt it — UI-12 appears in decision 196 only because that
 * decision quotes UI-12's +8.2MB pricing while ruling on a different item, and a
 * gate that can be cleared by an accident of prose is a gate that passes for the
 * wrong reason. That is the failure this whole sprint is about.
 *
 * IT EXITS 1 ON TODAY'S BOARD, AND THAT IS CORRECT. No `CARRIED:` marker exists
 * anywhere yet, because nothing has ever been deliberately carried ON THE RECORD.
 * Closing it is the CEO's: either draw the item into the next sprint, or write
 * `CARRIED: <KEY> — <what it was traded for>` into docs/boardroom/decision-log.md.
 *
 * Usage:
 *   node scripts/measure/check-backlog-deferral.mjs
 *   node scripts/measure/check-backlog-deferral.mjs --selftest
 *   node scripts/measure/check-backlog-deferral.mjs --buddy <path-to-buddy-repo>
 *
 * Exit codes:
 *   0  clean
 *   1  violations found
 *   2  COULD NOT MEASURE — the tracker did not answer, or the parse returned
 *      nothing. A zero from this script must never be readable as "the backlog
 *      is healthy" when it means "I could not read the backlog".
 *
 * Owner: managing-editor. Written at the Sprint 06 retrospective, 02 Sept 2026.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");

const DEFAULT_BUDDY = resolve(process.env.USERPROFILE || process.env.HOME || ".", "Documents", "Code", "buddy");
const DECISION_LOG = join(REPO, "docs", "boardroom", "decision-log.md");
const SPRINTS_DIR = join(REPO, "docs", "sprints");

/** States that mean the item is still owed. `done` is not owed. */
const OPEN_STATES = new Set(["todo", "in_progress", "blocked", "parked"]);

// ---------------------------------------------------------------- the rules

/**
 * R1 — a state that reports work nobody claimed.
 * Fires on a backlog item in `in_progress` or `blocked` carrying zero evidence.
 */
export function r1(item) {
  if (item.state !== "in_progress" && item.state !== "blocked") return null;
  if (item.evidence > 0) return null;
  return {
    rule: "R1",
    key: item.key,
    message:
      `state '${item.state}' with ${item.evidence} evidence rows — the board reports work ` +
      `nobody has claimed. Either add evidence, or set it back to 'todo' so it reads as owed.`,
  };
}

/**
 * R2 — carried silently past two planning meetings.
 * Fires on an open item created before the SECOND-most-recent sprint's
 * planned_at, whose key carries no `CARRIED: <KEY>` marker in the decision log.
 */
export function r2(item, cutoffISO, carriedKeys) {
  if (!OPEN_STATES.has(item.state)) return null;
  if (!item.created || item.created >= cutoffISO) return null;
  if (carriedKeys.has(item.key)) return null;
  return {
    rule: "R2",
    key: item.key,
    message:
      `created ${item.created.slice(0, 10)}, before the planning meeting of ${cutoffISO.slice(0, 10)} — ` +
      `it has now survived two sprint plannings untouched and no decision names it. ` +
      `Draw it into the next sprint, or write "CARRIED: ${item.key} — <what it was traded for>" ` +
      `into docs/boardroom/decision-log.md.`,
  };
}

// ---------------------------------------------------------------- the inputs

/** The planned_at of the second-most-recent sprint. Anything older than this
 *  has been passed over at two planning meetings. */
export function carryCutoff(sprints) {
  const dated = sprints.filter((s) => s.planned_at).sort((a, b) => (a.planned_at < b.planned_at ? 1 : -1));
  if (dated.length < 2) return null;
  return `${dated[1].planned_at}T00:00:00+00:00`;
}

function readSprints() {
  const out = [];
  for (const f of readdirSync(SPRINTS_DIR)) {
    if (!/^sprint-\d+\.json$/.test(f)) continue;
    out.push(JSON.parse(readFileSync(join(SPRINTS_DIR, f), "utf8")));
  }
  return out;
}

export function parseCarriedKeys(decisionLogText) {
  const keys = new Set();
  for (const m of decisionLogText.matchAll(/CARRIED:\s*([A-Z]+-\d+)/g)) keys.add(m[1]);
  return keys;
}

export function parseBacklog(text) {
  const items = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s{2,}([A-Z]+-\d+)\s+(todo|in_progress|blocked|done|parked)\s+(\d+)pt\s+(\S+)\s+(.*)$/);
    if (m) items.push({ key: m[1], state: m[2], points: Number(m[3]), owner: m[4], title: m[5].trim() });
  }
  return items;
}

export function parseItemDetail(text) {
  const created = text.match(/^\s+created\s+(\S+)/m);
  const evidence = text.match(/^\s+evidence\s+\((\d+)\)/m);
  return {
    created: created ? created[1] : null,
    evidence: evidence ? Number(evidence[1]) : null,
  };
}

function sprintCli(buddy, args) {
  return execFileSync("pnpm", ["--silent", "sprint", ...args], {
    cwd: buddy,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
    maxBuffer: 8 * 1024 * 1024,
  });
}

// ---------------------------------------------------------------- self-test

function selftest() {
  const cutoff = "2026-09-01T00:00:00+00:00";
  const carried = new Set(["OLD-9"]);
  const cases = [
    // R1 must FIRE
    ["R1 fires on in_progress with no evidence", () => r1({ key: "A-1", state: "in_progress", evidence: 0 }), true],
    ["R1 fires on blocked with no evidence", () => r1({ key: "A-2", state: "blocked", evidence: 0 }), true],
    // R1 must CLEAR — the negative controls are the point
    ["R1 clears on in_progress WITH evidence", () => r1({ key: "A-3", state: "in_progress", evidence: 1 }), false],
    ["R1 clears on todo with no evidence", () => r1({ key: "A-4", state: "todo", evidence: 0 }), false],
    ["R1 clears on DONE with no evidence", () => r1({ key: "A-5", state: "done", evidence: 0 }), false],
    // R2 must FIRE
    [
      "R2 fires on an open item older than the cutoff and unnamed",
      () => r2({ key: "OLD-1", state: "todo", created: "2026-08-28T00:00:00+00:00" }, cutoff, carried),
      true,
    ],
    [
      "R2 fires on a PARKED item older than the cutoff and unnamed",
      () => r2({ key: "OLD-2", state: "parked", created: "2026-08-26T00:00:00+00:00" }, cutoff, carried),
      true,
    ],
    // R2 must CLEAR
    [
      "R2 clears on an item created AFTER the cutoff",
      () => r2({ key: "NEW-1", state: "todo", created: "2026-09-02T08:13:24+00:00" }, cutoff, carried),
      false,
    ],
    [
      "R2 clears when the decision log carries CARRIED: <KEY>",
      () => r2({ key: "OLD-9", state: "todo", created: "2026-08-01T00:00:00+00:00" }, cutoff, carried),
      false,
    ],
    [
      "R2 clears on a DONE item however old",
      () => r2({ key: "OLD-3", state: "done", created: "2026-08-01T00:00:00+00:00" }, cutoff, carried),
      false,
    ],
    // the escape hatch is exact, not a substring — this is the load-bearing one
    [
      "CARRIED marker is exact: a bare mention of UI-12 does NOT exempt it",
      () => (parseCarriedKeys("196. ...UI-12 priced that at +8.2MB...").has("UI-12") ? null : { rule: "x" }),
      true,
    ],
    [
      "CARRIED marker parses when it is actually written",
      () => (parseCarriedKeys("CARRIED: UI-12 — traded for PLAT-21").has("UI-12") ? { rule: "x" } : null),
      true,
    ],
    // the parsers, proved against real shapes
    [
      "backlog parser reads a real row",
      () => (parseBacklog("    PLAT-13   todo         3pt   BMAD    watch-agent cannot ...").length === 1 ? { rule: "x" } : null),
      true,
    ],
    [
      "backlog parser is not fooled by the header line",
      () => (parseBacklog("Backlog — 25 items · 80pt (belonging to no sprint)").length === 0 ? { rule: "x" } : null),
      true,
    ],
    [
      "detail parser reads created and evidence",
      () => {
        const d = parseItemDetail("  created  2026-09-02T08:13:24.150049+00:00\n  evidence (0) — nothing has been claimed");
        return d.created === "2026-09-02T08:13:24.150049+00:00" && d.evidence === 0 ? { rule: "x" } : null;
      },
      true,
    ],
    [
      "carryCutoff picks the SECOND-most-recent planning date",
      () => {
        const c = carryCutoff([{ planned_at: "2026-09-02" }, { planned_at: "2026-09-01" }, { planned_at: "2026-08-30" }]);
        return c === "2026-09-01T00:00:00+00:00" ? { rule: "x" } : null;
      },
      true,
    ],
  ];

  let pass = 0;
  let fail = 0;
  for (const [name, fn, mustFire] of cases) {
    const fired = fn() !== null;
    if (fired === mustFire) {
      pass++;
      console.log(`  PASS  ${name}`);
    } else {
      fail++;
      console.log(`  FAIL  ${name} — expected ${mustFire ? "FIRE" : "CLEAR"}, got ${fired ? "FIRE" : "CLEAR"}`);
    }
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  console.log(`DEFERRAL SELFTEST EXIT: ${fail === 0 ? 0 : 1}`);
  process.exit(fail === 0 ? 0 : 1);
}

// ---------------------------------------------------------------- main

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--selftest")) return selftest();

  const bi = argv.indexOf("--buddy");
  const buddy = bi >= 0 ? argv[bi + 1] : DEFAULT_BUDDY;
  if (!existsSync(buddy)) {
    console.error(`COULD NOT MEASURE: no buddy repo at ${buddy}. Pass --buddy <path>.`);
    console.log("DEFERRAL EXIT: 2");
    process.exit(2);
  }

  let backlogText;
  try {
    backlogText = sprintCli(buddy, ["backlog"]);
  } catch (err) {
    console.error(`COULD NOT MEASURE: the sprint CLI did not answer — ${err.message.split("\n")[0]}`);
    console.log("DEFERRAL EXIT: 2");
    process.exit(2);
  }

  const items = parseBacklog(backlogText);
  if (items.length === 0) {
    console.error(
      "COULD NOT MEASURE: the backlog parse returned 0 items. That is a claim about this parser, " +
        "not about the backlog. Compare the raw output shape against parseBacklog()."
    );
    console.log("DEFERRAL EXIT: 2");
    process.exit(2);
  }

  const carried = parseCarriedKeys(readFileSync(DECISION_LOG, "utf8"));
  const cutoff = carryCutoff(readSprints());
  if (!cutoff) {
    console.error("COULD NOT MEASURE: fewer than two sprints carry a planned_at.");
    console.log("DEFERRAL EXIT: 2");
    process.exit(2);
  }

  const open = items.filter((i) => OPEN_STATES.has(i.state));
  const openPoints = open.reduce((a, i) => a + i.points, 0);
  const donePoints = items.filter((i) => i.state === "done").reduce((a, i) => a + i.points, 0);

  console.log(`backlog: ${items.length} items, ${items.reduce((a, i) => a + i.points, 0)}pt as the tracker reports it`);
  console.log(`  OPEN (todo/in_progress/blocked/parked): ${open.length} items, ${openPoints}pt`);
  console.log(`  done and still sitting in the backlog:  ${items.length - open.length} items, ${donePoints}pt`);
  console.log(`  carry cutoff (second-most-recent planning): ${cutoff.slice(0, 10)}`);
  console.log(`  CARRIED: markers found in the decision log: ${carried.size}\n`);

  const violations = [];
  for (const item of open) {
    let detail;
    try {
      detail = parseItemDetail(sprintCli(buddy, ["get", item.key, "--backlog"]));
    } catch {
      detail = { created: null, evidence: null };
    }
    if (detail.evidence === null && detail.created === null) {
      console.error(`COULD NOT MEASURE ${item.key}: no created/evidence line parsed.`);
      console.log("DEFERRAL EXIT: 2");
      process.exit(2);
    }
    const full = { ...item, ...detail, evidence: detail.evidence ?? 0 };
    const a = r1(full);
    const b = r2(full, cutoff, carried);
    if (a) violations.push({ ...a, points: item.points, owner: item.owner });
    if (b) violations.push({ ...b, points: item.points, owner: item.owner });
  }

  for (const rule of ["R1", "R2"]) {
    const hits = violations.filter((v) => v.rule === rule);
    console.log(
      `${rule}  ${hits.length} violation(s)` +
        (rule === "R1"
          ? "  — a backlog state that reports work nobody claimed"
          : "  — carried past two plannings with no decision naming it")
    );
    for (const h of hits) console.log(`      ${h.key}  (${h.points}pt, ${h.owner})  ${h.message}`);
  }

  console.log(`\nVIOLATIONS: ${violations.length}`);
  console.log(`DEFERRAL EXIT: ${violations.length === 0 ? 0 : 1}`);
  process.exit(violations.length === 0 ? 0 : 1);
}

main();
