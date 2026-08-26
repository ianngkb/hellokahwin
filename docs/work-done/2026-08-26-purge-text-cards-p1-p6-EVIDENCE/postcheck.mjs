import postgres from 'postgres';
import { readFileSync } from 'node:fs';
const sql = postgres(readFileSync('.tmp-textcard-purge/.dburl','utf8').trim(),{prepare:false,max:2});
const pre = JSON.parse(readFileSync('.tmp-textcard-purge/pre-write-rows.json','utf8'));
const canon = v => Array.isArray(v)?v.map(canon):(v&&typeof v==='object')?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canon(v[k])])):v;
for (const before of pre.rows) {
  const [now] = await sql`select * from articles where id=${before.id}`;
  const bn = before.content.content, an = now.content.content;
  const bnp = bn.filter(n=>n.type!=='figureBlock'), anp = an.filter(n=>n.type!=='figureBlock');
  const proseSame = JSON.stringify(canon(bnp))===JSON.stringify(canon(anp));
  console.log(`${now.slug.padEnd(26)} nodes ${bn.length}->${an.length}  figures ${bn.length-bnp.length}->${an.length-anp.length}  prose ${proseSame?'IDENTICAL':'*** CHANGED ***'}  published_at ${new Date(before.published_at).toISOString()===new Date(now.published_at).toISOString()?'kept':'*** MOVED to '+new Date(now.published_at).toISOString()+' ***'}  status=${now.status} review=${now.review_status}  title=${now.title===before.title} meta=${now.meta_description===before.meta_description}`);
}
await sql.end();
