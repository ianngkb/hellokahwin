/**
 * P1 in-article graphics — clusters C1.1 and C1.2.
 *
 * These are BODY graphics, not covers. Per the graphic kit spec §2.3, body
 * images render from `variants` at their own aspect ratio and never pass
 * through the smart-crop pipeline, so the generator's per-crop warnings do not
 * apply to anything in this file.
 *
 * ── Why P1 gets graphics rather than photographs ──────────────────────────
 * Brief of 25 Aug 2026: "P1 and P6 will lean on kind 2. That is the right
 * answer for them, not a compromise." The subject matter of these four articles
 * is a form number, a fee, a sequence and a list of conditions. No photograph
 * depicts a form number. A card does, and it is rights-free.
 *
 * ── The sourcing rule, unchanged from every other spec file here ──────────
 * EVERY figure, form number, fee and date below was taken from the article the
 * graphic belongs to — the `.md` named in `draft` — and from nowhere else.
 * Nothing was sourced independently by the author of this file, and no figure
 * is carried between articles.
 *
 * ── The one place a count is stated rather than quoted ────────────────────
 * `21 kedudukan` on P1B-2 is a count of a list `rukun-nikah.md` prints in full.
 * It was counted off the article text item by item: the wali order runs bapa
 * kandung → wali hakim in 21 positions, of which the 21st is wali hakim. It is
 * not an estimate and it does not come from outside the draft.
 *
 * ── This set is deliberately small, and that is the point ─────────────────
 * Seven cards were drafted for P1 and P6; four of the P1 ones were cut before
 * anything shipped because the P1 COVER cards — displaced into the body by the
 * owner's instruction of 25 Ogos 2026 — already carry that data. `cover-rukun-
 * nikah.png` already lists the five rukun; `cover-borang-nikah.png` already
 * lists the forms and their fees; `cover-lafaz-taklik.png` already lists the
 * three taklik conditions; `cover-syarat-sah-nikah.png` already carries the
 * enakmen additions. A second card saying the same thing is padding, and the
 * brief of 25 Aug 2026 rules padding out explicitly. What survives here is only
 * what those four cards do NOT say.
 *
 * ── Five rows is the ceiling, and it is the template's, not a preference ──
 * `renderCover` refuses to shrink body type below an 88px legibility floor and
 * throws rather than render an illegible card. At this canvas that caps a card
 * at five rows with short values. Where an article has a sixth item, it is in
 * the note or in the prose — it is never squeezed in.
 */
import type { CoverSpec } from './cover-template.mts';

export const P1_BODY_SPECS: CoverSpec[] = [
  {
    id: 'P1B-2',
    file: 'rukun-nikah-wali-hakim.png',
    draft: 'rukun-nikah.md',
    kicker: 'Wali nikah',
    title: 'Bila wali hakim boleh ambil tempat wali nasab',
    figures: [
      {
        eyebrow: 'Susunan wali',
        value: '21 kedudukan',
        sublabel: 'Bapa kandung di atas, wali hakim yang terakhir',
      },
      {
        eyebrow: 'Jarak wali aqrab',
        value: 'Dua marhalah',
        sublabel: 'Kurang daripada itu, hakim perlu izin wali',
      },
    ],
    rows: [
      { label: 'Keadaan 1', value: 'Wali enggan tanpa sebab' },
      { label: 'Keadaan 2', value: 'Tiada wali nasab' },
      { label: 'Keadaan 3', value: 'Wali aqrab tak cukup syarat' },
      { label: 'Keadaan 4', value: 'Wali aqrab jauh atau berihram' },
    ],
    note: 'Wali hakim sindiket tidak sah — Mufti Pulau Pinang.',
    footer: 'Irsyad Hukum Siri ke-408, 2020 · Disemak 24 Ogos 2026',
    alt:
      'Kad maklumat bertajuk "Bila wali hakim boleh ambil tempat wali nasab". Pada jalur ungu di ' +
      'tengah, dua fakta bersebelahan: susunan wali mengandungi 21 kedudukan, bermula dengan ' +
      'bapa kandung di atas dan wali hakim yang terakhir; dan jarak wali aqrab diukur pada dua ' +
      'marhalah, kerana kurang daripada itu hakim perlu izin wali. Di bawah jalur itu, empat ' +
      'baris keadaan yang mengharuskan wali hakim mengambil tempat: pertama, wali enggan tanpa ' +
      'sebab; kedua, tiada wali nasab; ketiga, wali aqrab tidak cukup syarat; keempat, wali ' +
      'aqrab berada jauh atau sedang berihram. Nota kecil di bawahnya menyatakan wali hakim ' +
      'sindiket tidak sah menurut Mufti Pulau Pinang. Baris kaki kad menyatakan sumbernya Irsyad ' +
      'Hukum Siri ke-408 tahun 2020, disemak 24 Ogos 2026.',
  },

  {
    id: 'P1B-3',
    file: 'syarat-sah-nikah-lelaki-perempuan.png',
    draft: 'syarat-sah-nikah.md',
    kicker: 'Syarat sah nikah',
    title: 'Syarat bagi pihak lelaki dan pihak perempuan',
    figures: [
      {
        eyebrow: 'Pihak lelaki',
        value: 'Tujuh syarat',
        sublabel: 'Masjid Wilayah Persekutuan',
      },
      {
        eyebrow: 'Pihak perempuan',
        value: 'Enam syarat',
        sublabel: 'Senarai daripada laman yang sama',
      },
    ],
    rows: [
      { label: 'Agama', value: 'Islam' },
      { label: 'Pertalian', value: 'Bukan mahram' },
      { label: 'Ihram', value: 'Bukan dalam ihram' },
      { label: 'Orangnya', value: 'Tertentu, bukan sesiapa' },
    ],
    note: 'Lelaki menambah tiga syarat lagi; perempuan dua.',
    footer: 'Masjid Wilayah Persekutuan · Disemak 24 Ogos 2026',
    alt:
      'Kad maklumat bertajuk "Syarat bagi pihak lelaki dan pihak perempuan". Pada jalur ungu di ' +
      'tengah, dua fakta bersebelahan: pihak lelaki mempunyai tujuh syarat mengikut Masjid ' +
      'Wilayah Persekutuan, dan pihak perempuan enam syarat daripada senarai laman yang sama. Di ' +
      'bawah jalur itu, empat baris syarat yang sama pada kedua-dua pihak: agama Islam; ' +
      'pertalian, iaitu bukan mahram; bukan dalam ihram; dan orangnya tertentu, bukan sesiapa. ' +
      'Nota kecil di bawahnya menyatakan pihak lelaki menambah tiga syarat lagi manakala pihak ' +
      'perempuan menambah dua. Baris kaki kad menyatakan sumbernya Masjid Wilayah Persekutuan, ' +
      'disemak 24 Ogos 2026.',
  },

  {
    id: 'P1B-6',
    file: 'borang-nikah-dokumen.png',
    draft: 'borang-nikah.md',
    kicker: 'Dokumen permohonan',
    title: 'Apa yang perlu dibawa, dan bila ia perlu sampai',
    figures: [
      {
        eyebrow: 'Hantar sebelum',
        value: '7 hari',
        sublabel: 'Sebelum tarikh akad — Perak dan Selangor',
      },
      {
        eyebrow: 'Pulau Pinang',
        value: '12 dan 19 item',
        sublabel: 'Pemohon lelaki dan pemohon perempuan',
      },
    ],
    rows: [
      { label: 'Pengenalan', value: 'Kad pemohon, asal dan salinan' },
      { label: 'Pasangan', value: 'Salinan kad pengenalan' },
      { label: 'Kursus', value: 'Sijil Praperkahwinan Islam' },
      { label: 'Kesihatan', value: 'Saringan HIV, sah 6 bulan' },
    ],
    note: 'Pemohon perempuan menambah dokumen wali.',
    footer: 'e-Munakahat Pulau Pinang · Disemak 24 Ogos 2026',
    alt:
      'Kad maklumat bertajuk "Apa yang perlu dibawa, dan bila ia perlu sampai". Pada jalur ungu ' +
      'di tengah, dua fakta bersebelahan: permohonan hendaklah dihantar sekurang-kurangnya tujuh ' +
      'hari sebelum tarikh akad di Perak dan Selangor; dan senarai semak Pulau Pinang ' +
      'mengandungi 12 item bagi pemohon lelaki dan 19 item bagi pemohon perempuan. Di bawah ' +
      'jalur itu, empat baris dokumen yang biasa bagi kedua-dua pihak: kad pengenalan pemohon, ' +
      'asal dan salinan; salinan kad pengenalan pasangan; sijil Kursus Praperkahwinan Islam; dan ' +
      'keputusan saringan HIV yang sah enam bulan. Nota kecil di bawahnya menyatakan pemohon ' +
      'perempuan menambah dokumen wali. Baris kaki kad menyatakan sumbernya e-Munakahat Pulau ' +
      'Pinang, disemak 24 Ogos 2026.',
  },
  {
    id: 'P1B-8',
    file: 'borang-nikah-sistem-negeri.png',
    draft: 'borang-nikah.md',
    kicker: 'Sistem permohonan',
    title: 'SPPIM bukan satu sistem untuk seluruh negara',
    figures: [
      {
        eyebrow: 'SPPIM 2.0',
        value: '13 Sept 2025',
        sublabel: 'Dilancarkan di Johor Bahru',
      },
      {
        eyebrow: 'Guna sistem sendiri',
        value: 'Lima negeri',
        sublabel: 'Setakat berita JAKIM 24 April 2026',
      },
    ],
    rows: [
      { label: 'Pulau Pinang', value: 'e-Munakahat' },
      { label: 'Sabah', value: 'Portal ePerkahwinan' },
      { label: 'Johor', value: 'SPPIM' },
      { label: 'Kelantan, Pahang', value: 'Sistem sendiri' },
      { label: 'Sarawak', value: 'Sistem sendiri' },
    ],
    note: 'Guna www.sppim.gov.my. Tanpa www ia tidak menyelesai.',
    footer: 'Berita JAKIM 24 April 2026 · Disemak 24 Ogos 2026',
    alt:
      'Kad maklumat bertajuk "SPPIM bukan satu sistem untuk seluruh negara". Pada jalur ungu di ' +
      'tengah, dua fakta bersebelahan: SPPIM versi 2.0 dilancarkan pada 13 September 2025 di ' +
      'Johor Bahru; dan lima negeri masih menggunakan sistem sendiri setakat berita JAKIM ' +
      'bertarikh 24 April 2026. Di bawah jalur itu, lima baris negeri dan sistemnya: Pulau ' +
      'Pinang menggunakan e-Munakahat; Sabah menggunakan Portal ePerkahwinan; Johor menggunakan ' +
      'SPPIM; Kelantan dan Pahang menggunakan sistem sendiri; dan Sarawak juga menggunakan ' +
      'sistem sendiri. Nota kecil di bawahnya menyatakan alamat yang berfungsi ialah ' +
      'www.sppim.gov.my, kerana tanpa www ia tidak menyelesai. Baris kaki kad menyatakan ' +
      'sumbernya berita JAKIM bertarikh 24 April 2026, disemak 24 Ogos 2026.',
  },

  {
    id: 'P1B-9',
    file: 'lafaz-taklik-ke-mana-perginya.png',
    draft: 'lafaz-taklik.md',
    kicker: 'Selepas majlis',
    title: 'Ke mana lafaz taklik itu pergi selepas dibaca',
    figures: [
      {
        eyebrow: 'Dicetak dalam',
        value: 'Borang 4 dan 5',
        sublabel: 'Butir Daftar dan Perakuan Nikah',
      },
      {
        eyebrow: 'Fi Borang 5',
        value: 'RM15.00',
        sublabel: 'Perakuan Nikah, teks Perak',
      },
    ],
    rows: [
      { label: 'Dicatat', value: 'Dalam Daftar Perkahwinan' },
      { label: 'Dikeluarkan', value: 'Surat perakuan taklik' },
      { label: 'Kepada', value: 'Setiap satu pihak' },
      { label: 'Kalau berlaku', value: 'Borang 11 di Perak' },
    ],
    note: 'Tidak pernah terima surat itu? Tanya Pejabat Agama Daerah.',
    footer: 'Enakmen Selangor 2003, s.22 dan s.26 · Disemak 24 Ogos 2026',
    alt:
      'Kad maklumat bertajuk "Ke mana lafaz taklik itu pergi selepas dibaca". Pada jalur ungu di ' +
      'tengah, dua fakta bersebelahan: lafaz taklik dicetak dalam Borang 4 dan Borang 5, iaitu ' +
      'Butir Daftar dan Perakuan Nikah; dan fi Borang 5, Perakuan Nikah, ialah RM15.00 mengikut ' +
      'teks Perak. Di bawah jalur itu, empat baris: lafaz itu dicatat dalam Daftar Perkahwinan; ' +
      'surat perakuan taklik dikeluarkan; ia diberi kepada setiap satu pihak; dan kalau syaratnya ' +
      'berlaku, permohonan dibuat melalui Borang 11 di Perak. Nota kecil di bawahnya bertanya ' +
      'sama ada pembaca pernah menerima surat itu, dan menyuruh bertanya di Pejabat Agama ' +
      'Daerah. Baris kaki kad menyatakan sumbernya Enakmen Selangor 2003 seksyen 22 dan 26, ' +
      'disemak 24 Ogos 2026.',
  },
];
