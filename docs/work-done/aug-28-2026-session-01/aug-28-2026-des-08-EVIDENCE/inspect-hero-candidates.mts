import 'dotenv/config';
import { db } from '../../src/lib/db/drizzle';
import { articles, inspireCategories } from '../../src/lib/db/schema/articles';
import { eq, desc } from 'drizzle-orm';

const rows = await db
  .select({
    title: articles.title,
    slug: articles.slug,
    categorySlug: inspireCategories.slug,
    coverImageSmartCrops: articles.coverImageSmartCrops,
    coverImageUrl: articles.coverImageUrl,
  })
  .from(articles)
  .innerJoin(inspireCategories, eq(articles.primaryCategoryId, inspireCategories.id))
  .where(eq(articles.status, 'published'))
  .orderBy(desc(articles.publishedAt))
  .limit(15);

for (const r of rows) {
  const crops = r.coverImageSmartCrops as Record<
    string,
    { url: string; width: number; height: number }
  > | null;
  const card = crops?.['crop-4x3-article-card'];
  console.log(`${r.slug.padEnd(40)} card=${card?.width}x${card?.height}  cover=${r.coverImageUrl}`);
}
process.exit(0);
