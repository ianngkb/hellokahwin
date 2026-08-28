"""CONT-12 — reconcile `digunakan_dalam` for the C2.1 seed `hantaran-kahwin`.

The re-angle removed the twenty-item idea list, which carried all 25 legacy
WordPress images on that page. Two licensed photographs already in the library
took their place. This edits exactly 27 cells in one column plus 25 `nota`
cells, and touches no other row, no other column and no id.

    python cont12-register-update.py            # dry run, prints the diff
    python cont12-register-update.py --commit   # writes

Run from anywhere; the register path is resolved relative to this file.
"""

import csv
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REG = os.path.normpath(os.path.join(HERE, "..", "asset-register.csv"))
SLUG = "hantaran-kahwin"
GAINED = {"HK-P-0037", "HK-P-0038"}
NOTE = (
    " Dibuang daripada badan artikel hantaran-kahwin pada 28 Ogos 2026 oleh CONT-12, "
    "apabila senarai 20 idea digantikan dengan halaman takrif. Fail dan baris media "
    "dikekalkan; hanya rujukan dalam badan dan indeks media_article_usage yang berubah."
)

commit = "--commit" in sys.argv

with open(REG, newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    fields = reader.fieldnames
    rows = list(reader)

assert fields is not None
ncols = len(fields)
lost, gained, unchanged = [], [], 0

for r in rows:
    used = [u for u in r["digunakan_dalam"].split(";") if u]
    if r["asset_id"] in GAINED:
        if SLUG not in used:
            used.append(SLUG)
            r["digunakan_dalam"] = ";".join(used)
            gained.append(r["asset_id"])
    elif used == [SLUG]:
        # The 25 legacy images. The column asks which articles use the image,
        # and after this run the answer is none, which is what the register's
        # own orphan convention writes as TIDAK BERKENAAN.
        r["digunakan_dalam"] = "TIDAK BERKENAAN"
        r["nota"] = (r["nota"] or "").rstrip() + NOTE
        lost.append(r["asset_id"])
    elif SLUG in used:
        # An image shared with another article — not this run's business.
        unchanged += 1

print(f"register: {len(rows)} rows, {ncols} columns")
print(f"gained {SLUG}: {len(gained)} -> {', '.join(gained)}")
print(f"lost   {SLUG}: {len(lost)} -> {lost[0]}..{lost[-1]}" if lost else "lost: 0")
print(f"shared with another article, left alone: {unchanged}")

if not commit:
    print("\nDRY RUN. Re-run with --commit to write.")
    sys.exit(0)

with open(REG, "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=fields, lineterminator="\n")
    w.writeheader()
    w.writerows(rows)

# Re-parse and assert every row still has the full column count. One unescaped
# quote in a `nota` field corrupts every row after it.
with open(REG, newline="", encoding="utf-8") as f:
    check = list(csv.reader(f))
bad = [i for i, row in enumerate(check) if len(row) != ncols]
print(f"\nre-parsed: {len(check)} lines, rows with wrong column count: {len(bad)} {bad[:5]}")
if bad:
    sys.exit(1)
print("written")
