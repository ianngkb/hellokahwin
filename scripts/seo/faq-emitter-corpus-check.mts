/**
 * Run the FAQ emitter over EVERY article in the database and report which ones
 * it fires on, and by which path.
 *
 * SEO-13. This exists because the emitter gained a second path — an article
 * whose whole body is question-shaped now qualifies without a `Soalan lazim`
 * heading — and a loosened matcher is exactly the change whose blast radius you
 * cannot judge from the one article that motivated it. Unit tests prove the rule
 * does what I meant. Only this proves it does not also do something I did not
 * mean, to 85 articles I was not looking at.
 *
 * Usage: pnpm exec tsx scripts/seo/faq-emitter-corpus-check.mts
 */

import 'dotenv/config';
import postgres from 'postgres';
import {
  buildFaqPageJsonLd,
  extractFaqEntries,
  hasFaqBlockHeading,
} from '../../src/lib/inspire/faq-schema';

const sql = postgres(process.env.DATABASE_URL!, { max: 2, prepare: false, ssl: 'require' });

const rows = await sql<{ slug: string; content: unknown; status: string }[]>`
  select slug, content, status from articles order by slug
`;

const viaBlock: string[] = [];
const viaWholeBody: string[] = [];
const none: string[] = [];

for (const r of rows) {
  const jsonLd = buildFaqPageJsonLd({ content: r.content });
  if (!jsonLd) {
    none.push(r.slug);
    continue;
  }
  const n = extractFaqEntries(r.content).length;
  (hasFaqBlockHeading(r.content) ? viaBlock : viaWholeBody).push(`${r.slug} (${n} Q, ${r.status})`);
}

console.log(`articles in DB: ${rows.length}`);
console.log(`  emit via Soalan lazim block: ${viaBlock.length}`);
console.log(`  emit via whole-body Q&A:     ${viaWholeBody.length}`);
for (const s of viaWholeBody) console.log(`      ${s}`);
console.log(`  emit nothing:                ${none.length}`);

await sql.end();
