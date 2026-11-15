import { describe, it, expect } from 'vitest';
import {
  findPendingUploads,
  isPendingUploadSrc,
  describePendingUploads,
} from '../upload-placeholder';

/**
 * The "a blob: src must never be saved" contract, pinned on the exact shape of
 * the two production documents that shipped broken images: figure blocks whose
 * swap was lost to "Add Caption", and a bare image whose swap never ran.
 */
const BLOB = 'blob:https://hellokahwin.com/77ad2be3-ae0f-44e6-9c64-c463853cd622';
const REAL =
  'https://images.hellokahwin.com/artikel/wedding-dress-styles/1792463640448-x/x-high.webp';

describe('isPendingUploadSrc', () => {
  it('flags blob: and data: URLs only', () => {
    expect(isPendingUploadSrc(BLOB)).toBe(true);
    expect(isPendingUploadSrc('data:image/png;base64,AAAA')).toBe(true);
    expect(isPendingUploadSrc(REAL)).toBe(false);
    expect(isPendingUploadSrc(null)).toBe(false);
    expect(isPendingUploadSrc(undefined)).toBe(false);
    expect(isPendingUploadSrc(42)).toBe(false);
  });
});

describe('findPendingUploads', () => {
  it('finds a placeholder on a figureBlock AND on a bare image, nested anywhere', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'hi' }] },
        {
          type: 'figureBlock',
          attrs: { src: BLOB, alt: 'Elsa-topper-1-scaled.jpg', 'data-caption': 'Lili Hod' },
        },
        { type: 'figureBlock', attrs: { src: REAL, alt: 'ok.png' } },
        {
          type: 'blockquote',
          content: [{ type: 'image', attrs: { src: 'blob:https://x/abc', alt: '' } }],
        },
      ],
    };
    expect(findPendingUploads(doc)).toEqual([
      { type: 'figureBlock', alt: 'Elsa-topper-1-scaled.jpg', src: BLOB },
      { type: 'image', alt: null, src: 'blob:https://x/abc' },
    ]);
  });

  it('ignores non-image nodes that happen to carry a blob-looking attr, and non-documents', () => {
    const doc = {
      type: 'doc',
      content: [{ type: 'pdfLinkBlock', attrs: { src: BLOB } }],
    };
    expect(findPendingUploads(doc)).toEqual([]);
    expect(findPendingUploads(null)).toEqual([]);
    expect(findPendingUploads('{"type":"doc"}')).toEqual([]);
    expect(findPendingUploads({ type: 'doc' })).toEqual([]);
  });
});

describe('describePendingUploads', () => {
  it('names the files so the admin can find them in the media library', () => {
    const msg = describePendingUploads([
      { type: 'figureBlock', alt: 'Rixo.avif', src: BLOB },
      { type: 'image', alt: null, src: BLOB },
    ]);
    expect(msg).toBe(
      '2 images (Rixo.avif) have not finished uploading. Wait for the upload, or replace the image from the media library, then save again.',
    );
    expect(describePendingUploads([{ type: 'image', alt: null, src: BLOB }])).toMatch(
      /^1 image has not finished uploading\./,
    );
  });
});
