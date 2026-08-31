/**
 * UI-18 — the in-article contents list, asserted on rendered markup.
 *
 * `scripts/audit-article-toc.mjs` is the gate that watches production; this
 * file watches the two things the gate cannot see from outside.
 *
 *   1. THE FLOOR IS THE FLOOR, IN BOTH DIRECTIONS. A threshold test that only
 *      shows the component appearing above the line has not shown the line
 *      exists. Both sides are asserted at the exact boundary.
 *   2. THE LABEL. It read `Isi Kandungan` until 01 Sept 2026; DES-03 §5.1
 *      names it `Dalam artikel ini`, and UI-17's rail is being built to place
 *      REKOD, that label, then SUMBER in that order. A silent rename would
 *      leave UI-17 looking for a string the page no longer has, which is the
 *      exact shape of the census this item was dispatched from.
 *
 * The headings come from `extractHeadings`, not from hand-written objects, so
 * the ids under test are the ids the slug rules actually emit.
 */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ArticleToc, TOC_MIN_HEADINGS } from '../article-toc';
import { extractHeadings } from '@/lib/inspire/heading-anchors';

const doc = (headings: [2 | 3, string][]) => ({
  type: 'doc',
  content: headings.map(([level, text]) => ({
    type: 'heading',
    attrs: { level },
    content: [{ type: 'text', text }],
  })),
});

const render = (headings: [2 | 3, string][]) =>
  renderToStaticMarkup(<ArticleToc headings={extractHeadings(doc(headings))} />);

const h2s = (n: number): [2 | 3, string][] =>
  Array.from({ length: n }, (_, i) => [2, `Bahagian ${i + 1}`]);

describe('ArticleToc', () => {
  it('renders at the floor and not one heading below it', () => {
    // The boundary itself, from both sides. The floor moved 4 -> 2 in UI-18
    // and this pair moves with the constant rather than restating it.
    expect(render(h2s(TOC_MIN_HEADINGS))).not.toBe('');
    expect(render(h2s(TOC_MIN_HEADINGS - 1))).toBe('');
  });

  it('renders nothing at all below the floor — not an empty frame', () => {
    // `return null`, not a nav with no children. An empty bordered box on 21
    // of 86 articles is a visible defect that a presence check would call a
    // pass, because the markup would be there.
    expect(render([])).toBe('');
    expect(render(h2s(1))).toBe('');
  });

  it('carries the DES-03 label, in the eyebrow and on the landmark', () => {
    const html = render(h2s(3));
    expect(html).toContain('Dalam artikel ini');
    expect(html).toContain('aria-label="Dalam artikel ini"');
    expect(html).not.toContain('Isi Kandungan');
  });

  it('links every h2 to the id that heading will carry in the body', () => {
    const headings = extractHeadings(
      doc([
        [2, 'Kadar minimum mengikut negeri'],
        [2, 'Siapa yang menetapkan kadar'],
        [2, 'Soalan lazim'],
      ]),
    );
    const html = renderToStaticMarkup(<ArticleToc headings={headings} />);
    for (const h of headings) expect(html).toContain(`href="#${h.id}"`);
  });

  it('nests h3s under the h2 they follow, and drops orphans', () => {
    // An h3 before any h2 has no parent entry to hang from. Dropping it is the
    // decision; the test is here so that stays a decision rather than becoming
    // an accident that renders a stray top-level link.
    const html = render([
      [3, 'Yatim'],
      [2, 'Induk'],
      [3, 'Anak'],
      [2, 'Induk kedua'],
    ]);
    expect(html).toContain('>Induk<');
    expect(html).toContain('>Anak<');
    expect(html).not.toContain('>Yatim<');
    // Two top-level entries, one nested list.
    expect(html.match(/<ol>/g)).toHaveLength(1);
    expect(html.match(/<ul>/g)).toHaveLength(1);
  });

  it('shows the heading verbatim, list ordinal and all', () => {
    // A second numbering of our own put "11." in front of an unnumbered
    // "Kesimpulan" and double-numbered everything above it. The href drops the
    // ordinal (so renumbering does not break inbound links); the LABEL keeps it.
    const html = render([
      [2, '1. Dewan Seri Siantan'],
      [2, '2. Dewan Perdana'],
    ]);
    expect(html).toContain('>1. Dewan Seri Siantan<');
    expect(html).toContain('href="#dewan-seri-siantan"');
  });
});
