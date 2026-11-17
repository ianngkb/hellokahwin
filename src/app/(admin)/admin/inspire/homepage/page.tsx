import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { requireAdminSection } from '@/lib/auth/admin';
import { PageHeader } from '@/components/layout/page-header';
import { Chip } from '@/components/ui/chip';
import { SectionCard } from '@/components/ui/section-card';
import {
  getInspireHomepageResolvedData,
  pickerArticlesForConfig,
} from '@/lib/inspire/homepage-queries';
import {
  HOMEPAGE_SURFACES,
  type HomepageSurface,
  type ResolvedInspireHomepageArticle,
} from '@/lib/inspire/homepage-curation';
import { cn } from '@/lib/utils';
import { getSmartCropUrl } from '@/lib/storage/smart-crop-url';
import { InspireHomepageManager } from './homepage-manager';

export const metadata: Metadata = { title: 'Homepage curation - Admin' };

/** Tab order: the site homepage first, it is the page most readers land on. */
const SURFACE_ORDER: HomepageSurface[] = ['home', 'artikel'];
const tab = 'border-b-2 px-1 pb-2 text-sm font-semibold transition-colors underline-offset-4';

interface PageProps {
  searchParams?: Promise<{ page?: string | string[] }>;
}

const SOURCE_LABEL = {
  pinned: 'Pinned',
  category: 'Category',
  latest: 'Newest',
  fallback: 'Newest fallback',
} as const;

function PreviewCard({
  item,
  priority = false,
}: {
  item: ResolvedInspireHomepageArticle;
  priority?: boolean;
}) {
  const { article } = item;
  const image =
    getSmartCropUrl(
      article.coverImageSmartCrops as Record<string, { url: string }> | null,
      'crop-4x3-article-card',
    ) ??
    (article.coverImageVariants as Record<string, { url: string }> | null)?.low?.url ??
    article.coverImageUrl;
  return (
    <article className="border-hairline rounded-card overflow-hidden border">
      <div className="bg-muted relative aspect-[4/3]">
        <Image
          src={image}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 25vw"
          className="object-cover"
          priority={priority}
        />
        <Chip
          className="absolute top-2 left-2"
          variant={item.source === 'fallback' ? 'outline' : 'solid'}
        >
          {SOURCE_LABEL[item.source]}
        </Chip>
      </div>
      <div className="space-y-1 p-3">
        <p className="text-muted-foreground text-xs">{article.categoryName}</p>
        <p className="line-clamp-2 text-sm font-medium">{article.title}</p>
      </div>
    </article>
  );
}

export default async function InspireHomepageAdminPage({ searchParams }: PageProps) {
  await requireAdminSection('inspire');
  const sp = (await searchParams) ?? {};
  const surface: HomepageSurface = sp.page === 'artikel' ? 'artikel' : 'home';
  const { label, path } = HOMEPAGE_SURFACES[surface];
  const data = await getInspireHomepageResolvedData({ surface });
  const pins = pickerArticlesForConfig(
    data.config,
    new Map(data.pinnedArticles.map((article) => [article.id, article])),
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Homepage curation"
        description="Pin the stories that matter, then let the newest articles or a category fill every remaining space automatically. Each page keeps its own arrangement."
      />

      <nav className="border-hairline -mt-2 flex gap-5 border-b" aria-label="Page to curate">
        {SURFACE_ORDER.map((key) => (
          <Link
            key={key}
            href={`/admin/inspire/homepage?page=${key}`}
            prefetch={false}
            aria-current={surface === key ? 'page' : undefined}
            className={cn(
              tab,
              surface === key
                ? 'border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground border-transparent',
            )}
          >
            {HOMEPAGE_SURFACES[key].label}
          </Link>
        ))}
      </nav>

      <p className="text-muted-foreground -mt-4 text-sm">
        Editing{' '}
        <a href={path} target="_blank" rel="noreferrer" className="text-foreground underline">
          {label}
        </a>
        . Saving here never changes the other page.
      </p>

      <InspireHomepageManager
        key={surface}
        surface={surface}
        pageLabel={label}
        initialConfig={data.config}
        categories={data.allCategories}
        initialPins={pins}
      />

      <SectionCard title="Live resolved preview" bodyClassName="space-y-5">
        <p className="text-muted-foreground text-sm">
          This is the exact saved order {path} will use. Source badges explain why each article is
          here.
        </p>
        {data.resolution.warnings.length > 0 && (
          <div
            className="border-warning/40 bg-warning-subtle rounded-control border px-4 py-3"
            role="status"
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="size-4" />
              Needs attention
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {data.resolution.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-3">
          <h2 className="text-sm font-semibold">
            Featured · {data.resolution.featured.length} of 3 filled
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {data.resolution.featured.map((item, index) => (
              <PreviewCard key={item.article.id} item={item} priority={index === 0} />
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">
            Latest grid · {data.resolution.latest.length} of 9 filled
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.resolution.latest.map((item) => (
              <PreviewCard key={item.article.id} item={item} />
            ))}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
