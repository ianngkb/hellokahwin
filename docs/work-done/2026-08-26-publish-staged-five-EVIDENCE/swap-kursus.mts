/**
 * SEO-03 — replace the thin "varies by state" fee section on the LIVE
 * `kursus-kahwin` row with the researched 14-state table.
 *
 * The swap instructions describe `articles.content` as "a legacy jsonb object
 * holding a TipTap HTML string" and give a find-string to replace. It is not a
 * string: it is a TipTap/ProseMirror JSON document (`jsonb_typeof` = object,
 * `doc.content` = 56 block nodes). So the find-string is matched against the
 * two NODES it describes — h2 "Bayaran Yuran" and the paragraph after it — and
 * the replacement HTML is converted with `generateJSON`, the same function
 * `scripts/ingest-article.mts` uses, so the nodes produced are shape-identical
 * to anything ingest would have written.
 *
 * Every other node of the document is carried across by identity.
 */
import fs from 'node:fs';
import postgres from 'postgres';
import { generateJSON } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import UnderlineExtension from '@tiptap/extension-underline';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import ImageExtension from '@tiptap/extension-image';

const D =
  'C:/Users/Ian Ng/Documents/Code/hellokahwin/hellokahwin/docs/plans/aug-23-2026-session-01/drafts/';
const SECTION_HTML = fs.readFileSync(D + 'kursus-kahwin-yuran-section.html', 'utf8').trim();

// The exact find-string from the swap instructions, as the two nodes it is.
const FIND_H2 = 'Bayaran Yuran';
const FIND_P =
  'Yuran kursus ditetapkan oleh Jabatan Agama Islam negeri masing-masing dan berbeza mengikut negeri. Sila semak kadar terkini dengan Jabatan Agama Islam negeri anda sebelum mendaftar.';

const url = fs
  .readFileSync('.env', 'utf8')
  .match(/^DATABASE_URL=(.*)$/m)![1]
  .trim()
  .replace(/^["']|["']$/g, '');
const sql = postgres(url, { prepare: false, max: 1 });
const commit = process.argv.includes('--commit');

const [live] = await sql`
  select id, jsonb_typeof(content) as t, content::text as ct, updated_at
  from articles where slug = 'kursus-kahwin'`;
if (!live) throw new Error('no row at slug kursus-kahwin');
if (live.t !== 'object') throw new Error(`content shape is ${live.t}, expected object`);

const snap = JSON.parse(fs.readFileSync('.tmp-ops/pub5/kursus.BEFORE.json', 'utf8'));
if (live.id !== snap.id) throw new Error('row id changed since the snapshot');
if (live.ct !== snap.content_text) throw new Error('row changed since the snapshot was taken');

const doc = JSON.parse(live.ct);
const before = doc.content as any[];

// Locate the two nodes by CONTENT, never by index.
const hits = before
  .map((n, i) => ({ n, i }))
  .filter(
    ({ n }) => n.type === 'heading' && n.attrs?.level === 2 && n.content?.[0]?.text === FIND_H2,
  );
if (hits.length !== 1) throw new Error(`expected exactly 1 "${FIND_H2}" h2, found ${hits.length}`);
const at = hits[0].i;
const p = before[at + 1];
if (p?.type !== 'paragraph' || p.content?.[0]?.text !== FIND_P)
  throw new Error(
    'the node after the h2 is not the "varies by state" paragraph the instructions name',
  );
if (before.filter((n) => JSON.stringify(n).includes(FIND_P)).length !== 1)
  throw new Error('the find-paragraph appears more than once');

const section = generateJSON(SECTION_HTML, [
  StarterKit,
  ImageExtension,
  LinkExtension.configure({ openOnClick: false, defaultProtocol: 'https' }),
  UnderlineExtension,
  Table.configure({ resizable: true }),
  TableRow,
  TableHeader,
  TableCell,
] as never[]) as { type: string; content: any[] };

// The converted section must begin with the same h2 — the instructions promise
// the heading text is unchanged, so any anchor to it survives.
if (section.content[0]?.type !== 'heading' || section.content[0]?.content?.[0]?.text !== FIND_H2)
  throw new Error('converted section does not begin with the "Bayaran Yuran" h2');

const kinds = section.content.reduce((a: Record<string, number>, n: any) => {
  const k = n.type === 'heading' ? `h${n.attrs.level}` : n.type;
  a[k] = (a[k] ?? 0) + 1;
  return a;
}, {});
console.log('converted section blocks:', JSON.stringify(kinds));

const table = section.content.find((n: any) => n.type === 'table');
if (!table)
  throw new Error('the table did not survive conversion — do NOT flatten it, stop and report');
console.log(
  'table rows:',
  table.content.length,
  '· header cells:',
  table.content[0].content.length,
  '· cell types:',
  [...new Set(table.content.flatMap((r: any) => r.content.map((c: any) => c.type)))].join(', '),
);
if (table.content.length !== 15)
  throw new Error(`expected 15 table rows, got ${table.content.length}`);
if (table.content[0].content.some((c: any) => c.type !== 'tableHeader'))
  throw new Error('header row is not tableHeader cells');

const after = [...before.slice(0, at), ...section.content, ...before.slice(at + 2)];
const newDoc = { ...doc, content: after };

// Every node outside the swapped window must be carried by identity.
const untouchedBefore = JSON.stringify([...before.slice(0, at), ...before.slice(at + 2)]);
const untouchedAfter = JSON.stringify([
  ...after.slice(0, at),
  ...after.slice(at + section.content.length),
]);
if (untouchedBefore !== untouchedAfter)
  throw new Error('a node outside the swapped section changed');
console.log(
  'nodes:',
  before.length,
  '->',
  after.length,
  `(swapped 2 -> ${section.content.length} at index ${at})`,
);
console.log('untouched nodes carried by identity:', before.length - 2, '/', before.length - 2);

// The 18 image nodes must be untouched, byte for byte.
const imgsB = before.filter((n) => n.type === 'image');
const imgsA = after.filter((n: any) => n.type === 'image');
console.log(
  'image nodes:',
  imgsB.length,
  '->',
  imgsA.length,
  '· identical:',
  JSON.stringify(imgsB) === JSON.stringify(imgsA),
);
if (JSON.stringify(imgsB) !== JSON.stringify(imgsA)) throw new Error('an image node changed');

// The stale sentence must be gone; the new figures must be present.
const s = JSON.stringify(newDoc);
if (s.includes(FIND_P)) throw new Error('the old paragraph survives');
for (const probe of [
  'RM180',
  'RM120 seorang mulai tarikh itu',
  'Pulau Pinang',
  '1 September 2026',
  'KISWA',
])
  if (!s.includes(probe)) throw new Error(`missing from the new section: ${probe}`);
console.log('bytes:', live.ct.length, '->', s.length);

if (!commit) {
  fs.writeFileSync('.tmp-ops/pub5/kursus.AFTER-preview.json', JSON.stringify(newDoc));
  console.log('\nDRY RUN — nothing written.');
  await sql.end();
  process.exit(0);
}

const [row] = await sql`
  update articles set content = ${sql.json(newDoc)}::jsonb, updated_at = now()
   where id = ${live.id}
  returning id, jsonb_typeof(content) as t, updated_at`;
console.log('\nWROTE', JSON.stringify(row));

const oldLike = '%' + FIND_P + '%';
const [chk] = await sql`
  select jsonb_typeof(content) t,
         jsonb_array_length(content->'content') blocks,
         content::text like ${oldLike} as old_survives,
         content::text like '%RM180%' as new_present
    from articles where id = ${live.id}`;
console.log('VERIFY', JSON.stringify(chk));
await sql.end();
