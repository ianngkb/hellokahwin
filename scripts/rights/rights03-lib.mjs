// Shared wiring for the RIGHTS-03 takedown and its UNDO.
//
// This repo (the docs/planning lineage) carries no runtime dependencies. The
// site checkout does — `postgres`, `@aws-sdk/client-s3` — and it is also where
// the production credentials live, in its `.env`. So both are resolved from
// there by absolute path rather than duplicated here. If the site checkout
// moves, set HK_SITE_DIR and everything keeps working.
import { createRequire } from 'module';
import fs from 'fs';

export const SITE = process.env.HK_SITE_DIR || 'C:/Users/Ian Ng/Documents/Code/hellokahwin-site';
if (!fs.existsSync(SITE + '/package.json')) {
  throw new Error(`no site checkout at ${SITE} — set HK_SITE_DIR to the hellokahwin-site directory`);
}
const require = createRequire(SITE + '/package.json');

export const ENV = (() => {
  const e = { ...process.env };
  for (const line of fs.readFileSync(SITE + '/.env', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)="?(.*?)"?\s*$/);
    if (m && !e[m[1]]) e[m[1]] = m[2];
  }
  return e;
})();

export const postgres = require('postgres');
export const { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command } =
  require('@aws-sdk/client-s3');

// `max` matters. postgres.js refuses a statement that opens its own transaction
// unless the pool is a single connection — connection.js:606 fires
// UNSAFE_TRANSACTION on `result.command === 'BEGIN' && max !== 1`. The UNDO .sql
// is one explicit begin/commit, so the restore opens the pool with max: 1.
export const sql = (opts = {}) => postgres(ENV.DATABASE_URL, { prepare: false, ssl: 'require', ...opts });

export const s3 = () => new S3Client({
  region: 'auto',
  endpoint: `https://${ENV.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ENV.R2_ACCESS_KEY_ID, secretAccessKey: ENV.R2_SECRET_ACCESS_KEY },
});

/** The two files decision 167 ruled down, and everything production holds about them. */
export const TARGETS = [
  {
    label: 'Getty Images/iStockphoto',
    assetId: 'HK-L-0592',
    mediaId: 'b7965eb8-be83-4f93-beb0-bf01272e3514',
    slug: 'tempat-honeymoon-di-malaysia',
    articleId: '3dcdff4c-d262-4333-8a75-4f826a207918',
    pageUrl: 'https://hellokahwin.com/artikel/idea-dan-nasihat/tempat-honeymoon-di-malaysia',
    stem: '1787395669518-IN-TempatHoneymoondiMalaysia-CameronHighland',
    nodeIndex: 37,
    r2Keys: [
      'inspire/tempat-honeymoon-di-malaysia/1787395669518-IN-TempatHoneymoondiMalaysia-CameronHighland.jpg',
      'inspire/tempat-honeymoon-di-malaysia/1787395669518-IN-TempatHoneymoondiMalaysia-CameronHighland/high.webp',
      'inspire/tempat-honeymoon-di-malaysia/1787395669518-IN-TempatHoneymoondiMalaysia-CameronHighland/low.webp',
    ],
    legacyRedirectId: '5cc8482a-5e06-4d47-ae65-d82f3234c55d',
  },
  {
    label: 'press photograph — Utusan Malaysia',
    assetId: 'HK-L-0347',
    mediaId: '584e944f-b781-459b-a6a6-a556d4aeb7f7',
    slug: 'kursus-kahwin',
    articleId: '1c2e96ae-340f-4226-bb32-363da8cbe3d0',
    pageUrl: 'https://hellokahwin.com/artikel/idea-dan-nasihat/kursus-kahwin',
    stem: '1787396416141-IN-KursusKahwin-Kelas-1024x576',
    nodeIndex: 3,
    r2Keys: [
      'inspire/kursus-kahwin/1787396416141-IN-KursusKahwin-Kelas-1024x576.jpg',
      'inspire/kursus-kahwin/1787396416141-IN-KursusKahwin-Kelas-1024x576/high.webp',
      'inspire/kursus-kahwin/1787396416141-IN-KursusKahwin-Kelas-1024x576/low.webp',
    ],
    legacyRedirectId: null,
  },
];

// The negative control for each page: an image that STAYS. Both were picked as
// the nearest neighbour of the removed node — same page, same import batch,
// same `IN-` legacy class — so a delete that over-reached takes the control with
// it and the check goes red instead of green.
export const CONTROLS = {
  'tempat-honeymoon-di-malaysia': {
    stem: '1787395668007-IN-TempatHoneymoondiMalaysia-PulauSipadanMabul-',
    url: 'https://images.hellokahwin.com/inspire/tempat-honeymoon-di-malaysia/1787395668007-IN-TempatHoneymoondiMalaysia-PulauSipadanMabul-/high.webp',
  },
  'kursus-kahwin': {
    stem: '1787396418071-IN-KursusKahwin-2-1024x576',
    url: 'https://images.hellokahwin.com/inspire/kursus-kahwin/1787396418071-IN-KursusKahwin-2-1024x576/high.webp',
  },
};

export async function revalidate() {
  const r = await fetch('https://hellokahwin.com/api/cron/revalidate-content', {
    method: 'POST', headers: { authorization: `Bearer ${ENV.CRON_SECRET}` },
  });
  return { status: r.status, body: await r.text() };
}
