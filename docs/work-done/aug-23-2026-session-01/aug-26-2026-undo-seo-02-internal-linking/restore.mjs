// Restore every article body SEO-02 changed, from the recorded pre-state.
//   node .tmp-seo02-undo.mjs <content-before.json>            # dry run
//   node .tmp-seo02-undo.mjs <content-before.json> --commit
import postgres from 'postgres';
import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) throw new Error('usage: node .tmp-seo02-undo.mjs <content-before.json> [--commit]');
const COMMIT = process.argv.includes('--commit');
const rows = JSON.parse(readFileSync(file, 'utf8'));
const enc = encodeURIComponent(process.env.PGPASSWORD);
const sql = postgres(
  `postgresql://postgres.nyidzlupgmyyazhyykuk:${enc}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require`,
  { prepare: false, max: 2 },
);
console.log(`${rows.length} rows to restore`);
for (const r of rows) console.log('  ', r.slug);
if (!COMMIT) {
  console.log('\nDRY RUN — nothing written. Add --commit.');
  await sql.end();
  process.exit(0);
}
await sql.begin(async (tx) => {
  for (const r of rows) {
    // published_at is deliberately NOT restored: SEO-02 never wrote it.
    await tx`update articles set content = ${sql.json(r.content)}, updated_at = now() where id = ${r.id}`;
  }
});
console.log(`restored ${rows.length} rows — now re-run the revalidate + edge purge.`);
await sql.end();
