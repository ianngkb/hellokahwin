// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { LINK_HTML_ATTRIBUTES } from '../link-rel';
import { LinkRelPolicy } from '../link-rel-policy';

let editor: Editor | null = null;
afterEach(() => editor?.destroy());

function make(content = '<p></p>') {
  editor = new Editor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, HTMLAttributes: LINK_HTML_ATTRIBUTES }),
      LinkRelPolicy,
    ],
    content,
  });
  return editor;
}

function linkAttrs(e: Editor) {
  let found: Record<string, unknown> | undefined;
  e.state.doc.descendants((n) => {
    const m = n.marks.find((x) => x.type.name === 'link');
    if (m && !found) found = m.attrs;
  });
  return found;
}

describe('LinkRelPolicy (editor paste / autolink path)', () => {
  it('a pasted external link with no rel gets new tab + noopener noreferrer (followed)', () => {
    const e = make();
    e.commands.insertContent('<a href="https://example.com">x</a>');
    expect(linkAttrs(e)).toMatchObject({ target: '_blank', rel: 'noopener noreferrer' });
  });

  it('a pasted internal link stays followed, same tab', () => {
    const e = make();
    e.commands.insertContent('<a href="/artikel/x/y">x</a>');
    expect(linkAttrs(e)).toMatchObject({ target: null, rel: null });
  });

  it("the dialog's explicit same-tab followed external link is left alone", () => {
    const e = make('<p>hello</p>');
    e.chain()
      .setTextSelection({ from: 1, to: 6 })
      .setLink({ href: 'https://ex.com', target: null, rel: null })
      .run();
    expect(linkAttrs(e)).toMatchObject({ target: null, rel: null });
    // typing inside that existing link does not re-decide it
    e.chain().setTextSelection(3).insertContent('X').run();
    expect(linkAttrs(e)).toMatchObject({ target: null, rel: null });
  });

  it('an explicit pasted rel is kept', () => {
    const e = make();
    e.commands.insertContent('<a href="https://ex.com" rel="nofollow">x</a>');
    expect(linkAttrs(e)?.rel).toBe('nofollow');
  });
});
