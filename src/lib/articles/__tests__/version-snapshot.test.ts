import { describe, expect, it } from 'vitest';
import {
  buildRestorePayload,
  buildSnapshot,
  changedSnapshotFields,
  compareSnapshots,
  contentToBlocks,
  countWords,
  diffBlocks,
  normaliseVersionLabel,
  VERSIONED_ARTICLE_FIELDS,
  type ArticleSnapshot,
} from '../version-snapshot';
import { articleUpdateSchema } from '@/lib/validations/article';

const TAG_A = '22222222-2222-4222-8222-222222222222';
const TAG_B = '33333333-3333-4333-8333-333333333333';

function doc(...paragraphs: string[]) {
  return {
    type: 'doc',
    content: paragraphs.map((text) => ({
      type: 'paragraph',
      content: [{ type: 'text', text }],
    })),
  };
}

function snap(overrides: Partial<ArticleSnapshot> = {}): ArticleSnapshot {
  return {
    title: 'Hantaran ideas',
    excerpt: 'A blurb',
    content: doc('First paragraph.', 'Second paragraph.'),
    coverImageUrl: 'https://images.hellokahwin.com/cover.webp',
    coverImageVariants: { high: { url: 'https://images.hellokahwin.com/h.webp' } },
    coverImageQuality: 'high',
    coverImageFocalPoint: { x: 0.5, y: 0.5, method: 'auto' },
    coverImageDetectionData: null,
    coverImageSmartCrops: null,
    coverImageFocalPointOverride: null,
    metaTitle: 'SEO title',
    metaDescription: 'SEO description',
    pinterestBoardName: null,
    tagIds: [TAG_A],
    ...overrides,
  };
}

describe('snapshots', () => {
  it('sorts and de-duplicates tag ids so the same state compares equal', () => {
    const { tagIds } = buildSnapshot(snap(), [TAG_B, TAG_A, TAG_B]);
    expect(tagIds).toEqual([TAG_A, TAG_B]);
  });

  it('treats jsonb with a different key order as unchanged', () => {
    const a = snap({ coverImageFocalPoint: { x: 0.5, y: 0.5, method: 'auto' } });
    const b = snap({ coverImageFocalPoint: { method: 'auto', y: 0.5, x: 0.5 } });
    expect(changedSnapshotFields(a, b)).toEqual([]);
  });

  it('lists changed fields in display order', () => {
    const changed = changedSnapshotFields(
      snap(),
      snap({ metaTitle: 'New', title: 'New title', tagIds: [] }),
    );
    expect(changed).toEqual(['title', 'metaTitle', 'tagIds']);
  });

  it('versions exactly the 13 editorial columns — never the URL or publication state', () => {
    expect(VERSIONED_ARTICLE_FIELDS).toHaveLength(13);
    for (const f of ['slug', 'primaryCategoryId', 'status', 'publishedAt', 'authorId']) {
      expect(VERSIONED_ARTICLE_FIELDS as readonly string[]).not.toContain(f);
    }
  });
});

describe('preview / compare', () => {
  it('reads a Tiptap body as blocks, one per paragraph, heading and list item', () => {
    const content = {
      type: 'doc',
      content: [
        { type: 'heading', content: [{ type: 'text', text: 'Title' }] },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hello ' },
            { type: 'text', text: 'world', marks: [{ type: 'bold' }] },
          ],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'One' }] }],
            },
          ],
        },
        { type: 'paragraph' },
        { type: 'image', attrs: { src: 'x' } },
      ],
    };
    expect(contentToBlocks(content)).toEqual(['Title', 'Hello world', 'One']);
    expect(contentToBlocks(null)).toEqual([]);
    expect(countWords(['Hello world', 'One'])).toBe(3);
  });

  it('diffs paragraphs both ways, counting repeats', () => {
    const { onlyInVersion, onlyInCurrent } = diffBlocks(['a', 'b', 'b', 'c'], ['a', 'b', 'd']);
    expect(onlyInVersion).toEqual(['b', 'c']);
    expect(onlyInCurrent).toEqual(['d']);
  });

  it('describes changes in words an editor understands, folding cover blobs into the cover row', () => {
    const version = snap({
      coverImageUrl: 'https://images.hellokahwin.com/old.webp',
      coverImageVariants: { high: { url: 'https://images.hellokahwin.com/old-h.webp' } },
      content: doc('Only one paragraph here.'),
      tagIds: [TAG_A, TAG_B],
    });
    const changes = compareSnapshots(
      version,
      snap(),
      new Map([
        [TAG_A, 'Pelamin'],
        [TAG_B, 'Hantaran'],
      ]),
    );
    expect(changes.map((c) => c.label)).toEqual(['Body', 'Cover image', 'Tags']);
    expect(changes.find((c) => c.field === 'content')).toMatchObject({
      version: '4 words',
      current: '4 words',
    });
    expect(changes.find((c) => c.field === 'tagIds')).toMatchObject({
      version: 'Pelamin, Hantaran',
      current: 'Pelamin',
    });
  });

  it('names a deleted tag instead of showing an id', () => {
    const [change] = compareSnapshots(snap({ tagIds: [TAG_B] }), snap({ tagIds: [] }));
    expect(change.version).toBe('(deleted tag)');
    expect(change.current).toBe('(none)');
  });
});

describe('restore payload', () => {
  it('carries only versioned fields — never slug, status, category, author or dates', () => {
    const { data } = buildRestorePayload(snap(), new Set([TAG_A]));
    for (const key of [
      'slug',
      'status',
      'primaryCategoryId',
      'authorId',
      'publishedAt',
      'scheduledPublishAt',
      'updatedAt',
    ]) {
      expect(data).not.toHaveProperty(key);
    }
    expect(data.title).toBe('Hantaran ideas');
  });

  it('passes the save validation even when the version has empty columns', () => {
    const { data } = buildRestorePayload(
      snap({
        excerpt: null,
        coverImageUrl: null,
        coverImageQuality: null,
        coverImageVariants: null,
        metaTitle: null,
        metaDescription: null,
        pinterestBoardName: null,
        content: null,
      }),
      new Set(),
    );
    const parsed = articleUpdateSchema.safeParse(data);
    expect(parsed.success).toBe(true);
    // Empty boxes go as '' — the action stores those as NULL, as it does for
    // an emptied field in the editor.
    expect(data).toMatchObject({ coverImageUrl: '', metaTitle: '', excerpt: '' });
  });

  it('a full version passes the save validation as-is', () => {
    const { data } = buildRestorePayload(snap(), new Set([TAG_A]));
    expect(articleUpdateSchema.safeParse(data).success).toBe(true);
  });

  it('drops tags deleted since, and reports them', () => {
    const { data, skippedTagIds } = buildRestorePayload(
      snap({ tagIds: [TAG_A, TAG_B] }),
      new Set([TAG_A]),
    );
    expect(data.tagIds).toEqual([TAG_A]);
    expect(skippedTagIds).toEqual([TAG_B]);
  });

  it('sends an empty tag list (clear) rather than omitting it', () => {
    const { data } = buildRestorePayload(snap({ tagIds: [] }), new Set());
    expect(data.tagIds).toEqual([]);
  });
});

describe('version names', () => {
  it('trims, collapses whitespace, caps at 80 and treats blank as no name', () => {
    expect(normaliseVersionLabel('  Before   refresh ')).toBe('Before refresh');
    expect(normaliseVersionLabel('   ')).toBeNull();
    expect(normaliseVersionLabel(undefined)).toBeNull();
    expect(normaliseVersionLabel('x'.repeat(100))).toHaveLength(80);
  });
});
