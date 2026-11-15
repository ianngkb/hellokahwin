import { describe, it, expect, vi } from 'vitest';
import {
  collectR2Keys,
  groupIntoImageDirs,
  collectReferencedAssets,
  copyReferencedAssets,
  rewriteR2Urls,
} from '../duplicate-assets';

/**
 * Duplicating an article used to clone only the DB row, leaving the copy's
 * photos physically inside the SOURCE article's folder. Deleting the source
 * then destroyed the copy's images — which is how a published article lost its
 * cover for good on 2026-09-08.
 *
 * These tests pin the parts that make a duplicate self-contained, and in
 * particular the two things that would quietly cause real damage if they
 * regressed: copying at image-directory granularity (never the shared
 * `inspire/general/` parent), and rewriting URLs by exact key mapping rather
 * than by string-replacing a slug.
 */

const PUBLIC_URL = 'https://pub-abc.r2.dev';
const url = (key: string) => `${PUBLIC_URL}/${key}`;

describe('collectR2Keys', () => {
  it('finds keys in strings, nested objects and arrays', () => {
    const value = {
      cover: url('inspire/a/1785-foo/high.webp'),
      variants: { low: { url: url('inspire/a/1785-foo/low.webp') } },
      blocks: [{ content: [{ src: url('inspire/b/1786-bar/high.webp') }] }],
    };
    expect(collectR2Keys(value, PUBLIC_URL).sort()).toEqual([
      'inspire/a/1785-foo/high.webp',
      'inspire/a/1785-foo/low.webp',
      'inspire/b/1786-bar/high.webp',
    ]);
  });

  it('ignores URLs on other hosts', () => {
    const value = { a: 'https://images.example.com/inspire/x/1-y/high.webp' };
    expect(collectR2Keys(value, PUBLIC_URL)).toEqual([]);
  });

  it('strips query strings and finds several URLs inside one string', () => {
    const html = `<img src="${url('inspire/a/1-x/high.webp')}?v=2"><img src="${url('inspire/a/1-y/high.webp')}">`;
    expect(collectR2Keys(html, PUBLIC_URL).sort()).toEqual([
      'inspire/a/1-x/high.webp',
      'inspire/a/1-y/high.webp',
    ]);
  });

  it('decodes a percent-encoded path back to the real object key', () => {
    // A real legacy folder is literally named `white-%e7%99%bd`, so its stored
    // URL carries `%25e7%2599%25bd`. Slicing without decoding produces a key
    // that matches nothing in R2 and the copy silently no-ops.
    const stored = url('inspire/white-%25e7%2599%25bd/1775-cover.jpg');
    expect(collectR2Keys(stored, PUBLIC_URL)).toEqual(['inspire/white-%e7%99%bd/1775-cover.jpg']);
  });

  it('decodes ordinary percent-encoded spaces', () => {
    expect(collectR2Keys(url('inspire/(Deleted)%20a/1785-x/high.webp'), PUBLIC_URL)).toEqual([
      'inspire/(Deleted) a/1785-x/high.webp',
    ]);
  });

  it('falls back to the raw text on a malformed escape rather than throwing', () => {
    expect(() => collectR2Keys(url('inspire/a%/1785-x/high.webp'), PUBLIC_URL)).not.toThrow();
    expect(collectR2Keys(url('inspire/a%/1785-x/high.webp'), PUBLIC_URL)).toEqual([
      'inspire/a%/1785-x/high.webp',
    ]);
  });

  it('tolerates a trailing slash on the configured public URL', () => {
    expect(collectR2Keys(url('inspire/a/1-x/high.webp'), `${PUBLIC_URL}/`)).toEqual([
      'inspire/a/1-x/high.webp',
    ]);
  });
});

describe('groupIntoImageDirs', () => {
  it('groups variants into their image directory and dedupes', () => {
    const { dirs, siblingKeys } = groupIntoImageDirs([
      'inspire/a/1785-foo/high.webp',
      'inspire/a/1785-foo/low.webp',
      'inspire/a/1785-foo/crop-16x9-og.webp',
    ]);
    expect(dirs).toEqual([{ prefix: 'inspire/a/1785-foo/', leaf: '1785-foo' }]);
    expect(siblingKeys).toEqual([]);
  });

  it('treats a file directly under the article folder as a legacy sibling original', () => {
    const { dirs, siblingKeys } = groupIntoImageDirs(['inspire/a/1785-foo.jpg']);
    expect(dirs).toEqual([]);
    expect(siblingKeys).toEqual(['inspire/a/1785-foo.jpg']);
  });

  it('ignores keys outside inspire/', () => {
    expect(groupIntoImageDirs(['avatars/u1/pic.png']).dirs).toEqual([]);
  });

  it('SKIPS a key deeper than one image directory instead of guessing', () => {
    // `inspire/wp-content/uploads/2024/01/foo.jpg` is the shape old WordPress
    // imports use. Treating "everything above the filename" as the image dir
    // would make `uploads/2024/01/` the unit of copy and clone every unrelated
    // photo in that month — the same shared-folder catastrophe as `general/`.
    const { dirs, siblingKeys, skipped } = groupIntoImageDirs([
      'inspire/wp-content/uploads/2024/01/foo.jpg',
    ]);
    expect(dirs).toEqual([]);
    expect(siblingKeys).toEqual([]);
    expect(skipped[0].reason).toMatch(/depth/);
  });

  it('skips a key that ends in a slash', () => {
    const { dirs, skipped } = groupIntoImageDirs(['inspire/a/1785-foo/']);
    expect(dirs).toEqual([]);
    expect(skipped).toHaveLength(1);
  });
});

describe('multiple public hosts', () => {
  // Stored URLs are migrated lazily, so one article can reference several hosts
  // at once — and dev is already on `images.hellokahwin.com` while prod
  // is on `pub-….r2.dev`. Matching only the current env's host would find
  // nothing for a whole class of articles and silently restore the old
  // shared-folder behaviour, with green tests.
  const BASES = ['https://pub-abc.r2.dev', 'https://images.hellokahwin.com'];

  it('collects keys stored under any known host', () => {
    const doc = {
      cover: 'https://pub-abc.r2.dev/inspire/a/1785-foo/high.webp',
      body: 'https://images.hellokahwin.com/inspire/a/1786-bar/high.webp',
    };
    expect(collectR2Keys(doc, BASES).sort()).toEqual([
      'inspire/a/1785-foo/high.webp',
      'inspire/a/1786-bar/high.webp',
    ]);
  });

  it('rewrites an alternate-host URL onto the canonical host', () => {
    const map = new Map([['inspire/a/1786-bar/high.webp', 'inspire/new/1786-bar/high.webp']]);
    expect(
      rewriteR2Urls(
        'https://images.hellokahwin.com/inspire/a/1786-bar/high.webp',
        map,
        BASES,
        'https://pub-abc.r2.dev',
      ),
    ).toBe('https://pub-abc.r2.dev/inspire/new/1786-bar/high.webp');
  });
});

/** A fake R2 that lists a fixed key set and records what was copied. */
function fakeR2(objectsByPrefix: Record<string, string[]>, failOn: string[] = []) {
  const copies: Array<{ from: string; to: string }> = [];
  const send = vi.fn(
    async (cmd: { constructor: { name: string }; input: Record<string, string> }) => {
      const name = cmd.constructor.name;
      if (name === 'ListObjectsV2Command') {
        const prefix = cmd.input.Prefix;
        return {
          Contents: (objectsByPrefix[prefix] ?? []).map((Key) => ({ Key })),
          IsTruncated: false,
        };
      }
      if (name === 'CopyObjectCommand') {
        const from = cmd.input.CopySource.split('/').slice(1).join('/');
        if (failOn.includes(from)) throw new Error('NoSuchKey');
        copies.push({ from, to: cmd.input.Key });
        return {};
      }
      throw new Error(`unexpected command ${name}`);
    },
  );
  return { r2: { send } as never, copies, send };
}

describe('copyReferencedAssets', () => {
  it('copies every variant into the new article folder, preserving the leaf name', async () => {
    const { r2, copies } = fakeR2({
      'inspire/source/1785-foo/': [
        'inspire/source/1785-foo/high.webp',
        'inspire/source/1785-foo/low.webp',
      ],
    });
    const { keyMap } = await copyReferencedAssets(
      r2,
      'bucket',
      {
        dirs: [{ prefix: 'inspire/source/1785-foo/', leaf: '1785-foo' }],
        siblingKeys: [],
        skipped: [],
      },
      'new-slug',
    );
    expect(copies).toEqual([
      { from: 'inspire/source/1785-foo/high.webp', to: 'inspire/new-slug/1785-foo/high.webp' },
      { from: 'inspire/source/1785-foo/low.webp', to: 'inspire/new-slug/1785-foo/low.webp' },
    ]);
    expect(keyMap.get('inspire/source/1785-foo/high.webp')).toBe(
      'inspire/new-slug/1785-foo/high.webp',
    );
  });

  it('copies only the referenced image dir out of a shared general/ folder', async () => {
    // The regression that would be catastrophic: `inspire/general/` holds
    // images belonging to many articles. Listing the PARENT would clone them
    // all into this one duplicate.
    const { r2, copies, send } = fakeR2({
      'inspire/general/1785-mine/': ['inspire/general/1785-mine/high.webp'],
      'inspire/general/': [
        'inspire/general/1785-mine/high.webp',
        'inspire/general/9999-someone-else/high.webp',
      ],
    });
    await copyReferencedAssets(
      r2,
      'bucket',
      {
        dirs: [{ prefix: 'inspire/general/1785-mine/', leaf: '1785-mine' }],
        siblingKeys: [],
        skipped: [],
      },
      'new-slug',
    );
    expect(copies).toEqual([
      { from: 'inspire/general/1785-mine/high.webp', to: 'inspire/new-slug/1785-mine/high.webp' },
    ]);
    const listedPrefixes = send.mock.calls
      .map(([c]) => c as { constructor: { name: string }; input: { Prefix?: string } })
      .filter((c) => c.constructor.name === 'ListObjectsV2Command')
      .map((c) => c.input.Prefix);
    expect(listedPrefixes).not.toContain('inspire/general/');
  });

  it('copies a legacy sibling original alongside its variant directory', async () => {
    const { r2, copies } = fakeR2({
      'inspire/source/1785-foo/': ['inspire/source/1785-foo/high.webp'],
    });
    await copyReferencedAssets(
      r2,
      'bucket',
      {
        dirs: [{ prefix: 'inspire/source/1785-foo/', leaf: '1785-foo' }],
        siblingKeys: ['inspire/source/1785-foo.jpg'],
        skipped: [],
      },
      'new-slug',
    );
    expect(copies).toContainEqual({
      from: 'inspire/source/1785-foo.jpg',
      to: 'inspire/new-slug/1785-foo.jpg',
    });
  });

  it('skips an object that no longer exists and still copies the rest', async () => {
    const warn = vi.fn();
    const { r2 } = fakeR2(
      {
        'inspire/source/1785-foo/': [
          'inspire/source/1785-foo/high.webp',
          'inspire/source/1785-foo/low.webp',
        ],
      },
      ['inspire/source/1785-foo/high.webp'],
    );
    const { keyMap } = await copyReferencedAssets(
      r2,
      'bucket',
      {
        dirs: [{ prefix: 'inspire/source/1785-foo/', leaf: '1785-foo' }],
        siblingKeys: [],
        skipped: [],
      },
      'new-slug',
      warn,
    );
    expect(keyMap.has('inspire/source/1785-foo/high.webp')).toBe(false);
    expect(keyMap.has('inspire/source/1785-foo/low.webp')).toBe(true);
    expect(warn).toHaveBeenCalledOnce();
  });

  it('copies concurrently but never exceeds the limit', async () => {
    // Sequential copying of a gallery-heavy article ran for minutes, which a
    // server action cannot afford. This pins that the work is parallel AND
    // bounded, so the fix for one problem does not create a thundering herd.
    const keys = Array.from({ length: 40 }, (_, i) => `inspire/source/1785-foo/v${i}.webp`);
    let inFlight = 0;
    let peak = 0;
    const send = vi.fn(
      async (cmd: { constructor: { name: string }; input: Record<string, string> }) => {
        if (cmd.constructor.name === 'ListObjectsV2Command') {
          return { Contents: keys.map((Key) => ({ Key })), IsTruncated: false };
        }
        inFlight++;
        peak = Math.max(peak, inFlight);
        await new Promise((r) => setTimeout(r, 5));
        inFlight--;
        return {};
      },
    );
    const { keyMap } = await copyReferencedAssets(
      { send } as never,
      'bucket',
      {
        dirs: [{ prefix: 'inspire/source/1785-foo/', leaf: '1785-foo' }],
        siblingKeys: [],
        skipped: [],
      },
      'new-slug',
      undefined,
      4,
    );
    expect(keyMap.size).toBe(40);
    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThanOrEqual(4);
  });

  it('percent-encodes CopySource but not Key', async () => {
    // CopySource is a URI reference; Key is the raw object key. Sending the raw
    // key as CopySource fails with NoSuchKey for any key holding a `%` or a
    // space — verified against the real `inspire/white-%e7%99%bd/` folder,
    // where the copy silently moved 0 objects before this was fixed.
    const src = 'inspire/white-%e7%99%bd/1775-cover/high.webp';
    const calls: Array<Record<string, string>> = [];
    const send = vi.fn(
      async (cmd: { constructor: { name: string }; input: Record<string, string> }) => {
        if (cmd.constructor.name === 'ListObjectsV2Command') {
          return { Contents: [{ Key: src }], IsTruncated: false };
        }
        calls.push(cmd.input);
        return {};
      },
    );
    await copyReferencedAssets(
      { send } as never,
      'bucket',
      {
        dirs: [{ prefix: 'inspire/white-%e7%99%bd/1775-cover/', leaf: '1775-cover' }],
        siblingKeys: [],
        skipped: [],
      },
      'new-slug',
    );
    expect(calls[0].CopySource).toBe('bucket/inspire/white-%25e7%2599%25bd/1775-cover/high.webp');
    expect(calls[0].Key).toBe('inspire/new-slug/1775-cover/high.webp');
  });

  it('encodes a space in CopySource, for the "(Deleted) slug" folders', async () => {
    const src = 'inspire/(Deleted) a/1785-x/high.webp';
    const calls: Array<Record<string, string>> = [];
    const send = vi.fn(
      async (cmd: { constructor: { name: string }; input: Record<string, string> }) => {
        if (cmd.constructor.name === 'ListObjectsV2Command')
          return { Contents: [{ Key: src }], IsTruncated: false };
        calls.push(cmd.input);
        return {};
      },
    );
    await copyReferencedAssets(
      { send } as never,
      'bucket',
      {
        dirs: [{ prefix: 'inspire/(Deleted) a/1785-x/', leaf: '1785-x' }],
        siblingKeys: [],
        skipped: [],
      },
      'new-slug',
    );
    expect(calls[0].CopySource).toContain('%20');
  });

  it('refuses a destination collision instead of overwriting', async () => {
    // Two source dirs under different parents can share a leaf name — a
    // partially failed duplicate-of-a-duplicate produces exactly that. Left
    // unchecked the second copy overwrites the first (wrong photo in the
    // article) and the two-keys-to-one-value map then violates
    // `idx_media_r2_key_unique`, aborting the whole transaction.
    const { r2, copies } = fakeR2({
      'inspire/src-a/1785-foo/': ['inspire/src-a/1785-foo/high.webp'],
      'inspire/src-b/1785-foo/': ['inspire/src-b/1785-foo/high.webp'],
    });
    const warn = vi.fn();
    const { keyMap, copied, failed } = await copyReferencedAssets(
      r2,
      'bucket',
      {
        dirs: [
          { prefix: 'inspire/src-a/1785-foo/', leaf: '1785-foo' },
          { prefix: 'inspire/src-b/1785-foo/', leaf: '1785-foo' },
        ],
        siblingKeys: [],
        skipped: [],
      },
      'new-slug',
      warn,
      1,
    );
    expect(copies).toHaveLength(1);
    expect(new Set(keyMap.values()).size).toBe(keyMap.size); // no two keys share a destination
    expect(copied).toBe(1);
    expect(failed).toBe(1);
    expect(warn).toHaveBeenCalled();
  });

  it('reports copied and failed counts so a partial copy is visible', async () => {
    const { r2 } = fakeR2(
      {
        'inspire/source/1785-foo/': [
          'inspire/source/1785-foo/high.webp',
          'inspire/source/1785-foo/low.webp',
        ],
      },
      ['inspire/source/1785-foo/high.webp'],
    );
    const { copied, failed } = await copyReferencedAssets(
      r2,
      'bucket',
      {
        dirs: [{ prefix: 'inspire/source/1785-foo/', leaf: '1785-foo' }],
        siblingKeys: [],
        skipped: [],
      },
      'new-slug',
    );
    expect(copied).toBe(1);
    expect(failed).toBe(1);
  });

  it('follows pagination rather than copying only the first page', async () => {
    const page1 = Array.from({ length: 3 }, (_, i) => `inspire/source/1785-foo/a${i}.webp`);
    const page2 = Array.from({ length: 2 }, (_, i) => `inspire/source/1785-foo/b${i}.webp`);
    let call = 0;
    const send = vi.fn(
      async (cmd: { constructor: { name: string }; input: Record<string, string> }) => {
        if (cmd.constructor.name === 'ListObjectsV2Command') {
          call++;
          return call === 1
            ? {
                Contents: page1.map((Key) => ({ Key })),
                IsTruncated: true,
                NextContinuationToken: 't',
              }
            : { Contents: page2.map((Key) => ({ Key })), IsTruncated: false };
        }
        return {};
      },
    );
    const { copied } = await copyReferencedAssets(
      { send } as never,
      'bucket',
      {
        dirs: [{ prefix: 'inspire/source/1785-foo/', leaf: '1785-foo' }],
        siblingKeys: [],
        skipped: [],
      },
      'new-slug',
    );
    expect(copied).toBe(5);
  });

  it('makes no R2 calls for a text-only article', async () => {
    const { r2, send } = fakeR2({});
    const { keyMap } = await copyReferencedAssets(
      r2,
      'bucket',
      { dirs: [], siblingKeys: [], skipped: [] },
      'new-slug',
    );
    expect(send).not.toHaveBeenCalled();
    expect(keyMap.size).toBe(0);
  });
});

describe('rewriteR2Urls', () => {
  const keyMap = new Map([['inspire/a/1785-foo/high.webp', 'inspire/new/1785-foo/high.webp']]);

  it('rewrites mapped URLs anywhere in a nested structure', () => {
    const doc = { blocks: [{ src: url('inspire/a/1785-foo/high.webp') }] };
    expect(rewriteR2Urls(doc, keyMap, PUBLIC_URL)).toEqual({
      blocks: [{ src: url('inspire/new/1785-foo/high.webp') }],
    });
  });

  it('leaves an unmapped URL untouched, so a failed copy degrades rather than breaks', () => {
    const doc = { src: url('inspire/a/9999-never-copied/high.webp') };
    expect(rewriteR2Urls(doc, keyMap, PUBLIC_URL)).toEqual(doc);
  });

  it('preserves a query string on a rewritten URL', () => {
    expect(rewriteR2Urls(`${url('inspire/a/1785-foo/high.webp')}?v=2`, keyMap, PUBLIC_URL)).toBe(
      `${url('inspire/new/1785-foo/high.webp')}?v=2`,
    );
  });

  it('returns the value untouched when nothing was copied', () => {
    const doc = { src: url('inspire/a/1785-foo/high.webp') };
    expect(rewriteR2Urls(doc, new Map(), PUBLIC_URL)).toBe(doc);
  });

  it('handles null and non-string leaves', () => {
    expect(rewriteR2Urls({ a: null, b: 3, c: true }, keyMap, PUBLIC_URL)).toEqual({
      a: null,
      b: 3,
      c: true,
    });
  });

  it('passes a Date through instead of flattening it to a plain object', () => {
    const d = new Date('2026-09-09T00:00:00Z');
    const out = rewriteR2Urls({ createdAt: d }, keyMap, PUBLIC_URL);
    expect(out.createdAt).toBeInstanceOf(Date);
    expect(out.createdAt.getTime()).toBe(d.getTime());
  });

  it('re-encodes a rewritten key that needs escaping', () => {
    const map = new Map([['inspire/white-%e7%99%bd/1775-cover.jpg', 'inspire/new/1775-cover.jpg']]);
    expect(
      rewriteR2Urls(url('inspire/white-%25e7%2599%25bd/1775-cover.jpg'), map, PUBLIC_URL),
    ).toBe(url('inspire/new/1775-cover.jpg'));
  });

  it('rewrites every occurrence of the same URL in one string', () => {
    const u = url('inspire/a/1785-foo/high.webp');
    expect(rewriteR2Urls(`${u} and ${u}`, keyMap, PUBLIC_URL)).toBe(
      `${url('inspire/new/1785-foo/high.webp')} and ${url('inspire/new/1785-foo/high.webp')}`,
    );
  });
});

describe('collectReferencedAssets (end to end)', () => {
  it('turns an article’s cover + body into the exact set of dirs to copy', () => {
    const cover = url('inspire/src-slug/1785-cover/high.webp');
    const variants = { low: { url: url('inspire/src-slug/1785-cover/low.webp') } };
    const content = { blocks: [{ src: url('inspire/general/1786-shared/high.webp') }] };
    const legacy = url('inspire/src-slug/1785-cover.jpg');

    const { dirs, siblingKeys } = collectReferencedAssets(
      [cover, variants, content, legacy],
      PUBLIC_URL,
    );

    expect(dirs.map((d) => d.prefix).sort()).toEqual([
      'inspire/general/1786-shared/',
      'inspire/src-slug/1785-cover/',
    ]);
    expect(siblingKeys).toEqual(['inspire/src-slug/1785-cover.jpg']);
  });
});
