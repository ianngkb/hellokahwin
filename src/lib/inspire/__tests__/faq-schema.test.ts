import { describe, it, expect } from 'vitest';
import { extractFaqEntries, buildFaqPageJsonLd, FAQ_MIN_QUESTIONS } from '../faq-schema';

/**
 * Every fixture below is the shape of a real live article, not an invented one.
 * The two block shapes the corpus actually uses are named on their fixtures.
 */

type Node = Record<string, unknown>;

const h = (level: number, text: string): Node => ({
  type: 'heading',
  attrs: { level },
  content: [{ type: 'text', text }],
});

const p = (...parts: string[]): Node => ({
  type: 'paragraph',
  content: parts.map((text) => ({ type: 'text', text })),
});

const doc = (...content: Node[]): Node => ({ type: 'doc', content });

/**
 * Shape A — 22 of the 29 live blocks. `<h2>Soalan lazim</h2>` with `<h3>`
 * questions. Shape from /artikel/hantaran-mas-kahwin/nisbah-hantaran.
 */
const SHAPE_A = doc(
  h(2, 'Tiga perkara berbeza'),
  p('Kalau ketiga-tiga ini dibincangkan satu per satu, setiap satu mudah.'),
  h(2, 'Soalan lazim'),
  h(3, 'Adakah nisbah hantaran wajib dalam Islam?'),
  p('Tidak. Kajian UiTM 2015 menyatakan hantaran hukumnya harus.'),
  h(3, 'Bolehkah nisbah hantaran sama, contohnya 5 balas 5?'),
  p('Boleh, kerana tiada pihak berkuasa melarangnya.'),
  h(3, 'Adakah dulang sirih junjung dikira dalam nisbah?'),
  p('Ya, dalam amalan lazim ia dikira sebagai satu dulang.'),
  h(2, 'Langkah seterusnya'),
  p('Tetapkan nisbah dalam perbincangan merisik.'),
);

/**
 * Shape B — the 7 mas-kahwin articles. Their whole body is `<h3>`, so the block
 * heading is an `<h3>` and the questions are `<h4>`. Shape from
 * /artikel/hantaran-mas-kahwin/mas-kahwin-johor.
 */
const SHAPE_B = doc(
  h(3, 'Cara mengesahkan kadar terkini'),
  p('Panduan penuh bagi barang, dulang dan wang ada dalam hantaran dan mas kahwin.'),
  h(3, 'Soalan lazim'),
  h(4, 'Adakah Johor menetapkan kadar berbeza bagi janda?'),
  p('Tiada sumber yang ditemui menyatakan pembezaan itu.'),
  h(4, 'Adakah RM22.50 kadar minimum atau kadar tetap?'),
  p('Tidak dapat disahkan pada hari ini.'),
  h(4, 'Berapa bayaran Kad Perakuan Nikah di Johor?'),
  p('Bayaran pemprosesan RM40.00, mengikut JAINJ, disemak pada Ogos 2026.'),
);

describe('extractFaqEntries', () => {
  it('reads an h2 block with h3 questions', () => {
    const entries = extractFaqEntries(SHAPE_A);
    expect(entries.map((e) => e.question)).toEqual([
      'Adakah nisbah hantaran wajib dalam Islam?',
      'Bolehkah nisbah hantaran sama, contohnya 5 balas 5?',
      'Adakah dulang sirih junjung dikira dalam nisbah?',
    ]);
    expect(entries[0].answer).toBe('Tidak. Kajian UiTM 2015 menyatakan hantaran hukumnya harus.');
  });

  it('reads an h3 block with h4 questions — the mas-kahwin shape', () => {
    const entries = extractFaqEntries(SHAPE_B);
    expect(entries).toHaveLength(3);
    expect(entries[2].answer).toBe(
      'Bayaran pemprosesan RM40.00, mengikut JAINJ, disemak pada Ogos 2026.',
    );
  });

  it('stops at the next heading at or above the block level', () => {
    const answers = extractFaqEntries(SHAPE_A)
      .map((e) => e.answer)
      .join(' ');
    expect(answers).not.toContain('Tetapkan nisbah dalam perbincangan merisik.');
  });

  it('joins a multi-paragraph answer in document order', () => {
    const entries = extractFaqEntries(
      doc(
        h(2, 'Soalan lazim'),
        h(3, 'Berapa harga kain songket asli?'),
        p('Sampin sutera Terengganu disiarkan pada RM2,800 hingga RM11,500 sehelai.'),
        p('Set nikah berdua disiarkan pada RM477 hingga RM587.'),
        h(3, 'Perlukah baju sanding menggunakan songket?'),
        p('Tidak wajib.'),
      ),
    );
    expect(entries[0].answer).toBe(
      'Sampin sutera Terengganu disiarkan pada RM2,800 hingga RM11,500 sehelai. ' +
        'Set nikah berdua disiarkan pada RM477 hingga RM587.',
    );
  });

  it('takes the block heading whatever its case and trailing colon', () => {
    for (const heading of ['Soalan Lazim', 'SOALAN LAZIM', 'Soalan lazim:', 'soalan  lazim']) {
      const entries = extractFaqEntries(
        doc(
          h(2, heading),
          h(3, 'Adakah ia wajib?'),
          p('Tidak.'),
          h(3, 'Berapa kadarnya?'),
          p('RM22.50.'),
        ),
      );
      expect(entries, heading).toHaveLength(2);
    }
  });

  it('ignores an h2 that merely starts with Soalan', () => {
    // Live: /artikel/busana-pengantin/songket-tenunan-tangan-atau-cetak carries
    // BOTH `Soalan sebelum bayar` (prose, no questions) and `Soalan lazim`.
    const entries = extractFaqEntries(
      doc(
        h(2, 'Soalan sebelum bayar'),
        p('Tanya peniaga tiga perkara ini sebelum membayar deposit.'),
        h(2, 'Soalan lazim'),
        h(3, 'Berapa harga kain songket asli?'),
        p('RM2,800 hingga RM11,500 sehelai.'),
        h(3, 'Adakah songket Terengganu berbeza?'),
        p('Ya.'),
      ),
    );
    expect(entries.map((e) => e.question)).toEqual([
      'Berapa harga kain songket asli?',
      'Adakah songket Terengganu berbeza?',
    ]);
  });

  it('drops a sub-heading that is not phrased as a question', () => {
    const entries = extractFaqEntries(
      doc(
        h(2, 'Soalan lazim'),
        h(3, 'Nota kaki'),
        p('Semua angka disemak pada Ogos 2026.'),
        h(3, 'Adakah ia wajib?'),
        p('Tidak.'),
        h(3, 'Berapa kadarnya?'),
        p('RM22.50.'),
      ),
    );
    expect(entries.map((e) => e.question)).toEqual(['Adakah ia wajib?', 'Berapa kadarnya?']);
  });

  it('drops a question with no answer prose under it', () => {
    const entries = extractFaqEntries(
      doc(
        h(2, 'Soalan lazim'),
        h(3, 'Adakah ia wajib?'),
        h(3, 'Berapa kadarnya?'),
        p('RM22.50.'),
        h(3, 'Bila perlu dibayar?'),
        p('Semasa akad nikah.'),
      ),
    );
    expect(entries.map((e) => e.question)).toEqual(['Berapa kadarnya?', 'Bila perlu dibayar?']);
  });

  it('returns nothing for an article with no block', () => {
    // Live: /artikel/venue-perancangan/checklist-kahwin and .../bajet-kahwin.
    const entries = extractFaqEntries(
      doc(h(2, '12 bulan sebelum'), p('Tempah dewan.'), h(2, 'Ringkasnya'), p('Mula awal.')),
    );
    expect(entries).toEqual([]);
  });

  it('finds the block inside a sectionBlock wrapper', () => {
    const entries = extractFaqEntries(
      doc({
        type: 'sectionBlock',
        content: [
          h(2, 'Soalan lazim'),
          h(3, 'Adakah ia wajib?'),
          p('Tidak.'),
          h(3, 'Berapa?'),
          p('RM22.50.'),
        ],
      }),
    );
    expect(entries).toHaveLength(2);
  });

  it('survives null, a string and a doc with no content', () => {
    expect(extractFaqEntries(null)).toEqual([]);
    expect(extractFaqEntries('Soalan lazim')).toEqual([]);
    expect(extractFaqEntries({ type: 'doc' })).toEqual([]);
  });
});

describe('buildFaqPageJsonLd', () => {
  it('emits a spec-shaped FAQPage', () => {
    expect(buildFaqPageJsonLd({ content: SHAPE_A })).toEqual({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Adakah nisbah hantaran wajib dalam Islam?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Tidak. Kajian UiTM 2015 menyatakan hantaran hukumnya harus.',
          },
        },
        {
          '@type': 'Question',
          name: 'Bolehkah nisbah hantaran sama, contohnya 5 balas 5?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Boleh, kerana tiada pihak berkuasa melarangnya.',
          },
        },
        {
          '@type': 'Question',
          name: 'Adakah dulang sirih junjung dikira dalam nisbah?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Ya, dalam amalan lazim ia dikira sebagai satu dulang.',
          },
        },
      ],
    });
  });

  it('is null below the question floor', () => {
    expect(FAQ_MIN_QUESTIONS).toBeGreaterThan(1);
    const oneQuestion = doc(h(2, 'Soalan lazim'), h(3, 'Adakah ia wajib?'), p('Tidak.'));
    expect(buildFaqPageJsonLd({ content: oneQuestion })).toBeNull();
  });

  it('is null for an article with no block', () => {
    expect(buildFaqPageJsonLd({ content: doc(h(2, 'Ringkasnya'), p('Mula awal.')) })).toBeNull();
  });
});
