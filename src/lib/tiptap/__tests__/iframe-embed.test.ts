import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { generateHTML } from '@tiptap/html';
import { IframeEmbed, isAllowedEmbedSrc, toEmbedSrc } from '../iframe-embed';
import { extensions as rendererExtensions } from '@/components/inspire/article-renderer';

describe('toEmbedSrc', () => {
  it('turns the addresses editors actually paste into embed URLs', () => {
    expect(toEmbedSrc('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    );
    expect(toEmbedSrc('https://youtu.be/dQw4w9WgXcQ')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    );
    expect(toEmbedSrc('youtube.com/shorts/abc_DEF-1')).toBe(
      'https://www.youtube.com/embed/abc_DEF-1',
    );
    expect(toEmbedSrc('https://vimeo.com/76979871')).toBe(
      'https://player.vimeo.com/video/76979871',
    );
    expect(toEmbedSrc('https://www.instagram.com/p/C1a2B3c4D5e/?igsh=xyz')).toBe(
      'https://www.instagram.com/p/C1a2B3c4D5e/embed',
    );
    expect(toEmbedSrc('https://instagram.com/reel/C1a2B3c4D5e/')).toBe(
      'https://www.instagram.com/reel/C1a2B3c4D5e/embed',
    );
  });

  it('keeps an address already in embed form', () => {
    expect(toEmbedSrc('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    );
    expect(toEmbedSrc('https://player.vimeo.com/video/76979871')).toBe(
      'https://player.vimeo.com/video/76979871',
    );
  });

  it('refuses anything it may not embed', () => {
    expect(toEmbedSrc('')).toBeNull();
    expect(toEmbedSrc('https://evil.example/watch?v=abc')).toBeNull();
    expect(toEmbedSrc('https://youtube.com.evil.io/watch?v=abc')).toBeNull();
    expect(toEmbedSrc('javascript:alert(1)')).toBeNull();
    expect(toEmbedSrc('https://www.instagram.com/someprofile/')).toBeNull();
    expect(toEmbedSrc('https://www.youtube.com/watch?v=<script>')).toBeNull();
  });

  it('only ever produces a src the node itself accepts', () => {
    for (const raw of [
      'https://youtu.be/dQw4w9WgXcQ',
      'https://vimeo.com/76979871',
      'https://www.instagram.com/p/C1a2B3c4D5e/',
    ]) {
      expect(isAllowedEmbedSrc(toEmbedSrc(raw))).toBe(true);
    }
  });
});

describe('IframeEmbed node', () => {
  const doc = (src: string) => ({
    type: 'doc',
    content: [{ type: 'iframeEmbed', attrs: { src, width: 540, height: 640 } }],
  });

  it('round-trips an allowed embed through the editor', () => {
    const editor = new Editor({
      element: document.createElement('div'),
      extensions: [StarterKit, IframeEmbed],
      content: doc('https://www.youtube.com/embed/dQw4w9WgXcQ'),
    });
    expect(editor.getJSON().content?.[0]).toMatchObject({
      type: 'iframeEmbed',
      attrs: { src: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
    });
    expect(editor.getHTML()).toContain('<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"');
    editor.destroy();
  });

  it('renders a foreign src as an empty paragraph, never a frame', () => {
    const html = generateHTML(doc('https://evil.example/x'), [StarterKit, IframeEmbed]);
    expect(html).not.toContain('iframe');
  });

  it('is part of the public renderer schema, so a saved embed cannot crash the page', () => {
    const html = generateHTML(
      doc('https://player.vimeo.com/video/76979871'),
      rendererExtensions as Parameters<typeof generateHTML>[1],
    );
    expect(html).toContain('<iframe src="https://player.vimeo.com/video/76979871"');
  });
});
