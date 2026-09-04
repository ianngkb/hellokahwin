# `docs/work-done/` — the shipping record

Every item that ships writes one entry here, with evidence a reader who was not
there can re-run. This file is the index over those entries.

**It exists because three agents were told to update it and found it missing.**
PLAT-19 raised it on 01 Sept, DES-18 confirmed it independently the same day,
and UI-20 created it on 02 Sept rather than report it a fourth time. The real
convention has always been a **per-session index**; the standing rule named a
file that did not exist, so the rule could not be followed. It can now.

## Where your entry goes

| You are shipping | Write to |
| --- | --- |
| an item in the current sprint | `docs/work-done/<session-id>/<date>-done-<item>-<slug>.md`, and **append a row to that session's `README.md`** |
| evidence for it | a sibling `…-EVIDENCE/` directory beside the entry |
| a production write | a sibling `…-UNDO.md` (and `.sql` / `.json` if the undo is executable), **pushed before the write runs** |

The session index — not this file — is the merge point several agents append to
in the same sprint. Resolve conflicts there by keeping both rows, never by
replacing the table.

## Sessions, newest first

| Session | Sprint | Index |
| --- | --- | --- |
| `sep-04-2026-session-01` | Ahrefs audit, Phase 3 | [index](./sep-04-2026-session-01/README.md) |
| `sep-02-2026-session-01` | Sprint 06 — _Deepen where the click is_ | [index](./sep-02-2026-session-01/README.md) |
| `sep-01-2026-session-01` | Sprint 05 — _Build where the click is_ | [index](./sep-01-2026-session-01/README.md) |
| `aug-30-2026-session-01` | Sprint 04 | [index](./aug-30-2026-session-01/README.md) |
| `aug-28-2026-session-01` | Sprint 03 | [directory](./aug-28-2026-session-01/) — no index file; the convention started with Sprint 04 |

Entries from 26–28 August predate the session-folder convention and sit flat in
this directory as `2026-08-<dd>-<item>-<slug>.md` with their own
`…-EVIDENCE/` and `…-UNDO.*` siblings. They are not re-filed; the convention
changed forward, not backward.

## What an entry has to contain

Not a narrative. The standing rules ask for four things, and a reader should be
able to find each of them without reading the prose around it:

1. **The failing case, named**, and the command that shows it failing.
2. **The same command run against the fix**, showing it passing — on the live
   surface, not on a local build.
3. **A `## Retrospective`** naming what was learned, **which document must
   change and who owns the edit**, what was done twice, and what was nearly
   shipped and what caught it. Then the edit, made.
4. **A gate or a script**, wherever one is possible. Prose rules do not fire.

## Which branch

`docs/work-done/` is on **`master`**, beside the code it describes, and always
has been. The "anything under `docs/` goes to `feat/command-centre-dashboard`"
rule in the standing brief is about the **boardroom** line — the briefs, the
style guide, `docs/boardroom` — which is not on `master`. Test by content, not
by path prefix.
