#!/usr/bin/env node
/**
 * Dump the authored body of named article slugs as a readable outline.
 * Companion to `faq-dump-absent.mjs`, for reading articles that ALREADY carry a
 * Soalan lazim block — the house pattern a new block has to match.
 *
 * Usage: node scripts/seo/faq-dump-slugs.mjs <out-dir> <slug> [slug ...]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import postgres from 'postgres';

const [outDir, ...slugs] = process.argv.slice(2);
if (!outDir || slugs.length === 0) {
  console.error('usage: node scripts/seo/faq-dump-slugs.mjs <out-dir> <slug> [slug ...]');
  process.exit(2);
}

const sql = postgres(process.env.DATABASE_URL, { max: 2, prepare: false, ssl: 'require' });

function text(node) {
  if (!node || typeof node !== 'object') return '';
  if (node.type === 'text') return node.text ?? '';
  if (!Array.isArray(node.content)) return '';
  return node.content.map(text).join('');
}

function outline(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (node.type === 'heading') {
    out.push(`${'#'.repeat(node.attrs?.level ?? 2)} ${text(node)}`);
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

const rows = await sql`select slug, title, content from articles where slug = any(${slugs})`;
mkdirSync(outDir, { recursive: true });
for (const r of rows) {
  writeFileSync(join(outDir, `${r.slug}.md`), `# ${r.title}\n\n---\n\n${outline(r.content).join('\n\n')}\n`);
  console.log(`wrote ${r.slug}`);
}
await sql.end();
