# UNDO — five links added to the C2.2 seed article `hantaran-tunang`, 27 Aug 2026

Written **before** the write and committed before it ran.

**What changed:** five `listItem` nodes appended to the ONE `bulletList` that
follows the `Artikel Lain:` paragraph in `articles.content` for slug
`hantaran-tunang`. Nothing else in the document is touched — the prefix of the
serialised document up to and including that paragraph is byte-identical before
and after, asserted by the script before it writes.

Before: 7 list items, `content` 19,460 bytes.
After: 12 list items, `content` 20,941 bytes (+1,481).

**Why:** the seed holds the cluster's head term (`hantaran tunang`, 4,700/mo)
and was the only page in C2.2 predating this sprint. It linked to none of the
five new articles, so the cluster's highest-authority page gave Googlebot no
path into five cold ones. Editorial links from an indexed page into cold pages
are the crawl lever (`ceo-memory.md`).

**Exact before-state:** `2026-08-27-publish-cont-05-c22-EVIDENCE/seed-hantaran-tunang-content-BEFORE.json`
— the full TipTap document read out of the DATABASE, not from the rendered page.

## To undo

```bash
# from the site worktree, with .env DATABASE_URL pointing at production
node -e "
const fs=require('fs'),postgres=require('postgres');
const url=fs.readFileSync('.env','utf8').match(/^DATABASE_URL=(.*)\$/m)[1].trim().replace(/^[\"']|[\"']\$/g,'');
(async()=>{const sql=postgres(url,{prepare:false,max:1});
const doc=JSON.parse(fs.readFileSync('docs/work-done/2026-08-27-publish-cont-05-c22-EVIDENCE/seed-hantaran-tunang-content-BEFORE.json','utf8'));
await sql\`update articles set content=\${sql.json(doc)}::jsonb where slug='hantaran-tunang'\`;
const [r]=await sql\`select length(content::text) n from articles where slug='hantaran-tunang'\`;
console.log('restored,',r.n,'bytes (expect 19460)');await sql.end()})();"
```

Then drop the caches: `POST /api/cron/revalidate-content` or a re-ingest with
`--revalidate-url`, and purge `/artikel/hantaran-mas-kahwin/hantaran-tunang`.

**`published_at` is not touched by this write** — the update sets `content` and
`updated_at` only, and does not go through the ingest CLI's `on conflict` clause.

## What this UNDO does not cover

The seven pre-existing links in that list point at **legacy root slugs**
(`https://hellokahwin.com/hantaran-kahwin/`) rather than canonical
`/artikel/{category}/{slug}` paths. That is a known open site-wide defect —
41 such links across the legacy bodies — and this run deliberately did **not**
touch them. Fixing them is SEO's, not CONT-05's, and mixing it into this write
would have made the undo above wrong.
