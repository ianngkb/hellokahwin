/**
 * CONT-09 undo. Restores every column and every R2 object the run changed.
 *
 *   node .tmp-cont09-undo-restore.mjs           # dry run, prints the diff
 *   node .tmp-cont09-undo-restore.mjs --commit  # write
 *
 * Two halves, and both are needed. The DATABASE half puts the old cover URL,
 * variants, crops, focal point and detection data back on each article. The R2
 * half re-uploads the crop bytes that the focal-point regeneration overwrote at
 * their existing keys — restoring the JSON alone would leave the OLD url
 * pointing at the NEW image, which is worse than either state.
 */
import postgres from 'postgres';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
const commit = process.argv.includes('--commit');
const env = readFileSync('.env','utf8');
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)="?([^"]*)"?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const sql = postgres(process.env.DATABASE_URL, { prepare:false, max:2 });
const arts = JSON.parse(readFileSync('.tmp-cont09/undo/articles.before.json','utf8'));
const media = JSON.parse(readFileSync('.tmp-cont09/undo/media.before.json','utf8'));

console.log(`${commit ? 'RESTORING' : 'DRY RUN —'} ${arts.length} articles, ${media.length} media rows`);
if (commit) {
  await sql.begin(async (tx) => {
    for (const a of arts) {
      await tx`update articles set
        cover_image_url = ${a.cover_image_url},
        cover_image_variants = ${a.cover_image_variants ? sql.json(a.cover_image_variants) : null}::jsonb,
        cover_image_smart_crops = ${a.cover_image_smart_crops ? sql.json(a.cover_image_smart_crops) : null}::jsonb,
        cover_image_focal_point = ${a.cover_image_focal_point ? sql.json(a.cover_image_focal_point) : null}::jsonb,
        cover_image_detection_data = ${a.cover_image_detection_data ? sql.json(a.cover_image_detection_data) : null}::jsonb,
        cover_image_focal_point_override = ${a.cover_image_focal_point_override ? sql.json(a.cover_image_focal_point_override) : null}::jsonb
        where id = ${a.id}`;
    }
    for (const m of media) {
      await tx`update media set
        smart_crops = ${m.smart_crops ? sql.json(m.smart_crops) : null}::jsonb,
        focal_point = ${m.focal_point ? sql.json(m.focal_point) : null}::jsonb
        where id = ${m.id}`;
    }
  });
  console.log('database restored');
}

// ── R2 half ──────────────────────────────────────────────────────────────
const dir = '.tmp-cont09/undo/crops';
const files = existsSync(dir) ? readdirSync(dir).filter(f=>f.endsWith('.webp')) : [];
console.log(`${files.length} crop objects to put back`);
if (commit && files.length) {
  const { getR2Client, getR2Bucket } = await import('./src/lib/r2/client.ts');
  const { PutObjectCommand } = await import('@aws-sdk/client-s3');
  const byId = new Map(media.map(m=>[m.id,m]));
  const r2 = getR2Client(), bucket = getR2Bucket();
  for (const f of files) {
    const [id, rest] = f.split('--');
    const name = rest.replace(/\.webp$/,'');
    const m = byId.get(id);
    const key = new URL(m.smart_crops[name].url).pathname.replace(/^\//,'');
    await r2.send(new PutObjectCommand({ Bucket: bucket, Key: key,
      Body: readFileSync(`${dir}/${f}`), ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable' }));
    console.log('  put', key);
  }
}
if (!commit) {
  for (const a of arts) console.log(`  ${a.slug} -> ${a.cover_image_url}`);
}
await sql.end();
console.log(commit ? 'DONE' : 'dry run only — pass --commit to write');
