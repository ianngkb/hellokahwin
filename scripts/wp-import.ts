/**
 * WordPress Article Import — CLI Migration Script
 *
 * Imports published articles from the legacy WordPress site (hellokahwin.com)
 * into the Supabase Inspire module. Handles:
 *   - WP REST API fetching (posts, categories, tags, media)
 *   - Image migration: download full-res originals → upload to R2
 *   - Variant generation (WebP low/medium/high) via Sharp
 *   - Smart crop generation via AWS Rekognition
 *   - HTML → Tiptap JSON conversion via generateJSON()
 *   - Category/tag mapping and auto-creation
 *   - Idempotent re-import (--clean flag)
 *
 * Usage: npx tsx scripts/wp-import.ts [--all] [--dry-run] [--skip-images] [--limit N] [--offset N]
 *        [--local-images <dir>] [--manifest <path>] [--clean] [--skip-smart-crops]
 *
 * --all               Import ALL posts (auto-paginates through entire WP archive)
 * --local-images <d>  Read images from local directory instead of HTTP
 * --manifest <path>   Load WP media manifest JSON (from wp-media-manifest.ts)
 * --clean             Delete existing imported articles before re-importing
 * --skip-smart-crops  Skip smart crop generation (faster testing)
 */

import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { randomUUID } from 'crypto';

// Load .env (Next.js convention here) or .env.local if present; otherwise
// assume env vars are already populated. Values already in process.env win.
const envFile = existsSync('.env') ? '.env' : existsSync('.env.local') ? '.env.local' : null;
if (envFile) {
  const envContent = readFileSync(envFile, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).replace(/^export\s+/, '');
    // Strip surrounding quotes — `KEY="value"` is valid .env syntax, and
    // leaving the quotes on turns DATABASE_URL into an unparseable string.
    let val = trimmed.slice(eqIdx + 1);
    const q = val[0];
    if ((q === '"' || q === "'") && val.length > 1 && val.endsWith(q)) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { decode as decodeEntities } from 'he';
import { generateJSON } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import * as schema from '../src/lib/db/schema';
import { generateVariants, getDefaultPresets } from '../src/lib/storage/image-variants';
import type { ImageVariants } from '../src/lib/storage/image-variants';
import { processSmartCrops } from '../src/lib/storage/smart-crop';
import type { FocalPoint, SmartCrops } from '../src/lib/storage/smart-crop';

// ── Tiptap Extensions (MUST match article-renderer.tsx exactly) ──────────────

const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-caption': { default: null },
      'data-caption-url': { default: null },
    };
  },
});

// MUST match the set in src/components/inspire/article-renderer.tsx. Table*
// is load-bearing, not decoration: generateJSON silently DROPS nodes it has no
// extension for, so importing a WP post containing a <table> (comparison and
// budget posts routinely do) would lose the table with no error to notice.
const extensions = [
  StarterKit,
  CustomImage,
  Link.configure({ openOnClick: false }),
  Underline,
  Table,
  TableRow,
  TableHeader,
  TableCell,
];

// ── Config ───────────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL!;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!;

const WP_BASE = 'https://hellokahwin.com/wp-json/wp/v2';
// The house author every imported article is attributed to. Overridable via
// env; ensureHouseAuthor() below creates the profiles row if it is missing.
const ADMIN_PROFILE_ID = process.env.WP_IMPORT_AUTHOR_ID ?? 'hellokahwin-editorial';
const ADMIN_PROFILE_EMAIL = process.env.WP_IMPORT_AUTHOR_EMAIL ?? 'editorial@hellokahwin.com';

async function ensureHouseAuthor(): Promise<void> {
  const existing = await db
    .select({ id: schema.profiles.id })
    .from(schema.profiles)
    .where(eq(schema.profiles.id, ADMIN_PROFILE_ID))
    .limit(1);
  if (existing.length > 0) return;
  await db.insert(schema.profiles).values({
    id: ADMIN_PROFILE_ID,
    role: 'admin',
    firstName: 'HelloKahwin',
    lastName: null,
    email: ADMIN_PROFILE_EMAIL,
  });
  console.log(`Created house author profile ${ADMIN_PROFILE_ID}`);
}

// ── CLI Args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SKIP_IMAGES = args.includes('--skip-images');
const CLEAN_MODE = args.includes('--clean');
const SKIP_SMART_CROPS = args.includes('--skip-smart-crops');

function getArgValue(flag: string, defaultVal: number): number {
  const idx = args.indexOf(flag);
  if (idx >= 0 && args[idx + 1]) return parseInt(args[idx + 1], 10);
  return defaultVal;
}

function getArgString(flag: string): string | null {
  const idx = args.indexOf(flag);
  if (idx >= 0 && args[idx + 1] && !args[idx + 1].startsWith('--')) return args[idx + 1];
  return null;
}

const IMPORT_ALL = args.includes('--all');
const LIMIT = getArgValue('--limit', IMPORT_ALL ? 100 : 30);
const OFFSET = getArgValue('--offset', 0);
// Paging is page-based (Math.floor(OFFSET / LIMIT)); a non-multiple offset
// would silently import a different range than the operator asked for.
if (OFFSET % LIMIT !== 0) {
  throw new Error(`--offset (${OFFSET}) must be a multiple of --limit (${LIMIT})`);
}
const LOCAL_IMAGES_DIR = getArgString('--local-images');
const MANIFEST_PATH = getArgString('--manifest');

// ── Manifest ────────────────────────────────────────────────────────────────

interface ManifestEntry {
  wpMediaId: number;
  relativePath: string;
  sourceUrl: string;
}

interface InlineImageEntry {
  url: string;
  resolvedPath: string | null;
}

interface Manifest {
  featuredMedia: ManifestEntry[];
  inlineImages: InlineImageEntry[];
}

let manifest: Manifest | null = null;
let manifestMediaById: Map<number, ManifestEntry> | null = null;
let manifestInlineByUrl: Map<string, string> | null = null;

if (MANIFEST_PATH) {
  const raw = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
  manifest = raw as Manifest;
  manifestMediaById = new Map();
  for (const entry of manifest.featuredMedia) {
    manifestMediaById.set(entry.wpMediaId, entry);
  }
  manifestInlineByUrl = new Map();
  for (const entry of manifest.inlineImages) {
    if (entry.resolvedPath) manifestInlineByUrl.set(entry.url, entry.resolvedPath);
  }
}

// ── Clients ──────────────────────────────────────────────────────────────────

const sql = postgres(DATABASE_URL);
const db = drizzle(sql, { schema });
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// ── Types ────────────────────────────────────────────────────────────────────

interface WPPost {
  id: number;
  date: string;
  modified: string;
  slug: string;
  status: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  featured_media: number;
  categories: number[];
  tags: number[];
}

interface WPMedia {
  id: number;
  source_url: string;
  alt_text: string;
  caption: { rendered: string };
  media_details: {
    width: number;
    height: number;
    file: string;
  };
}

interface WPCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count: number;
}

interface WPTag {
  id: number;
  name: string;
  slug: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function log(msg: string) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Normalize WP HTML before Tiptap conversion:
 * - Strip class, srcset, sizes, data-* attributes
 * - Unwrap bare <div> and <figure> wrappers (preserve children)
 * - Strip WP shortcodes
 */
function normalizeWpHtml(html: string): { html: string; strippedShortcodes: string[] } {
  let h = html;

  // Strip class, srcset, sizes, data-* attributes
  h = h.replace(/\s+(class|srcset|sizes|data-[\w-]+)="[^"]*"/gi, '');
  h = h.replace(/\s+(class|srcset|sizes|data-[\w-]+)='[^']*'/gi, '');

  // Unwrap bare <div> wrappers (no semantic meaning in Tiptap)
  h = h.replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, '$1');

  // Extract figcaptions and add as data-caption (+ data-caption-url if linked) on the img, then unwrap <figure>
  h = h.replace(/<figure[^>]*>([\s\S]*?)<\/figure>/gi, (_match, inner: string) => {
    const captionMatch = inner.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i);
    let content = inner.replace(/<figcaption[^>]*>[\s\S]*?<\/figcaption>/gi, '');
    if (captionMatch) {
      const captionHtml = captionMatch[1];
      const captionText = captionHtml.replace(/<[^>]*>/g, '').trim();
      const linkMatch = captionHtml.match(/<a\s+[^>]*href="([^"]*)"[^>]*>/i);
      if (captionText) {
        let attrs = `data-caption="${captionText.replace(/"/g, '&quot;')}"`;
        if (linkMatch?.[1]) {
          attrs += ` data-caption-url="${linkMatch[1].replace(/"/g, '&quot;')}"`;
        }
        content = content.replace(/<img\s/i, `<img ${attrs} `);
      }
    }
    return content;
  });

  // Handle [caption]...[/caption] shortcodes — extract caption text (+ link) and apply as data-caption
  h = h.replace(/\[caption[^\]]*\]([\s\S]*?)\[\/caption\]/gi, (_match, inner: string) => {
    // The inner content typically has <img ...> followed by caption text
    const imgMatch = inner.match(/<img[^>]*>/i);
    if (!imgMatch) return inner;
    const afterImg = inner.replace(/<img[^>]*>/i, '');
    const linkMatch = afterImg.match(/<a\s+[^>]*href="([^"]*)"[^>]*>/i);
    const captionText = afterImg.replace(/<[^>]*>/g, '').trim();
    if (captionText) {
      let attrs = `data-caption="${captionText.replace(/"/g, '&quot;')}"`;
      if (linkMatch?.[1]) {
        attrs += ` data-caption-url="${linkMatch[1].replace(/"/g, '&quot;')}"`;
      }
      const img = imgMatch[0].replace(/<img\s/i, `<img ${attrs} `);
      return img;
    }
    return imgMatch[0];
  });

  // Strip remaining WP shortcodes like [gallery], [embed], etc.
  const strippedShortcodes: string[] = [];
  h = h.replace(/\[(\w+)[^\]]*\](?:[\s\S]*?\[\/\1\])?/g, (match, tag) => {
    strippedShortcodes.push(tag);
    return '';
  });

  return { html: h.trim(), strippedShortcodes };
}

/**
 * Extract all image URLs from HTML string.
 */
function extractImageUrls(html: string): string[] {
  const urls: string[] = [];
  const re = /<img[^>]+src="([^"]+)"/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

/**
 * Strip WP thumbnail dimension suffix to get original full-res URL.
 * e.g., "image-1024x683.jpg" → "image.jpg"
 */
function getOriginalImageUrl(url: string): string | null {
  const stripped = url.replace(/-\d{1,4}x\d{1,4}(\.[a-zA-Z]{3,4})$/, '$1');
  return stripped !== url ? stripped : null;
}

/**
 * Detect content type from buffer magic bytes.
 */
function detectContentType(buffer: Buffer): string {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'image/jpeg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'image/png';
  if (buffer[0] === 0x47 && buffer[1] === 0x49) return 'image/gif';
  if (buffer[0] === 0x52 && buffer[1] === 0x49) return 'image/webp';
  return 'image/jpeg'; // default fallback
}

/**
 * Get file extension from content type.
 */
function getExtFromContentType(ct: string): string {
  if (ct === 'image/jpeg') return 'jpg';
  if (ct === 'image/png') return 'png';
  if (ct === 'image/gif') return 'gif';
  if (ct === 'image/webp') return 'webp';
  return 'jpg';
}

/**
 * Every R2 key written during THIS run. The --clean path deletes the old
 * article prefix after a successful re-import, and when the slug is unchanged
 * (the normal case) that prefix is the SAME one the new images just landed in
 * — without this keep-set the cleanup deletes the images it is meant to
 * preserve and every image on the re-imported article 404s.
 */
const uploadedKeysThisRun = new Set<string>();

/**
 * Register the R2 keys behind a variant / smart-crop record.
 *
 * `uploadToR2` below adds its own keys, but variants and smart crops are
 * written by the storage helpers (`generateVariants`, `processSmartCrops`),
 * which own their own R2 client and know nothing about this script's keep-set.
 * Left unregistered, `deleteR2Prefix` treats every derivative as stale and
 * deletes it moments after it was generated — on a `--clean` re-import with an
 * unchanged slug the originals survive, every variant and crop 404s, and the
 * DB still records their URLs so the whole site renders broken images while
 * looking perfectly healthy in the import summary. Verified 2026-08-22.
 *
 * Crop URLs carry a `?v=<focal>` cache-bust token; `extractKeyFromUrl` strips
 * the query, which is exactly what the ListObjectsV2 comparison needs.
 */
function registerDerivedKeys(record: unknown): void {
  if (!record || typeof record !== 'object') return;
  for (const entry of Object.values(record as Record<string, unknown>)) {
    if (entry && typeof entry === 'object') {
      const { url } = entry as { url?: unknown };
      if (typeof url === 'string' && url.length > 0) {
        const key = r2KeyFromUrl(url);
        if (key) uploadedKeysThisRun.add(key);
      }
    }
  }
}

/**
 * Public R2 URL -> object key.
 *
 * Deliberately NOT `extractKeyFromUrl` from `src/lib/r2/client`. That helper
 * builds its host list in a module-level constant, and ES module imports are
 * evaluated before this script's body — which is where the .env file is read.
 * Imported from here it captures `R2_PUBLIC_URL` as undefined, matches nothing
 * and hands back the whole URL, so the keep-set fills with URLs that can never
 * equal an R2 key and the cleanup deletes the derivatives anyway. This local
 * version closes over the script's own constant, read after env loading.
 */
function r2KeyFromUrl(url: string): string | null {
  const [withoutQuery] = url.split(/[?#]/, 1);
  const base = R2_PUBLIC_URL.replace(/\/+$/, '');
  return withoutQuery.startsWith(base + '/') ? withoutQuery.slice(base.length + 1) : null;
}

/**
 * Upload a buffer to R2 and return the public URL.
 */
async function uploadToR2(key: string, buffer: Buffer, contentType: string): Promise<string> {
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
  uploadedKeysThisRun.add(key);
  return `${R2_PUBLIC_URL}/${key}`;
}

/**
 * Read an image from the local filesystem (for --local-images mode).
 * Falls back to null if the file doesn't exist.
 */
function readLocalImage(relativePath: string): Buffer | null {
  if (!LOCAL_IMAGES_DIR) return null;
  const fullPath = resolve(LOCAL_IMAGES_DIR, relativePath);
  // Guard against path traversal (e.g., ../../.env.local)
  if (!fullPath.startsWith(resolve(LOCAL_IMAGES_DIR))) return null;
  if (!existsSync(fullPath)) return null;
  return readFileSync(fullPath) as Buffer;
}

/**
 * Resolve a WP inline image URL to a local file path using the manifest.
 */
function resolveInlineImagePath(url: string): string | null {
  if (!manifestInlineByUrl) return null;
  return manifestInlineByUrl.get(url) ?? null;
}

/**
 * Delete all R2 objects under a prefix (for --clean idempotent re-import).
 */
async function deleteR2Prefix(prefix: string): Promise<number> {
  let deleted = 0;
  let continuationToken: string | undefined;
  // Never delete what this run just wrote — see uploadedKeysThisRun.

  do {
    const listResp = await r2.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    const objects = listResp.Contents;
    if (!objects || objects.length === 0) break;

    const stale = objects.filter((o) => o.Key && !uploadedKeysThisRun.has(o.Key));
    if (stale.length > 0) {
      await r2.send(
        new DeleteObjectsCommand({
          Bucket: R2_BUCKET_NAME,
          Delete: { Objects: stale.map((o) => ({ Key: o.Key })) },
        }),
      );
    }

    deleted += stale.length;
    continuationToken = listResp.IsTruncated ? listResp.NextContinuationToken : undefined;
  } while (continuationToken);

  return deleted;
}

/**
 * Download image from URL with retries.
 */
async function downloadImage(url: string, retries = 3): Promise<Buffer | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        if (resp.status === 404) return null;
        throw new Error(`HTTP ${resp.status}`);
      }
      return Buffer.from(await resp.arrayBuffer());
    } catch (err: any) {
      if (i === retries - 1) {
        log(`  ⚠ Failed to download image after ${retries} attempts: ${url} — ${err.message}`);
        return null;
      }
      // Exponential backoff: 1s, 2s, 4s
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
  return null;
}

/**
 * Fetch from WP REST API with retry logic.
 */
async function wpFetch<T>(path: string, retries = 3): Promise<T> {
  const url = `${WP_BASE}${path}`;
  for (let i = 0; i < retries; i++) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`WP API ${resp.status}: ${url}`);
      return (await resp.json()) as T;
    } catch (err: any) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
  throw new Error('Unreachable');
}

/**
 * Fetch all pages of a WP REST API endpoint.
 */
async function wpFetchAll<T>(basePath: string): Promise<T[]> {
  const results: T[] = [];
  let page = 1;
  while (true) {
    const sep = basePath.includes('?') ? '&' : '?';
    const url = `${WP_BASE}${basePath}${sep}per_page=100&page=${page}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      if (resp.status === 400) break; // past last page
      throw new Error(`WP API ${resp.status}: ${url}`);
    }
    const data = (await resp.json()) as T[];
    if (data.length === 0) break;
    results.push(...data);
    const totalPages = parseInt(resp.headers.get('x-wp-totalpages') || '1', 10);
    if (page >= totalPages) break;
    page++;
  }
  return results;
}

// ── Summary Counters ─────────────────────────────────────────────────────────

const stats = {
  fetched: 0,
  imported: 0,
  skipped: 0,
  cleaned: 0,
  failed: 0,
  coverImages: 0,
  inlineImages: 0,
  variantsGenerated: 0,
  smartCropsGenerated: 0,
  tagsCreated: 0,
  tagsReused: 0,
  categoriesCreated: 0,
  categoriesUnmapped: 0,
  localImageHits: 0,
  localImageMisses: 0,
  errors: [] as string[],
};

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log(
    `Starting WP import — ${IMPORT_ALL ? 'ALL posts' : `limit: ${LIMIT}, offset: ${OFFSET}`}, dry-run: ${DRY_RUN}, skip-images: ${SKIP_IMAGES}, clean: ${CLEAN_MODE}`,
  );
  if (LOCAL_IMAGES_DIR) log(`  Local images: ${LOCAL_IMAGES_DIR}`);
  if (MANIFEST_PATH)
    log(
      `  Manifest: ${MANIFEST_PATH} (${manifest?.featuredMedia.length ?? 0} media, ${manifest?.inlineImages.length ?? 0} inline)`,
    );
  if (SKIP_SMART_CROPS) log(`  Smart crops: SKIPPED`);

  // Every imported article is attributed to the house author — make sure the
  // profiles row exists before the first insert (FK on articles.author_id).
  if (!DRY_RUN) await ensureHouseAuthor();

  // Pre-load variant presets
  const variantPresets = await getDefaultPresets();

  // ── 1. Pre-fetch WP categories (full tree) ──────────────────────────────

  log('Fetching WP categories...');
  const wpCategories = await wpFetchAll<WPCategory>(
    '/categories?_fields=id,name,slug,parent,count',
  );
  const wpCategoryMap = new Map<number, WPCategory>();
  for (const c of wpCategories) wpCategoryMap.set(c.id, c);
  log(`  ${wpCategories.length} WP categories fetched`);

  // ── 2. Build Supabase category map (wp_id → row) ────────────────────────

  log('Loading Supabase categories...');
  const sbCategories = await db.select().from(schema.inspireCategories);
  const sbCategoryByWpId = new Map<number, (typeof sbCategories)[0]>();
  for (const c of sbCategories) {
    if (c.wpId) sbCategoryByWpId.set(c.wpId, c);
  }
  log(`  ${sbCategories.length} Supabase categories (${sbCategoryByWpId.size} with wp_id)`);

  // ── 3. Build Supabase tag map (wp_id → row) ─────────────────────────────

  log('Loading Supabase tags...');
  const sbTags = await db.select().from(schema.inspireTags);
  const sbTagByWpId = new Map<number, (typeof sbTags)[0]>();
  for (const t of sbTags) {
    if (t.wpId) sbTagByWpId.set(t.wpId, t);
  }
  log(`  ${sbTags.length} Supabase tags (${sbTagByWpId.size} with wp_id)`);

  // ── 4. Ensure category exists (with auto-create for unmapped sub-cats) ──

  async function ensureCategory(wpCatId: number): Promise<string | null> {
    // Already in Supabase?
    const existing = sbCategoryByWpId.get(wpCatId);
    if (existing) return existing.id;

    // Look up in WP tree
    const wpCat = wpCategoryMap.get(wpCatId);
    if (!wpCat) {
      stats.categoriesUnmapped++;
      return null;
    }

    // Find parent in Supabase
    let parentId: string | null = null;
    if (wpCat.parent && wpCat.parent > 0) {
      const parentSb = sbCategoryByWpId.get(wpCat.parent);
      if (parentSb) {
        parentId = parentSb.id;
      } else {
        // Try to recursively ensure parent
        parentId = await ensureCategory(wpCat.parent);
      }
    }

    if (!parentId && wpCat.parent && wpCat.parent > 0) {
      // Parent not found in WP or Supabase
      log(
        `  ⚠ Cannot find parent for WP category ${wpCat.name} (wp_id=${wpCatId}, parent=${wpCat.parent})`,
      );
      stats.categoriesUnmapped++;
      return null;
    }

    // Check slug conflict
    let slug = wpCat.slug;
    const slugConflict = sbCategories.find((c) => c.slug === slug);
    if (slugConflict) slug = `${slug}-wp`;

    if (DRY_RUN) {
      log(`  [dry] Would create category: ${wpCat.name} (slug=${slug}, parent=${parentId})`);
      stats.categoriesCreated++;
      return `dry-run-cat-${wpCatId}`;
    }

    // Auto-create the category
    const [newCat] = await db
      .insert(schema.inspireCategories)
      .values({
        // WP serves entity-encoded names ("Hiasan &amp; Dekorasi") — decode.
        name: decodeEntities(wpCat.name),
        slug,
        wpId: wpCat.id,
        parentId,
        displayOrder: 0,
      })
      .returning();

    // Update local maps
    sbCategories.push(newCat);
    sbCategoryByWpId.set(wpCat.id, newCat);
    stats.categoriesCreated++;
    log(`  + Created category: ${newCat.name} (${newCat.id})`);
    return newCat.id;
  }

  // ── 5. Ensure tag exists ────────────────────────────────────────────────

  async function ensureTag(wpTag: WPTag): Promise<string> {
    const existing = sbTagByWpId.get(wpTag.id);
    if (existing) {
      stats.tagsReused++;
      return existing.id;
    }

    if (DRY_RUN) {
      log(`  [dry] Would create tag: ${wpTag.name} (slug=${wpTag.slug})`);
      stats.tagsCreated++;
      return `dry-run-tag-${wpTag.id}`;
    }

    // Check slug conflict
    let slug = wpTag.slug;
    const conflict = sbTags.find((t) => t.slug === slug);
    if (conflict) slug = `${slug}-wp`;

    const [newTag] = await db
      .insert(schema.inspireTags)
      .values({
        name: decodeEntities(wpTag.name),
        slug,
        wpId: wpTag.id,
      })
      .returning();

    sbTags.push(newTag);
    sbTagByWpId.set(wpTag.id, newTag);
    stats.tagsCreated++;
    log(`  + Created tag: ${newTag.name} (${newTag.id})`);
    return newTag.id;
  }

  // ── 6. Resolve slug conflicts ───────────────────────────────────────────

  async function resolveSlug(slug: string, wpId: number): Promise<string> {
    const [existing] = await db
      .select({ id: schema.articles.id })
      .from(schema.articles)
      .where(eq(schema.articles.slug, slug))
      .limit(1);
    if (!existing) return slug;

    const wpSlug = `${slug}-wp`;
    const [existing2] = await db
      .select({ id: schema.articles.id })
      .from(schema.articles)
      .where(eq(schema.articles.slug, wpSlug))
      .limit(1);
    if (!existing2) return wpSlug;

    return `${slug}-wp-${wpId}`;
  }

  // ── 7. Fetch WP posts ──────────────────────────────────────────────────

  let allPosts: WPPost[] = [];

  if (IMPORT_ALL) {
    log('Fetching ALL WP posts (paginating through entire archive)...');
    let page = 1;
    let totalPages = 1;
    while (page <= totalPages) {
      const url = `/posts?per_page=100&page=${page}&orderby=date&order=desc&status=publish`;
      const resp = await fetch(`${WP_BASE}${url}`);
      if (!resp.ok) {
        if (resp.status === 400) break;
        throw new Error(`WP API ${resp.status}: ${url}`);
      }
      const data = (await resp.json()) as WPPost[];
      if (data.length === 0) break;
      allPosts.push(...data);
      totalPages = parseInt(resp.headers.get('x-wp-totalpages') || '1', 10);
      log(`  Page ${page}/${totalPages}: ${data.length} posts (${allPosts.length} total so far)`);
      page++;
    }
    log(`  Fetched ${allPosts.length} total posts`);
  } else {
    log('Fetching WP posts...');
    const wpPage = Math.floor(OFFSET / LIMIT) + 1;
    const data = await wpFetch<WPPost[]>(
      `/posts?per_page=${LIMIT}&page=${wpPage}&orderby=date&order=desc&status=publish`,
    );
    allPosts = data;
    log(`  Fetched ${allPosts.length} posts (page ${wpPage})`);
  }

  stats.fetched = allPosts.length;

  // ── 8. Process each article ────────────────────────────────────────────

  for (let i = 0; i < allPosts.length; i++) {
    const post = allPosts[i];
    const title = decodeEntities(post.title.rendered);
    log(`\n[${i + 1}/${allPosts.length}] Processing: ${title} (wp_id=${post.id})`);

    // Track old R2 prefix for deferred cleanup after successful re-import
    let cleanupR2Prefix: string | null = null;

    try {
      // a. DEDUP CHECK / CLEAN
      const [existingArticle] = await db
        .select({ id: schema.articles.id, slug: schema.articles.slug })
        .from(schema.articles)
        .where(eq(schema.articles.wpId, post.id))
        .limit(1);

      if (existingArticle) {
        if (CLEAN_MODE) {
          // Delete DB row now (to allow re-import); defer R2 cleanup until after success
          if (!DRY_RUN) {
            cleanupR2Prefix = `inspire/${existingArticle.slug}/`;
            await db.delete(schema.articles).where(eq(schema.articles.id, existingArticle.id));
            log(
              `  🧹 Deleted DB row for wp_id=${post.id}, R2 cleanup deferred until re-import succeeds`,
            );
          } else {
            log(`  [dry] Would clean existing article (wp_id=${post.id})`);
          }
          stats.cleaned++;
        } else {
          log(`  ⏭ Skipping (already imported, wp_id=${post.id})`);
          stats.skipped++;
          continue;
        }
      }

      // a2. PRE-GENERATE UUID
      const articleId = randomUUID();

      // b. CATEGORY MAPPING
      const categoryIds: string[] = [];
      for (const wpCatId of post.categories) {
        const catId = await ensureCategory(wpCatId);
        if (catId) categoryIds.push(catId);
      }

      if (categoryIds.length === 0) {
        log(`  ✗ No categories mapped — skipping article`);
        stats.failed++;
        stats.errors.push(`${title}: No categories mapped`);
        continue;
      }

      const primaryCategoryId = categoryIds[0];

      // c. TAG MAPPING
      const tagIds: string[] = [];
      if (post.tags.length > 0) {
        const wpTagDetails = await wpFetch<WPTag[]>(
          `/tags?include=${post.tags.join(',')}&_fields=id,name,slug`,
        );
        for (const wpTag of wpTagDetails) {
          const tagId = await ensureTag(wpTag);
          tagIds.push(tagId);
        }
      }

      // d. FEATURED IMAGE + VARIANTS + SMART CROPS
      let coverImageUrl: string | null = null;
      let coverImageVariants: ImageVariants | null = null;
      let coverImageQuality: string | null = null;
      let coverImageFocalPoint: FocalPoint | null = null;
      let coverImageDetectionData: object | null = null;
      let coverImageSmartCrops: SmartCrops | null = null;

      if (post.featured_media > 0 && !SKIP_IMAGES) {
        try {
          const media = await wpFetch<WPMedia>(
            `/media/${post.featured_media}?_fields=id,source_url,alt_text,caption,media_details`,
          );

          // Try local filesystem first (via manifest), then fall back to HTTP
          let imgBuffer: Buffer | null = null;

          if (LOCAL_IMAGES_DIR && manifestMediaById) {
            const manifestEntry = manifestMediaById.get(media.id);
            if (manifestEntry) {
              imgBuffer = readLocalImage(manifestEntry.relativePath);
              if (imgBuffer) {
                stats.localImageHits++;
                log(
                  `  📁 Cover from local: ${manifestEntry.relativePath} (${(imgBuffer.length / 1024).toFixed(0)}KB)`,
                );
              }
            }
          }

          if (!imgBuffer) {
            imgBuffer = await downloadImage(media.source_url);
            if (imgBuffer) stats.localImageMisses++;
          }

          if (imgBuffer) {
            const ct = detectContentType(imgBuffer);
            const ext = getExtFromContentType(ct);
            log(`  Cover: ${(imgBuffer.length / 1024).toFixed(0)}KB ${ct}`);

            const key = `inspire/${post.slug}/${Date.now()}-cover.${ext}`;

            if (!DRY_RUN) {
              coverImageUrl = await uploadToR2(key, imgBuffer, ct);

              // Generate variants
              try {
                coverImageVariants = await generateVariants(imgBuffer, key, variantPresets);
                registerDerivedKeys(coverImageVariants);
                coverImageQuality = 'high';
                stats.variantsGenerated++;
                log(`  ✓ Variants generated`);
              } catch (err: any) {
                log(`  ⚠ Variant generation failed: ${err.message}`);
                stats.errors.push(`${title}: Variant gen failed — ${err.message}`);
              }

              // Generate smart crops
              if (!SKIP_SMART_CROPS) {
                try {
                  const cropResult = await processSmartCrops(key, { originalBuffer: imgBuffer });
                  coverImageFocalPoint = cropResult.focalPoint;
                  coverImageDetectionData = cropResult.detectionData;
                  coverImageSmartCrops = cropResult.smartCrops;
                  registerDerivedKeys(coverImageSmartCrops);
                  stats.smartCropsGenerated++;
                  log(`  ✓ Smart crops generated (method: ${cropResult.focalPoint.method})`);
                } catch (err: any) {
                  log(`  ⚠ Smart crop generation failed: ${err.message}`);
                  stats.errors.push(`${title}: Smart crop failed — ${err.message}`);
                }
              }
            } else {
              coverImageUrl = `${R2_PUBLIC_URL}/${key}`;
              log(`  [dry] Would upload cover image + generate variants/crops: ${key}`);
            }
            stats.coverImages++;
          }
        } catch (err: any) {
          log(`  ⚠ Failed to process featured image: ${err.message}`);
          stats.errors.push(`${title}: Featured image failed — ${err.message}`);
        }

        // Rate limit between articles for Rekognition
        if (!SKIP_SMART_CROPS && !DRY_RUN) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }

      // e. CONTENT CONVERSION
      let contentHtml = post.content.rendered || '';

      // Normalize HTML
      const { html: normalizedHtml, strippedShortcodes } = normalizeWpHtml(contentHtml);
      contentHtml = normalizedHtml;

      if (strippedShortcodes.length > 0) {
        log(`  ⚠ Stripped shortcodes: [${strippedShortcodes.join(', ')}]`);
      }

      // Process inline images
      let inlineImageCount = 0;
      if (!SKIP_IMAGES) {
        const imgUrls = extractImageUrls(contentHtml);

        for (const imgUrl of imgUrls) {
          let imgBuffer: Buffer | null = null;

          // Try local filesystem first (via manifest)
          if (LOCAL_IMAGES_DIR) {
            const resolvedPath = resolveInlineImagePath(imgUrl);
            if (resolvedPath) {
              imgBuffer = readLocalImage(resolvedPath);
              if (imgBuffer) {
                stats.localImageHits++;
                log(
                  `  📁 Inline from local: ${resolvedPath} (${(imgBuffer.length / 1024).toFixed(0)}KB)`,
                );
              }
            }
          }

          // Fall back to HTTP: try original full-res first, then thumbnail
          if (!imgBuffer) {
            if (LOCAL_IMAGES_DIR) stats.localImageMisses++;
            const originalUrl = getOriginalImageUrl(imgUrl);
            if (originalUrl) {
              imgBuffer = await downloadImage(originalUrl);
              if (imgBuffer) {
                log(`  ↑ Using full-res original (${(imgBuffer.length / 1024).toFixed(0)}KB)`);
              }
            }
          }
          if (!imgBuffer) {
            imgBuffer = await downloadImage(imgUrl);
          }

          if (!imgBuffer) {
            log(`  ⚠ Broken inline image: ${imgUrl}`);
            stats.errors.push(`${title}: Broken inline image — ${imgUrl}`);
            // Remove the broken image from HTML
            contentHtml = contentHtml.replace(
              new RegExp(
                `<img[^>]+src="${imgUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`,
                'g',
              ),
              '',
            );
            continue;
          }

          const ct = detectContentType(imgBuffer);
          const ext = getExtFromContentType(ct);

          // Generate a filename from the URL
          const urlPath = new URL(imgUrl).pathname;
          const filename =
            urlPath
              .split('/')
              .pop()
              ?.replace(/\.[^.]+$/, '') || 'image';
          const sanitizedName = filename.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
          const key = `inspire/${post.slug}/${Date.now()}-${sanitizedName}.${ext}`;

          if (!DRY_RUN) {
            // Upload original
            await uploadToR2(key, imgBuffer, ct);

            // Generate variants for inline images and use high quality URL
            try {
              const inlineVariants = await generateVariants(imgBuffer, key, variantPresets);
              registerDerivedKeys(inlineVariants);
              const highUrl = inlineVariants.high?.url;
              if (highUrl) {
                contentHtml = contentHtml.split(imgUrl).join(highUrl);
              } else {
                contentHtml = contentHtml.split(imgUrl).join(`${R2_PUBLIC_URL}/${key}`);
              }
            } catch {
              // Fallback to original URL if variant gen fails
              contentHtml = contentHtml.split(imgUrl).join(`${R2_PUBLIC_URL}/${key}`);
            }
          } else {
            log(`  [dry] Would upload inline image + variants: ${key}`);
          }

          inlineImageCount++;
          stats.inlineImages++;
        }
      }

      // Convert HTML → Tiptap JSON
      let tiptapJson: unknown;
      if (contentHtml.trim()) {
        try {
          tiptapJson = generateJSON(contentHtml, extensions);
        } catch (err: any) {
          log(`  ⚠ Tiptap conversion failed: ${err.message}`);
          tiptapJson = { type: 'doc', content: [{ type: 'paragraph' }] };
          stats.errors.push(`${title}: Tiptap conversion failed — ${err.message}`);
        }
      } else {
        tiptapJson = { type: 'doc', content: [{ type: 'paragraph' }] };
        log(`  ⚠ Empty content`);
      }

      // Prepare fields
      const excerpt = decodeEntities(stripHtmlTags(post.excerpt.rendered))
        .replace(/Continue reading.*$/i, '')
        .trim();
      const slug = await resolveSlug(post.slug, post.id);
      // Store the clean (already entity-decoded) title as meta_title WITHOUT a
      // brand suffix — the article page strips brand + the root title.template
      // appends the single " | The Wedding Notebook". The old
      // `${title} | The Wedding Notebook`.slice(0, 70) truncated mid-brand and
      // produced doubled/garbled titles at render. meta_description is the
      // decoded excerpt.
      const metaTitle = title;
      const metaDescription = excerpt.slice(0, 160);

      // f. ARTICLE INSERT (in transaction)
      if (DRY_RUN) {
        log(`  [dry] Would insert article: ${title}`);
        log(`    slug=${slug}, categories=${categoryIds.length}, tags=${tagIds.length}`);
        log(`    cover=${coverImageUrl ? 'yes' : 'no'}, inline_images=${inlineImageCount}`);
        stats.imported++;
        continue;
      }

      await db.transaction(async (tx) => {
        // Insert article
        await tx.insert(schema.articles).values({
          id: articleId,
          title,
          slug,
          excerpt: excerpt || null,
          content: tiptapJson,
          coverImageUrl,
          coverImageVariants,
          coverImageQuality,
          coverImageFocalPoint,
          coverImageDetectionData,
          coverImageSmartCrops,
          metaTitle,
          metaDescription,
          status: 'published',
          authorId: ADMIN_PROFILE_ID,
          primaryCategoryId,
          publishedAt: new Date(post.date),
          wpId: post.id,
          createdAt: new Date(post.date),
          updatedAt: new Date(post.modified),
        });

        // Insert article_categories junction records
        for (const catId of categoryIds) {
          await tx.insert(schema.articleCategories).values({
            articleId,
            categoryId: catId,
          });
        }

        // Insert article_tags junction records
        for (const tagId of tagIds) {
          await tx.insert(schema.articleTags).values({
            articleId,
            tagId,
          });
        }
      });

      // Clean up old R2 objects after successful re-import
      if (cleanupR2Prefix) {
        try {
          const deletedCount = await deleteR2Prefix(cleanupR2Prefix);
          log(`  🧹 Cleaned ${deletedCount} old R2 objects from previous import`);
        } catch (err: any) {
          log(`  ⚠ R2 cleanup failed (orphaned objects at ${cleanupR2Prefix}): ${err.message}`);
        }
      }

      stats.imported++;
      log(
        `  ✓ Imported: ${title} (${inlineImageCount + (coverImageUrl ? 1 : 0)} images, ${categoryIds.length} categories, ${tagIds.length} tags)`,
      );
    } catch (err: any) {
      const pgCode = err.code ? ` [PG:${err.code}]` : '';
      const pgDetail = err.detail ? ` detail=${err.detail}` : '';
      const shortMsg = (err.message || 'Unknown error').split('\n')[0].slice(0, 300);
      log(`  ✗ Failed: ${title}${pgCode}${pgDetail}`);
      log(`    Error: ${shortMsg}`);
      if (err.cause) {
        const c = err.cause;
        log(`    Cause: [${c.code || 'no-code'}] ${c.message?.slice(0, 300) || c}`);
        if (c.detail) log(`    Detail: ${c.detail}`);
        if (c.hint) log(`    Hint: ${c.hint}`);
        if (c.constraint_name) log(`    Constraint: ${c.constraint_name}`);
      }
      if (cleanupR2Prefix) {
        log(
          `  ⚠ WARNING: DB row was deleted in clean mode but re-import failed. Old R2 objects at ${cleanupR2Prefix} are orphaned.`,
        );
      }
      stats.failed++;
      stats.errors.push(`${title}${pgCode}: ${shortMsg}`);
    }
  }

  // ── 9. Summary Report ──────────────────────────────────────────────────

  console.log('\n');
  console.log('═══════════════════════════════════════');
  console.log('WP Import Summary');
  console.log('═══════════════════════════════════════');
  console.log(`Mode:              ${DRY_RUN ? 'dry-run' : 'live'}${CLEAN_MODE ? ' (clean)' : ''}`);
  console.log(`Posts fetched:     ${stats.fetched}`);
  console.log(`Imported:          ${stats.imported}`);
  console.log(`Skipped (dedup):   ${stats.skipped}`);
  console.log(`Cleaned:           ${stats.cleaned}`);
  console.log(`Failed:            ${stats.failed}`);
  console.log('───────────────────────────────────────');
  console.log(`Images uploaded:   ${stats.coverImages + stats.inlineImages}`);
  console.log(`  Cover images:    ${stats.coverImages}`);
  console.log(`  Inline images:   ${stats.inlineImages}`);
  console.log(`Variants generated:    ${stats.variantsGenerated}`);
  console.log(`Smart crops generated: ${stats.smartCropsGenerated}`);
  if (LOCAL_IMAGES_DIR) {
    console.log(`Local image hits:  ${stats.localImageHits}`);
    console.log(`Local image misses: ${stats.localImageMisses}`);
  }
  console.log('───────────────────────────────────────');
  console.log(`Tags created:      ${stats.tagsCreated}`);
  console.log(`Tags reused:       ${stats.tagsReused}`);
  console.log(`Categories created:   ${stats.categoriesCreated}`);
  console.log(`Categories unmapped:  ${stats.categoriesUnmapped}`);
  console.log('───────────────────────────────────────');
  if (stats.errors.length > 0) {
    console.log('Errors:');
    for (const e of stats.errors) {
      console.log(`  - ${e}`);
    }
  } else {
    console.log('Errors: none');
  }
  console.log('═══════════════════════════════════════');

  // Cleanup
  await sql.end();
  log('Done');
}

// ── Run ──────────────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
