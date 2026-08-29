import 'dotenv/config';
import sharp from 'sharp';
import { db } from '../../src/lib/db/drizzle';
import { articles, inspireCategories } from '../../src/lib/db/schema/articles';
import { eq, desc } from 'drizzle-orm';

const rows = await db
  .select({
    slug: articles.slug,
    coverImageUrl: articles.coverImageUrl,
    coverImageVariants: articles.coverImageVariants,
  })
  .from(articles)
  .innerJoin(inspireCategories, eq(articles.primaryCategoryId, inspireCategories.id))
  .where(eq(articles.status, 'published'))
  .orderBy(desc(articles.publishedAt))
  .limit(8);

for (const r of rows) {
  const variants = r.coverImageVariants as { low?: { url: string } } | null;
  const url = variants?.low?.url ?? r.coverImageUrl;
  if (!url) {
    console.log(r.slug.padEnd(40), 'no url');
    continue;
  }
  try {
    const res = await fetch(url);
    const buf = Buffer.from(await res.arrayBuffer());
    const meta = await sharp(buf).metadata();
    const ar = (meta.width! / meta.height!).toFixed(2);
    console.log(`${r.slug.padEnd(40)} ${meta.width}x${meta.height}  ar=${ar}  bytes=${buf.length}`);
  } catch (e) {
    console.log(r.slug.padEnd(40), 'fetch/decode failed', e);
  }
}
process.exit(0);
