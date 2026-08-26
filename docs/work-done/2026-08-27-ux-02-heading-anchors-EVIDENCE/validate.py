"""Post a page URL or a raw JSON-LD block to validator.schema.org and print
the per-node verdict. Google's Rich Results Test has no public API; this is
schema.org's own validator, the same engine behind validator.schema.org.

  python validate.py url  <https://...>
  python validate.py html <file-containing-a-script-tag>
"""
import sys, json, urllib.parse, urllib.request, io

mode, arg = sys.argv[1], sys.argv[2]
payload = arg if mode == 'url' else io.open(arg, encoding='utf-8').read()
req = urllib.request.Request(
    'https://validator.schema.org/validate',
    data=urllib.parse.urlencode({mode: payload}).encode(),
    headers={'Content-Type': 'application/x-www-form-urlencoded'},
)
raw = urllib.request.urlopen(req, timeout=90).read().decode()
d = json.loads(raw.split('\n', 1)[1] if raw.startswith(")]}'") else raw)

print('source          :', arg)
print('totalNumErrors  :', d.get('totalNumErrors'))
print('totalNumWarnings:', d.get('totalNumWarnings'))
print('fetchError      :', d.get('fetchError', 'none'))
print()


def walk(n, depth=0):
    for t in n.get('types', []):
        print('  ' * depth + '@type ' + t['value'] + ('  ERRORS: ' + str(t['errors']) if t['errors'] else ''))
    for p in n.get('properties', []):
        if p['errors']:
            print('  ' * depth + '  ERROR on ' + p['pred'] + ': ' + str(p['errors']))
    for np in n.get('nodeProperties', []):
        walk(np['target'], depth + 1)


for g in d.get('tripleGroups', []):
    for n in g['nodes']:
        walk(n)
