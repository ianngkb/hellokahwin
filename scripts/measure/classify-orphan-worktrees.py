"""Classify workspace directories before any deletion. PRINTS ONLY - deletes nothing.

Written after two hand-rolled shell classifiers in a row labelled LIVE Sprint 05
worktrees as orphans (a failed `sed` left the registry file empty, and every
`grep` aborted, so everything fell through to the delete list). Deleting on
either output would have destroyed the running fleet.

Safety rules encoded here rather than remembered:
  * the registered set comes from `git worktree list --porcelain` on BOTH repos,
    parsed as absolute paths and normalised - never a substring/name match
  * a directory is a DELETE candidate only if ALL of: not registered, has no
    .git entry, and is not on the explicit live-tree allowlist
  * anything that fails to parse is classified KEEP, never DELETE
"""
import json, os, subprocess, sys

REPOS = [
    os.path.expanduser("~/Documents/Code/hellokahwin-site"),
    os.path.expanduser("~/Documents/Code/hellokahwin/hellokahwin"),
    os.path.expanduser("~/Documents/Code/buddy"),
]
ROOTS = [
    os.path.expanduser("~/orca/workspaces/hellokahwin-site"),
    os.path.expanduser("~/orca/workspaces/hellokahwin"),
    os.path.expanduser("~/orca/workspaces/buddy"),
]
# Belt and braces: these must never be deleted whatever the logic says.
LIVE = {"ui13-diversity","ui17-rail","ui18-toc","des18-midsize","seo13-faq",
        "risk10-hooks","cont13-doa","cont14-hantaran","cont16-skrip",
        "rights02-census","rights03-institutional","des17-h6rule",
        "plat18-keycollision","pillars-ingest-redirects","s13docs"}

def norm(p):
    return os.path.normcase(os.path.abspath(p.replace("\\", "/")))

registered = set()
for repo in REPOS:
    if not os.path.isdir(repo):
        continue
    try:
        out = subprocess.run(["git","worktree","list","--porcelain"], cwd=repo,
                             capture_output=True, text=True, timeout=60).stdout
    except Exception as e:
        print("!! could not read worktrees for", repo, e); sys.exit(2)
    for line in out.splitlines():
        if line.startswith("worktree "):
            registered.add(norm(line[len("worktree "):].strip()))

print("registered worktrees parsed:", len(registered))
if len(registered) < 5:
    print("!! REFUSING: registered set implausibly small — the parse likely failed.")
    sys.exit(2)

delete, keep = [], []
for root in ROOTS:
    if not os.path.isdir(root):
        continue
    for name in sorted(os.listdir(root)):
        p = os.path.join(root, name)
        if not os.path.isdir(p):
            continue
        reason = None
        if norm(p) in registered:      reason = "REGISTERED worktree"
        elif name in LIVE:             reason = "on the live allowlist"
        elif os.path.exists(os.path.join(p, ".git")): reason = "has a .git entry"
        if reason:
            keep.append((root, name, reason)); continue
        n = sum(len(f) for _,_,f in os.walk(p))
        delete.append((root, name, n))

print("\n=== KEEP (%d) ===" % len(keep))
for root, name, why in keep:
    print("  %-26s %-22s %s" % (name, why, os.path.basename(root)))

print("\n=== DELETE CANDIDATES (%d) ===" % len(delete))
tot = 0
for root, name, n in delete:
    tot += n
    print("  %-26s files=%-7d %s" % (name, n, os.path.basename(root)))
print("\n  total files: %d" % tot)

json.dump([[r,n] for r,n,_ in delete],
          open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "delete_plan.json"), "w"))
print("  plan written to delete_plan.json — NOTHING DELETED YET")
