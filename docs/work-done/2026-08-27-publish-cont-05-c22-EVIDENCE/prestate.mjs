import fs from 'node:fs'
import postgres from 'postgres'
const url = fs.readFileSync('.env','utf8').match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/^["']|["']$/g,'')
const sql = postgres(url, { prepare: false, max: 1 })
const SLUGS = ['hantaran-tunang-untuk-lelaki','hantaran-tunang-untuk-perempuan','berapa-dulang-hantaran-tunang','hantaran-tunang-simple','barang-hantaran-tunang']
const out = { capturedAt: new Date().toISOString() }
out.articles = (await sql`select count(*)::int n from articles`)[0].n
out.published = (await sql`select count(*)::int n from articles where status='published'`)[0].n
out.media = (await sql`select count(*)::int n from media`)[0].n
out.tags = (await sql`select count(*)::int n from inspire_tags`)[0].n
out.contentTypes = await sql`select jsonb_typeof(content) t, count(*)::int n from articles group by 1`
out.targetSlugsPresent = await sql`select slug from articles where slug = any(${SLUGS})`
out.p2Published = (await sql`select count(*)::int n from articles a join inspire_categories c on c.id=a.primary_category_id where c.slug='hantaran-mas-kahwin' and a.status='published'`)[0].n
out.byCategory = await sql`select c.slug, count(*)::int n from articles a join inspire_categories c on c.id=a.primary_category_id where a.status='published' group by 1 order by 1`
out.existingTagSlugs = await sql`select slug from inspire_tags where slug = any(${['hantaran-tunang-untuk-lelaki','hantaran-tunang-untuk-perempuan','barang-hantaran-tunang','bertunang','hantaran-tunang','dulang-hantaran-tunang','berapa-dulang-hantaran-tunang','hantaran-tunang-simple','contoh-hantaran-tunang','bajet-kahwin','adat-pertunangan']}) order by slug`
console.log(JSON.stringify(out, null, 1))
fs.writeFileSync('.tmp-ops/cont05/prestate.json', JSON.stringify(out, null, 1))
await sql.end()
