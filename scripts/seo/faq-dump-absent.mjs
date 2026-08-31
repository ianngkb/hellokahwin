#!/usr/bin/env node
/**
 * Dump the authored body of every article the FAQ census reports `absent`,
 * as plain text, so the Q&A written for it can be checked line by line against
 * what the article already says.
 *
 * SEO-13. This exists because the one rule the item cannot bend is "do not
 * invent questions", and the only way to hold that rule is to draft every
 * answer against the article's OWN prose rather than against what I happen to
 * know about Malay weddings. Reading the rendered page is not good enough —
 * the rendered page carries dynamic blocks and read-next rails that are not
 * the author's text.
 *
 * Needs DATABASE_URL. Usage:
 *   node scripts/seo/faq-dump-absent.mjs <census.json> <out-dir>
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import postgres from 'postgres';

const [censusPath, outDir] = process.argv.slice(2);
if (!censusPath || !outDir) {
  console.error('usage: node scripts/seo/faq-dump-absent.mjs <census.json> <out-dir>');
  process.exit(2);
}

const census = JSON.parse(readFileSync(censusPath, 'utf8'));
const slugs = census.rows.filter((r) => r.state === 'absent').map((r) => r.slug);

const sql = postgres(process.env.DATABASE_URL, { max: 2, prepare: false, ssl: 'require' });

/** Tiptap doc -> readable outline. Headings prefixed by level, prose flat. */
function outline(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (node.type === 'heading') {
    const lvl = node.attrs?.level ?? 2;
    out.push(`${'#'.repeat(lvl)} ${text(node)}`);
    return out;
  }
  if (node.type === 'paragraph') {
    const t = text(node).trim();
    if (t) out.push(t);
    return out;
  }
  if (node.type === 'listItem') {
    out.push(`- ${text(node).trim()}`);
    return out;
  }
  if (Array.isArray(node.content)) node.content.forEach((c) => outline(c, out));
  return out;
}

function text(node) {
  if (!node || typeof node !== 'object') return '';
  if (node.type === 'text') return node.text ?? '';
  if (!Array.isArray(node.content)) return '';
  return node.content.map(text).join('');
}

const rows = await sql`
  select a.slug, a.title, a.content, c.slug as category
  from articles a
  left join inspire_categories c on c.id = a.primary_category_id
  where a.slug = any(${slugs})
`;

mkdirSync(outDir, { recursive: true });
const index = [];
for (const r of rows) {
  const body = outline(r.content).join('\n\n');
  writeFileSync(join(outDir, `${r.slug}.md`), `# ${r.title}\n\ncategory: ${r.category}\nslug: ${r.slug}\n\n---\n\n${body}\n`);
  index.push({ slug: r.slug, category: r.category, title: r.title, words: body.split(/\s+/).length });
}
writeFileSync(join(outDir, '_index.json'), JSON.stringify(index, null, 2));
console.log(`dumped ${rows.length} of ${slugs.length} absent articles to ${outDir}`);
for (const i of index.sort((a, b) => a.category.localeCompare(b.category))) {
  console.log(`  ${i.category.padEnd(24)} ${i.slug.padEnd(60)} ${i.words} words`);
}
const missing = slugs.filter((s) => !rows.some((r) => r.slug === s));
if (missing.length) console.log(`NOT FOUND IN DB: ${missing.join(', ')}`);
await sql.end();
