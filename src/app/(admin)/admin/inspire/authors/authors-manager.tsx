'use client';

import { useEffect, useRef, useState, useActionState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ExternalLinkIcon, PencilIcon, UploadIcon, UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { authorArchivePath } from '@/lib/authors/gate';
import { updateAuthorProfileAction } from './actions';
import { uploadAuthorAvatar } from './upload-author-avatar';

export interface AuthorRow {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  authorSlug: string | null;
  /**
   * `generateSlug(name)`, computed on the server. NOT derived here: importing
   * `@/lib/utils/slug` into a client component drags its lazy
   * `@/lib/seo/place-page-data` import — and through it the postgres driver —
   * into the browser bundle, which fails the build on `Can't resolve 'tls'`.
   */
  suggestedSlug: string;
  isPublicAuthor: boolean;
  authorTitle: string | null;
  authorBio: string | null;
  authorWebsiteUrl: string | null;
  authorInstagramUrl: string | null;
  authorLinkedinUrl: string | null;
  publishedArticleCount: number;
}

export function AuthorsManager({ authors }: { authors: AuthorRow[] }) {
  const [editing, setEditing] = useState<AuthorRow | null>(null);

  const publicCount = authors.filter((a) => a.isPublicAuthor && a.authorSlug).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          <span className="text-foreground font-mono font-medium tabular-nums">
            {authors.length}
          </span>{' '}
          admin account{authors.length === 1 ? '' : 's'},{' '}
          <span className="text-foreground font-mono font-medium tabular-nums">{publicCount}</span>{' '}
          published as public author{publicCount === 1 ? '' : 's'}
        </p>
      </div>

      <div className="bg-card rounded-card border-hairline overflow-hidden border">
        {authors.map((author) => (
          <div
            key={author.id}
            className="border-hairline hover:bg-muted flex items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0"
          >
            <div className="flex min-w-0 items-center gap-3">
              <AuthorAvatar url={author.avatarUrl} name={author.name} size={36} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{author.name}</span>
                  {author.isPublicAuthor && author.authorSlug ? (
                    <Chip variant="success" size="sm" className="text-xs">
                      Public
                    </Chip>
                  ) : (
                    <Chip variant="outline" size="sm" className="text-xs">
                      Private
                    </Chip>
                  )}
                  {author.authorSlug && (
                    <span className="text-muted-foreground text-xs">/{author.authorSlug}</span>
                  )}
                </div>
                <p className="text-muted-foreground truncate text-xs">
                  {author.authorTitle ? `${author.authorTitle} · ` : ''}
                  <span className="font-mono tabular-nums">
                    {author.publishedArticleCount}
                  </span>{' '}
                  published article{author.publishedArticleCount === 1 ? '' : 's'}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {author.isPublicAuthor && author.authorSlug && (
                <Button asChild variant="ghost" size="icon" className="size-8">
                  <Link
                    href={authorArchivePath(author.authorSlug)}
                    target="_blank"
                    aria-label={`View ${author.name}'s public archive`}
                  >
                    <ExternalLinkIcon className="size-3.5" />
                  </Link>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setEditing(author)}
                aria-label={`Edit ${author.name}`}
              >
                <PencilIcon className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {authors.length === 0 && (
          <EmptyState
            title="No admin accounts"
            description="Public authors are drawn from admin accounts only."
          />
        )}
      </div>

      {editing && (
        <AuthorFormDialog
          key={editing.id}
          author={editing}
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
    </div>
  );
}

function AuthorAvatar({ url, name, size }: { url: string | null; name: string; size: number }) {
  if (!url) {
    return (
      <span
        className="bg-muted text-muted-foreground flex shrink-0 items-center justify-center rounded-full"
        style={{ width: size, height: size }}
        aria-hidden
      >
        <UserIcon className="size-4" />
      </span>
    );
  }
  return (
    <Image
      src={url}
      alt={name}
      width={size}
      height={size}
      className="shrink-0 rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  );
}

function AuthorFormDialog({
  author,
  open,
  onOpenChange,
}: {
  author: AuthorRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState(updateAuthorProfileAction, null);
  const [isPublic, setIsPublic] = useState(author.isPublicAuthor);
  const [slug, setSlug] = useState(author.authorSlug ?? '');
  // The uploaded (or existing) headshot URL. Held in state rather than read off
  // a file input because the upload happens BEFORE submit — the form posts a URL
  // that already exists in R2, never the bytes.
  const [avatarUrl, setAvatarUrl] = useState(author.avatarUrl ?? '');
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state && 'success' in state && state.success) {
      toast.success('Author profile saved');
      onOpenChange(false);
    }
  }, [state, onOpenChange]);

  async function handleFile(file: File) {
    setUploadPct(0);
    try {
      const url = await uploadAuthorAvatar(author.id, file, setUploadPct);
      setAvatarUrl(url);
      toast.success('Photo uploaded — save to apply it');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadPct(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{author.name}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="profileId" value={author.id} />
          <input type="hidden" name="avatarUrl" value={avatarUrl} />

          {/* Photo */}
          <div className="flex items-center gap-4">
            <AuthorAvatar url={avatarUrl || null} name={author.name} size={64} />
            <div className="space-y-1">
              <Button
                type="button"
                variant="quiet"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadPct !== null}
              >
                <UploadIcon className="mr-1 size-3.5" />
                {uploadPct !== null ? `Uploading ${uploadPct}%` : 'Upload photo'}
              </Button>
              <p className="text-muted-foreground text-xs">JPG, PNG or WEBP, under 5MB.</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                }}
              />
            </div>
          </div>

          {/* The gate. Both halves are required — the checkbox alone publishes
              nobody, which is the point (see the migration's comment block). */}
          <div className="border-hairline rounded-card space-y-2 border p-3">
            <label className="flex items-start gap-2.5">
              <Checkbox
                name="isPublicAuthor"
                checked={isPublic}
                onCheckedChange={(v) => {
                  const next = v === true;
                  setIsPublic(next);
                  // Suggest a slug the moment someone is opted in, so the
                  // "slug required" error is something they rarely have to see.
                  if (next && !slug) setSlug(author.suggestedSlug);
                }}
                className="mt-0.5"
              />
              <span className="text-sm">
                <span className="font-medium">Publish as a public author</span>
                <span className="text-muted-foreground block text-xs">
                  Links the byline on every article they wrote and creates /inspire/author/
                  {slug || '…'}. Untick to de-list them — nothing is deleted.
                </span>
              </span>
            </label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="authorSlug">Slug</Label>
            <Input
              id="authorSlug"
              name="authorSlug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="esther-kang"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="authorTitle">Title</Label>
            <Input
              id="authorTitle"
              name="authorTitle"
              defaultValue={author.authorTitle ?? ''}
              placeholder="Founder & Editor"
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="authorBio">Bio</Label>
            <Textarea
              id="authorBio"
              name="authorBio"
              defaultValue={author.authorBio ?? ''}
              rows={4}
              maxLength={1000}
              placeholder="A short third-person bio shown under their articles."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="authorWebsiteUrl">Website</Label>
            <Input
              id="authorWebsiteUrl"
              name="authorWebsiteUrl"
              defaultValue={author.authorWebsiteUrl ?? ''}
              placeholder="https://example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="authorInstagramUrl">Instagram</Label>
            <Input
              id="authorInstagramUrl"
              name="authorInstagramUrl"
              defaultValue={author.authorInstagramUrl ?? ''}
              placeholder="https://instagram.com/username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="authorLinkedinUrl">LinkedIn</Label>
            <Input
              id="authorLinkedinUrl"
              name="authorLinkedinUrl"
              defaultValue={author.authorLinkedinUrl ?? ''}
              placeholder="https://linkedin.com/in/username"
            />
          </div>

          {state && 'error' in state && state.error && (
            <p className="text-destructive text-sm">{state.error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="quiet" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || uploadPct !== null}>
              {pending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
