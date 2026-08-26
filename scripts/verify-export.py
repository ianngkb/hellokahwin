"""Verify the hellokahwin.com export: every media-library item and every
upload URL referenced in post/page content must exist locally.
Also renames percent-encoded filenames to their decoded form.

Usage: python scripts/verify-export.py
"""
import json
import os
import re
import sys
import urllib.parse

BASE = os.path.join(os.path.dirname(__file__), '..', 'data', 'hellokahwin-export')
MEDIA_DIR = os.path.join(BASE, 'media')


def decode_names():
    renamed = 0
    for root, _dirs, files in os.walk(MEDIA_DIR):
        for name in files:
            if '%' not in name:
                continue
            decoded = urllib.parse.unquote(name)
            if decoded != name:
                src = os.path.join(root, name)
                dst = os.path.join(root, decoded)
                if os.path.exists(dst):
                    os.remove(src)
                else:
                    os.rename(src, dst)
                renamed += 1
    print(f'Renamed {renamed} percent-encoded filenames to decoded form')


def local_path(url):
    p = urllib.parse.urlparse(url).path
    parts = [urllib.parse.unquote(s) for s in p.split('/') if s]
    return os.path.join(MEDIA_DIR, *parts)


def main():
    decode_names()

    with open(os.path.join(BASE, 'content', 'media.json'), encoding='utf-8') as f:
        media = json.load(f)
    missing_lib = [m['source_url'] for m in media
                   if m.get('source_url') and not os.path.exists(local_path(m['source_url']))]
    print(f'Media library: {len(media)} items, missing locally: {len(missing_lib)}')
    for u in missing_lib:
        print('  MISSING:', u)

    with open(os.path.join(BASE, 'content', 'posts.json'), encoding='utf-8') as f:
        posts = json.load(f)
    with open(os.path.join(BASE, 'content', 'pages.json'), encoding='utf-8') as f:
        pages = json.load(f)

    url_re = re.compile(
        r'https?://(?:www\.)?hellokahwin\.com/wp-content/uploads/'
        r'[^\s"\'<>)]+\.(?:jpe?g|png|gif|webp|svg|avif|mp4|pdf)', re.I)
    refs = set()
    for item in posts + pages:
        html = (item.get('content', {}).get('rendered', '') or '') + \
               (item.get('excerpt', {}).get('rendered', '') or '')
        for u in url_re.findall(html):
            refs.add(re.sub(r'&#\d+;', '', u))
    missing_refs = sorted(u for u in refs if not os.path.exists(local_path(u)))
    print(f'In-content upload URLs referenced: {len(refs)}, missing locally: {len(missing_refs)}')
    for u in missing_refs:
        print('  MISSING:', u)

    media_by_id = {m['id'] for m in media}
    feat_missing = [p['slug'] for p in posts
                    if p.get('featured_media') and p['featured_media'] not in media_by_id]
    print(f'Posts with unresolvable featured_media: {len(feat_missing)} {feat_missing}')

    ok = not missing_lib and not missing_refs and not feat_missing
    print('\nVERIFICATION ' + ('PASSED' if ok else 'FAILED'))
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
