import json, os, sys, urllib.request

CFG = json.load(open(os.path.expanduser('~/.claude.json'), encoding='utf-8'))
AH = CFG['mcpServers']['ahrefs']
URL = AH['url']
AUTH = AH['headers']['Authorization']

_session = {'id': None}

def _post(payload):
    data = json.dumps(payload).encode()
    hdrs = {'Authorization': AUTH, 'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream'}
    if _session['id']:
        hdrs['Mcp-Session-Id'] = _session['id']
    req = urllib.request.Request(URL, data=data, headers=hdrs, method='POST')
    with urllib.request.urlopen(req) as r:
        sid = r.headers.get('mcp-session-id')
        if sid:
            _session['id'] = sid
        body = r.read().decode('utf-8', 'replace')
        ct = r.headers.get('Content-Type', '')
    if not body.strip():
        return None
    if 'text/event-stream' in ct:
        out = None
        for line in body.splitlines():
            if line.startswith('data:'):
                out = json.loads(line[5:].strip())
        return out
    return json.loads(body)

def init():
    _post({"jsonrpc": "2.0", "id": 1, "method": "initialize",
           "params": {"protocolVersion": "2025-06-18", "capabilities": {},
                      "clientInfo": {"name": "hk-seo08", "version": "1.0"}}})
    _post({"jsonrpc": "2.0", "method": "notifications/initialized", "params": {}})

def call(name, args, rid=2):
    r = _post({"jsonrpc": "2.0", "id": rid, "method": "tools/call",
               "params": {"name": name, "arguments": args}})
    return r

def tools():
    return _post({"jsonrpc": "2.0", "id": 99, "method": "tools/list", "params": {}})

if __name__ == '__main__':
    init()
    if sys.argv[1] == 'tools':
        r = tools()
        for t in r['result']['tools']:
            print(t['name'], '::', (t.get('description') or '')[:110].replace('\n', ' '))
    elif sys.argv[1] == 'schema':
        r = tools()
        for t in r['result']['tools']:
            if t['name'] == sys.argv[2]:
                print(json.dumps(t, indent=2)[:6000])
    else:
        name = sys.argv[1]
        args = json.loads(sys.argv[2])
        print(json.dumps(call(name, args), ensure_ascii=False, indent=2)[:20000])
