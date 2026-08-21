import Image from 'next/image';
import Link from 'next/link';
import { GlobeIcon, InstagramIcon, LinkedinIcon, UserIcon } from 'lucide-react';
import { authorArchivePath } from '@/lib/authors/gate';

export interface AuthorBoxProps {
  name: string;
  slug: string;
  avatarUrl: string | null;
  title: string | null;
  bio: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  linkedinUrl: string | null;
  /** Published-article count, shown as the link to their archive. */
  articleCount?: number | null;
}

/**
 * The end-of-article author box.
 *
 * Rendered ONLY for a profile that passes `isLinkableAuthor` — the caller does
 * that check; this component never sees a house-account or vendor profile. That
 * is why it takes a non-nullable `slug`: there is no "unlinked" variant of this
 * box, because the house account's article should look exactly as it does today
 * (no box at all).
 *
 * The three links are stored behind an http(s)-only DB CHECK and an http(s)-only
 * zod refine, so they are safe to place in an href — but they get
 * `rel="noopener noreferrer"` regardless, and `nofollow` because an author's
 * personal socials are not an editorial endorsement we want to pass ranking
 * signal to.
 */
export function AuthorBox({
  name,
  slug,
  avatarUrl,
  title,
  bio,
  websiteUrl,
  instagramUrl,
  linkedinUrl,
  articleCount,
}: AuthorBoxProps) {
  const archiveHref = authorArchivePath(slug);
  const socials = [
    { href: websiteUrl, Icon: GlobeIcon, label: `${name}'s website` },
    { href: instagramUrl, Icon: InstagramIcon, label: `${name} on Instagram` },
    { href: linkedinUrl, Icon: LinkedinIcon, label: `${name} on LinkedIn` },
  ].filter((s): s is { href: string; Icon: typeof GlobeIcon; label: string } => Boolean(s.href));

  return (
    <section
      className="rounded-card border-hairline mt-12 border p-6"
      aria-labelledby="author-box-heading"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Link href={archiveHref} className="shrink-0" aria-hidden tabIndex={-1}>
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt=""
              width={72}
              height={72}
              className="size-[72px] rounded-full object-cover"
            />
          ) : (
            <span className="bg-muted text-muted-foreground flex size-[72px] items-center justify-center rounded-full">
              <UserIcon className="size-7" />
            </span>
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <p className="inspire-overline text-brand-secondary">Ditulis oleh</p>
          <h2 id="author-box-heading" className="mt-1 text-lg">
            <Link href={archiveHref} className="hover:underline">
              {name}
            </Link>
          </h2>
          {title && <p className="text-muted-foreground text-sm">{title}</p>}
          {bio && <p className="mt-2 text-sm leading-relaxed">{bio}</p>}

          <div className="mt-3 flex flex-wrap items-center gap-4">
            <Link href={archiveHref} className="text-sm font-medium hover:underline">
              {typeof articleCount === 'number' && articleCount > 0
                ? `View all ${articleCount} article${articleCount === 1 ? '' : 's'}`
                : `View all articles by ${name}`}
            </Link>
            {socials.length > 0 && (
              <span className="flex items-center gap-3">
                {socials.map(({ href, Icon, label }) => (
                  <a
                    key={href}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    aria-label={label}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Icon className="size-4" />
                  </a>
                ))}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
