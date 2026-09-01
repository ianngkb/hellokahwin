"""Correct shipped-test for a deregistered worktree directory.

The previous version asked "does this file differ from origin/master?" and got
~370 hits per orphan on files like package.json and README.md. Those are STALE,
not unique: master moved on. Differing from master's tip says nothing about
whether the content was ever committed.

The right question is: was this exact content EVER committed to this repository?
Git answers it directly - hash the file as a blob and ask the object database.
A blob that exists was committed at some point and is recoverable from history.
A blob that does not exist has never been committed anywhere, and is the only
thing that would actually be destroyed by deleting the directory.

Bias is one-way on purpose: anything unreadable or unresolvable counts as
UNIQUE (keep), because a wrong removal costs work and an extra directory costs
disk.
"""
import os, subprocess, sys

SITE = os.environ.get("REPO", os.path.expanduser("~/Documents/Code/hellokahwin-site"))
ROOT = os.environ.get("WORKSPACES", os.path.expanduser("~/orca/workspaces/hellokahwin-site"))
import sys
ORPHANS = sys.argv[1:]  # directory names to test; pass them explicitly
SKIP = {"node_modules",".next",".turbo","dist",".orca",".git","coverage",".vercel"}

def batch_hash(paths):
    """git hash-object on many files at once; returns list of sha1s."""
    out = subprocess.run(["git","hash-object","--stdin-paths"], cwd=SITE,
                         input="\n".join(paths), capture_output=True, text=True)
    return out.stdout.split()

for name in ORPHANS:
    base = os.path.join(ROOT, name)
    if not os.path.isdir(base):
        print(f"{name:26} -- not on disk"); continue
    files = []
    for dirpath, dirnames, filenames in os.walk(base):
        dirnames[:] = [d for d in dirnames if d not in SKIP]
        for fn in filenames:
            if fn.endswith((".log",".tmp",".tsbuildinfo")):
                continue
            files.append(os.path.join(dirpath, fn))
    if not files:
        print(f"{name:26} scanned=0      uncommitted=0     SAFE TO DELETE (empty)"); continue
    shas = batch_hash(files)
    if len(shas) != len(files):
        print(f"{name:26} !! hash count mismatch — KEEP"); continue
    # one batch call to check existence
    chk = subprocess.run(["git","cat-file","--batch-check"], cwd=SITE,
                         input="\n".join(shas), capture_output=True, text=True).stdout.splitlines()
    missing = [files[i] for i,l in enumerate(chk) if "missing" in l]
    verdict = "SAFE TO DELETE" if not missing else f"KEEP — {len(missing)} never-committed file(s)"
    print(f"{name:26} scanned={len(files):<6} uncommitted={len(missing):<5} {verdict}")
    for m in missing[:8]:
        print("      ", os.path.relpath(m, base).replace("\\","/"))
