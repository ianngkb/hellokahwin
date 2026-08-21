import { z } from 'zod/v4';

/**
 * A slug that is safe to put in a URL path segment. Enforced on every slug an
 * admin can type: an article slug containing a space, slash, uppercase letter,
 * `?` or `#` produces an unroutable page AND a slug-change redirect row whose
 * sourcePath can never match an incoming request.
 */
const urlSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Slug is required')
  .max(120, 'Slug is too long')
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Slug may contain only lowercase letters, numbers and single hyphens',
  );

export const articleCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  primaryCategoryId: z.string().uuid(),
  additionalCategoryIds: z.array(z.string().uuid()).optional(),
});

export type ArticleCreateInput = z.infer<typeof articleCreateSchema>;

export const articleUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  slug: urlSlugSchema.optional(),
  // M3: Validate TipTap JSON structure — root must be a 'doc' node
  content: z
    .object({ type: z.literal('doc'), content: z.array(z.unknown()) })
    .optional()
    .nullable(),
  coverImageUrl: z.string().url().optional().or(z.literal('')),
  coverImageVariants: z.unknown().optional(),
  coverImageQuality: z.string().optional(),
  coverImageFocalPoint: z
    .object({
      x: z.number().min(0).max(1),
      y: z.number().min(0).max(1),
      method: z.string(),
    })
    .optional()
    .nullable(),
  coverImageDetectionData: z.record(z.string(), z.unknown()).optional().nullable(),
  coverImageSmartCrops: z
    .record(
      z.string(),
      z.object({
        url: z.string().url(),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
      }),
    )
    .optional()
    .nullable(),
  coverImageFocalPointOverride: z
    .object({
      x: z.number().min(0).max(1),
      y: z.number().min(0).max(1),
    })
    .optional()
    .nullable(),
  metaTitle: z.string().max(70, 'Meta Title must be 70 characters or fewer').optional(),
  metaDescription: z
    .string()
    .max(160, 'Meta Description must be 160 characters or fewer')
    .optional(),
  // Compulsory for real-wedding articles (enforced in updateArticleAction, which
  // can resolve the category). < 50 chars: Pinterest rejects longer board names.
  pinterestBoardName: z
    .string()
    .max(49, 'Pinterest Board Name must be under 50 characters')
    .optional(),
  status: z.enum(['draft', 'published']).optional(),
  primaryCategoryId: z.string().uuid().optional(),
  // The credited author. NOT a uuid: `profiles.id` is the Clerk user id
  // ("user_3C5TZ…"), a plain text primary key. Whether the id is actually
  // ATTRIBUTABLE — an opted-in public author, or the house account — is checked
  // by the action against `listSelectableAuthors()`, not here; this schema is
  // imported by client components and must not reach the database.
  authorId: z.string().min(1, 'Author is required').optional(),
  publishedAt: z.string().datetime().optional().nullable(),
  // Editor-controlled "Last Updated" date. When present, persisted verbatim
  // (WYSIWYG) instead of auto-bumping updated_at to now(); see updateArticleAction.
  updatedAt: z.string().datetime().optional().nullable(),
  scheduledPublishAt: z.string().datetime().optional().nullable(),
});

export type ArticleUpdateInput = z.infer<typeof articleUpdateSchema>;

// Human-readable labels for validation error messages. Raw zod messages
// ("Too big: expected string to have <=70 characters") don't say WHICH field
// failed, which left admins guessing — always surface the field name.
const ARTICLE_FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  slug: 'Slug',
  content: 'Content',
  coverImageUrl: 'Cover Image URL',
  metaTitle: 'Meta Title',
  metaDescription: 'Meta Description',
  pinterestBoardName: 'Pinterest Board Name',
  status: 'Status',
  primaryCategoryId: 'Primary Category',
  authorId: 'Author',
  publishedAt: 'Published date',
  scheduledPublishAt: 'Scheduled publish date',
  updatedAt: 'Last Updated date',
};

/** First zod issue as a field-labelled message, e.g. "Meta Title: Too big…". */
export function formatArticleValidationError(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return 'Invalid input';
  const key = String(issue.path[0] ?? '');
  const label = ARTICLE_FIELD_LABELS[key] ?? key;
  // Skip the prefix when the message already names the field (custom messages).
  if (!label || issue.message.toLowerCase().includes(label.toLowerCase())) return issue.message;
  return `${label}: ${issue.message}`;
}

export const articleQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['draft', 'published']).optional(),
  categoryId: z.string().uuid().optional(),
  search: z.string().optional(),
});

export type ArticleQueryInput = z.infer<typeof articleQuerySchema>;

/**
 * A public link on an author's profile.
 *
 * http/https ONLY, and enforced in three places — here, a DB CHECK on the
 * column, and the fact that only these three columns are ever rendered as an
 * href. Same reasoning as `article_vendor_credits.url`: an author's "website"
 * ends up in an anchor on a public page, so a `javascript:` payload here would
 * run in the reader's browser. An empty string is the form's "cleared" signal
 * and becomes NULL in the action.
 */
function authorLinkSchema(label: string) {
  return z
    .string()
    .trim()
    .max(2048, `${label} is too long`)
    .refine((v) => /^https?:\/\/\S+$/i.test(v), `${label} must start with http:// or https://`)
    .optional()
    .or(z.literal(''));
}

/**
 * The slug shape. Deliberately stricter than `generateSlug` produces so a
 * hand-typed value can't create a URL that only half-works: lowercase letters,
 * digits and single hyphens, no leading or trailing hyphen.
 *
 * Empty is allowed at the field level and rejected by the cross-field rule
 * below only when the author is being made public — an admin must be able to
 * fill in a bio for a not-yet-published author without inventing a slug.
 */
const authorSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(80, 'Slug is too long')
  .refine(
    (v) => v === '' || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v),
    'Slug may contain only lowercase letters, numbers and single hyphens',
  );

/**
 * The admin contract for opting a staff profile in as a public author.
 *
 * This schema NEVER creates or deletes a profile — "removing" an author is
 * `isPublicAuthor: false`, which is why the flag is required rather than
 * optional: a form that omits it would otherwise be indistinguishable from one
 * that unticked it.
 */
export const authorProfileSchema = z
  .object({
    profileId: z.string().min(1, 'Profile is required'),
    authorSlug: authorSlugSchema,
    // A real boolean, not `z.coerce.boolean()` — that is JS truthiness, which
    // turns the string 'false' into true. The action pre-coerces the checkbox.
    isPublicAuthor: z.boolean(),
    authorTitle: z.string().trim().max(120, 'Title must be 120 characters or fewer').optional(),
    authorBio: z.string().trim().max(1000, 'Bio must be 1000 characters or fewer').optional(),
    authorWebsiteUrl: authorLinkSchema('Website'),
    authorInstagramUrl: authorLinkSchema('Instagram URL'),
    authorLinkedinUrl: authorLinkSchema('LinkedIn URL'),
    // The headshot, uploaded to R2 by the dialog before submit. Scheme-checked
    // for the same reason as the links: it is rendered as an image src.
    avatarUrl: authorLinkSchema('Photo URL'),
  })
  .superRefine((value, ctx) => {
    // Reported on `authorSlug`, not on the flag: the slug is the field the
    // admin has to fix, and the dialog auto-suggests one from the name.
    if (value.isPublicAuthor && !value.authorSlug) {
      ctx.addIssue({
        code: 'custom',
        path: ['authorSlug'],
        message: 'A slug is required before an author can be made public',
      });
    }
  });

export type AuthorProfileInput = z.infer<typeof authorProfileSchema>;

export const categoryCreateSchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  slug: urlSlugSchema.optional(),
  description: z.string().optional(),
  parentId: z.string().uuid().optional().or(z.literal('')),
});

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;


export const tagCreateSchema = z.object({
  name: z.string().min(1, 'Tag name is required'),
  slug: urlSlugSchema.optional(),
  // Not z.coerce.boolean() — that is JS truthiness, so it accepts anything and
  // turns the string 'false' into true. Callers pre-coerce the checkbox.
  isHidden: z.boolean().optional(),
});

export type TagCreateInput = z.infer<typeof tagCreateSchema>;

export const tagUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: urlSlugSchema.optional(),
  // See tagCreateSchema — a real boolean, not truthiness coercion.
  isHidden: z.boolean().optional(),
});

const safeUrlSchema = z
  .string()
  .min(1, 'URL is required')
  .refine(
    (val) => val.startsWith('/') || val.startsWith('https://') || val.startsWith('http://'),
    'URL must start with /, https://, or http://',
  );

export const navItemCreateSchema = z.object({
  type: z.enum(['category', 'custom_link']),
  label: z.string().min(1, 'Label is required'),
  categoryId: z.string().uuid().optional().or(z.literal('')),
  url: safeUrlSchema.optional().or(z.literal('')),
  parentId: z.string().uuid().optional().or(z.literal('')),
});

export type NavItemCreateInput = z.infer<typeof navItemCreateSchema>;

export const navItemUpdateSchema = z.object({
  label: z.string().min(1, 'Label is required').optional(),
  url: safeUrlSchema.optional().or(z.literal('')),
  isActive: z.boolean().optional(),
});

export type NavItemUpdateInput = z.infer<typeof navItemUpdateSchema>;
