/**
 * UNDO part 2 — put the kursus-kahwin `content` back, byte for byte, from the
 * snapshot taken before the swap.
 *
 * Requires `--yes-really`. Without it, it reports what it would do.
 */
import fs from 'node:fs';
import postgres from 'postgres';

// The snapshot lives in two places: the session scratch dir, and the committed
// evidence folder. Prefer whichever exists — the scratch dir does not survive.
const SNAP = [
  'docs/work-done/2026-08-26-publish-staged-five-EVIDENCE/kursus-kahwin.BEFORE.json',
  '.tmp-ops/pub5/kursus.BEFORE.json',
].find((f) => fs.existsSync(f));
if (!SNAP) throw new Error('no kursus-kahwin.BEFORE.json snapshot found');
const snap = JSON.parse(fs.readFileSync(SNAP, 'utf8'));
console.log('snapshot from:', SNAP);
const url = fs
  .readFileSync('.env', 'utf8')
  .match(/^DATABASE_URL=(.*)$/m)[1]
  .trim()
  .replace(/^["']|["']$/g, '');
const sql = postgres(url, { prepare: false, max: 1 });
const go = process.argv.includes('--yes-really');

const [live] = await sql`
  select id, jsonb_typeof(content) t, length(content::text) len,
         jsonb_array_length(content->'content') blocks, updated_at
    from articles where slug='kursus-kahwin'`;
if (!live) throw new Error('no row at slug kursus-kahwin');
if (live.id !== snap.id)
  throw new Error(`row id is ${live.id}, snapshot is ${snap.id} — WRONG ROW, stop`);

const target = JSON.parse(snap.content_text);

// ── THE ROW MOVED UNDER US ONCE ALREADY, SO CHECK BEFORE CLOBBERING ────────
//
// At 18:01:59Z on 26 Aug, four minutes after this run's swap, the SEO-02
// internal-linking session added five editorial links to this same row (blocks
// 11, 69 and 73). Restoring the snapshot blindly would delete that work along
// with the fee table. So: compare the live document to what THIS run wrote,
// ignoring jsonb key-order normalisation, and refuse unless told twice.
const mineFile = [
  'docs/work-done/2026-08-26-publish-staged-five-EVIDENCE/kursus-kahwin.AFTER.json',
  '.tmp-ops/pub5/kursus.AFTER-preview.json',
].find((f) => fs.existsSync(f));
if (mineFile) {
  const norm = (v) =>
    Array.isArray(v)
      ? v.map(norm)
      : v && typeof v === 'object'
        ? Object.fromEntries(
            Object.keys(v)
              .sort()
              .map((k) => [k, norm(v[k])]),
          )
        : v;
  const [full] = await sql`select content::text ct from articles where id = ${snap.id}`;
  const now = JSON.parse(full.ct);
  const mine = JSON.parse(fs.readFileSync(mineFile, 'utf8'));
  const moved = [];
  for (let i = 0; i < Math.max(now.content.length, mine.content.length); i++)
    if (JSON.stringify(norm(mine.content[i])) !== JSON.stringify(norm(now.content[i])))
      moved.push(i);
  if (moved.length) {
    console.log(
      `\n⚠ ${moved.length} block(s) differ from what this run wrote: ${moved.join(', ')}`,
    );
    console.log('  Someone else has edited this row since. A blind restore DELETES their work.');
    if (!process.argv.includes('--i-know-it-moved')) {
      console.log('  Refusing. Re-run with --i-know-it-moved once you have decided that is right.');
      await sql.end();
      process.exit(4);
    }
  } else {
    console.log('live document is exactly what this run wrote — no third-party edits to lose.');
  }
}
console.log(
  'live now    :',
  live.t,
  live.len,
  'bytes,',
  live.blocks,
  'blocks, updated_at',
  live.updated_at.toISOString(),
);
console.log(
  'snapshot    :',
  snap.t,
  snap.content_text.length,
  'bytes,',
  target.content.length,
  'blocks, updated_at',
  snap.updated_at,
);
if (live.len === snap.content_text.length && live.blocks === target.content.length)
  console.log('NOTE: the row already looks like the snapshot — the swap may not have run.');

if (!go) {
  console.log('\nDRY RUN — pass --yes-really to write.');
  await sql.end();
  process.exit(0);
}

const [row] = await sql`
  update articles set content = ${sql.json(target)}::jsonb, updated_at = now()
   where id = ${snap.id}
  returning id, jsonb_typeof(content) t`;
console.log('\nRESTORED', JSON.stringify(row));

const [chk] = await sql`
  select jsonb_typeof(content) t, jsonb_array_length(content->'content') blocks,
         length(content::text) len, content::text = ${snap.content_text} as byte_identical
    from articles where id = ${snap.id}`;
console.log('VERIFY', JSON.stringify(chk));
if (chk.t !== 'object') throw new Error('shape is not object after restore');
await sql.end();
