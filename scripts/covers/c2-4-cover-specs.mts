/**
 * The eight C2.4 covers, one per draft.
 *
 * EVERY figure and phrase here was taken from the article that cover belongs
 * to — the `*-REVIEWED.md` file named in `draft` — and from nowhere else. No
 * number is carried across from a sibling draft, and none was sourced by this
 * script's author. Where two drafts describe the same jurisdiction differently
 * (A1 lists Sabah RM100 and Sarawak RM120 flagged "belum disahkan"; A7 states
 * both simply set no minimum) each cover follows ITS OWN article. That
 * divergence is real and is reported upward, not silently reconciled here.
 *
 * "Tiada kadar minimum ditetapkan" is a value, not a blank. The template
 * renders it as the figure, at figure size.
 */
import type { CoverSpec } from './cover-template.mts';

export const COVER_SPECS: CoverSpec[] = [
  {
    id: 'A1',
    file: 'A1-mas-kahwin-ikut-negeri-cover.png',
    draft: 'A1-mas-kahwin-ikut-negeri-REVIEWED.md',
    kicker: 'Mas kahwin ikut negeri',
    title: 'Kadar minimum mas kahwin, 14 bidang kuasa',
    figures: [
      {
        eyebrow: 'Julat kadar',
        value: 'RM22.50 – RM300',
        sublabel: 'Johor hingga Selangor dan Wilayah Persekutuan',
      },
      {
        eyebrow: 'Tiada kadar',
        value: '6 daripada 14',
        sublabel: 'Perlis, Kedah, Pulau Pinang, Perak, Kelantan, Terengganu',
      },
    ],
    rows: [
      { label: 'RM300', value: 'Selangor, Wilayah Persekutuan' },
      { label: 'RM200 / RM100', value: 'Negeri Sembilan, anak dara / janda' },
      { label: 'RM120*', value: 'Sarawak' },
      { label: 'RM100', value: 'Melaka, Pahang, Sabah*' },
      { label: 'RM22.50*', value: 'Johor' },
    ],
    footer: '* Belum disahkan sebagai kadar semasa · Disemak Ogos 2026',
    alt:
      'Grafik ringkasan kadar minimum mas kahwin bagi 14 bidang kuasa: julat RM22.50 hingga RM300, ' +
      'RM300 di Selangor dan Wilayah Persekutuan, RM200 anak dara dan RM100 janda di Negeri Sembilan, ' +
      'RM120 Sarawak, RM100 di Melaka, Pahang dan Sabah, RM22.50 Johor, dan tiada kadar minimum ' +
      'ditetapkan di enam bidang kuasa.',
  },

  {
    id: 'A2',
    file: 'A2-apa-itu-mas-kahwin-cover.png',
    draft: 'A2-apa-itu-mas-kahwin-REVIEWED.md',
    kicker: 'Apa itu mas kahwin',
    title: 'Maksud mas kahwin: hak isteri dan beza dengan hantaran',
    // A2 carries no state figure by design — "all rates belong to A1", the
    // chair's ruling recorded in the draft. The band therefore holds the two
    // definitional facts instead of a number.
    figures: [
      {
        eyebrow: 'Mas kahwin',
        value: 'Wajib',
        sublabel: 'Bayaran suami kepada isteri pada masa akad nikah',
      },
      {
        eyebrow: 'Milik siapa',
        value: 'Isteri',
        sublabel: 'Hak isteri sepenuhnya; mahar ialah istilah Arab baginya',
      },
    ],
    rows: [
      { label: 'Mas kahwin', value: 'Wajib, milik isteri' },
      { label: 'Hantaran', value: 'Adat, milik penerima dulang' },
      { label: 'Duit hantaran', value: 'Adat, milik keluarga' },
    ],
    note: 'Kadar minimum ditetapkan pihak berkuasa agama negeri, dan tidak semua negeri menetapkan satu.',
    footer: 'Disemak Ogos 2026',
    alt:
      'Grafik yang menerangkan maksud mas kahwin sebagai bayaran wajib suami kepada isteri dan hak ' +
      'isteri sepenuhnya, berbanding hantaran dan duit hantaran yang merupakan adat antara dua keluarga.',
  },

  {
    id: 'A3',
    file: 'A3-mas-kahwin-johor-cover.png',
    draft: 'A3-mas-kahwin-johor-REVIEWED.md',
    kicker: 'Mas kahwin Johor',
    title: 'RM22.50 dan asal usul angkanya',
    figures: [
      {
        eyebrow: 'Kadar yang beredar',
        value: 'RM22.50',
        sublabel: 'Belum disahkan sebagai kadar semasa',
      },
    ],
    rows: [
      { label: 'Sumber', value: 'Modul kursus 2019/2020' },
      { label: 'Asal angka', value: "Ahkam Syar'iyyah Johor 1935" },
      { label: 'Kajian UiTM', value: 'Had maksimum, bukan minimum' },
      { label: 'Portal JAINJ', value: 'Tiada kadar diterbitkan' },
    ],
    note: 'Tiada laman kerajaan negeri Johor menerbitkan angka ini pada hari ini.',
    footer: 'Disemak Ogos 2026',
    alt:
      'Grafik kadar mas kahwin Johor menunjukkan angka RM22.50 yang beredar dan belum disahkan sebagai ' +
      "kadar semasa, berserta asal usulnya daripada Ahkam Syar'iyyah Johor 1935 dan pembacaan kajian " +
      'UiTM sebagai had maksimum.',
  },

  {
    id: 'A4',
    file: 'A4-mas-kahwin-kelantan-terengganu-cover.png',
    draft: 'A4-mas-kahwin-kelantan-terengganu-REVIEWED.md',
    kicker: 'Mas kahwin Kelantan dan Terengganu',
    title: 'Tiada kadar minimum ditetapkan',
    figures: [
      {
        eyebrow: 'Kelantan',
        value: 'Tiada kadar minimum ditetapkan',
        sublabel: 'Tiada kenyataan rasmi',
      },
      {
        eyebrow: 'Terengganu',
        value: 'Tiada kadar minimum ditetapkan',
        sublabel: 'Pesuruhjaya JHEAT, Mac 2024',
      },
    ],
    rows: [
      { label: 'Kelantan', value: 'Fi nikah RM126' },
      { label: 'Terengganu', value: 'Upah nikah RM100' },
      { label: 'Sumber', value: 'Utusan Malaysia, 29 Mac 2024' },
    ],
    note: 'Angka RM300 dan RM100 yang beredar bagi Terengganu tidak dapat dikesan kepada sumber kerajaan negeri.',
    footer: 'Disemak Ogos 2026',
    alt:
      'Grafik perbandingan Kelantan dan Terengganu menunjukkan kedua-dua negeri tidak menetapkan kadar ' +
      'minimum mas kahwin, berserta sumber setiap negeri dan fi nikah RM126 di Kelantan serta upah ' +
      'nikah RM100 di Terengganu.',
  },

  {
    id: 'A5',
    file: 'A5-mas-kahwin-perak-cover.png',
    draft: 'A5-mas-kahwin-perak-REVIEWED.md',
    kicker: 'Mas kahwin Perak',
    title: 'Tiada kadar minimum ditetapkan',
    figures: [
      {
        eyebrow: 'Kadar minimum',
        value: 'Tiada kadar minimum ditetapkan',
        sublabel: 'Warta Pk. P.U. 30: ruang kosong, bukan angka',
      },
    ],
    rows: [
      { label: 'Warta negeri', value: 'Pk. P.U. 30, 1 Jun 2013' },
      { label: 'JAIPK', value: 'Tiada kadar diterbitkan' },
      { label: 'Modul kursus', value: 'Perak: tiada ketetapan' },
      { label: 'Fi rasmi', value: 'RM1 hingga RM30' },
    ],
    note: 'Angka RM101 yang beredar tidak dapat dikesan kepada mana-mana sumber kerajaan negeri Perak.',
    footer: 'Disemak Ogos 2026',
    alt:
      'Grafik kadar mas kahwin Perak menyatakan tiada kadar minimum ditetapkan, dengan warta Pk. P.U. 30 ' +
      'bertarikh 1 Jun 2013 hanya membawa ruang kosong pada borang, dan fi rasmi urusan perkahwinan ' +
      'antara RM1 hingga RM30.',
  },

  {
    id: 'A6',
    file: 'A6-mas-kahwin-pahang-negeri-sembilan-cover.png',
    draft: 'A6-mas-kahwin-pahang-negeri-sembilan-REVIEWED.md',
    kicker: 'Mas kahwin Pahang dan Negeri Sembilan',
    title: 'Kadar rasmi dua negeri',
    figures: [
      {
        eyebrow: 'Pahang',
        value: 'RM100',
        sublabel: 'Titah Sultan Pahang, 28 Mac 2024',
      },
      {
        eyebrow: 'Negeri Sembilan',
        value: 'RM200 / RM100',
        sublabel: 'Anak dara atau bujang / janda atau ibu tunggal',
      },
    ],
    rows: [
      { label: 'Pahang', value: 'Sebelum ini RM22.50' },
      { label: 'Kuat kuasa', value: 'Tarikh tidak dinyatakan' },
      { label: 'N. Sembilan', value: 'Dokumen JHEAINS, Mei 2026' },
      { label: 'Kadar minimum', value: 'Lantai, bukan jumlah akhir' },
    ],
    note: 'Tiada sumber rasmi Pahang menyatakan perbezaan kadar bagi janda.',
    footer: 'Disemak Ogos 2026',
    alt:
      'Grafik kadar mas kahwin Pahang RM100 selepas titah Sultan Pahang pada 28 Mac 2024, dan Negeri ' +
      'Sembilan RM200 bagi anak dara atau bujang dan RM100 bagi janda atau ibu tunggal mengikut dokumen ' +
      'JHEAINS.',
  },

  {
    id: 'A7',
    file: 'A7-mas-kahwin-sabah-sarawak-cover.png',
    draft: 'A7-mas-kahwin-sabah-sarawak-REVIEWED.md',
    kicker: 'Mas kahwin Sabah dan Sarawak',
    title: 'Tiada kadar minimum ditetapkan',
    figures: [
      {
        eyebrow: 'Sabah',
        value: 'Tiada kadar minimum ditetapkan',
        sublabel: 'Enakmen 2004, seksyen 21',
      },
      {
        eyebrow: 'Sarawak',
        value: 'Tiada kadar minimum ditetapkan',
        sublabel: 'Ordinan 2001, seksyen 19',
      },
    ],
    rows: [
      { label: 'Kewajipan', value: 'Merekod nilai, bukan menetapkan' },
      { label: 'Angka beredar', value: 'RM100 Sabah, RM120 Sarawak' },
      { label: 'Sumbernya', value: 'Modul kursus 2019/2020' },
    ],
    note: 'Tiada jabatan agama di Sabah atau Sarawak menerbitkan angka itu.',
    footer: 'Disemak Ogos 2026',
    alt:
      'Grafik perbandingan Sabah dan Sarawak menunjukkan kedua-dua negeri tidak menetapkan kadar minimum ' +
      'mas kahwin, dengan enakmen Sabah 2004 seksyen 21 dan ordinan Sarawak 2001 seksyen 19 hanya ' +
      'mewajibkan nilai mas kahwin direkodkan.',
  },

  {
    id: 'A8',
    file: 'A8-mas-kahwin-melebihi-kadar-minimum-cover.png',
    draft: 'A8-mas-kahwin-melebihi-kadar-minimum-REVIEWED.md',
    kicker: 'Melebihi kadar minimum',
    title: 'Bolehkah mas kahwin melebihi kadar minimum negeri?',
    // No figure in the band, per the brief and per the draft: this page owns a
    // question, not a rate.
    figures: [
      {
        eyebrow: 'Bolehkah melebihi?',
        value: 'Ya',
        sublabel: 'Di negeri yang menyatakannya',
      },
      {
        eyebrow: 'Had maksimum',
        value: 'Tiada',
        sublabel: 'Fatwa Selangor 2010: tanpa ada had maksima',
      },
    ],
    rows: [
      { label: 'Selangor', value: 'RM300, tanpa had maksima' },
      { label: 'Pahang', value: 'Ikut kemampuan dan persetujuan' },
      { label: 'Jumlah sebenar', value: 'Melalui persetujuan' },
    ],
    note: 'Enam daripada 14 bidang kuasa tidak menetapkan sebarang kadar minimum.',
    footer: 'Disemak Ogos 2026',
    alt:
      'Grafik menjawab sama ada mas kahwin boleh melebihi kadar minimum negeri: boleh di negeri yang ' +
      'menyatakannya, tiada had maksimum dalam fatwa Selangor 2010, dan jumlah sebenar ditentukan ' +
      'melalui persetujuan.',
  },
];
