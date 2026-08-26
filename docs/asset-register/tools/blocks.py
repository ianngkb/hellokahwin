"""Print the top-level block index of an article body.

`placeAfter: n` in the front matter means "insert below the nth top-level block",
so a wrong n silently drops a photograph into the middle of an argument. This
mirrors the parser's block splitting closely enough to choose n deliberately:
blank-line-separated groups, with consecutive table rows and list items staying
together as one block, the way a markdown AST groups them.
"""
import sys, re
p = sys.argv[1]
raw = open(p, encoding='utf-8').read()
body = raw.split('\n---\n', 1)[1] if '\n---\n' in raw else raw
lines = body.split('\n')
blocks, cur = [], []
for ln in lines:
    if ln.strip() == '':
        if cur: blocks.append(cur); cur = []
    else:
        cur.append(ln)
if cur: blocks.append(cur)
# merge a table's rows: consecutive blocks each starting with | are one table
merged = []
for b in blocks:
    if merged and b[0].startswith('|') and merged[-1][0].startswith('|'):
        merged[-1] += b
    else:
        merged.append(b)
for i, b in enumerate(merged, 1):
    head = b[0][:88].replace('\t', ' ')
    kind = 'H' if head.startswith('#') else ('TBL' if head.startswith('|') else
           ('QUOTE' if head.startswith('>') else ('LIST' if re.match(r'^\s*[-*\d]', head) else 'P')))
    print(f"{i:>3} {kind:<5} {head}")
