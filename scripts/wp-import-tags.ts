/**
 * WordPress Tag Import — standalone script
 *
 * Imports all WP tags into Supabase inspire_tags,
 * preserving slugs and wpId for later article linking.
 *
 * Usage: npx tsx scripts/wp-import-tags.ts [--dry-run]
 */

import { readFileSync } from 'fs';

// Load .env (or .env.local) manually
import { existsSync } from 'fs';
const envFile = existsSync('.env') ? '.env' : '.env.local';
const envContent = readFileSync(envFile, 'utf-8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx);
  const val = trimmed.slice(eqIdx + 1);
  if (!process.env[key]) process.env[key] = val;
}

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { decode as decodeEntities } from 'he';
import * as schema from '../src/lib/db/schema';

const DATABASE_URL = process.env.DATABASE_URL!;
const WP_BASE = 'https://hellokahwin.com/wp-json/wp/v2';

const DRY_RUN = process.argv.includes('--dry-run');

const sql = postgres(DATABASE_URL);
const db = drizzle(sql, { schema });

interface WPTag {
  id: number;
  name: string;
  slug: string;
  count: number;
}

function log(msg: string) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

async function wpFetchAll<T>(basePath: string): Promise<T[]> {
  const results: T[] = [];
  let page = 1;
  while (true) {
    const sep = basePath.includes('?') ? '&' : '?';
    const url = `${WP_BASE}${basePath}${sep}per_page=100&page=${page}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      if (resp.status === 400) break;
      throw new Error(`WP API ${resp.status}: ${url}`);
    }
    const data = (await resp.json()) as T[];
    if (data.length === 0) break;
    results.push(...data);
    const totalPages = parseInt(resp.headers.get('x-wp-totalpages') || '1', 10);
    log(`  Page ${page}/${totalPages} (${results.length} tags so far)`);
    if (page >= totalPages) break;
    page++;
  }
  return results;
}

async function main() {
  log(`WP Tag Import — dry-run: ${DRY_RUN}`);

  // 1. Fetch all WP tags
  log('Fetching WP tags...');
  const wpTags = await wpFetchAll<WPTag>('/tags?_fields=id,name,slug,count');
  log(`  ${wpTags.length} WP tags fetched`);

  // 2. Load existing Supabase tags
  log('Loading Supabase tags...');
  const sbTags = await db.select().from(schema.inspireTags);
  const sbByWpId = new Map<number, (typeof sbTags)[0]>();
  const sbBySlug = new Map<string, (typeof sbTags)[0]>();
  for (const t of sbTags) {
    if (t.wpId) sbByWpId.set(t.wpId, t);
    sbBySlug.set(t.slug, t);
  }
  log(`  ${sbTags.length} Supabase tags (${sbByWpId.size} with wp_id)`);

  // 3. Import tags
  let created = 0;
  let skipped = 0;

  for (const wpTag of wpTags) {
    const name = decodeEntities(wpTag.name);

    // Already exists?
    if (sbByWpId.has(wpTag.id)) {
      skipped++;
      continue;
    }

    // Resolve slug conflicts — check both local map and DB
    let slug = wpTag.slug;
    const slugExists = async (s: string) => {
      if (sbBySlug.has(s)) return true;
      const [row] = await db
        .select({ id: schema.inspireTags.id })
        .from(schema.inspireTags)
        .where(eq(schema.inspireTags.slug, s))
        .limit(1);
      return !!row;
    };
    if (await slugExists(slug)) {
      slug = `${slug}-wp`;
    }
    if (await slugExists(slug)) {
      slug = `${wpTag.slug}-wp-${wpTag.id}`;
    }

    if (DRY_RUN) {
      log(
        `  [dry] Would create: ${name} (slug=${slug}, wp_id=${wpTag.id}, articles=${wpTag.count})`,
      );
      created++;
      continue;
    }

    const [newTag] = await db
      .insert(schema.inspireTags)
      .values({ name, slug, wpId: wpTag.id })
      .returning();

    // Update local maps
    sbTags.push(newTag);
    sbByWpId.set(wpTag.id, newTag);
    sbBySlug.set(newTag.slug, newTag);
    created++;

    if (created % 100 === 0) {
      log(`  Progress: ${created} tags created`);
    }
  }

  // Summary
  console.log('\n═══════════════════════════════════════');
  console.log('WP Tag Import Summary');
  console.log('═══════════════════════════════════════');
  console.log(`Mode:       ${DRY_RUN ? 'dry-run' : 'live'}`);
  console.log(`Fetched:    ${wpTags.length}`);
  console.log(`Created:    ${created}`);
  console.log(`Skipped:    ${skipped} (already exist)`);
  console.log('═══════════════════════════════════════');

  await sql.end();
  log('Done');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
