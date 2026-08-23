import { z } from 'zod';
import { parse as parseYaml } from 'yaml';

/**
 * The approved-article file format, and the validator that decides whether a
 * file may become a page.
 *
 * This is the contract between the editorial team and the site. Stage 7 of the
 * production workflow hands over "an approved article file"; this defines what
 * that is — one Markdown file with YAML front matter — and what it must carry.
 *
 * Kept pure and dependency-free of the database on purpose: it is the piece
 * that must be trivially testable, because the whole point of ingest is that
 * publishing becomes boring, and boring means the failure modes are caught
 * here, in one place, with a message a person can act on.
 *
 * Two rules shape the design:
 *
 *  1. **Collect every error, then refuse once.** A writer fixing one field at a
 *     time across six runs is how a publishing path gets abandoned.
 *  2. **Never invent a value.** A missing meta description is a refusal, not a
 *     generated string. Ingest publishes what was approved; anything it made up
 *     was not reviewed by anybody.
 */

/** Approved licence classes, visual-asset strategy §3.1. There is no sixth. */
export const LICENSE_CLASSES = ['V', 'C', 'O', 'S', 'G'] as const;
export type LicenseClass = (typeof LICENSE_CLASSES)[number];

export const LICENSE_CLASS_LABELS: Record<LicenseClass, string> = {
  V: 'vendor or photographer licence',
  C: 'couple submission',
  O: 'commissioned',
  S: 'stock',
  G: 'our own graphic',
};

/**
 * The image-credit gate — the owner-level requirement, in one schema.
 *
 * "ALWAYS credit the original image source so it can be traced back."
 * The three required fields are not interchangeable and each earns its place:
 *   - `credit` is what the READER sees, in the licensor's own wording.
 *   - `licensorName` is who to ASK, years later, when scope is questioned.
 *   - `licenseClass` is what evidence has to exist for this image at all.
 *
 * A photograph with a credit line but no recorded licence class is exactly the
 * position the 682-item library is in today, and the audit's whole finding.
 */
const imageSchema = z.object({
  /** Path to the image file, relative to the article file. */
  file: z.string().min(1, 'file is required'),
  alt: z
    .string()
    .trim()
    .min(1, 'alt is required — write it in Malay, for somebody who cannot see the image'),
  caption: z.string().optional(),
  // `.trim()` before `.min(1)` on every required field, not decoration: a
  // credit of "   " passed the owner-level gate before review caught it, and
  // an image credited to whitespace is an uncredited image.
  credit: z
    .string()
    .trim()
    .min(1, 'credit is required — every image must name its original source'),
  creditUrl: z.string().url('creditUrl must be a full URL').optional(),
  licenseClass: z.enum(LICENSE_CLASSES, {
    message: `licenseClass is required and must be one of ${LICENSE_CLASSES.join(', ')}`,
  }),
  licensorName: z
    .string()
    .trim()
    .min(1, 'licensorName is required — the legal name of the licensor'),
});

export type ArticleImage = z.infer<typeof imageSchema>;

const internalLinkSchema = z.object({
  slug: z.string().min(1),
  anchor: z.string().min(1, 'anchor is required — use the target’s Malay entity phrase'),
});

export const articleFileSchema = z.object({
  title: z.string().trim().min(1, 'title is required'),
  slug: z
    .string()
    .regex(
      /^[a-z0-9][a-z0-9-]*$/,
      'slug must be lowercase letters, digits and hyphens, starting with a letter or digit',
    ),
  /** `P1`…`P7`. Resolved against the seeded categories at run time. */
  pillar: z.string().regex(/^P[1-7]$/, 'pillar must be P1–P7'),
  /** `C1.1`…`C7.5`. Resolved against the seeded categories at run time. */
  cluster: z.string().regex(/^C[1-7]\.\d+$/, 'cluster must look like C2.4'),
  metaDescription: z
    .string()
    .trim()
    .min(1, 'metaDescription is required')
    // 160 is where Google reliably truncates. A description written to fit is
    // an editorial decision; one silently cut in half is not.
    .max(160, 'metaDescription must be 160 characters or fewer'),
  excerpt: z.string().optional(),
  /** A `profiles.id` or an email that resolves to one. */
  author: z.string().trim().min(1, 'author is required'),
  status: z.enum(['draft', 'published']).default('draft'),
  publishedAt: z.string().datetime().optional(),
  tags: z.array(z.string().min(1)).default([]),
  cover: imageSchema,
  images: z.array(imageSchema).default([]),
  internalLinks: z.array(internalLinkSchema).default([]),
});

export type ArticleFile = z.infer<typeof articleFileSchema>;

export interface ParsedArticleFile {
  frontMatter: ArticleFile;
  /** Everything after the front matter, unmodified. */
  markdown: string;
}

export class ArticleFileError extends Error {
  constructor(readonly problems: string[]) {
    super(
      `This file cannot be published. ${problems.length} problem${
        problems.length === 1 ? '' : 's'
      } to fix:\n  - ${problems.join('\n  - ')}`,
    );
    this.name = 'ArticleFileError';
  }
}

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/**
 * Parse and validate an approved article file.
 *
 * Throws `ArticleFileError` listing EVERY problem found. Nothing is written by
 * the caller until this returns, which is what makes the image-credit rule a
 * genuine refusal rather than a warning somebody scrolls past.
 */
export function parseArticleFile(raw: string): ParsedArticleFile {
  const match = raw.match(FRONT_MATTER);
  if (!match) {
    throw new ArticleFileError([
      'no YAML front matter found — the file must start with a --- line, the metadata, then another --- line',
    ]);
  }

  let data: unknown;
  try {
    data = parseYaml(match[1]);
  } catch (err) {
    throw new ArticleFileError([
      `the front matter is not valid YAML: ${err instanceof Error ? err.message : String(err)}`,
    ]);
  }

  const result = articleFileSchema.safeParse(data);
  if (!result.success) {
    // `cover.credit` reads better than `Invalid input at cover → credit`, and
    // the person fixing it is looking at a YAML file, not a Zod schema.
    throw new ArticleFileError(
      result.error.issues.map((issue) => {
        const path = issue.path.join('.');
        return path ? `${path}: ${issue.message}` : issue.message;
      }),
    );
  }

  const markdown = match[2].trim();
  if (markdown.length === 0) {
    throw new ArticleFileError(['the file has front matter but no article body']);
  }

  // THE HOLE THIS CLOSES, caught in review: a markdown image written inline in
  // the body (`![alt](./foto.jpg)`) becomes an image node and renders on the
  // page — while never passing through `images`, never getting a credit, never
  // getting a media row and never being uploaded. It would have been an
  // uncredited photograph on a live page, which is the one thing the gate
  // exists to prevent.
  //
  // Images are declared in front matter, where the credit fields are required.
  // There is no second way in.
  // Three ways to put a picture in a markdown body, and all three are closed.
  // The first pass caught only the inline form; review pointed out that
  // reference-style images and raw HTML both went straight past it, which would
  // have left the gate looking shut while two doors stood open.
  const inlineImages = [...markdown.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map((m) => m[1]);
  const referenceImages = [...markdown.matchAll(/!\[[^\]]*\]\[([^\]]*)\]/g)].map(
    (m) => `[${m[1]}]`,
  );
  const htmlImages = [...markdown.matchAll(/<img\b[^>]*?src=["']?([^"'\s>]+)/gi)].map((m) => m[1]);
  const smuggled = [...inlineImages, ...referenceImages, ...htmlImages];
  if (smuggled.length > 0) {
    throw new ArticleFileError(
      smuggled.map(
        (src) =>
          `image "${src}" is written into the body — every image must be declared under \`images:\` in the front matter, where its credit, licence class and licensor are required`,
      ),
    );
  }

  return { frontMatter: result.data, markdown };
}

/** Every image the file references, cover first. */
export function allImages(file: ArticleFile): ArticleImage[] {
  return [file.cover, ...file.images];
}

/**
 * The visible credit line for an image.
 *
 * Caption and credit are different things and stay distinct: the caption
 * describes the picture, the credit names its source. When both exist they are
 * joined with an en dash rather than one silently replacing the other, which is
 * how the current library ended up with photographer names buried in captions.
 */
export function creditLine(image: Pick<ArticleImage, 'caption' | 'credit'>): string {
  const caption = image.caption?.trim();
  return caption ? `${caption} — ${image.credit}` : image.credit;
}
