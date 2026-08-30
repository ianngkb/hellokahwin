# Sprint 04 dispatch map — wave 1

**Started:** 31 August 2026 · **Sprint state:** `in_progress` (tracker, started 2026-08-31)

## The map — handles captured from each dispatch's own `handle:` line

Never from the status board's row order. On 25 Aug that error gave two items two
agents each and left two items never dispatched at all.

| Item | Owner | Handle | Tree | Watcher |
|---|---|---|---|---|
| **UI-04** | `product-designer` | `term_3ab68028-6c29-487d-a671-f28762eb7fcb` | docs repo | `bxqvbm2qq` |
| **UI-01** | `creative-director` | `term_71a8be89-fc00-4666-9c19-620efd495e2d` | site worktree | `be2ufbu3a` |
| **SEO-11** | `head-of-seo-content` | `term_184c348a-5ab8-49ce-87bd-5134eca596f9` | docs repo | `bhenx3cfi` |

**Map audited** by reading each terminal's own buffer for its brief filename —
all three MATCH.

## Two things caught during dispatch that would have broken this wave

### 1. The `creative-director` collision fired — PLAT-16, the item I nearly cut

Dispatching the bare name `creative-director` into the site worktree resolves to
**the wrong persona**:

| Location | Persona |
|---|---|
| `~/.claude/agents/creative-director.md` (global) | **short-form social VIDEO producer** |
| `hellokahwin/hellokahwin/.claude/agents/creative-director.md` (project) | **HelloKahwin art director** |
| the site worktree, before this fix | **neither** — so the global one wins |

A video producer would have been dispatched to fix a CSS grid bug. **Fixed by
copying the six hellokahwin project personas into the site worktree's
`.claude/agents/`** and verifying the right description resolves there.

**This is exactly the item the CEO proposed cutting on 30 Aug and then withdrew**,
on the grounds that the workaround — "remember to always dispatch with the full
path" — is a prose rule, and prose rules do not fire. It tried to fire within an
hour of the sprint starting. **PLAT-16 stays deferred but is now evidenced**, and
the permanent fix belongs there; the copy above is a workaround for this sprint.

### 2. `status-board.py --project hellokahwin` hides two of the three agents

The skill's Step 2 says to use `--project hellokahwin`. Doing so returned **one
row of three**: UI-01 and SEO-11 are misattributed to project `buddy`, branch
`main`, when one is in the site worktree and the other in the docs repo.

| Handle | Reported project/branch | Actually |
|---|---|---|
| `term_3ab68028` | `hellokahwin` / `feat/command-centre-dashboard` | ✅ correct |
| `term_71a8be89` | `buddy` / `main` | ❌ site worktree |
| `term_184c348a` | `buddy` / `main` | ❌ docs repo |

**Trusting the flag would have read as two failed dispatches.** All three are
`WORKING`, confirmed per-handle. **Use `--all` or `--handle`, not `--project`,
until this is fixed.**

## And one about the watchers themselves

They were first launched with `nohup … &` inside an ordinary tool call. **Those
processes run, but nothing is tracked, so their exit wakes nobody** — a silent
recreation of Sprint 03's three re-arm failures in a new form. They were killed
(`kill -9`, after `pkill` left all three alive) and relaunched as **harness-tracked
background tasks**, whose completion re-invokes the session.

**The rule this adds:** a watcher that is not tracked by the harness is not a
watcher. Backgrounding it is not the same as being woken by it.

---

# WAVE 2 — the rest of the sprint, all concurrent (31 Aug)

**Owner directive:** *"dispatch the rest of the sprint too. If it can be done
concurrently, always do that so we do not waste time, add that to your rules."*

**All 10 remaining items are now running at once.** Written into
`ceo-hellokahwin.md` and `startsprint/SKILL.md` as a standing rule.

## The correction that made it possible

The CEO's first plan serialised the six design items into three pairs, reasoning
that `creative-director` owns two of them and "can only do one at a time."
**That was wrong.** Every dispatch is a separate Claude Code session in its own
process, and a persona is a file any number of sessions can load. **The constraint
is the CHECKOUT, not the agent.** Six fresh Orca worktrees removed it entirely.

## Full map — every handle from its own dispatch line, all audited

| Item | Owner | Handle | Tree | Watcher |
|---|---|---|---|---|
| UI-04 | product-designer | `term_3ab68028` | docs repo | `bxqvbm2qq` |
| SEO-11 | head-of-seo-content | `term_184c348a` | docs repo | `bhenx3cfi` |
| **UI-01** | creative-director | `term_bfc06acb` | `ui01-srow` | `bxo5hhgdw` |
| UI-02 | design-systems-engineer | `term_4cedb4a3` | `ui02-nav` | `baogsdbgi` |
| UI-03 | creative-director | `term_47cee755` | `ui03-hero` | `bfh0jstyx` |
| UI-05 | product-designer | `term_75e80ade` | `ui05-category-images` | `bjc31yqsn` |
| UI-06 | design-systems-engineer | `term_922b3a0d` | `ui06-layout-gate` | `buw1e4zno` |
| RIGHTS-01 | managing-editor | `term_3fdd9c23` | `rights01-credits` | `b0mc78a9d` |
| RISK-09 | design-systems-engineer | `term_96db1f57` | docs repo | `b3oz2ea1d` |
| PLAT-15 | design-systems-engineer | `term_8c311c60` | buddy | `bgwttadwa` |

**Map audit: 10 MATCH, 0 mismatch**, each verified by reading that terminal's own
buffer for its brief filename. All 10 `WORKING`.

## ⚠ THE ONE THAT WOULD HAVE WASTED THE SPRINT

**UI-01 was dispatched into `pillars-ingest-redirects`, which is 42 commits behind
`master` and contains ZERO `.s-row` code.** The bug lives in 6 files on master,
introduced by DES-08 — a commit that tree does not have. The agent had already
spawned a sub-agent and run **8m 44s** in a tree where the code it was told to fix
does not exist.

Caught by checking the base before creating the new worktrees, not by any report.
The terminal was closed, `UI-01` reset to `todo`, and it was re-dispatched into
`ui01-srow` at `105e79d`.

**And the same trap nearly caught the replacements:** `orca worktree create
--base-branch master` resolved **local** `master` at `2d78c95`, two commits behind
`origin/master`, again missing DES-08. All six new trees came up stale and were
reset to `origin/master` — verified by `grep -rl 's-row' src/` returning **6 files**
in each, against **3** before.

**The rule this produces:** never dispatch into a worktree without confirming
(a) its HEAD, and (b) that the code the item names is actually present in it.

## Sequencing, stated out loud

Only one item is sequenced, and the reason is in its brief:

- **RISK-09 builds concurrently but INSTALLS last.** It installs a checkout guard
  into trees where six agents are doing checkouts. The brief says plainly that
  this is an **ordering instruction and NOT a narrowing of its DoD** — installation
  still has to happen and the item is not done without it.

Everything else has no dependency and went out together.
