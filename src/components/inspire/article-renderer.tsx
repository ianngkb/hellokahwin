import Image from 'next/image';
import { generateHTML } from '@tiptap/html';
import { Node } from '@tiptap/core';
import sanitizeHtml from 'sanitize-html';
import { decode as decodeEntities } from 'he';
import StarterKit from '@tiptap/starter-kit';
import ImageExtension from '@tiptap/extension-image';
import { InternalAwareLink } from '@/lib/inspire/internal-links';
import UnderlineExtension from '@tiptap/extension-underline';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { MoodboardSaveButton } from '@/components/moodboard/moodboard-save-button';
import { getArticleVariantUrl } from '@/lib/storage/article-image-variant';
// Moved to lib/utils when the image-credit block needed the same guard.
// Duplicating a security check is how one copy quietly stops matching the
// other, so there is exactly one.
import { safeHref } from '@/lib/utils/safe-href';
import { normaliseCaptionLabel, normaliseCreditParagraphs } from '@/lib/inspire/image-credit-label';
import {
  extractHeadings,
  createHeadingIdAssigner,
  injectHeadingIds,
} from '@/lib/inspire/heading-anchors';
import { ArticleToc } from './article-toc';

function ExternalLinkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="ml-1 inline-block size-3 -translate-y-px opacity-70"
    >
      <path d="M6.22 8.72a.75.75 0 0 0 1.06 1.06l5.22-5.22v1.69a.75.75 0 0 0 1.5 0v-3.5a.75.75 0 0 0-.75-.75h-3.5a.75.75 0 0 0 0 1.5h1.69L6.22 8.72Z" />
      <path d="M3.5 6.75c0-.69.56-1.25 1.25-1.25H7A.75.75 0 0 0 7 4H4.75A2.75 2.75 0 0 0 2 6.75v4.5A2.75 2.75 0 0 0 4.75 14h4.5A2.75 2.75 0 0 0 12 11.25V9a.75.75 0 0 0-1.5 0v2.25c0 .69-.56 1.25-1.25 1.25h-4.5c-.69 0-1.25-.56-1.25-1.25v-4.5Z" />
    </svg>
  );
}

function PdfFileIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="inline-block size-4 shrink-0"
      aria-hidden="true"
    >
      <path d="M4 1.5A1.5 1.5 0 0 0 2.5 3v10A1.5 1.5 0 0 0 4 14.5h8a1.5 1.5 0 0 0 1.5-1.5V5.621a1.5 1.5 0 0 0-.44-1.06l-2.62-2.622A1.5 1.5 0 0 0 9.38 1.5H4Zm5 1.25 3.25 3.25H10A1 1 0 0 1 9 6V2.75Z" />
    </svg>
  );
}

/** Human-readable byte size for the PDF link/button label. */
function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const CustomImageRenderer = ImageExtension.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-original-src': { default: null },
      'data-quality': { default: null },
      'data-variants': { default: null },
      'data-caption': { default: null },
      'data-caption-url': { default: null },
    };
  },
});

// Render-only definition of the inline PDF node so generateHTML() emits a
// tracked <a> for inline pdfLinkInline nodes (they live inside paragraphs, so
// they flow through the HTML pipeline + sanitizeHtml — not the block split-path).
const PdfLinkInlineRenderer = Node.create({
  name: 'pdfLinkInline',
  group: 'inline',
  inline: true,
  atom: true,
  addAttributes() {
    return {
      'data-url': { default: '' },
      'data-text': { default: 'Download PDF' },
      'data-file-size': { default: '' },
      'data-style': { default: 'link' },
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-type="pdf-link-inline"]' }];
  },
  renderHTML({ node }) {
    const url = (node.attrs['data-url'] as string) || '';
    const label = (node.attrs['data-text'] as string) || 'Download PDF';
    const size = formatBytes(Number(node.attrs['data-file-size']) || 0);
    const text = size ? `${label} (${size})` : label;
    // No url yet — render nothing meaningful (sanitize keeps an empty span out).
    if (!url) return ['span', { 'data-type': 'pdf-link-inline' }, ''];
    const isButton = node.attrs['data-style'] !== 'link';
    const cls = isButton
      ? 'bg-primary text-primary-foreground inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-semibold no-underline align-middle'
      : 'text-primary inline-flex items-center gap-1 text-sm font-medium underline underline-offset-2 align-middle';
    return [
      'a',
      { href: url, class: cls, target: '_blank', rel: 'noopener noreferrer', download: '' },
      text,
    ];
  },
});

// Render-only no-op for the dynamic-block embed atom. mergeDynamicBlocks
// substitutes/strips these server-side BEFORE render, so none should reach
// generateHTML — this definition only guarantees a stray un-merged node can
// never crash the pipeline (it renders an empty, sanitize-stripped div).
const DynamicBlockEmbedRenderer = Node.create({
  name: 'dynamicBlockEmbed',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      blockId: { default: '' },
      blockName: { default: '' },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="dynamic-block-embed"]' }];
  },
  renderHTML() {
    return ['div', { 'data-type': 'dynamic-block-embed' }];
  },
});

/**
 * Render-only stand-ins for the editor's custom block nodes.
 *
 * `splitContentByGalleryBlocks` and `unwrapSections` intercept these at the
 * document's TOP LEVEL and render them as React, so they normally never reach
 * `generateHTML`. One nested inside a blockquote, a table cell or a list item
 * does — and `generateHTML` throws on a node type it has no extension for,
 * which the catch further down then swallows, silently deleting that slice of
 * the article.
 *
 * These therefore have to do more than stop the throw: they have to RENDER.
 * An attribute-less stub would emit an empty div that sanitize-html strips,
 * which trades a crash for a quieter version of the same data loss — the
 * nested gallery, figure, CTA or PDF would still vanish. Each definition below
 * emits the same information the React path emits, in plain HTML: gallery
 * images as `<figure><img>`, a figure as image plus `<figcaption>`, a CTA and
 * a PDF as ordinary links. Unstyled and non-interactive by design — this is a
 * degraded path for content that should have been top-level, not a second
 * renderer competing with the React one above.
 */
const NESTED_BLOCK_FALLBACK_NAMES = [
  'galleryBlock',
  'sectionBlock',
  'figureBlock',
  'ctaButtonBlock',
  'pdfLinkBlock',
] as const;

/** Attributes each fallback needs to reproduce its content, per node name. */
const NESTED_BLOCK_ATTRS: Record<string, string[]> = {
  galleryBlock: ['data-images', 'data-layout', 'data-gap', 'data-show-captions'],
  sectionBlock: [],
  figureBlock: ['src', 'alt', 'data-caption', 'data-caption-url'],
  ctaButtonBlock: ['data-text', 'data-url', 'data-new-tab', 'data-align'],
  pdfLinkBlock: ['data-url', 'data-text', 'data-style', 'data-align', 'data-file-size'],
};

type DomOutput = (string | Record<string, string> | DomOutput)[];

/** `<figure><img …>[<figcaption>…</figcaption>]</figure>` in Tiptap's DOM-spec form. */
function figureSpec(src: string, alt: string, caption: string, captionUrl: string): DomOutput {
  const children: DomOutput = [['img', { src, alt, loading: 'lazy' }]];
  // RIGHTS-01: a figcaption here is EITHER a credit or a descriptive caption.
  // `normaliseCaptionLabel` relabels only the credits and returns teaching
  // captions untouched — see `image-credit-label.ts`.
  const label = normaliseCaptionLabel(caption);
  if (label) {
    children.push([
      'figcaption',
      {},
      captionUrl ? ['a', { href: captionUrl, rel: 'noopener noreferrer' }, label] : label,
    ]);
  }
  return ['figure', {}, ...children];
}

function nestedGallerySpec(attrs: Record<string, unknown>): DomOutput {
  let images: unknown = [];
  try {
    images = JSON.parse((attrs['data-images'] as string) || '[]');
  } catch {
    images = [];
  }
  const figures: DomOutput = [];
  if (Array.isArray(images)) {
    for (const img of images) {
      if (!img || typeof img !== 'object') continue;
      const { src, alt, caption, captionUrl } = img as Record<string, unknown>;
      if (typeof src !== 'string' || !src) continue;
      figures.push(
        figureSpec(
          src,
          typeof alt === 'string' ? alt : '',
          typeof caption === 'string' ? caption : '',
          typeof captionUrl === 'string' ? captionUrl : '',
        ),
      );
    }
  }
  return ['div', { 'data-type': 'galleryBlock' }, ...figures];
}

const NestedBlockFallbacks = NESTED_BLOCK_FALLBACK_NAMES.map((name) =>
  Node.create({
    name,
    group: 'block',
    // `sectionBlock` is the only one that wraps other nodes, and `figureBlock`
    // may carry a legacy inline caption. Giving the rest a content expression
    // they never satisfy would make the document invalid.
    content: name === 'sectionBlock' ? 'block+' : name === 'figureBlock' ? 'inline*' : undefined,
    atom: name !== 'sectionBlock' && name !== 'figureBlock',
    addAttributes() {
      return Object.fromEntries(
        (NESTED_BLOCK_ATTRS[name] ?? []).map((attr) => [attr, { default: null }]),
      );
    },
    renderHTML({ node }) {
      const attrs = node.attrs as Record<string, unknown>;
      const str = (key: string) => (typeof attrs[key] === 'string' ? (attrs[key] as string) : '');

      switch (name) {
        case 'sectionBlock':
          // A transparent wrapper: `0` is the content hole, so the children
          // render exactly as they would have unwrapped.
          return ['div', { 'data-type': 'sectionBlock' }, 0] as never;

        case 'galleryBlock':
          return nestedGallerySpec(attrs) as never;

        case 'figureBlock': {
          const src = str('src');
          // No src and no stored caption means the caption lives in the node's
          // inline content (the legacy shape); keep the hole so it survives.
          if (!src) return ['figure', {}, ['figcaption', {}, 0]] as never;
          return figureSpec(src, str('alt'), str('data-caption'), str('data-caption-url')) as never;
        }

        case 'ctaButtonBlock': {
          const url = str('data-url');
          const text = str('data-text') || 'Learn More';
          if (!url) return ['p', {}, text] as never;
          return [
            'p',
            {},
            [
              'a',
              str('data-new-tab') === 'true'
                ? { href: url, target: '_blank', rel: 'noopener noreferrer' }
                : { href: url },
              text,
            ],
          ] as never;
        }

        case 'pdfLinkBlock': {
          const url = str('data-url');
          const text = str('data-text') || 'Download PDF';
          if (!url) return ['p', {}, text] as never;
          return [
            'p',
            {},
            ['a', { href: url, target: '_blank', rel: 'noopener noreferrer', download: '' }, text],
          ] as never;
        }

        default:
          return ['div', { 'data-type': name }] as never;
      }
    },
  }),
);

/**
 * Also exported for `__tests__/article-nested-blocks.test.ts`, which asserts
 * that a custom block nested inside a blockquote/list/table still renders its
 * content rather than throwing or vanishing.
 */
export const extensions = [
  StarterKit,
  CustomImageRenderer,
  PdfLinkInlineRenderer,
  DynamicBlockEmbedRenderer,
  ...NestedBlockFallbacks,
  // Internal links are emitted followed and same-tab; see the module header.
  InternalAwareLink.configure({ openOnClick: false }),
  UnderlineExtension,
  Table,
  TableRow,
  TableHeader,
  TableCell,
];

interface ArticleRendererProps {
  content: unknown;
  articleId?: string;
  savedImageUrls?: string[];
  vendorCredits?: { listingId: string | null; vendorName: string }[];
  inlineBanner?: React.ReactNode;
}

/**
 * Split HTML around <img> tags so we can render images with next/image
 * while keeping the rest as raw HTML.
 */
type HtmlPart =
  | { type: 'html'; value: string }
  | {
      type: 'img';
      src: string;
      alt: string;
      caption: string | null;
      captionUrl: string | null;
      width: number;
      height: number;
    };

// Default intrinsic size used only when the real dimensions can't be derived
// from the URL. Matches the historical hard-coded 3:2 box.
const FALLBACK_IMG_WIDTH = 1200;
const FALLBACK_IMG_HEIGHT = 800;

// R2 / WP-import image URLs encode the rendered pixel size as `-{w}x{h}/` just
// before the variant filename, e.g. `.../foo-1024x683/high.webp`. Parsing the
// true aspect ratio lets next/image reserve a correctly-shaped box, eliminating
// the layout shift that the fixed 1200×800 caused for portrait photos (CLS).
function parseImageDims(src: string): { width: number; height: number } {
  const m = src.match(/-(\d{2,5})x(\d{2,5})\/[^/]+$/);
  if (m) {
    const width = parseInt(m[1], 10);
    const height = parseInt(m[2], 10);
    if (width > 0 && height > 0) return { width, height };
  }
  return { width: FALLBACK_IMG_WIDTH, height: FALLBACK_IMG_HEIGHT };
}

function splitHtmlByImages(rawHtml: string): HtmlPart[] {
  // RIGHTS-01: some imported credits are body paragraphs rather than figure
  // captions, so they never reach the figcaption path below.
  const html = normaliseCreditParagraphs(rawHtml);
  const parts: HtmlPart[] = [];
  const imgRegex = /<img\s+[^>]*src="([^"]*)"[^>]*>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = imgRegex.exec(html)) !== null) {
    // Add preceding HTML
    if (match.index > lastIndex) {
      const segment = html.slice(lastIndex, match.index).trim();
      if (segment) parts.push({ type: 'html', value: segment });
    }

    // Extract alt, data-caption, and data-caption-url attributes.
    //
    // These are pulled with a regex out of ALREADY-SANITIZED HTML, where
    // sanitize-html has entity-encoded the attribute values. React then
    // renders the extracted string as text and escapes it again, so a caption
    // reading `Tom & Jerry` reached the page as `Tom &amp; Jerry` — and a
    // caption URL with a query string lost its `&` separators outright.
    // Decoding once here undoes the sanitizer's encoding and nothing more:
    // sanitize-html parses and validates on the DECODED value (that is how it
    // rejects `javascript:` however it is spelled) and only re-encodes on
    // output, so this cannot resurrect a scheme it already refused.
    const altMatch = match[0].match(/alt="([^"]*)"/i);
    const captionMatch = match[0].match(/data-caption="([^"]*)"/i);
    const captionUrlMatch = match[0].match(/data-caption-url="([^"]*)"/i);
    const src = decodeEntities(match[1]);
    const { width, height } = parseImageDims(src);
    parts.push({
      type: 'img',
      src,
      alt: altMatch?.[1] ? decodeEntities(altMatch[1]) : '',
      caption: captionMatch?.[1] ? decodeEntities(captionMatch[1]) : null,
      captionUrl: captionUrlMatch?.[1] ? decodeEntities(captionUrlMatch[1]) : null,
      width,
      height,
    });
    lastIndex = match.index + match[0].length;
  }

  // Add trailing HTML
  if (lastIndex < html.length) {
    const segment = html.slice(lastIndex).trim();
    if (segment) parts.push({ type: 'html', value: segment });
  }

  return parts;
}

// ── Gallery block types ──────────────────────────────────────────────────

interface GalleryBlockImage {
  mediaId?: string;
  src: string;
  alt: string;
  caption: string;
  captionUrl: string;
  width?: number;
  height?: number;
}

interface GalleryBlockData {
  images: GalleryBlockImage[];
  layout: string;
  gap: number;
  showCaptions: boolean;
}

// ── Section unwrapping ───────────────────────────────────────────────────

/**
 * Recursively remove sectionBlock wrappers, promoting their children
 * to the parent level. Sections are editor-only — invisible on public pages.
 */
function unwrapSections(nodes: unknown[]): unknown[] {
  const result: unknown[] = [];
  for (const node of nodes) {
    const n = node as { type: string; content?: unknown[] };
    if (n.type === 'sectionBlock' && n.content) {
      result.push(...unwrapSections(n.content));
    } else {
      result.push(node);
    }
  }
  return result;
}

// ── Content preprocessing ────────────────────────────────────────────────

interface FigureBlockData {
  src: string;
  alt: string;
  captionHtml: string;
  caption: string;
  captionUrl: string;
}

type ContentPart =
  | { type: 'nodes'; nodes: unknown[] }
  | { type: 'gallery'; data: GalleryBlockData }
  | { type: 'figure'; data: FigureBlockData }
  | { type: 'ctaButton'; data: { text: string; url: string; newTab: boolean; align: string } }
  | {
      type: 'pdfLink';
      data: { url: string; text: string; style: string; align: string; fileSize: number };
    };

/**
 * Pre-process Tiptap JSON content to extract galleryBlock nodes,
 * splitting the content into segments that can be rendered differently.
 */
function splitContentByGalleryBlocks(content: unknown): ContentPart[] {
  if (!content || typeof content !== 'object') return [];

  const doc = content as { type: string; content?: unknown[] };
  if (!doc.content || !Array.isArray(doc.content)) return [];

  // Unwrap sections first — sections are editor-only
  const flatContent = unwrapSections(doc.content);

  const parts: ContentPart[] = [];
  let currentNodes: unknown[] = [];

  for (const node of flatContent) {
    const n = node as { type: string; attrs?: Record<string, unknown>; content?: unknown[] };
    if (n.type === 'galleryBlock') {
      // Flush accumulated nodes
      if (currentNodes.length > 0) {
        parts.push({ type: 'nodes', nodes: currentNodes });
        currentNodes = [];
      }

      // Parse gallery block data
      let images: GalleryBlockImage[] = [];
      try {
        images = JSON.parse((n.attrs?.['data-images'] as string) || '[]');
      } catch (err) {
        console.warn('Failed to parse gallery block images:', err);
      }

      const rawGap = Number(n.attrs?.['data-gap'] || 8);
      const gap = Number.isFinite(rawGap) ? Math.max(0, Math.min(rawGap, 64)) : 8;

      parts.push({
        type: 'gallery',
        data: {
          images,
          layout: (n.attrs?.['data-layout'] as string) || 'grid-2',
          gap,
          showCaptions:
            n.attrs?.['data-show-captions'] !== false &&
            n.attrs?.['data-show-captions'] !== 'false',
        },
      });
    } else if (n.type === 'figureBlock') {
      // Flush accumulated nodes
      if (currentNodes.length > 0) {
        parts.push({ type: 'nodes', nodes: currentNodes });
        currentNodes = [];
      }

      const src = (n.attrs?.src as string) || '';
      const alt = (n.attrs?.alt as string) || '';
      const caption = (n.attrs?.['data-caption'] as string) || '';
      const captionUrl = (n.attrs?.['data-caption-url'] as string) || '';

      // Generate caption HTML from figure's inline content (backward compat)
      let captionHtml = '';
      if (!caption && n.content && n.content.length > 0) {
        try {
          const captionDoc = {
            type: 'doc',
            content: [{ type: 'paragraph', content: n.content }],
          };
          captionHtml = generateHTML(
            captionDoc as Parameters<typeof generateHTML>[0],
            extensions as Parameters<typeof generateHTML>[1],
          );
          captionHtml = sanitizeHtml(captionHtml, sanitizeOptions);
        } catch {
          captionHtml = '';
        }
      }

      parts.push({
        type: 'figure',
        data: { src, alt, captionHtml, caption, captionUrl },
      });
    } else if (n.type === 'ctaButtonBlock') {
      if (currentNodes.length > 0) {
        parts.push({ type: 'nodes', nodes: currentNodes });
        currentNodes = [];
      }

      parts.push({
        type: 'ctaButton',
        data: {
          text: (n.attrs?.['data-text'] as string) || 'Learn More',
          url: (n.attrs?.['data-url'] as string) || '',
          newTab: n.attrs?.['data-new-tab'] === 'true',
          align: (n.attrs?.['data-align'] as string) || 'center',
        },
      });
    } else if (n.type === 'pdfLinkBlock') {
      if (currentNodes.length > 0) {
        parts.push({ type: 'nodes', nodes: currentNodes });
        currentNodes = [];
      }

      parts.push({
        type: 'pdfLink',
        data: {
          url: (n.attrs?.['data-url'] as string) || '',
          text: (n.attrs?.['data-text'] as string) || 'Download PDF',
          style: (n.attrs?.['data-style'] as string) || 'button',
          align: (n.attrs?.['data-align'] as string) || 'center',
          fileSize: Number(n.attrs?.['data-file-size']) || 0,
        },
      });
    } else {
      currentNodes.push(node);
    }
  }

  // Flush remaining nodes
  if (currentNodes.length > 0) {
    parts.push({ type: 'nodes', nodes: currentNodes });
  }

  return parts;
}

function renderHtmlParts(
  html: string,
  articleId: string | undefined,
  savedImageUrls: string[] | undefined,
  vendorCredits: { listingId: string | null; vendorName: string }[] | undefined,
  keyPrefix: string,
): React.ReactNode[] {
  const parts = splitHtmlByImages(html);
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    // RIGHTS-01: one label, one casing, normalised at render. Descriptive
    // captions pass through unchanged; `null` means there is nothing to show,
    // including a caption that is a bare label with no owner after it.
    const creditLabel = part.type === 'html' ? null : normaliseCaptionLabel(part.caption);
    if (part.type === 'html') {
      elements.push(
        <div key={`${keyPrefix}-${i}`} dangerouslySetInnerHTML={{ __html: part.value }} />,
      );
    } else if (creditLabel) {
      elements.push(
        <figure
          key={`${keyPrefix}-${i}`}
          className="group relative my-6 lg:mx-auto lg:w-fit lg:max-w-[680px]"
        >
          <Image
            src={getArticleVariantUrl(part.src, 'high')}
            alt={part.alt}
            width={part.width}
            height={part.height}
            sizes="(max-width: 768px) 100vw, 680px"
            className="h-auto w-full rounded-md lg:w-auto"
          />
          {articleId && (
            <MoodboardSaveButton
              photoUrl={part.src}
              source="inspire_upload"
              sourceMetadata={{
                type: 'inspire_upload',
                articleId,
                vendorNames: vendorCredits
                  ?.filter((c) => c.listingId)
                  .map((c) => ({ id: c.listingId!, name: c.vendorName, type: 'vendor' })),
              }}
              isSaved={savedImageUrls?.includes(part.src)}
            />
          )}
          <figcaption
            className="absolute inset-x-0 bottom-0 rounded-b-md bg-gradient-to-t from-black/70 to-transparent px-3 pt-10 pb-3 text-xs text-white italic"
            style={{ textShadow: 'var(--text-shadow-scrim)', fontFamily: 'var(--font-now-alt)' }}
          >
            {safeHref(part.captionUrl) ? (
              <a
                href={safeHref(part.captionUrl)!}
                className="transition-opacity hover:opacity-80"
                style={{ color: 'white' }}
                target="_blank"
                rel="noopener noreferrer"
              >
                {creditLabel}
                <ExternalLinkIcon />
              </a>
            ) : (
              creditLabel
            )}
          </figcaption>
        </figure>,
      );
    } else {
      elements.push(
        <div
          key={`${keyPrefix}-${i}`}
          className="group relative lg:mx-auto lg:w-fit lg:max-w-[680px]"
        >
          <Image
            src={getArticleVariantUrl(part.src, 'high')}
            alt={part.alt}
            width={part.width}
            height={part.height}
            sizes="(max-width: 768px) 100vw, 680px"
            className="h-auto w-full rounded-md lg:w-auto"
          />
          {articleId && (
            <MoodboardSaveButton
              photoUrl={part.src}
              source="inspire_upload"
              sourceMetadata={{
                type: 'inspire_upload',
                articleId,
                vendorNames: vendorCredits
                  ?.filter((c) => c.listingId)
                  .map((c) => ({ id: c.listingId!, name: c.vendorName, type: 'vendor' })),
              }}
              isSaved={savedImageUrls?.includes(part.src)}
            />
          )}
        </div>,
      );
    }
  }

  return elements;
}

// ── Gallery grid layouts ─────────────────────────────────────────────────

const gridClasses: Record<string, string> = {
  'grid-1': 'flex flex-col',
  'grid-2': 'flex',
  'grid-3': 'flex',
  masonry: 'columns-2 sm:columns-3',
};

function GalleryImage({
  img,
  isMasonry,
  layout,
  articleId,
  savedImageUrls,
  vendorCredits,
  showCaption,
}: {
  img: GalleryBlockImage;
  isMasonry: boolean;
  layout: string;
  articleId?: string;
  savedImageUrls?: string[];
  vendorCredits?: { listingId: string | null; vendorName: string }[];
  showCaption: boolean;
}) {
  const saveButton = articleId ? (
    <MoodboardSaveButton
      photoUrl={img.src}
      source="inspire_upload"
      sourceMetadata={{
        type: 'inspire_upload',
        articleId,
        vendorNames: vendorCredits
          ?.filter((c) => c.listingId)
          .map((c) => ({ id: c.listingId!, name: c.vendorName, type: 'vendor' })),
      }}
      isSaved={savedImageUrls?.includes(img.src)}
    />
  ) : null;

  const caption =
    showCaption && img.caption ? (
      <div className="absolute inset-x-0 bottom-0 rounded-b-md bg-gradient-to-t from-black/60 to-transparent px-2 pt-6 pb-1.5 text-[10px] text-white/90 italic">
        {safeHref(img.captionUrl) ? (
          <a
            href={safeHref(img.captionUrl)!}
            className="transition-opacity hover:opacity-80"
            style={{ color: 'white' }}
            target="_blank"
            rel="noopener noreferrer"
          >
            {img.caption}
            <ExternalLinkIcon />
          </a>
        ) : (
          img.caption
        )}
      </div>
    ) : null;

  const sizes =
    layout === 'grid-1'
      ? '(max-width: 768px) 100vw, 680px'
      : layout === 'grid-3'
        ? '(max-width: 768px) 33vw, 227px'
        : '(max-width: 768px) 50vw, 340px';

  // Single-column gallery cells render at ~680px (large) → high variant.
  // Multi-up cells render at 227-340px → low is plenty.
  const variant = layout === 'grid-1' ? 'high' : 'low';

  return (
    <div className="group relative overflow-hidden rounded-md">
      <Image
        src={getArticleVariantUrl(img.src, variant)}
        alt={img.alt || ''}
        width={img.width || 800}
        height={img.height || 800}
        sizes={sizes}
        className="h-auto w-full"
      />
      {saveButton}
      {caption}
    </div>
  );
}

function GalleryRenderer({
  data,
  articleId,
  savedImageUrls,
  vendorCredits,
  keyPrefix,
}: {
  data: GalleryBlockData;
  articleId?: string;
  savedImageUrls?: string[];
  vendorCredits?: { listingId: string | null; vendorName: string }[];
  keyPrefix: string;
}) {
  const isMasonry = data.layout === 'masonry';
  const isGrid1 = data.layout === 'grid-1';
  const isRow = !isMasonry && !isGrid1;

  if (isRow) {
    const cols = data.layout === 'grid-3' ? 3 : 2;
    const rows = Array.from({ length: Math.ceil(data.images.length / cols) }, (_, rowIdx) =>
      data.images.slice(rowIdx * cols, rowIdx * cols + cols),
    );
    return (
      <div className="flex flex-col" style={{ gap: `${data.gap}px` }}>
        {rows.map((rowImages, rowIdx) => (
          <div key={`${keyPrefix}-row-${rowIdx}`} className="flex" style={{ gap: `${data.gap}px` }}>
            {rowImages.map((img, colIdx) => {
              const j = rowIdx * cols + colIdx;
              const aspectRatio = img.width && img.height ? img.width / img.height : 1;
              return (
                <div key={`${keyPrefix}-gi-${j}`} style={{ flex: `${aspectRatio} 1 0%` }}>
                  <GalleryImage
                    img={img}
                    isMasonry={false}
                    layout={data.layout}
                    articleId={articleId}
                    savedImageUrls={savedImageUrls}
                    vendorCredits={vendorCredits}
                    showCaption={data.showCaptions}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={gridClasses[data.layout] || gridClasses['grid-2']}
      style={{ gap: `${data.gap}px` }}
    >
      {data.images.map((img, j) => (
        <div key={`${keyPrefix}-gi-${j}`} className={isMasonry ? 'mb-2 break-inside-avoid' : ''}>
          <GalleryImage
            img={img}
            isMasonry={isMasonry}
            layout={data.layout}
            articleId={articleId}
            savedImageUrls={savedImageUrls}
            vendorCredits={vendorCredits}
            showCaption={data.showCaptions}
          />
        </div>
      ))}
    </div>
  );
}

// ── Main renderer ────────────────────────────────────────────────────────

export function ArticleRenderer({
  content,
  articleId,
  savedImageUrls,
  vendorCredits,
  inlineBanner,
}: ArticleRendererProps) {
  if (!content) {
    return <p className="text-muted-foreground">No content yet.</p>;
  }

  // Split content into segments: regular nodes and gallery blocks
  const contentParts = splitContentByGalleryBlocks(content);

  // Anchors, and the contents list built from them. `extractHeadings` walks
  // the Tiptap JSON; `assignId` walks the rendered HTML further down. Both go
  // in document order through the same id contract, which is what makes every
  // `href="#…"` in the TOC resolve — see `lib/inspire/heading-anchors.ts`.
  const headings = extractHeadings(content);
  const toc = <ArticleToc headings={headings} />;

  // If no gallery/figure blocks exist, fall back to the original single-pass approach.
  // Build a clean doc from the unwrapped nodes (sections removed) so generateHTML works.
  if (contentParts.length === 0 || contentParts.every((p) => p.type === 'nodes')) {
    const allNodes = contentParts.flatMap((p) => (p.type === 'nodes' ? p.nodes : []));
    const cleanContent = allNodes.length > 0 ? { type: 'doc', content: allNodes } : content;
    return renderOriginal(
      cleanContent,
      articleId,
      savedImageUrls,
      vendorCredits,
      inlineBanner,
      toc,
    );
  }

  // ONE assigner for the whole article: the renderer sanitises each content
  // chunk separately, and a fresh assigner per chunk would restart the
  // de-duplication counter partway down the page.
  const assignId = createHeadingIdAssigner();

  // Render each segment
  const allElements: React.ReactNode[] = [];
  let partIndex = 0;

  for (const part of contentParts) {
    if (part.type === 'gallery') {
      allElements.push(
        <div key={`gallery-${partIndex}`} className="my-8 lg:mx-auto lg:max-w-[680px]">
          <GalleryRenderer
            data={part.data}
            articleId={articleId}
            savedImageUrls={savedImageUrls}
            vendorCredits={vendorCredits}
            keyPrefix={`g${partIndex}`}
          />
        </div>,
      );
    } else if (part.type === 'figure') {
      const { src, alt, caption, captionUrl, captionHtml } = part.data;
      if (src) {
        const figureDims = parseImageDims(src);
        allElements.push(
          <figure
            key={`figure-${partIndex}`}
            className="group relative my-6 lg:mx-auto lg:w-fit lg:max-w-[680px]"
          >
            <Image
              src={getArticleVariantUrl(src, 'high')}
              alt={alt}
              width={figureDims.width}
              height={figureDims.height}
              sizes="(max-width: 768px) 100vw, 680px"
              className="h-auto w-full rounded-md lg:w-auto"
            />
            {articleId && (
              <MoodboardSaveButton
                photoUrl={src}
                source="inspire_upload"
                sourceMetadata={{
                  type: 'inspire_upload',
                  articleId,
                  vendorNames: vendorCredits
                    ?.filter((c) => c.listingId)
                    .map((c) => ({ id: c.listingId!, name: c.vendorName, type: 'vendor' })),
                }}
                isSaved={savedImageUrls?.includes(src)}
              />
            )}
            {caption ? (
              <figcaption
                className="absolute inset-x-0 bottom-0 rounded-b-md bg-gradient-to-t from-black/70 to-transparent px-3 pt-10 pb-3 text-xs text-white italic"
                style={{
                  textShadow: 'var(--text-shadow-scrim)',
                  fontFamily: 'var(--font-now-alt)',
                }}
              >
                {safeHref(captionUrl) ? (
                  <a
                    href={safeHref(captionUrl)!}
                    className="transition-opacity hover:opacity-80"
                    style={{ color: 'white' }}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {caption}
                    <ExternalLinkIcon />
                  </a>
                ) : (
                  caption
                )}
              </figcaption>
            ) : captionHtml ? (
              <figcaption
                className="absolute inset-x-0 bottom-0 rounded-b-md bg-gradient-to-t from-black/70 to-transparent px-3 pt-10 pb-3 text-xs text-white italic"
                style={{ textShadow: 'var(--text-shadow-scrim)' }}
                dangerouslySetInnerHTML={{ __html: captionHtml }}
              />
            ) : null}
          </figure>,
        );
      }
    } else if (part.type === 'ctaButton') {
      const ctaHref = safeHref(part.data.url);
      const ctaLabel = part.data.text || 'Learn More';
      const ctaClassName =
        'inline-block rounded-full bg-primary px-8 py-3 text-sm font-semibold shadow-sm hover:bg-primary/90 transition-colors no-underline';
      allElements.push(
        <div
          key={`cta-${partIndex}`}
          className={`my-8 flex ${part.data.align === 'left' ? 'justify-start' : part.data.align === 'right' ? 'justify-end' : 'justify-center'}`}
        >
          {ctaHref ? (
            <a
              href={ctaHref}
              target={part.data.newTab ? '_blank' : undefined}
              rel={part.data.newTab ? 'noopener noreferrer' : undefined}
              className={ctaClassName}
              style={{ color: 'var(--primary-foreground)', textDecoration: 'none' }}
            >
              {ctaLabel}
            </a>
          ) : (
            <span className={ctaClassName} style={{ color: 'var(--primary-foreground)' }}>
              {ctaLabel}
            </span>
          )}
        </div>,
      );
    } else if (part.type === 'pdfLink') {
      const pdfHref = safeHref(part.data.url);
      const pdfLabel = part.data.text || 'Download PDF';
      const pdfSize = formatBytes(part.data.fileSize);
      const isButton = part.data.style !== 'link';
      allElements.push(
        <div
          key={`pdf-${partIndex}`}
          className={`my-4 flex ${part.data.align === 'left' ? 'justify-start' : part.data.align === 'right' ? 'justify-end' : 'justify-center'}`}
        >
          {pdfHref ? (
            isButton ? (
              <a
                href={pdfHref}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold no-underline shadow-sm transition-colors"
                style={{ color: 'var(--primary-foreground)', textDecoration: 'none' }}
              >
                <PdfFileIcon />
                {pdfLabel}
                {pdfSize && <span style={{ opacity: 0.8 }}>({pdfSize})</span>}
              </a>
            ) : (
              <a
                href={pdfHref}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="text-primary inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-2"
              >
                <PdfFileIcon />
                {pdfLabel}
                {pdfSize && <span className="text-muted-foreground">({pdfSize})</span>}
              </a>
            )
          ) : (
            <span className="text-muted-foreground text-sm">{pdfLabel}</span>
          )}
        </div>,
      );
    } else {
      // Render this chunk of nodes as HTML
      const subDoc = { type: 'doc', content: part.nodes };
      try {
        const raw = generateHTML(
          subDoc as Parameters<typeof generateHTML>[0],
          extensions as Parameters<typeof generateHTML>[1],
        );
        const html = injectHeadingIds(
          wrapTablesForScroll(sanitizeHtml(raw, sanitizeOptions)),
          assignId,
        );
        const htmlElements = renderHtmlParts(
          html,
          articleId,
          savedImageUrls,
          vendorCredits,
          `p${partIndex}`,
        );
        allElements.push(...htmlElements);
      } catch (err) {
        // Still skip the chunk — one bad slice must not take the article down —
        // but say so. Swallowing this silently deleted content from published
        // articles with nothing anywhere to indicate it had happened.
        console.error('[article-renderer] skipped unrenderable content chunk', {
          articleId,
          partIndex,
          nodeTypes: [...new Set(part.nodes.map((n) => (n as { type?: string }).type))],
          error: err,
        });
      }
    }
    partIndex++;
  }

  // Insert inline banner at midpoint (simplified: after half the parts)
  if (inlineBanner && allElements.length >= 4) {
    const mid = Math.floor(allElements.length / 2);
    allElements.splice(mid, 0, <div key="inline-ad">{inlineBanner}</div>);
  }

  return (
    // `inspire-prose` and `max-w-none` only: the `prose*` variants that used to
    // sit alongside them were inert, because @tailwindcss/typography is not
    // installed and deliberately stays uninstalled. What they claimed to do is
    // already done by hand in globals.css - heading tracking, paragraph
    // leading and `img { border-radius }` all live under `.inspire-prose`.
    <div className="inspire-prose max-w-none">
      {toc}
      {allElements}
    </div>
  );
}

/**
 * Exported for `__tests__/article-sanitize.test.ts`. The allowlist is the only
 * thing standing between editor output and the public page, so which
 * attributes survive it is worth asserting rather than eyeballing.
 */
export const sanitizeOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    'img',
    'figure',
    'figcaption',
    'iframe',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'data-caption', 'data-caption-url'],
    a: ['href', 'target', 'rel', 'download', 'class'],
    // `loading` lets Instagram embeds lazy-load; `scrolling` keeps the classic
    // IG embed markup from growing scrollbars inside the fixed-height frame.
    iframe: ['src', 'width', 'height', 'frameborder', 'allowfullscreen', 'loading', 'scrolling'],
    th: ['colspan', 'rowspan', 'colwidth', 'style'],
    td: ['colspan', 'rowspan', 'colwidth', 'style'],
    // The editor lets an author pick a/A/i/I numbering (and a start value),
    // and `globals.css` has the matching `.inspire-prose ol[type=…]` rules —
    // but with no `ol` entry here sanitize-html stripped the attributes, so
    // every choice silently reverted to 1, 2, 3 on the live article.
    ol: ['type', 'start'],
  },
  allowedStyles: {
    th: { width: [/^\d+(\.\d+)?px$/], 'min-width': [/^\d+(\.\d+)?px$/] },
    td: { width: [/^\d+(\.\d+)?px$/], 'min-width': [/^\d+(\.\d+)?px$/] },
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  // instagram.com serves a no-JS post embed at /p/<shortcode>/embed — used by
  // editorial roundups to show a vendor's own photography without rehosting it
  // (the imagery stays on the platform, attribution built in). The hostname
  // allowlist remains the enforcement boundary.
  allowedIframeHostnames: [
    'www.youtube.com',
    'youtube.com',
    'player.vimeo.com',
    'vimeo.com',
    'www.instagram.com',
    'instagram.com',
  ],
};

/**
 * Wrap each `<table>` in a horizontal-scroll container so a table with px
 * column widths (allowed through the sanitizer above) scrolls inside its own
 * box instead of forcing whole-page sideways scroll on phones. The editor
 * already does this (`.ProseMirror .tableWrapper`); the public render lost it
 * because `generateHTML` emits bare tables. Runs AFTER sanitizeHtml — the
 * wrapper div never passes through the sanitizer's allowlist. Tiptap tables
 * never nest, so the non-greedy match closes at the right `</table>`.
 *
 * Tables containing an `<img>` are left unwrapped: the downstream
 * `splitHtmlByImages` slices the HTML at every `<img>` tag, so a wrapper div
 * around such a table would open in one fragment and close in another.
 */
export function wrapTablesForScroll(html: string): string {
  return html.replace(/<table[\s>][\s\S]*?<\/table>/gi, (table) =>
    table.includes('<img') ? table : `<div class="table-scroll-wrapper">${table}</div>`,
  );
}

/**
 * Original rendering path — used when no gallery/figure/cta blocks exist.
 *
 * Splits the inline ad banner between **top-level Tiptap nodes** rather than
 * mid-HTML-string. The previous heuristic counted `</p>` tags and sliced the
 * sanitized HTML at the midpoint `</p>`, which broke `<table>` (and lists,
 * blockquotes, …) when the midpoint paragraph lived inside a `<td>`/`<li>`/etc.
 * Rendering each half as its own subdoc keeps every container block intact.
 */
function renderOriginal(
  content: unknown,
  articleId?: string,
  savedImageUrls?: string[],
  vendorCredits?: { listingId: string | null; vendorName: string }[],
  inlineBanner?: React.ReactNode,
  toc?: React.ReactNode,
): React.ReactNode {
  // Same as the wrapper above: the `prose*` classes here matched nothing.
  const wrapperClassName = 'inspire-prose max-w-none';

  // One assigner per ATTEMPT, shared across that attempt's halves: the banner
  // path sanitises the article in two passes, and restarting the counter at
  // the midpoint would let a heading in the second half reuse an id from the
  // first. The retry below starts a fresh assigner for the same reason in
  // reverse — reusing the failed attempt's would suffix every id with `-2`.
  const renderHalf = (
    nodes: unknown[],
    keyPrefix: string,
    assignId: (text: string) => string,
  ): React.ReactNode[] => {
    const subDoc = { type: 'doc', content: nodes };
    const raw = generateHTML(
      subDoc as Parameters<typeof generateHTML>[0],
      extensions as Parameters<typeof generateHTML>[1],
    );
    const html = injectHeadingIds(
      wrapTablesForScroll(sanitizeHtml(raw, sanitizeOptions)),
      assignId,
    );
    return renderHtmlParts(html, articleId, savedImageUrls, vendorCredits, keyPrefix);
  };

  // Pull out top-level nodes for JSON-level splitting. The current caller
  // (splitContentByGalleryBlocks) already unwraps sections, but call
  // unwrapSections defensively so this function stays self-contained — a
  // future caller passing raw content with sectionBlocks won't accidentally
  // collapse a whole section into a single "node" and skew the midpoint.
  const doc = content as { type?: string; content?: unknown[] } | null;
  const rawNodes = Array.isArray(doc?.content) ? (doc as { content: unknown[] }).content : [];
  const nodes = unwrapSections(rawNodes);

  // Fast path: no banner, or too few top-level nodes to bother splitting.
  if (!inlineBanner || nodes.length < 4) {
    let elements: React.ReactNode[];
    try {
      elements = renderHalf(nodes, 'all', createHeadingIdAssigner());
    } catch {
      return <p className="text-muted-foreground">Unable to render content.</p>;
    }
    return (
      <div className={wrapperClassName}>
        {toc}
        {elements}
      </div>
    );
  }

  // Banner path: split between top-level nodes so structured blocks
  // (`table`, `bulletList`, `orderedList`, `blockquote`, …) stay intact.
  const mid = Math.floor(nodes.length / 2);
  try {
    const assignId = createHeadingIdAssigner();
    const firstHalf = renderHalf(nodes.slice(0, mid), 'a', assignId);
    const secondHalf = renderHalf(nodes.slice(mid), 'b', assignId);
    return (
      <div className={wrapperClassName}>
        {toc}
        {firstHalf}
        <div key="inline-ad">{inlineBanner}</div>
        {secondHalf}
      </div>
    );
  } catch {
    // If either half fails to render, fall back to a single-pass render of
    // the whole doc (no banner) before giving up entirely.
    try {
      const all = renderHalf(nodes, 'all', createHeadingIdAssigner());
      return (
        <div className={wrapperClassName}>
          {toc}
          {all}
        </div>
      );
    } catch {
      return <p className="text-muted-foreground">Unable to render content.</p>;
    }
  }
}

/**
 * Extract plain text from Tiptap JSON content for word count / read time.
 */
export function extractTextContent(content: unknown): string {
  if (!content || typeof content !== 'object') return '';

  const parts: string[] = [];

  function walk(node: Record<string, unknown>) {
    if (node.type === 'text' && typeof node.text === 'string') {
      parts.push(node.text);
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        walk(child as Record<string, unknown>);
      }
    }
  }

  walk(content as Record<string, unknown>);
  return parts.join(' ');
}

export interface GalleryImage {
  src: string;
  thumbnailUrl: string;
}

/**
 * Extract image URLs with variant data from Tiptap JSON content.
 * Returns GalleryImage[] with src (admin-selected quality) and thumbnailUrl (low variant or fallback).
 */
export function extractImageUrlsWithVariants(content: unknown): GalleryImage[] {
  if (!content || typeof content !== 'object') return [];

  const images: GalleryImage[] = [];

  function walk(node: Record<string, unknown>) {
    if (
      node.type === 'image' &&
      node.attrs &&
      typeof (node.attrs as Record<string, unknown>).src === 'string'
    ) {
      const attrs = node.attrs as Record<string, unknown>;
      const src = attrs.src as string;
      let thumbnailUrl = src;

      const variantsRaw = attrs['data-variants'];
      if (typeof variantsRaw === 'string') {
        try {
          const parsed = JSON.parse(variantsRaw);
          if (parsed?.low?.url) {
            thumbnailUrl = parsed.low.url;
          }
        } catch {
          // Malformed variants JSON — fall back to src
        }
      }

      images.push({ src, thumbnailUrl });
    }
    // Extract from figure blocks
    if (node.type === 'figureBlock' && node.attrs) {
      const attrs = node.attrs as Record<string, unknown>;
      if (typeof attrs.src === 'string') {
        const figureSrc = attrs.src as string;
        let figureThumbnailUrl = figureSrc;

        const figureVariantsRaw = attrs['data-variants'];
        if (typeof figureVariantsRaw === 'string') {
          try {
            const parsed = JSON.parse(figureVariantsRaw);
            if (parsed?.low?.url) {
              figureThumbnailUrl = parsed.low.url;
            }
          } catch {
            // Malformed variants JSON — fall back to src
          }
        }

        images.push({ src: figureSrc, thumbnailUrl: figureThumbnailUrl });
      }
    }
    // Also extract from gallery blocks
    if (node.type === 'galleryBlock' && node.attrs) {
      const attrs = node.attrs as Record<string, unknown>;
      try {
        const galleryImages = JSON.parse((attrs['data-images'] as string) || '[]');
        for (const gi of galleryImages) {
          images.push({ src: gi.src, thumbnailUrl: gi.src });
        }
      } catch {}
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        walk(child as Record<string, unknown>);
      }
    }
  }

  walk(content as Record<string, unknown>);
  return images;
}

/**
 * Extract all image URLs from Tiptap JSON content.
 */
export function extractImageUrls(content: unknown): string[] {
  if (!content || typeof content !== 'object') return [];

  const urls: string[] = [];

  function walk(node: Record<string, unknown>) {
    if (
      node.type === 'image' &&
      node.attrs &&
      typeof (node.attrs as Record<string, unknown>).src === 'string'
    ) {
      urls.push((node.attrs as Record<string, unknown>).src as string);
    }
    // Extract from figure blocks
    if (node.type === 'figureBlock' && node.attrs) {
      const attrs = node.attrs as Record<string, unknown>;
      if (typeof attrs.src === 'string') urls.push(attrs.src);
    }
    // Also extract from gallery blocks
    if (node.type === 'galleryBlock' && node.attrs) {
      const attrs = node.attrs as Record<string, unknown>;
      try {
        const galleryImages = JSON.parse((attrs['data-images'] as string) || '[]');
        for (const gi of galleryImages) {
          if (typeof gi.src === 'string') urls.push(gi.src);
        }
      } catch {}
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        walk(child as Record<string, unknown>);
      }
    }
  }

  walk(content as Record<string, unknown>);
  return urls;
}
