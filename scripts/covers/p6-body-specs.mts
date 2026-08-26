/**
 * P6 in-article graphics — cluster C6.2, the cost pages.
 *
 * Body graphics, not covers. See `p1-body-specs.mts` for why that distinction
 * matters to the template (graphic kit spec §2.3: body images are never
 * smart-cropped, so the generator's per-crop warnings do not apply here).
 *
 * ── Why these four articles get cards ─────────────────────────────────────
 * Every one of them turns on arithmetic a photograph cannot show: what a
 * published rate leaves out, what a session actually costs, which line is
 * refundable, which line has no official rate at all. P6B-1 is the clearest
 * case — the article's whole argument is that RM160 is RM860, and that is a
 * card, not a picture of a hall.
 *
 * ── The sourcing rule ─────────────────────────────────────────────────────
 * EVERY rate, deposit, hour count and authority name below was taken from the
 * article the graphic belongs to — the `.md` named in `draft` — and from
 * nowhere else. No rate is carried across from a sibling draft even where two
 * drafts quote the same council, and nothing was sourced by this file's author.
 *
 * ── The one arithmetic step, shown rather than hidden ─────────────────────
 * P6B-1 prints `RM100 sejam × 6 = RM600` as a row value. The multiplication is
 * the article's own: it states the six-hour session, the RM100 hourly aircon
 * charge, and the RM860 total in the same passage. The card shows the working,
 * because a reader who cannot see the working has to take RM860 on trust, and
 * taking a number on trust is the exact habit this article exists to break.
 *
 * ── "Tiada kadar tersiar" is a value, not a blank ─────────────────────────
 * Same rule as the P6 covers. DBKL publishes 22 halls and no rates; MBSA
 * publishes procedure and no rates for its majlis halls. P6B-2 says so as a row
 * with a value, because that refusal is the finding.
 *
 * ── Five rows is the template's ceiling ───────────────────────────────────
 * `renderCover` throws rather than shrink body type below its 88px legibility
 * floor, which caps a card at five rows. Where an article has a sixth item it
 * goes in the note or stays in the prose. It is never squeezed in.
 */
import type { CoverSpec } from './cover-template.mts';

export const P6_BODY_SPECS: CoverSpec[] = [
  {
    id: 'P6B-1',
    file: 'C6-2-A1-harga-sewa-dewan-kahwin-rm160.png',
    draft: 'C6-2-A1-harga-sewa-dewan-kahwin.md',
    kicker: 'Harga sewa dewan',
    title: 'Kenapa RM160 itu sebenarnya RM860',
    figures: [
      {
        eyebrow: 'Tersiar sebagai',
        value: 'RM160',
        sublabel: 'Dewan PJS 4/19, satu sesi enam jam',
      },
      {
        eyebrow: 'Jumlah sebenar',
        value: 'RM860',
        sublabel: 'Sebelum cagaran RM200 dikeluarkan',
      },
    ],
    rows: [
      { label: 'Sewa', value: 'RM160 sesi enam jam' },
      { label: 'Kebersihan', value: 'RM100 tetap' },
      { label: 'Hawa dingin', value: 'RM100 sejam × 6 = RM600' },
      { label: 'Jumlah', value: 'RM860' },
      { label: 'Cagaran', value: 'RM200, dipulangkan' },
    ],
    note: 'Kadar sewa ialah satu baris, bukan jumlahnya.',
    footer: 'Senarai kadar MBPJ 2024 · Disemak 25 Ogos 2026',
    alt:
      'Kad kos bertajuk "Kenapa RM160 itu sebenarnya RM860". Pada jalur ungu di tengah, dua ' +
      'angka bersebelahan: kadar yang tersiar ialah RM160 bagi Dewan PJS 4/19 untuk satu sesi ' +
      'enam jam; jumlah sebenar ialah RM860, sebelum cagaran RM200 dikeluarkan. Di bawah jalur ' +
      'itu, lima baris daripada senarai kadar Majlis Bandaraya Petaling Jaya: sewa RM160 bagi ' +
      'sesi enam jam; kebersihan dan elektrik RM100 tetap; penghawa dingin RM100 sejam didarab ' +
      'enam jam menjadi RM600; jumlah RM860; dan cagaran RM200 yang dipulangkan. Nota kecil di ' +
      'bawahnya menyatakan kadar sewa itu satu baris sahaja dan bukan jumlahnya. Baris kaki kad ' +
      'menyatakan sumbernya senarai kadar MBPJ tahun 2024, disemak 25 Ogos 2026.',
  },

  {
    id: 'P6B-2',
    file: 'C6-2-A1-harga-sewa-dewan-kahwin-jam-atau-sesi.png',
    draft: 'C6-2-A1-harga-sewa-dewan-kahwin.md',
    kicker: 'Jam atau sesi',
    title: 'Dua angka yang serupa, dua bil yang berbeza',
    figures: [
      {
        eyebrow: 'MBPJ dan MBSJ',
        value: 'Blok masa',
        sublabel: 'Satu harga untuk enam atau lapan jam',
      },
      {
        eyebrow: 'MB Diraja Klang',
        value: 'Kadar sejam',
        sublabel: 'RM120 sejam menjadi RM960 untuk lapan jam',
      },
    ],
    rows: [
      { label: 'Unit', value: 'Sejam atau sesesi?' },
      { label: 'Persiapan', value: 'MBSJ kira tempahan kedua' },
      { label: 'Cuti am', value: 'MBPJ dua kali ganda' },
      { label: 'DBKL', value: '22 dewan, tiada kadar tersiar' },
      { label: 'MBSA', value: 'Prosedur tersiar, kadar tidak' },
    ],
    note: 'RM160 PJ itu enam jam. RM170 Klang itu satu jam.',
    footer: 'Senarai kadar MBPJ, MBSJ dan Klang 2024 · Disemak 25 Ogos 2026',
    alt:
      'Kad maklumat bertajuk "Dua angka yang serupa, dua bil yang berbeza". Pada jalur ungu di ' +
      'tengah, dua fakta bersebelahan: Majlis Bandaraya Petaling Jaya dan Majlis Bandaraya ' +
      'Subang Jaya menjual blok masa, iaitu satu harga untuk enam atau lapan jam; Majlis ' +
      'Bandaraya Diraja Klang mengenakan kadar sejam, jadi RM120 sejam menjadi RM960 untuk ' +
      'lapan jam. Di bawah jalur itu, lima baris yang perlu disemak sebelum membanding: unitnya ' +
      'sejam atau sesesi; sesi persiapan yang dikira sebagai tempahan kedua di MBSJ; cuti am ' +
      'yang dikenakan bayaran dua kali ganda di MBPJ; DBKL yang menyenaraikan 22 dewan tanpa ' +
      'satu pun kadar tersiar; dan MBSA yang menyiarkan prosedur tetapi bukan kadar. Nota kecil ' +
      'di bawahnya menyatakan RM160 di Petaling Jaya itu enam jam manakala RM170 di Klang itu ' +
      'satu jam. Baris kaki kad menyatakan sumbernya senarai kadar MBPJ, MBSJ dan Klang tahun ' +
      '2024, disemak 25 Ogos 2026.',
  },

  {
    id: 'P6B-3',
    file: 'C6-2-A2-checklist-kahwin-garis-masa.png',
    draft: 'C6-2-A2-checklist-kahwin.md',
    kicker: 'Checklist kahwin',
    title: 'Urutan 12 bulan, dan apa yang dibuat bila',
    figures: [
      {
        eyebrow: 'Mula merancang',
        value: '12 bulan',
        sublabel: 'Bajet, bilangan tetamu dan tarikh dahulu',
      },
      {
        eyebrow: 'Titik potong',
        value: '3 bulan',
        sublabel: 'Selepas itu deposit mula hilang',
      },
    ],
    rows: [
      { label: '12 bulan', value: 'Bajet dan tetamu' },
      { label: '9 bulan', value: 'Tempah dewan' },
      { label: '6 bulan', value: 'Kunci katerer' },
      { label: '3 bulan', value: 'Borang nikah' },
      { label: '1 bulan', value: 'Edar kad' },
    ],
    note: 'Tiga tarikh mati berdenda: dewan, kursus, borang.',
    footer: 'Kadar dewan dan kursus rasmi · Disemak 25 Ogos 2026',
    alt:
      'Kad garis masa bertajuk "Urutan 12 bulan, dan apa yang dibuat bila". Pada jalur ungu di ' +
      'tengah, dua fakta masa bersebelahan: mula merancang 12 bulan sebelum majlis, dengan ' +
      'bajet, bilangan tetamu dan tarikh didahulukan; dan titik potong terakhir pada tiga bulan, ' +
      'kerana selepas itu deposit mula hilang. Di bawah jalur itu, lima baris, satu perkara ' +
      'utama bagi setiap peringkat: pada 12 bulan, bajet dan bilangan tetamu; pada 9 bulan, ' +
      'tempah dewan; pada 6 bulan, kunci katerer; pada 3 bulan, borang nikah; dan pada 1 bulan, ' +
      'edar kad. Nota kecil di bawahnya menyatakan tiga tarikh mati yang berdenda ' +
      'ialah dewan, kursus dan borang. Baris kaki kad menyatakan kadar dewan dan kursus rasmi ' +
      'ini disemak 25 Ogos 2026.',
  },

  {
    id: 'P6B-5',
    file: 'C6-2-A3-pakej-dewan-kahwin-syarat-katerer.png',
    draft: 'C6-2-A3-pakej-dewan-kahwin.md',
    kicker: 'Syarat katerer',
    title: 'Baris yang paling mahal dalam syarat dewan',
    figures: [
      {
        eyebrow: 'Paling mahal',
        value: 'Tidak boleh masak',
        sublabel: 'Di dalam mahupun di luar dewan',
      },
      {
        eyebrow: 'Maknanya',
        value: 'Makanan siap',
        sublabel: 'Masakan kampung di belakang dewan tertutup',
      },
    ],
    rows: [
      { label: 'Dibenarkan', value: 'Hidang dome dan buffet' },
      { label: 'Katerer', value: 'Mahir dan diiktiraf sahaja' },
      { label: 'Pelayan', value: 'Berseragam dan terlatih' },
      { label: 'Makanan', value: 'Halal sahaja' },
      { label: 'Dari luar', value: 'Perlu surat kebenaran' },
    ],
    note: 'Syarat berbeza antara dewan. Tanya lebih awal.',
    footer: 'Syarat am Dewan Banquet MBPJ · Disemak 25 Ogos 2026',
    alt:
      'Kad maklumat bertajuk "Baris yang paling mahal dalam syarat dewan". Pada jalur ungu di ' +
      'tengah, dua fakta bersebelahan: syarat yang paling mahal ialah tidak dibenarkan memasak, ' +
      'di dalam mahupun di luar dewan; dan maknanya makanan mesti sampai sudah siap, jadi ' +
      'masakan kampung di belakang dewan tertutup. Di bawah jalur itu, lima baris daripada ' +
      'syarat am Dewan Banquet Majlis Bandaraya Petaling Jaya: hidangan secara dome dan buffet ' +
      'dibenarkan; katerer mesti yang mahir dan diiktiraf sahaja; pelayan mesti berseragam dan ' +
      'terlatih; makanan mesti halal sahaja; dan makanan dari luar memerlukan surat kebenaran. ' +
      'Nota kecil di bawahnya menyatakan syarat berbeza antara dewan, jadi ia perlu ditanya ' +
      'lebih awal. Baris kaki kad menyatakan sumbernya syarat am Dewan Banquet MBPJ, disemak ' +
      '25 Ogos 2026.',
  },
];
