/**
 * WordPress Category Import — standalone script
 *
 * Imports all editorial WP categories into Supabase inspire_categories,
 * preserving the parent-child hierarchy. Skips vendor/country categories.
 *
 * Usage: npx tsx scripts/wp-import-categories.ts [--dry-run]
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

interface WPCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count: number;
}

// No categories skipped — import everything from WP
const SKIP_WP_IDS = new Set<number>();

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
    if (page >= totalPages) break;
    page++;
  }
  return results;
}

async function main() {
  log(`WP Category Import — dry-run: ${DRY_RUN}`);

  // 1. Fetch all WP categories
  log('Fetching WP categories...');
  const wpCategories = await wpFetchAll<WPCategory>(
    '/categories?_fields=id,name,slug,parent,count',
  );
  log(`  ${wpCategories.length} WP categories fetched`);

  // 2. Filter to editorial categories
  const editorial = wpCategories.filter((c) => !SKIP_WP_IDS.has(c.id));
  log(
    `  ${editorial.length} editorial categories (${wpCategories.length - editorial.length} skipped)`,
  );

  // 3. Load existing Supabase categories
  log('Loading Supabase categories...');
  const sbCategories = await db.select().from(schema.inspireCategories);
  const sbByWpId = new Map<number, (typeof sbCategories)[0]>();
  const sbBySlag = new Map<string, (typeof sbCategories)[0]>();
  for (const c of sbCategories) {
    if (c.wpId) sbByWpId.set(c.wpId, c);
    sbBySlag.set(c.slug, c);
  }
  log(`  ${sbCategories.length} Supabase categories (${sbByWpId.size} with wp_id)`);

  // 4. Build WP parent map
  const wpById = new Map<number, WPCategory>();
  for (const c of editorial) wpById.set(c.id, c);

  // 5. Import categories (parents first, then children)
  // Sort so that top-level (parent=0) comes first, then children
  const sorted = [...editorial].sort((a, b) => {
    const aDepth = getWpDepth(a, wpById);
    const bDepth = getWpDepth(b, wpById);
    return aDepth - bDepth;
  });

  let created = 0;
  let skipped = 0;
  const updated = 0;

  for (const wpCat of sorted) {
    const name = decodeEntities(wpCat.name);

    // Already exists?
    if (sbByWpId.has(wpCat.id)) {
      skipped++;
      continue;
    }

    // Resolve parent
    let parentId: string | null = null;
    if (wpCat.parent && wpCat.parent > 0) {
      const parentSb = sbByWpId.get(wpCat.parent);
      if (parentSb) {
        parentId = parentSb.id;
      } else if (SKIP_WP_IDS.has(wpCat.parent)) {
        // Parent is a skipped category — skip this child too
        log(`  ⏭ Skipping ${name} (parent is excluded)`);
        skipped++;
        continue;
      } else {
        log(
          `  ⚠ Parent not found for ${name} (wp_parent=${wpCat.parent}) — importing as top-level`,
        );
      }
    }

    // Resolve slug conflicts
    let slug = wpCat.slug;
    if (sbBySlag.has(slug)) {
      slug = `${slug}-wp`;
      if (sbBySlag.has(slug)) {
        slug = `${wpCat.slug}-wp-${wpCat.id}`;
      }
    }

    if (DRY_RUN) {
      const parentName = parentId
        ? (sbCategories.find((c) => c.id === parentId)?.name ?? '?')
        : '(top-level)';
      log(
        `  [dry] Would create: ${name} (slug=${slug}, parent=${parentName}, wp_id=${wpCat.id}, articles=${wpCat.count})`,
      );
      created++;
      continue;
    }

    const [newCat] = await db
      .insert(schema.inspireCategories)
      .values({ name, slug, wpId: wpCat.id, parentId, displayOrder: 0 })
      .returning();

    // Update local maps for subsequent children
    sbCategories.push(newCat);
    sbByWpId.set(wpCat.id, newCat);
    sbBySlag.set(newCat.slug, newCat);
    created++;
    log(`  + Created: ${name} (${newCat.slug}, wp_id=${wpCat.id})`);
  }

  // Summary
  console.log('\n═══════════════════════════════════════');
  console.log('WP Category Import Summary');
  console.log('═══════════════════════════════════════');
  console.log(`Mode:       ${DRY_RUN ? 'dry-run' : 'live'}`);
  console.log(`Created:    ${created}`);
  console.log(`Skipped:    ${skipped} (already exist or excluded)`);
  console.log(`Updated:    ${updated}`);
  console.log('═══════════════════════════════════════');

  await sql.end();
  log('Done');
}

function getWpDepth(cat: WPCategory, map: Map<number, WPCategory>): number {
  let depth = 0;
  let current: WPCategory | undefined = cat;
  while (current && current.parent > 0) {
    depth++;
    current = map.get(current.parent);
  }
  return depth;
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
