import postgres from 'postgres';
import { readFileSync } from 'node:fs';
const sql = postgres(readFileSync('.tmp-textcard-purge/.dburl','utf8').trim(),{prepare:false,max:2});
// The eight text-card media ids, exactly as recorded in the UNDO markdown.
const IDS = ['e326cfb1-99b7-4cbf-b94b-b0ad5d3462a7','fd7275df-5fb4-4291-bce7-8cf9e6e5b852',
 'a0cbb545-0828-4c5e-8356-5c94c3a5ad63','50f7bdb7-e962-4ee2-a70c-7057e607ac3f',
 '6b0f3a38-82fd-4eb9-9d61-b43455444912','85000828-a8d2-4cbf-9989-73c437606550',
 '5ea12c41-0072-4e67-ae30-00e9e7242451','3812de50-96f8-490c-a6a9-2089dff636f1'];
const before = await sql`select count(*)::int c from media_article_usage`;
const gone = await sql`delete from media_article_usage where media_id = any(${IDS}) returning media_id, article_id`;
const after = await sql`select count(*)::int c from media_article_usage`;
console.log('deleted usage rows:', gone.length);
console.log('media_article_usage total:', before[0].c, '->', after[0].c);
// The media rows and the R2 objects must survive: the owner banned their USE, not their existence.
const still = await sql`select id, filename, r2_key, url from media where id = any(${IDS}) order by filename`;
console.log('\nmedia rows still present (files untouched):', still.length);
for (const s of still) console.log('  ', s.filename, '->', s.r2_key);
await sql.end();
