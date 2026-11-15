import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TiptapImage from '@tiptap/extension-image';
import { FigureBlockSchema } from '../figure-block-schema';
import {
  settleUploadPlaceholder,
  discardUploadPlaceholder,
  beginUploadPlaceholder,
  useInFlightUploadPlaceholders,
} from '../upload-placeholder-editor';
import { renderHook, act } from '@testing-library/react';

/**
 * The editor-side swap must find the placeholder by src on EVERY image-bearing
 * node type. The regression this pins: "Add Caption" replaced the uploading
 * `image` with a `figureBlock` carrying the same blob src, the old swap only
 * looked at `image` nodes, and three `blob:` URLs reached production.
 */
const BLOB = 'blob:https://hellokahwin.com/642b79a1-57ce-44d8-84e9-5270dcda28f0';
const REAL = 'https://images.hellokahwin.com/artikel/s/1-x/x-high.webp';

// The editor's real `image` node (custom-image.ts) drags the whole editor
// bundle (and its CSS) into the test; the helper only needs an `image` node
// that carries the same attrs, so mirror those here.
const ImageNode = TiptapImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-original-src': { default: null },
      'data-quality': { default: null },
      'data-variants': { default: null },
    };
  },
});

function makeEditor(content: object) {
  return new Editor({
    element: document.createElement('div'),
    extensions: [StarterKit, ImageNode, FigureBlockSchema],
    content,
  });
}

const RESULT = {
  src: REAL,
  'data-original-src': 'https://images.hellokahwin.com/artikel/s/1-x/original.jpg',
  'data-quality': 'high',
  'data-variants': '{"high":{"url":"x"}}',
};

describe('settleUploadPlaceholder', () => {
  it('swaps the placeholder on a figureBlock (post "Add Caption") and keeps its caption', () => {
    const editor = makeEditor({
      type: 'doc',
      content: [
        {
          type: 'figureBlock',
          attrs: { src: BLOB, alt: 'Elsa-topper-1-scaled.jpg', 'data-caption': 'Lili Hod' },
        },
      ],
    });
    expect(settleUploadPlaceholder(editor, BLOB, RESULT)).toBe(1);
    const node = editor.getJSON().content![0];
    expect(node.type).toBe('figureBlock');
    expect(node.attrs).toMatchObject({
      ...RESULT,
      alt: 'Elsa-topper-1-scaled.jpg',
      'data-caption': 'Lili Hod',
    });
    editor.destroy();
  });

  it('swaps the placeholder on a bare image and leaves other images alone', () => {
    const editor = makeEditor({
      type: 'doc',
      content: [
        { type: 'image', attrs: { src: 'blob:https://x/other', alt: 'other' } },
        { type: 'paragraph' },
        { type: 'image', attrs: { src: BLOB, alt: 'mine' } },
      ],
    });
    expect(settleUploadPlaceholder(editor, BLOB, RESULT)).toBe(1);
    const [other, , mine] = editor.getJSON().content!;
    expect(other.attrs?.src).toBe('blob:https://x/other');
    expect(mine.attrs).toMatchObject({ ...RESULT, alt: 'mine' });
    editor.destroy();
  });

  it('returns 0 and dispatches nothing when the admin already removed the image', () => {
    const editor = makeEditor({ type: 'doc', content: [{ type: 'paragraph' }] });
    const before = editor.state;
    expect(settleUploadPlaceholder(editor, BLOB, RESULT)).toBe(0);
    expect(editor.state).toBe(before);
    editor.destroy();
  });
});

describe('discardUploadPlaceholder', () => {
  it('deletes a bare image but only empties a figureBlock, keeping its caption', () => {
    const editor = makeEditor({
      type: 'doc',
      content: [
        { type: 'image', attrs: { src: BLOB, alt: 'a' } },
        { type: 'paragraph', content: [{ type: 'text', text: 'kept' }] },
        { type: 'figureBlock', attrs: { src: BLOB, alt: 'b', 'data-caption': 'Caption' } },
      ],
    });
    expect(discardUploadPlaceholder(editor, BLOB)).toBe(2);
    const content = editor.getJSON().content!;
    expect(content.map((n) => n.type)).toEqual(['paragraph', 'figureBlock']);
    expect(content[1].attrs).toMatchObject({ src: null, alt: null, 'data-caption': 'Caption' });
    editor.destroy();
  });
});

describe('history and lifecycle guards', () => {
  it('the swap is not undoable: Ctrl+Z after settling cannot bring the blob src back', () => {
    const editor = makeEditor({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'a' }] }],
    });
    // An undoable edit first, so undo has something real to revert.
    editor.commands.insertContent({ type: 'image', attrs: { src: BLOB, alt: 'x' } });
    expect(settleUploadPlaceholder(editor, BLOB, RESULT)).toBe(1);
    editor.commands.undo();
    const srcs = (editor.getJSON().content ?? []).map((n) => n.attrs?.src).filter(Boolean);
    expect(srcs).not.toContain(BLOB);
    editor.destroy();
  });

  it('returns 0 instead of throwing once the editor has been destroyed', () => {
    const editor = makeEditor({ type: 'doc', content: [{ type: 'image', attrs: { src: BLOB } }] });
    editor.destroy();
    expect(settleUploadPlaceholder(editor, BLOB, RESULT)).toBe(0);
    expect(discardUploadPlaceholder(editor, BLOB)).toBe(0);
  });
});

describe('in-flight registry', () => {
  it('lists a placeholder from begin until it settles or is discarded', () => {
    const { result } = renderHook(() => useInFlightUploadPlaceholders());
    act(() => beginUploadPlaceholder('blob:https://x/one'));
    act(() => beginUploadPlaceholder('blob:https://x/two'));
    expect([...result.current]).toEqual(['blob:https://x/one', 'blob:https://x/two']);
    const editor = makeEditor({ type: 'doc', content: [{ type: 'paragraph' }] });
    act(() => void settleUploadPlaceholder(editor, 'blob:https://x/one', RESULT));
    expect([...result.current]).toEqual(['blob:https://x/two']);
    act(() => void discardUploadPlaceholder(editor, 'blob:https://x/two'));
    expect(result.current.size).toBe(0);
    editor.destroy();
  });
});
