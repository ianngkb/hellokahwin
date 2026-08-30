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
