# Autopilot decisions — HelloKahwin Command Centre

- [2026-08-23] Worked IN-PLACE on branch `feat/command-centre-dashboard` instead of an Orca child worktree, because the entire `docs/` tree (the dashboard's data source) is UNTRACKED in git — a worktree would have had no data to read.
- [2026-08-23] Will NOT push to `origin` or run a production deploy. Brief says the dashboard is internal and needs board approval to go public; separately, `origin` is the LIVE SITE repo (`ianngkb/hellokahwin`) and local master is 30 behind / 1 ahead on a diverged history. Escalated to the owner as a risk instead.
- [2026-08-23] Generator is dependency-free Node (ESM). No npm install, no lockfile churn in a repo whose remote is the live site.
