import { describe, it, expect } from 'vitest';
import {
  CREDIT_LABEL,
  formatCreditLabel,
  normaliseCaptionLabel,
  hasCanonicalCreditLabel,
} from '../image-credit-label';

/** U+00A0 — the separator the live data actually carries on some credits. */
const NBSP = ' ';

describe('CREDIT_LABEL', () => {
  it('is Kredit, as style guide §13.1 fixes it', () => {
    // Pinned by a test because this is an editorial decision, not a coding one.
    // Changing it means changing the style guide first.
    expect(CREDIT_LABEL).toBe('Kredit');
  });
});

describe('formatCreditLabel — a DEDICATED credit field (the cover)', () => {
  // The five non-conforming variants measured live on 31 Aug 2026.
  it.each([
    ['Source: The Waterway Villa', 'Kredit: The Waterway Villa'],
    ['source: Boathouse Ampang', 'Kredit: Boathouse Ampang'],
    ['SOURCE: Puncak Rimba', 'Kredit: Puncak Rimba'],
    ['sOURCE: Aman Rimba Private Estate', 'Kredit: Aman Rimba Private Estate'],
    ['image: zach chin', 'Kredit: zach chin'],
  ])('normalises %s', (input, expected) => {
    expect(formatCreditLabel(input)).toBe(expected);
  });

  it('labels a bare name, because this field is only ever a credit', () => {
    expect(formatCreditLabel('Jardin Event Venue')).toBe('Kredit: Jardin Event Venue');
  });

  it('collapses a non-breaking space after the colon', () => {
    expect(formatCreditLabel(`Source:${NBSP}A Refreshing Forest Wedding`)).toBe(
      'Kredit: A Refreshing Forest Wedding',
    );
  });

  it('collapses newlines and runs of whitespace', () => {
    expect(formatCreditLabel('  SOURCE:   Mutiara   Hillhomes,\n Bentong ')).toBe(
      'Kredit: Mutiara Hillhomes, Bentong',
    );
  });

  it('is idempotent — never doubles the label', () => {
    const once = formatCreditLabel('Source: Sangkot Place')!;
    expect(once).toBe('Kredit: Sangkot Place');
    expect(formatCreditLabel(once)).toBe(once);
  });

  it('leaves an already-canonical credit alone', () => {
    expect(formatCreditLabel('Kredit: mohd hasan / Pexels')).toBe('Kredit: mohd hasan / Pexels');
  });

  it.each([null, undefined, '', '   ', 'Source:', 'sOURCE:  '])(
    'returns null for %p rather than rendering a bare label',
    (input) => {
      expect(formatCreditLabel(input)).toBeNull();
    },
  );
});

describe('normaliseCaptionLabel — an article figcaption, credit OR caption', () => {
  it.each([
    ['Source: Tanarimba at Janda Baik', 'Kredit: Tanarimba at Janda Baik'],
    ['sOURCE: Setia City Convention Center', 'Kredit: Setia City Convention Center'],
    ['SOURCE: TEMPAH KL', 'Kredit: TEMPAH KL'],
    ['source: perbadanan putrajaya', 'Kredit: perbadanan putrajaya'],
    ['image: zach chin', 'Kredit: zach chin'],
  ])('relabels the credit %s', (input, expected) => {
    expect(normaliseCaptionLabel(input)).toBe(expected);
  });

  it('keeps an already-canonical credit unchanged', () => {
    expect(normaliseCaptionLabel('Kredit: CEphoto, Uwe Aranas (CC BY-SA 3.0)')).toBe(
      'Kredit: CEphoto, Uwe Aranas (CC BY-SA 3.0)',
    );
  });

  // The 171 captions an earlier draft of this module would have corrupted.
  it('leaves a descriptive teaching caption completely alone', () => {
    const caption =
      'Setiap barang duduk atas dulangnya sendiri, dan itulah sebabnya bilangan dulang dikira berasingan.';
    expect(normaliseCaptionLabel(caption)).toBe(caption);
  });

  it('does not prefix a caption that merely contains a colon', () => {
    const caption =
      'Satu set baju sanding lengkap: baju melayu, samping songket dan tanjak bagi pihak lelaki.';
    expect(normaliseCaptionLabel(caption)).toBe(caption);
  });

  // Style guide §13.1: a permitted specialisation of Kredit:, not an exception.
  it('never rewrites `Grafik:`', () => {
    expect(normaliseCaptionLabel('Grafik: HelloKahwin')).toBe('Grafik: HelloKahwin');
  });

  // `Sumber:` is the site's FACT-citation convention — 87 occurrences in body
  // prose citing enactments and council rate sheets. Converting one into an
  // image credit would be a factual error, not a style fix.
  it('never rewrites `Sumber:`, which cites a fact and not a photograph', () => {
    const cite =
      'Sumber: seksyen 2 Enakmen Undang-Undang Keluarga Islam (Negeri Pulau Pinang) 2004';
    expect(normaliseCaptionLabel(cite)).toBe(cite);
  });

  // A line in the body's "Kredit Vendor" block on the 17 real-wedding articles.
  it('never rewrites `Jurugambar:`', () => {
    expect(normaliseCaptionLabel('Jurugambar: Ameir Fikri')).toBe('Jurugambar: Ameir Fikri');
  });

  it('does not strip a multi-word name that opens with a label word', () => {
    expect(normaliseCaptionLabel('Image Studio: Kuala Lumpur')).toBe('Image Studio: Kuala Lumpur');
  });

  it('does not strip a label word with no colon after it', () => {
    expect(normaliseCaptionLabel('Foto Ali Studio')).toBe('Foto Ali Studio');
  });

  it('collapses a non-breaking separator on a credit', () => {
    expect(normaliseCaptionLabel(`SOURCE:${NBSP}RIVER JUNKIE`)).toBe('Kredit: RIVER JUNKIE');
  });

  it('is idempotent', () => {
    const once = normaliseCaptionLabel('source: petals')!;
    expect(normaliseCaptionLabel(once)).toBe(once);
  });

  it.each([null, undefined, '', '   ', 'Source:', 'image:  '])('returns null for %p', (input) => {
    expect(normaliseCaptionLabel(input)).toBeNull();
  });
});

describe('hasCanonicalCreditLabel', () => {
  it('accepts the canonical form', () => {
    expect(hasCanonicalCreditLabel('Kredit: Puncak Rimba')).toBe(true);
  });

  it.each(['Source: Puncak Rimba', 'kredit: Puncak Rimba', 'Kredit:Puncak', 'Kredit: '])(
    'rejects %p',
    (input) => {
      expect(hasCanonicalCreditLabel(input)).toBe(false);
    },
  );

  it('agrees with formatCreditLabel on everything it produces', () => {
    for (const raw of ['Source: A', 'sOURCE: B', 'image: c', 'Plain Name']) {
      expect(hasCanonicalCreditLabel(formatCreditLabel(raw)!)).toBe(true);
    }
  });
});
