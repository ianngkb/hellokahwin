# TASK — reviewer (Opus): full review of hellokahwin site analytics

Follow `C:/Users/Ian Ng/.claude/agents/codex-reviewer.md` as your procedure, in FULL-REVIEW mode. Read it first, all of it.
`brain/config/review-policy.json` says primary = claude, codex disabled → every layer runs on Opus at rung 0.

- Repo: hellokahwin. Worktree: this directory. Branch: `ianng89/hellokahwin-site-analytics`.
- Diff: `git diff 4d94f0843de33ea984fb8356330ab170f8906a04..HEAD` (HEAD = ceceb17 at dispatch; re-read HEAD yourself).
  Exclude `pnpm-lock.yaml` from the reviewed content.
- Layers: ALL THREE (Blind Hunter, Edge Case Hunter, Acceptance Auditor) — the diff adds a DB migration/schema and
  handles visitor privacy data, which is a risk area. Each layer blind to the others, launched in parallel, each its own
  headless `claude -p --model claude-opus-5-5` session. Chunk the diff if your procedure says to for its size.
- Spec for the Acceptance Auditor: `_bmad-output/implementation-artifacts/spec-hellokahwin-site-analytics.md`
  plus the orchestrator decisions in `_bmad-output/autopilot/runs/2026-10-30-site-analytics/decisions.md`
  (closed open questions: no retention script; admin visits counted; dev never touches prod DB).
- Known & accepted, NOT findings: dev check D16 admin sign-in could not run locally (prod-only Clerk) — verified on prod
  in P4; Analytics nav group hidden from the group tab bar because single-tab groups render no tab bar (pre-existing
  component behaviour, same as Authors/Media).
- Artifacts go in `_bmad-output/autopilot/runs/2026-10-30-site-analytics/`: `review-prompt-<layer>.txt`,
  `review-raw-<layer>.txt`. Verdict JSON (schema per the procedure) at
  `~/.claude/review-log/hellokahwin/<branch-slug>.json`, with stable finding ids F1.. and classes.
- Acceptance NOTES are returned separately and never become findings.
- Per-layer deadline 15 minutes (per chunk if chunked).

Completion: write `reviewer-DONE.md` in the run dir. Line 1: `STATUS: done` (or `failed` + why). Then: verdict path,
HEAD reviewed, count of findings by severity, the findings list with ids (id, layer, file:line, severity, one line),
and the acceptance NOTES separately. Do NOT fix anything.
