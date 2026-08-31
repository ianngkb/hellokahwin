#!/usr/bin/env node
// RIGHTS-03 — take the two INSTITUTIONAL images down from live production.
//
// Decision 167, 30 August 2026: "the Getty/iStock image and the press
// photograph belong to INSTITUTIONS, not to photographers who know us.
// Photographers have good relationships with us is not an argument that reaches
// Getty. Those two come down, with UNDO pushed first."
//
//   node scripts/rights/rights03-takedown.mjs --dry-run
//   node scripts/rights/rights03-takedown.mjs --go
//   node scripts/rights/rights03-takedown.mjs --go --only kursus-kahwin
//
// IT REFUSES TO RUN UNTIL THE UNDO IS COMMITTED AND PUSHED. Not "written" —
// pushed. A recovery file that exists only in a working tree is the same as no
// recovery file, and this is a production delete with an institution on the
// other end of it.
//
// Order: article body -> legacy redirect -> media rows -> R2 objects -> cache
// purge. The R2 delete is LAST because it is the only step the database cannot
// describe afterwards.
import { execFileSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { sql, s3, ENV, TARGETS, DeleteObjectCommand, revalidate } from './rights03-lib.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const UNDO = 'docs/work-done/sep-01-2026-session-01/sep-01-2026-rights-03-UNDO.sql';
const args = process.argv.slice(2);
const DRY = !args.includes('--go');
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const targets = TARGETS.filter((t) => !only || t.slug === only);
if (!targets.length) { console.error(`--only ${only} matched no target`); process.exit(2); }

function assertUndoPushed() {
  const git = (a) => execFileSync('git', a, { cwd: REPO, encoding: 'utf8' }).trim();
  const dirty = git(['status', '--porcelain', '--', UNDO]);
  if (dirty) throw new Error(`${UNDO} is uncommitted (${dirty.trim()}). Commit and push it BEFORE the delete.`);
  const head = git(['rev-parse', 'HEAD']);
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  let remote;
  try { remote = git(['rev-parse', `origin/${branch}`]); }
  catch { throw new Error(`origin/${branch} does not exist — the UNDO has not been pushed.`); }
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', head, remote], { cwd: REPO, stdio: 'ignore' });
  } catch {
    throw new Error(
      `HEAD ${head.slice(0, 8)} is not on origin/${branch} (which is at ${remote.slice(0, 8)}).
` +
      `The UNDO is committed but NOT PUSHED. Run: git push origin ${branch}`);
  }
  console.log(`UNDO gate: ${UNDO} committed at ${head.slice(0, 8)} and present on origin/${branch}`);
}

if (!DRY) {
  try { assertUndoPushed(); }
  catch (e) { console.error(`
REFUSING TO DELETE — ${e.message}
`); process.exit(3); }
}

const db = sql();
const client = s3();

for (const t of targets) {
  console.log(`\n── ${t.slug}  (${t.label}) ──`);

  // 1. the image node in the article body, addressed by the src it carries —
  //    NOT by index, which shifts if anything else edited the article.
  const [{ content }] = await db`select content from articles where id = ${t.articleId}`;
  const before = content.content.length;
  const kept = content.content.filter((n) => !(n.type === 'image' && String(n.attrs?.src || '').includes(t.stem)));
  const removed = before - kept.length;
  if (removed !== 1) throw new Error(`${t.slug}: expected to remove exactly 1 node, matched ${removed}. STOP.`);
  console.log(`  article body: ${before} nodes -> ${kept.length} (removed ${removed})`);
  if (!DRY) {
    await db`update articles set content = ${db.json({ ...content, content: kept })} where id = ${t.articleId}`;
  }

  // 2. the legacy WordPress path, which 301s an image request at the file.
  if (t.legacyRedirectId) {
    const [r] = await db`select article_destination_url from legacy_image_redirects where id = ${t.legacyRedirectId}`;
    console.log(`  legacy redirect ${t.legacyRedirectId} -> ${r.article_destination_url} (tier article_fallback)`);
    if (!DRY) {
      await db`update legacy_image_redirects
               set image_destination_url = ${r.article_destination_url},
                   mapping_tier = 'article_fallback',
                   updated_at = now()
               where id = ${t.legacyRedirectId}`;
    }
  }

  // 3. the media row (media_article_usage cascades).
  console.log(`  media row ${t.mediaId} + its media_article_usage row`);
  if (!DRY) {
    await db`delete from media_article_usage where media_id = ${t.mediaId}`;
    await db`delete from media where id = ${t.mediaId}`;
  }

  // 4. the objects. Last, because nothing downstream can describe them again.
  for (const key of t.r2Keys) {
    console.log(`  R2 delete ${key}`);
    if (!DRY) await client.send(new DeleteObjectCommand({ Bucket: ENV.R2_BUCKET_NAME, Key: key }));
  }
}

await db.end();
if (!DRY) console.log('\nrevalidate:', JSON.stringify(await revalidate()));
console.log(DRY ? '\nDRY RUN — nothing was written. Re-run with --go.' : '\ndone. Now run: node scripts/rights/rights03-verify.mjs');
