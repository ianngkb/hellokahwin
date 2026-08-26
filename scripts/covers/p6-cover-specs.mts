/**
 * The four P6 covers — cluster C6.2, the cost pages.
 *
 * Same rule as every other spec file here: EVERY figure on a card was taken
 * from the article that cover belongs to, and from nowhere else. No rate is
 * carried across from a sibling draft even where the two drafts quote the same
 * council, and nothing was sourced by this file's author.
 *
 * ── What a P6 card is ─────────────────────────────────────────────────────
 * A cost band. The brief: "a cost band is the natural shape … show the range
 * and name the source authority on the card." So the plum band carries the two
 * ends of the range, the rows attribute each rate to the council that published
 * it, and no rate appears without its authority beside it.
 *
 * ── "Tiada kadar ditetapkan" is a value, not a blank ──────────────────────
 * DBKL and MBSA publish no hall rates at all — dbkl.gov.my lists twenty halls
 * with no rate and routes bookings to Tempah@KL; MBSA publishes procedure and
 * SOPs and no rate list. The A1 draft says so plainly and refuses to estimate.
 * The card says so too, as a row with a value, because that refusal is the
 * finding: every blog number for those two authorities is unsourced.
 *
 * ── Dated rates ───────────────────────────────────────────────────────────
 * A council rate without its date is a rate you cannot check. MP Sepang's is
 * the sharp case — it is the cheapest published rate in the Klang Valley and it
 * has been in force since 1 July 2016. That date is on the card next to the
 * figure, exactly as the article carries it.
 */
import type { CoverSpec } from './cover-template.mts';

export const P6_COVER_SPECS: CoverSpec[] = [
  {
    id: 'P6-1',
    file: 'C6-2-A1-harga-sewa-dewan-kahwin-cover.png',
    draft: 'C6-2-A1-harga-sewa-dewan-kahwin.md',
    kicker: 'Harga sewa dewan kahwin',
    title: 'Kadar rasmi majlis perbandaran, bukan anggaran',
    figures: [
      {
        eyebrow: 'Paling rendah',
        value: 'RM60 sejam',
        sublabel: 'Dewan Taman Bunga Melor, MBDK Klang',
      },
      {
        eyebrow: 'Paling tinggi',
        value: 'RM3,600 sesi',
        sublabel: 'MBSJ kategori A, cuti am, 8 jam',
      },
    ],
    rows: [
      { label: 'MBDK Klang', value: 'RM60–RM200 sejam' },
      { label: 'MBPJ', value: 'RM160–RM450 sesi 6 jam' },
      { label: 'MBSJ', value: 'RM880–RM3,200 sesi 8 jam' },
      { label: 'MP Sepang', value: 'RM40–RM80 sejam (2016)' },
      { label: 'DBKL, MBSA', value: 'Tiada kadar tersiar' },
    ],
    note: 'Kadar sewa sahaja; cagaran berasingan.',
    footer: 'Kadar rasmi majlis perbandaran · Disemak 24 Ogos 2026',
    alt:
      'Kad kos bertajuk "Kadar rasmi majlis perbandaran, bukan anggaran". Pada jalur ungu di tengah, ' +
      'dua hujung julat bersebelahan: paling rendah RM60 sejam, di Dewan Taman Bunga Melor bawah ' +
      'Majlis Bandaraya Diraja Klang; paling tinggi RM3,600 satu sesi, di dewan kategori A Majlis ' +
      'Bandaraya Subang Jaya pada cuti am, sesi lapan jam. Di bawah jalur itu, lima baris mengikut ' +
      'pihak berkuasa: Majlis Bandaraya Diraja Klang RM60 hingga RM200 sejam; Majlis Bandaraya ' +
      'Petaling Jaya RM160 hingga RM450 satu sesi enam jam; Majlis Bandaraya Subang Jaya RM880 ' +
      'hingga RM3,200 satu sesi lapan jam; Majlis Perbandaran Sepang RM40 hingga RM80 sejam pada ' +
      'kadar tahun 2016; dan DBKL serta MBSA tiada kadar tersiar. Nota kecil di bawahnya menyatakan ' +
      'angka ini kadar sewa sahaja dan cagaran dikira berasingan, dan baris kaki kad menyatakan ' +
      'kadar rasmi majlis perbandaran ini disemak 24 Ogos 2026.',
  },

  {
    id: 'P6-2',
    file: 'C6-2-A2-checklist-kahwin-cover.png',
    draft: 'C6-2-A2-checklist-kahwin.md',
    kicker: 'Checklist kahwin',
    title: 'Tiga tarikh mati yang ada dendanya',
    figures: [
      {
        eyebrow: 'Mula merancang',
        value: '12 bulan',
        sublabel: 'Bajet dan tarikh dahulu, bukan tema',
      },
      {
        eyebrow: 'Tempah dewan',
        value: '9 bulan',
        sublabel: 'Cagaran dijelaskan sebelum tempahan sah',
      },
    ],
    rows: [
      { label: 'Dewan', value: 'Cagaran MBSJ 50% tempahan' },
      { label: 'Kursus', value: 'Sijil wajib untuk borang' },
      { label: 'Borang nikah', value: 'Tempoh ikut negeri' },
      { label: 'Yuran kursus', value: 'RM100 seorang (JAIS)' },
    ],
    note: 'Katering, pelamin dan fotografi tiada kadar rasmi. Minta sebut harga bertulis.',
    footer: 'Kadar dewan dan kursus rasmi · Disemak 24 Ogos 2026',
    alt:
      'Kad maklumat bertajuk "Tiga tarikh mati yang ada dendanya". Pada jalur ungu di tengah, dua ' +
      'fakta masa bersebelahan: mula merancang 12 bulan sebelum majlis, dengan bajet dan tarikh ' +
      'didahulukan, bukan tema; dan tempah dewan 9 bulan sebelum, dengan cagaran yang dijelaskan ' +
      'sebelum tempahan sah. Di bawah jalur itu, empat baris: dewan, cagaran Majlis Bandaraya ' +
      'Subang Jaya 50 peratus daripada tempahan; kursus, sijil wajib untuk borang; borang nikah, ' +
      'tempoh ikut negeri; dan yuran kursus RM100 seorang mengikut Jabatan Agama Islam Selangor. ' +
      'Nota kecil di bawahnya menyatakan katering, pelamin dan fotografi tiada kadar rasmi dan ' +
      'perlu sebut harga bertulis. Baris kaki kad menyatakan kadar dewan dan kursus rasmi ini ' +
      'disemak 24 Ogos 2026.',
  },

  {
    id: 'P6-3',
    file: 'C6-2-A3-pakej-dewan-kahwin-cover.png',
    draft: 'C6-2-A3-pakej-dewan-kahwin.md',
    kicker: 'Pakej dewan kahwin',
    title: 'Apa yang termasuk, dan apa yang selalu tidak',
    figures: [
      {
        eyebrow: 'Dewan Banquet',
        value: 'RM5,000',
        sublabel: 'Minimum satu sesi empat jam, MBPJ',
      },
      {
        eyebrow: 'Jam tambahan',
        value: 'RM1,000',
        sublabel: 'Setiap jam selepas empat jam pertama',
      },
    ],
    rows: [
      { label: 'Termasuk', value: '500 kerusi, 50 meja, PA, hawa dingin, juruteknik' },
      { label: 'Persiapan', value: 'RM300–RM600 sejam' },
      { label: 'Cagaran', value: 'RM2,000 tunai/bank draf' },
      { label: 'Cuti am', value: 'Bayaran dua kali ganda' },
    ],
    note: 'Sarung kerusi dan alas meja tidak termasuk. MBSA tidak menyiarkan kadarnya.',
    footer: 'Senarai kadar Dewan Sivik MBPJ 2024 · Disemak 24 Ogos 2026',
    alt:
      'Kad kos bertajuk "Apa yang termasuk, dan apa yang selalu tidak". Pada jalur ungu di tengah, ' +
      'dua angka bersebelahan: Dewan Banquet RM5,000, minimum satu sesi empat jam di Majlis ' +
      'Bandaraya Petaling Jaya; dan jam tambahan RM1,000, setiap jam selepas empat jam pertama. Di ' +
      'bawah jalur itu, empat baris: yang termasuk ialah 500 kerusi, 50 meja, sistem PA, penghawa ' +
      'dingin dan juruteknik; persiapan RM300 hingga RM600 sejam; cagaran RM2,000 tunai atau bank ' +
      'draf; dan cuti am dikenakan bayaran dua kali ganda. Nota kecil di bawahnya menyatakan sarung ' +
      'kerusi dan alas meja tidak termasuk, dan MBSA tidak menyiarkan kadarnya. Baris kaki kad ' +
      'menamakan senarai kadar Dewan Sivik MBPJ 2024 sebagai sumber, disemak 24 Ogos 2026.',
  },

  {
    id: 'P6-4',
    file: 'C6-2-A4-bajet-kahwin-cover.png',
    draft: 'C6-2-A4-bajet-kahwin.md',
    kicker: 'Bajet kahwin',
    title: 'Apa yang boleh diharga tepat, dan apa yang tidak',
    figures: [
      {
        eyebrow: 'Boleh dikunci',
        value: '2 baris',
        sublabel: 'Sewa dewan dan yuran kursus',
      },
      {
        eyebrow: 'Perlu sebut harga',
        value: '5 baris',
        sublabel: 'Katering, pelamin, foto, baju, kad',
      },
    ],
    rows: [
      { label: 'Sewa dewan', value: 'RM40 sejam – RM3,600 sesi' },
      { label: 'Yuran kursus', value: 'RM100 seorang (Selangor)' },
      { label: 'Cagaran', value: 'RM200–RM2,000, dipulangkan' },
      { label: 'Kos vendor', value: 'Tiada kadar rasmi' },
    ],
    note: 'Kadar kursus berbeza ikut negeri. Semak jabatan agama Islam negeri anda.',
    footer: 'MBPJ, MBSJ, MBDK, MP Sepang dan JAIS · Disemak 24 Ogos 2026',
    alt:
      'Kad bajet bertajuk "Apa yang boleh diharga tepat, dan apa yang tidak". Pada jalur ungu di ' +
      'tengah, dua fakta bersebelahan: dua baris bajet boleh dikunci, iaitu sewa dewan dan yuran ' +
      'kursus; lima baris perlu sebut harga, iaitu katering, pelamin, foto, baju dan kad. Di bawah ' +
      'jalur itu, empat baris: sewa dewan RM40 sejam hingga RM3,600 satu sesi; yuran kursus RM100 ' +
      'seorang di Selangor; cagaran RM200 hingga RM2,000, yang dipulangkan; dan kos vendor, tiada ' +
      'kadar rasmi. Nota kecil di bawahnya menyatakan kadar kursus berbeza ikut negeri dan perlu ' +
      'disemak dengan jabatan agama Islam negeri sendiri. Baris kaki kad menamakan MBPJ, MBSJ, ' +
      'MBDK, MP Sepang dan JAIS sebagai sumber, disemak 24 Ogos 2026.',
  },
];
