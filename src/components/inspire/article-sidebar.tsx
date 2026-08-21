import Image from 'next/image';
import Link from 'next/link';
import { CalendarIcon, TagIcon, UserIcon, HashIcon } from 'lucide-react';
import { Chip } from '@/components/ui/chip';
import { PhotoGallery } from './photo-gallery';
import { authorArchivePath } from '@/lib/authors/gate';
import type { GalleryImage } from './article-renderer';

interface ArticleTag {
  id: string;
  name: string;
  slug: string;
}

interface ArticleCategory {
  name: string;
  slug: string;
}

interface ArticleSidebarProps {
  updatedAt: string | null;
  categories: ArticleCategory[];
  authorName: string;
  /**
   * Set only when the author passes `isLinkableAuthor` — the caller does that
   * check, this component just links the name when it gets a slug. OPTIONAL so
   * the admin draft-preview surfaces, which render this sidebar without ever
   * reading the author's profile columns, keep working unchanged.
   */
  authorSlug?: string | null;
  authorAvatarUrl?: string | null;
  tags?: ArticleTag[];
  galleryImages: GalleryImage[];
  variant?: 'sidebar' | 'mobile';
}

export function ArticleSidebar({
  updatedAt,
  categories,
  authorName,
  authorSlug,
  authorAvatarUrl,
  tags,
  galleryImages,
  variant = 'sidebar',
}: ArticleSidebarProps) {
  return (
    <aside className="inspire-sidebar space-y-6">
      {/* Article info */}
      <div className="space-y-3">
        {updatedAt && (
          <div className="sidebar-meta flex items-center gap-2">
            <CalendarIcon className="size-4" />
            Dikemas kini{' '}
            {new Date(updatedAt).toLocaleDateString('ms-MY', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        )}
        {categories.length > 0 ? (
          <div className="sidebar-meta flex items-center gap-2">
            <TagIcon className="size-4 shrink-0" />
            <span>
              {categories.map((cat, i) => (
                <span key={cat.slug}>
                  {i > 0 && ', '}
                  <Link
                    href={`/artikel/${cat.slug}`}
                    className="hover:text-foreground transition-colors"
                  >
                    {cat.name}
                  </Link>
                </span>
              ))}
            </span>
          </div>
        ) : (
          <div className="sidebar-meta flex items-center gap-2">
            <TagIcon className="size-4 shrink-0" />
            Tiada kategori
          </div>
        )}
        <div className="sidebar-meta flex items-center gap-2">
          {authorAvatarUrl ? (
            <Image
              src={authorAvatarUrl}
              alt=""
              width={20}
              height={20}
              className="size-5 shrink-0 rounded-full object-cover"
            />
          ) : (
            <UserIcon className="size-4 shrink-0" />
          )}
          {authorSlug ? (
            <Link
              href={authorArchivePath(authorSlug)}
              className="hover:text-foreground transition-colors"
            >
              {authorName}
            </Link>
          ) : (
            authorName
          )}
        </div>
      </div>

      {/* Tags */}
      {tags && tags.length > 0 && (
        <div>
          <h3 className="sidebar-section-title mb-3 flex items-center gap-1.5">
            <HashIcon className="size-3.5" />
            Tag
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <Chip key={tag.id} asChild variant="outline" size="sm" className="text-xs">
                <Link href={`/artikel/tag/${tag.slug}`}>{tag.name}</Link>
              </Chip>
            ))}
          </div>
        </div>
      )}

      {/* View All Photos */}
      {galleryImages.length > 0 && (
        <div>
          <PhotoGallery images={galleryImages} />
        </div>
      )}

    </aside>
  );
}
