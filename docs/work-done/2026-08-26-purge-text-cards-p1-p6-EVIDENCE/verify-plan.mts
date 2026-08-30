import { readFileSync } from 'node:fs';
import postgres from 'postgres';
import { marked } from 'marked';
import { generateJSON } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import UnderlineExtension from '@tiptap/extension-underline';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import ImageExtension from '@tiptap/extension-image';
import { parseArticleFile, creditLine } from '../src/lib/inspire/article-file';
import { normStem } from './norm.mjs';
const EXT = [StarterKit.configure({ link: false, underline: false }),
  LinkExtension.configure({ openOnClick: false, defaultProtocol: 'https' }),
  UnderlineExtension, Table.configure({ resizable: true }), TableRow, TableHeader, TableCell, ImageExtension];
const canon = (v: any): any => Array.isArray(v)?v.map(canon):(v&&typeof v==='object')?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canon(v[k])])):v;
const plan = JSON.parse(readFileSync('.tmp-textcard-purge/ingest-plan.json','utf8'));
const sql = postgres(readFileSync('.tmp-textcard-purge/.dburl','utf8').trim(),{prepare:false,max:2});
const media = await sql`select filename, r2_key from media`;
const base = (k: string) => k.split('/').pop()!;
const byStem = new Map(media.map((m:any)=>[normStem(m.r2_key), m]));
const isCard = (m:any) => /\.png$/i.test(m.filename) && m.filename !== base(m.r2_key);
let allOk = true;
for (const p of plan) {
  const { frontMatter, markdown } = parseArticleFile(readFileSync(`.tmp-textcard-purge/ingest/${p.file}`,'utf8'));
  const doc: any = generateJSON(await marked.parse(markdown,{async:true,gfm:true,breaks:false}), EXT);
  // reproduce composeBody(), src replaced by a stable token
  const nodes = [...doc.content];
  const fig = (img: any) => ({ type:'figureBlock', attrs: { src:`<${img.file}>`, alt: img.alt,
    'data-caption': creditLine(img), 'data-caption-url': img.creditUrl ?? null } });
  const declared = frontMatter.images.map((image,index)=>({image,index}))
    .filter(e=>typeof e.image.placeAfter==='number')
    .sort((a,b)=>b.image.placeAfter!-a.image.placeAfter! || b.index-a.index);
  for (const {image} of declared) nodes.splice(image.placeAfter!, 0, fig(image));
  const composed = [...nodes, ...frontMatter.images.filter(i=>typeof i.placeAfter!=='number').map(fig)];
  const [a] = await sql`select content from articles where slug=${p.slug}`;
  const expected = (a.content.content as any[]).filter(n => {
    if (n.type!=='figureBlock') return true;
    const m: any = byStem.get(normStem(new URL(n.attrs.src).pathname.replace(/^\/+/,'')));
    return !isCard(m);
  }).map(n => n.type==='figureBlock'
    ? { ...n, attrs: { ...n.attrs, src: `<${(byStem.get(normStem(new URL(n.attrs.src).pathname.replace(/^\/+/,''))) as any).filename}>` } } : n);
  const composedT = composed.map((n:any)=> n.type==='figureBlock' ? { ...n, attrs:{...n.attrs, src:`<${base(n.attrs.src.slice(1,-1))}>`}} : n);
  const A = JSON.stringify(canon(composedT)), B = JSON.stringify(canon(expected));
  const ok = A===B; if(!ok) allOk=false;
  console.log(`${p.slug.padEnd(26)} ${ok?'MATCH':'*** MISMATCH ***'}  nodes ${composedT.length} vs ${expected.length}`);
  if (!ok) for (let i=0;i<Math.max(composedT.length,expected.length);i++) {
    const x=JSON.stringify(canon(composedT[i])), y=JSON.stringify(canon(expected[i]));
    if (x!==y) { console.log(`  block ${i}\n   PLANNED: ${String(x).slice(0,400)}\n   EXPECTED:${String(y).slice(0,400)}`); break; }
  }
}
console.log(allOk ? '\nALL EIGHT: the planned ingest reproduces live-minus-the-card exactly.' : '\nMISMATCHES PRESENT — do not commit.');
await sql.end();
