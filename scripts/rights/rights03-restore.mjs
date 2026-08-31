#!/usr/bin/env node
// RIGHTS-03 UNDO, executable. Puts the two INSTITUTIONAL images back exactly as
// production held them at 2026-08-31T17:53:20.113Z, the moment before the first
// delete.
//
// TWO HALVES, AND THE ORDER MATTERS. The database can happily point at an R2
// object that no longer exists — that is a broken image, not a restored one. So
// the objects go back first, then the rows, then the cache purge.
//
//   node scripts/rights/rights03-restore.mjs --r2            # objects only
//   node scripts/rights/rights03-restore.mjs --db            # rows only (runs the UNDO .sql)
//   node scripts/rights/rights03-restore.mjs --all           # both, then purge the cache
//   node scripts/rights/rights03-restore.mjs --all --only kursus-kahwin
//
// Add --dry-run to print what it would do and touch nothing.
//
// WHERE THE BYTES COME FROM. `data/rights03-institutional-takedown-backup/`,
// captured from R2 before the delete, MD5 recorded per object in its
// MANIFEST.json and re-checked here before every upload. `data/` is gitignored
// (.gitignore:16) and that is deliberate: a Getty file and a newspaper's
// photograph are what this item exists to stop us holding in public. They stay
// on the machine, out of the repo, and out of the CDN.
//
// The two originals are ALSO independently recoverable from the WordPress
// export at data/hellokahwin-export/media/wp-content/uploads/ — verified
// byte-identical by MD5 against the R2 ETags. Two sources, one of which would
// survive this backup directory being deleted.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import { s3, sql, ENV, TARGETS, PutObjectCommand, HeadObjectCommand, revalidate } from './rights03-lib.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BACKUP = process.env.HK_RIGHTS03_BACKUP ||
  'C:/Users/Ian Ng/Documents/Code/hellokahwin/hellokahwin/data/rights03-institutional-takedown-backup';
const UNDO_SQL = path.join(REPO, 'docs/work-done/sep-01-2026-session-01/sep-01-2026-rights-03-UNDO.sql');

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const DRY = has('--dry-run');
if (!has('--r2') && !has('--db') && !has('--all')) {
  console.error('nothing to do. pass --r2, --db or --all (see the header of this file)');
  process.exit(2);
}
const targets = TARGETS.filter((t) => !only || t.slug === only);
if (!targets.length) { console.error(`--only ${only} matched no target`); process.exit(2); }

const CT = { '.jpg': 'image/jpeg', '.webp': 'image/webp' };

if (has('--r2') || has('--all')) {
  const manifest = JSON.parse(fs.readFileSync(path.join(BACKUP, 'MANIFEST.json'), 'utf8'));
  const byKey = Object.fromEntries(manifest.objects.map((o) => [o.key, o]));
  const client = s3();
  for (const t of targets) {
    for (const key of t.r2Keys) {
      const rec = byKey[key];
      if (!rec) throw new Error(`no manifest entry for ${key} — refusing to upload bytes nobody vouched for`);
      const buf = fs.readFileSync(path.join(BACKUP, key));
      const md5 = crypto.createHash('md5').update(buf).digest('hex');
      if (md5 !== rec.md5) throw new Error(`${key}: backup is ${md5}, manifest says ${rec.md5} — STOP`);
      if (DRY) { console.log(`would PUT ${buf.length}B ${md5} ${key}`); continue; }
      await client.send(new PutObjectCommand({
        Bucket: ENV.R2_BUCKET_NAME, Key: key, Body: buf,
        ContentType: rec.contentType || CT[path.extname(key)] || 'application/octet-stream',
      }));
      const head = await client.send(new HeadObjectCommand({ Bucket: ENV.R2_BUCKET_NAME, Key: key }));
      const etag = (head.ETag || '').replace(/"/g, '');
      console.log(`PUT ok ${String(buf.length).padStart(8)}B etag=${etag} ${etag === md5 ? '== md5' : '!! ETAG MISMATCH'} ${key}`);
    }
  }
}

if (has('--db') || has('--all')) {
  if (only) {
    console.error('--only is not supported for the database half: the UNDO .sql is one transaction');
    console.error('covering both files. Run it whole, or hand-edit a copy.');
    process.exit(2);
  }
  if (DRY) {
    console.log(`would run: psql "$DATABASE_URL" -f ${UNDO_SQL}`);
  } else {
    const stmts = fs.readFileSync(UNDO_SQL, 'utf8');
    const db = sql();
    await db.unsafe(stmts);
    await db.end();
    console.log(`ran ${path.basename(UNDO_SQL)} against production`);
  }
}

if (has('--all')) {
  if (DRY) console.log('would POST /api/cron/revalidate-content');
  else console.log('revalidate:', JSON.stringify(await revalidate()));
}
