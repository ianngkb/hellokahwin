/**
 * Asset copying for article duplication.
 *
 * Duplicating an article used to clone only the DB row: `coverImageUrl` and the
 * `content` jsonb were carried over as verbatim strings, so the copy's photos
 * physically lived in the SOURCE article's R2 folder. Deleting the source then
 * destroyed the copy's images, with nothing to warn you — the page kept
 * pointing at bytes that no longer existed.
 *
 * That is not hypothetical. On The Wedding Notebook (whose admin this one
 * shares) a published article permanently lost its cover on 2026-09-08 when the
 * parent it had been duplicated from was hard-deleted 16 seconds after the copy
 * went live. HelloKahwin's master delete removes the same R2 folder, so the
 * same thing could happen here.
 *
 * These helpers make a duplicate self-contained: every object it references is
 * copied into its own `inspire/{slug}/` folder and every URL is rewritten to
 * the new location. Once nothing is shared, the delete paths stay safe without
 * needing a reference check.
 *
 * They live here rather than inside the `'use server'` actions module for two
 * reasons: that module may only export async server actions (a value export
 * there throws at module load and breaks every action in the file), and these
 * are pure enough to unit-test directly.
 */

import { CopyObjectCommand, ListObjectsV2Command, type S3Client } from '@aws-sdk/client-s3';

/**
 * How many R2 requests to keep in flight. R2 CopyObject is server-side, so this
 * is bounded by request latency rather than bandwidth; 16 keeps a large gallery
 * well inside a serverless invocation without hammering the bucket. Measured on
 * The Wedding Notebook's heaviest article (190 image dirs / 414 objects): 18.6s.
 */
const COPY_CONCURRENCY = 16;

/**
 * Matches a URL inside a string or JSON blob.
 *
 * `)` is deliberately ALLOWED. The soft-delete path parks an article's images
 * under `inspire/(Deleted) {slug}/`, which in URL form is
 * `inspire/(Deleted)%20{slug}/` — the space is escaped, but the parens are not,
 * and stopping at the first `)` truncates the key to something that matches
 * nothing. A trailing unbalanced `)` (the markdown `[text](url)` case) is
 * trimmed afterwards by `trimUrl` instead.
 */
const R2_URL_PATTERN = /https?:\/\/[^\s"'<>\\]+/g;

/** Drop trailing punctuation that belongs to the surrounding prose, not the URL. */
function trimUrl(url: string): string {
  let out = url;
  for (;;) {
    const last = out[out.length - 1];
    if (last === ')' && (out.match(/\)/g)?.length ?? 0) > (out.match(/\(/g)?.length ?? 0)) {
      out = out.slice(0, -1);
      continue;
    }
    if (last && '.,;:!?]}'.includes(last)) {
      out = out.slice(0, -1);
      continue;
    }
    return out;
  }
}

/**
 * An image "directory" is the folder holding one photo's variants, e.g.
 * `inspire/some-article/1785467788179-OWH-ZuanYuan-1/`. It is the correct unit
 * to copy: the level ABOVE it (`inspire/general/`) is shared by many articles,
 * so copying a parent folder would clone thousands of unrelated photos.
 */
export interface ImageDir {
  /** Key prefix of the variant directory, with trailing slash. */
  prefix: string;
  /** Final path segment, e.g. `1785467788179-OWH-ZuanYuan-1`. */
  leaf: string;
}

/** Everything an article references in R2: variant dirs + legacy sibling originals. */
export interface ReferencedAssets {
  dirs: ImageDir[];
  /**
   * Originals uploaded before 2026-08-27 sit BESIDE the variant directory
   * (`inspire/a/1785-foo.jpg` next to `inspire/a/1785-foo/`) rather than inside
   * it, so listing the directory alone would silently leave them behind.
   */
  siblingKeys: string[];
  /**
   * Keys we deliberately refuse to copy, with the reason. Surfaced so the caller
   * can tell the admin the copy is partial rather than letting it look complete.
   */
  skipped: Array<{ key: string; reason: string }>;
}

/**
 * Pull every R2 object key referenced anywhere in a JSON-ish value.
 *
 * Walks strings, arrays and plain objects, so it covers `coverImageUrl`, the
 * cover sidecar JSON (variants, smart crops) and the tiptap `content` document
 * without needing to know any of their shapes.
 *
 * `bases` must be every public host an inspire-bucket URL may carry. We store
 * absolute URLs, so an article stored under a host that is not listed is
 * silently left sharing its source's photos. HelloKahwin writes one host today
 * (`R2_PUBLIC_URL`); add any other inspire-bucket host here if one appears.
 */
export function collectR2Keys(value: unknown, bases: string | string[]): string[] {
  const normalised = (Array.isArray(bases) ? bases : [bases]).map(
    (b) => b.replace(/\/+$/, '') + '/',
  );
  const found = new Set<string>();

  const walk = (v: unknown): void => {
    if (typeof v === 'string') {
      // A single string can embed several URLs (e.g. a srcset or raw HTML).
      for (const match of v.matchAll(R2_URL_PATTERN)) {
        const url = trimUrl(match[0]);
        const base = normalised.find((b) => url.startsWith(b));
        if (!base) continue;
        const key = keyFromUrl(url, base);
        if (key) found.add(key);
      }
      return;
    }
    if (Array.isArray(v)) {
      for (const item of v) walk(item);
      return;
    }
    if (v && typeof v === 'object') {
      for (const item of Object.values(v)) walk(item);
    }
  };

  walk(value);
  return [...found];
}

/**
 * Group referenced keys into the directories that must be copied.
 *
 * `inspire/a/1785-foo/high.webp`  → dir `inspire/a/1785-foo/`   (4 segments)
 * `inspire/a/1785-foo.jpg`        → sibling key                 (3 segments)
 *
 * Anything else is SKIPPED rather than guessed at. A deeper key such as
 * `inspire/wp-content/uploads/2024/01/foo.jpg` (the shape old WordPress imports
 * use) would otherwise make `uploads/2024/01/` the "image directory" and copy
 * every unrelated photo in that month — precisely the shared-folder catastrophe
 * this module exists to avoid, one path shape over.
 */
export function groupIntoImageDirs(keys: string[]): ReferencedAssets {
  const dirs = new Map<string, ImageDir>();
  const siblings = new Set<string>();
  const skipped: Array<{ key: string; reason: string }> = [];

  for (const key of keys) {
    const segments = key.split('/');
    if (segments[0] !== 'inspire') {
      skipped.push({ key, reason: 'not under inspire/' });
      continue;
    }
    if (segments[segments.length - 1] === '') {
      skipped.push({ key, reason: 'key ends in a slash' });
      continue;
    }
    if (segments.length === 4) {
      const leaf = segments[2];
      dirs.set(`${segments[0]}/${segments[1]}/${leaf}/`, {
        prefix: `${segments[0]}/${segments[1]}/${leaf}/`,
        leaf,
      });
    } else if (segments.length === 3) {
      siblings.add(key);
    } else {
      skipped.push({ key, reason: `unexpected depth (${segments.length} segments)` });
    }
  }

  return { dirs: [...dirs.values()], siblingKeys: [...siblings], skipped };
}

/** Convenience wrapper: what does this article reference, in copyable form? */
export function collectReferencedAssets(
  values: unknown[],
  bases: string | string[],
): ReferencedAssets {
  const keys = [...new Set(values.flatMap((v) => collectR2Keys(v, bases)))];
  return groupIntoImageDirs(keys);
}

/** What a copy run actually managed to do — the caller reports this to the admin. */
export interface CopyReport {
  keyMap: Map<string, string>;
  copied: number;
  failed: number;
}

/**
 * Copy every referenced object into `inspire/{newSlug}/`, preserving each
 * image's own leaf directory name so variant filenames survive byte-identical.
 * Both variant-naming shapes (legacy `high.webp` and named `<base>-high.webp`)
 * are permanent and must never be rewritten.
 *
 * Returns the oldKey → newKey mapping, which is the single source of truth for
 * rewriting URLs afterwards, plus counts so a partial copy can be reported
 * rather than passed off as success. A source object that no longer exists is
 * simply absent from the map, so its URL is left untouched rather than
 * repointed at something that was never copied.
 */
export async function copyReferencedAssets(
  r2: Pick<S3Client, 'send'>,
  bucket: string,
  assets: ReferencedAssets,
  newSlug: string,
  onWarn: (message: string, err: unknown) => void = () => {},
  concurrency = COPY_CONCURRENCY,
): Promise<CopyReport> {
  const keyMap = new Map<string, string>();
  const destPrefix = `inspire/${newSlug}/`;
  let failed = 0;

  // Plan first, then execute concurrently. A gallery-heavy real wedding can
  // reference 300+ photos × 4 variants; copied one at a time that runs for
  // minutes, and a server action here is capped by its page's `maxDuration`.
  const plan: Array<{ from: string; to: string }> = [];
  // Two source dirs under different parents can share a leaf name (a partially
  // failed duplicate-of-a-duplicate produces exactly that). Left unchecked the
  // second copy overwrites the first — wrong photo in the article — and the
  // resulting two-keys-to-one-value map violates `idx_media_r2_key_unique`,
  // aborting the whole transaction after all the R2 work is already paid for.
  const takenDestinations = new Set<string>();

  const enqueue = (from: string, to: string): void => {
    if (takenDestinations.has(to)) {
      onWarn(`Destination collision, not copying ${from} over ${to}`, null);
      failed++;
      return;
    }
    takenDestinations.add(to);
    plan.push({ from, to });
  };

  await mapWithConcurrency(assets.dirs, concurrency, async (dir) => {
    const found: string[] = [];
    let continuationToken: string | undefined;
    try {
      do {
        const listed = await r2.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: dir.prefix,
            ContinuationToken: continuationToken,
          }),
        );
        for (const obj of listed.Contents ?? []) {
          if (obj.Key) found.push(obj.Key);
        }
        continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
      } while (continuationToken);
    } catch (err) {
      onWarn(`Failed to list ${dir.prefix}`, err);
      failed++;
      return;
    }
    if (found.length === 0) {
      // The article references this directory but R2 holds nothing under it.
      // Counting it is what makes the difference visible: otherwise the copy
      // moves zero objects, no counter moves, and the admin is told the
      // duplication succeeded while it still shares the source's folder.
      onWarn(`Nothing found under ${dir.prefix}`, null);
      failed++;
      return;
    }
    for (const key of found) {
      enqueue(key, `${destPrefix}${dir.leaf}/${key.slice(dir.prefix.length)}`);
    }
  });

  for (const key of assets.siblingKeys) {
    const filename = key.split('/').pop();
    if (filename) enqueue(key, `${destPrefix}${filename}`);
  }

  await mapWithConcurrency(plan, concurrency, async ({ from, to }) => {
    if (from === to) return;
    try {
      await r2.send(
        // `CopySource` is a URI reference and must be percent-ENCODED, unlike
        // `Key`, which is the raw object key. They differ whenever a key holds a
        // space or a `%` — `inspire/(Deleted) slug/…` and the legacy
        // `inspire/white-%e7%99%bd/…` folder both do — and sending the raw key
        // there fails with NoSuchKey while the identical Prefix lists fine.
        new CopyObjectCommand({
          Bucket: bucket,
          CopySource: `${bucket}/${encodeKey(from)}`,
          Key: to,
        }),
      );
      keyMap.set(from, to);
    } catch (err) {
      // A missing or unreadable source must not fail the duplication — the
      // article is still worth creating, just with that one URL left as-is.
      onWarn(`Failed to copy ${from}`, err);
      failed++;
    }
  });

  return { keyMap, copied: keyMap.size, failed };
}

/** Bounded-concurrency map. Never rejects: each worker handles its own errors. */
async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) return;
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor++];
      await fn(item);
    }
  });
  await Promise.all(workers);
}

/**
 * Rewrite every R2 URL in a JSON-ish value using an exact oldKey → newKey map.
 *
 * Keyed lookup, never a slug string-replace: an article's folder name is
 * whatever its slug happened to be at UPLOAD time and drifts freely afterwards
 * (slug edits do not move R2 folders), so a textual slug swap would miss most
 * real articles and corrupt the rest.
 *
 * Rewritten URLs are emitted on `canonicalBase` — the host this environment
 * writes today — which is also how a fresh upload would have stored them.
 */
export function rewriteR2Urls<T>(
  value: T,
  keyMap: Map<string, string>,
  bases: string | string[],
  canonicalBase?: string,
): T {
  if (keyMap.size === 0) return value;
  const list = (Array.isArray(bases) ? bases : [bases]).map((b) => b.replace(/\/+$/, '') + '/');
  const canonical = (canonicalBase ?? list[0]).replace(/\/+$/, '') + '/';

  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') {
      return v.replace(R2_URL_PATTERN, (match) => {
        const url = trimUrl(match);
        // Whatever `trimUrl` shaved off is prose, and must be put back.
        const tail = match.slice(url.length);
        const base = list.find((b) => url.startsWith(b));
        if (!base) return match;
        const mapped = keyMap.get(keyFromUrl(url, base));
        return mapped ? canonical + encodeKey(mapped) + suffixOf(url) + tail : match;
      });
    }
    if (Array.isArray(v)) return v.map(walk);
    // `Date` and other class instances would be flattened into plain objects by
    // the branch below, so anything that is not a plain object is passed through
    // untouched. Article content is JSON, but media rows are not exclusively so.
    if (v && typeof v === 'object' && isPlainObject(v)) {
      return Object.fromEntries(Object.entries(v).map(([k, val]) => [k, walk(val)]));
    }
    return v;
  };

  return walk(value) as T;
}

/**
 * URL → R2 object key.
 *
 * The path in a stored URL is percent-ENCODED; the object key R2 indexes by is
 * the decoded form. They differ for real articles here: one legacy folder is
 * literally named `white-%e7%99%bd`, so its URL carries `%25e7%2599%25bd`.
 * Slicing without decoding yields a key that matches nothing, and the copy
 * silently no-ops for exactly the articles that need it most.
 */
function keyFromUrl(url: string, base: string): string {
  const raw = url.slice(base.length).split(/[?#]/)[0];
  try {
    return decodeURIComponent(raw);
  } catch {
    // A malformed escape (a lone `%`) — treat the raw text as the key rather
    // than throwing in the middle of a duplication.
    return raw;
  }
}

/** R2 object key → the path portion of a URL, encoding each segment. */
function encodeKey(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/');
}

/** The `?query#hash` tail of a URL, so it survives rewriting. */
function suffixOf(url: string): string {
  const idx = url.search(/[?#]/);
  return idx === -1 ? '' : url.slice(idx);
}

function isPlainObject(v: object): boolean {
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}
