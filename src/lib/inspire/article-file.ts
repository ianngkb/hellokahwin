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
  /**
   * Normalised before it is checked. The five classes are policy (visual-asset
   * strategy §3.1) and stay closed — but a writer typing `v` or ` V ` has
   * supplied a perfectly legitimate credit, and refusing it teaches people the
   * gate is capricious rather than protective. A gate that rejects correct work
   * is one people learn to route around, which is the single outcome the image
   * rule cannot afford. A genuinely wrong class is still refused, and the
   * message now says what each letter means instead of listing bare letters.
   */
  licenseClass: z.preprocess(
    (v) => (typeof v === 'string' ? v.trim().toUpperCase() : v),
    z.enum(LICENSE_CLASSES, {
      message:
        'licenseClass is required and must be one of ' +
        LICENSE_CLASSES.map((c) => `${c} = ${LICENSE_CLASS_LABELS[c]}`).join(' · '),
    }),
  ),
  licensorName: z
    .string()
    .trim()
    .min(1, 'licensorName is required — the legal name of the licensor'),
});

export type ArticleImage = z.infer<typeof imageSchema>;

/**
 * A body image, plus where the editor wants it.
 *
 * `placeAfter` is the number of top-level body blocks the figure sits BELOW —
 * `placeAfter: 2` puts it under the second paragraph, `0` puts it above the
 * first. Omit it and the figure is appended after the body, which is what
 * every file did before this field existed.
 *
 * It is a DECLARED position, not an inferred one, and that distinction is the
 * whole point: ingest still makes no editorial judgement about where a picture
 * belongs, it just does what the approved file says. An out-of-range value is
 * a refusal rather than a silent clamp — a figure quietly landing at the end
 * of an article the editor wanted illustrated at the top is the failure this
 * field exists to remove, and reintroducing it as a fallback would be worse
 * than not having the field at all.
 */
const bodyImageSchema = imageSchema.extend({
  placeAfter: z
    .number()
    .int('placeAfter must be a whole number of top-level blocks')
    .min(0, 'placeAfter cannot be negative')
    .optional(),
});

export type ArticleBodyImage = z.infer<typeof bodyImageSchema>;

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
  /**
   * How this article was produced. Optional, and `ai` when absent — everything
   * arriving through the agent pipeline is AI-produced unless a writer says
   * otherwise, and the safe default is the one that puts the piece in the
   * owner's review queue rather than out of it.
   *
   * A writer who genuinely hand-wrote a piece can declare `human`; one who
   * edited a draft heavily can declare `ai_assisted`. Neither changes the review
   * status — every ingested article starts at `pending_review` regardless, so
   * the claim itself still gets checked.
   */
  authorship: z.enum(['ai', 'ai_assisted', 'human']).default('ai'),
  publishedAt: z.string().datetime().optional(),
  tags: z.array(z.string().min(1)).default([]),
  cover: imageSchema,
  images: z.array(bodyImageSchema).default([]),
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
  // `![...]` covers all three markdown image forms in one pass — inline
  // `![alt](src)`, full reference `![alt][ref]` and SHORTCUT reference
  // `![ref]`, which has no second bracket at all and slipped through a
  // narrower pattern. Whatever follows is captured only to name it in the
  // error; the `![` is what decides.
  const markdownImages = [...markdown.matchAll(/!\[([^\]]*)\](\([^)]*\)|\[[^\]]*\])?/g)].map((m) =>
    m[2]?.startsWith('(') ? m[2].slice(1, -1) : `![${m[1]}]`,
  );
  // `src` with whitespace either side of the `=`, quoted or not — HTML allows
  // all of it, so the pattern has to as well.
  const htmlImages = [
    ...markdown.matchAll(/<img\b[^>]*?\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi),
  ].map((m) => m[1] ?? m[2] ?? m[3]);
  const smuggled = [...markdownImages, ...htmlImages];
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
 * Every on-site link written in the BODY, as article slugs.
 *
 * The front-matter `internalLinks` list was the only thing being validated,
 * which left the links a writer actually types into their prose completely
 * unchecked. On this site that is the wrong way round: internal linking IS the
 * architecture — the whole pillar/cluster design exists to make link structure
 * load-bearing — so a dead `[hantaran kahwin](/artikel/…/typo)` in the body is
 * a defect in the thing we are building, not a cosmetic slip.
 *
 * Recognises both shapes an editor can produce:
 *   /artikel/<category>/<slug>   the canonical article URL
 *   /<slug>                      a legacy root permalink, which still resolves
 *
 * External links (`https://…`), anchors (`#…`) and mailto are not ours to
 * verify and are left alone.
 */
export function bodyInternalLinks(markdown: string): string[] {
  const slugs = new Set<string>();
  for (const m of markdown.matchAll(/\[[^\]]*\]\((\/[^)\s]*)\)/g)) {
    const path = m[1].split('#')[0].split('?')[0].replace(/\/+$/, '');
    if (!path) continue;
    const segments = path.split('/').filter(Boolean);
    if (segments[0] === 'artikel') {
      // /artikel/<category>/<slug> — the last segment is the article.
      // /artikel/<category> is a hub, not an article; nothing to resolve.
      if (segments.length >= 3) slugs.add(segments[segments.length - 1]);
    } else if (segments.length === 1) {
      slugs.add(segments[0]);
    }
  }
  return [...slugs];
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
