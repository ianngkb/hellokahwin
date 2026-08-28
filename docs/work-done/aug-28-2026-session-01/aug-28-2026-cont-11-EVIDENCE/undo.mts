/**
 * UNDO for CONT-11 — restore `adat-hantaran-ikut-keluarga`'s title and
 * meta_description exactly as they were before the target-keyword retarget
 * (`adat hantaran` -> `adat hantaran kahwin`) on 29 Ogos 2026.
 *
 * Only two scalar columns changed: title, meta_description. content, excerpt,
 * meta_title (already null), published_at and every media row are untouched.
 *
 * COPY THIS FILE INTO A WORKTREE THAT HAS `postgres` IN node_modules before
 * running (mirrors CONT-12's undo.mts, docs/work-done/aug-28-2026-session-01/
 * aug-28-2026-cont-12-EVIDENCE/undo.mts). Run from the site repo, whose .env
 * holds the production DATABASE_URL.
 *
 *   npx tsx undo.mts            # dry run, prints what it would restore
 *   npx tsx undo.mts --commit   # writes
 */
import postgres from 'postgres';
import fs from 'node:fs';
import path from 'node:path';

const EVIDENCE = process.env.CONT11_EVIDENCE ?? 'C:/Users/Ian Ng/Documents/Code/hellokahwin/hellokahwin/docs/work-done/aug-28-2026-session-01/aug-28-2026-cont-11-EVIDENCE';
const SLUG = 'adat-hantaran-ikut-keluarga';
const commit = process.argv.includes('--commit');

const env = fs.readFileSync('.env', 'utf8');
const url = env.split('\n').find((l) => l.startsWith('DATABASE_URL='))!
  .slice('DATABASE_URL='.length).replace(/^"|"$/g, '').trim();

const fields = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'adat-hantaran-fields-BEFORE.json'), 'utf8'));

const sql = postgres(url, { ssl: 'require', prepare: false, max: 1 });
const [now]: any = await sql`select id, title, meta_description from articles where slug=${SLUG}`;
console.log('current :', now.title);
console.log('         ', now.meta_description);
console.log('restore :', fields.title);
console.log('         ', fields.meta_description);

if (!commit) {
  console.log('\nDRY RUN. Re-run with --commit to write.');
  await sql.end();
  process.exit(0);
}

await sql`update articles set
    title = ${fields.title},
    meta_description = ${fields.meta_description},
    updated_at = now()
  where slug = ${SLUG}`;

const [after]: any = await sql`select title, meta_description, published_at from articles where slug=${SLUG}`;
console.log('\nrestored:', after.title);
console.log('          ', after.meta_description);
console.log('published_at:', after.published_at.toISOString(), `(expect ${fields.published_at})`);
await sql.end();
