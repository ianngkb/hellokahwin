import { describe, it, expect } from 'vitest';
import { isTextCard, isSourcedPhotograph } from '../text-card';

/**
 * Every case here is a real row that existed in production on 26 Aug 2026, not
 * an invented one. The test that matters is `the archival songket plates` —
 * the audit's header comment promised that exemption and the code did not
 * implement it, so the classifier failed a correct ingest run.
 */
describe('isTextCard', () => {
  it('catches a generated card: a declared .png whose key carries an ingest stamp', () => {
    expect(
      isTextCard({
        filename: 'cover-borang-nikah.png',
        r2Key: 'inspire/borang-nikah/1787652677828-cover-borang-nikah.png',
      }),
    ).toBe(true);
    expect(
      isTextCard({
        filename: 'C6-2-A2-checklist-kahwin-cover.png',
        r2Key: 'inspire/checklist-kahwin/1787652701234-c6-2-a2-checklist-kahwin-cover.png',
      }),
    ).toBe(true);
  });

  it('spares the archival songket plates — photographs that happen to be PNGs', () => {
    expect(
      isTextCard({
        filename: 'S-menenun-songket-kelantan-1899-skeat.png',
        r2Key:
          'inspire/songket-tenunan-tangan-atau-cetak/1787700000000-images-s-menenun-songket-kelantan-1899-skeat.png',
      }),
    ).toBe(false);
    expect(
      isTextCard({
        filename: 'S-menenun-songket-alor-setar-british-official.png',
        r2Key:
          'inspire/songket-tenunan-tangan-atau-cetak/1787700000000-images-s-menenun-songket-alor-setar-british-official.png',
      }),
    ).toBe(false);
  });

  it('spares a legacy WordPress PNG, whose filename already carries its stamp', () => {
    expect(
      isTextCard({
        filename: '1787396453507-IN-PreWeddingPhotoshoot-BangunanSultanAbdulSamad-.png',
        r2Key:
          'inspire/lokasi-pre-wedding-photoshoot-terbaik/1787396453507-IN-PreWeddingPhotoshoot-BangunanSultanAbdulSamad-.png',
      }),
    ).toBe(false);
  });

  it('spares every JPEG, whatever its key looks like', () => {
    expect(
      isTextCard({
        filename: 'S-selepas-akad-raja-abd-kadir.jpg',
        r2Key: 'inspire/borang-nikah/1787675513302-images-s-selepas-akad-raja-abd-kadir.jpg',
      }),
    ).toBe(false);
  });
});

describe('isSourcedPhotograph', () => {
  it('recognises the images/S-name convention by the declared filename alone', () => {
    expect(isSourcedPhotograph({ filename: 'S-pelamin-putih-shahnazshahizan.jpg' })).toBe(true);
    expect(isSourcedPhotograph({ filename: 'cover-rukun-nikah.png' })).toBe(false);
    // Lower-case `s-` is not the convention and must not buy an exemption.
    expect(isSourcedPhotograph({ filename: 's-not-the-convention.png' })).toBe(false);
  });
});
