// Does this article file differ from what production is serving?
// Asked BEFORE any --commit run, so a demonstration ingest cannot silently
// regress live content to whatever version happens to sit in a scratch folder.
import postgres from 'postgres';
import { readFile } from 'node:fs/promises';
import { parseArticleFile } from '../src/lib/inspire/article-file';

const db = process.argv[process.argv.indexOf('--db') + 1];
const files = process.argv.slice(process.argv.indexOf('--files') + 1);
const sql = postgres(db, { prepare: false, max: 2 });

const text = (node: any): string => {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(text).join('');
  if (node.type === 'text') return node.text ?? '';
  return text(node.content);
};

for (const f of files) {
  const { frontMatter, markdown } = parseArticleFile(await readFile(f, 'utf8'));
  const [row] = await sql<any[]>`
    select title, excerpt, meta_description, status, content, updated_at
    from articles where slug = ${frontMatter.slug}`;
  if (!row) { console.log(`${f}\n  NOT IN DB (slug ${frontMatter.slug}) — a --commit run would INSERT`); continue; }
  const dbText = text(row.content).replace(/\s+/g, ' ').trim();
  const fileText = markdown.replace(/[#*_>`\[\]()!-]/g, ' ').replace(/\s+/g, ' ').trim();
  console.log(`${f}  (slug ${frontMatter.slug})`);
  console.log(`  title  file=${JSON.stringify(frontMatter.title)}`);
  console.log(`         db  =${JSON.stringify(row.title)}   ${frontMatter.title === row.title ? 'SAME' : '*** DIFFERENT ***'}`);
  console.log(`  meta   ${frontMatter.metaDescription === row.meta_description ? 'SAME' : '*** DIFFERENT ***'}`);
  console.log(`  excerpt ${(frontMatter.excerpt ?? null) === row.excerpt ? 'SAME' : '*** DIFFERENT ***'}`);
  console.log(`  status file=${frontMatter.status} db=${row.status}`);
  console.log(`  body chars  db=${dbText.length}  file~=${fileText.length}  (delta ${dbText.length - fileText.length})`);
  console.log(`  db updated_at ${new Date(row.updated_at).toISOString()}`);
}
await sql.end();
