/**
 * The four P1 covers — C1.1 `borang-nikah` and the three C1.2 procedure pages.
 *
 * Same rule as `c2-4-cover-specs.mts`, and it is the rule that matters: EVERY
 * figure, form number, section number and date here was taken from the article
 * that cover belongs to — the `.md` named in `draft` — and from nowhere else.
 * Nothing was sourced independently and nothing is carried between articles.
 *
 * ── What a P1 card is ─────────────────────────────────────────────────────
 * These pages are procedural, not numeric. The brief asks for "a title card
 * with the entity phrase and the one or two facts that matter: which form,
 * which authority, what the fee is *and its date*". So the band carries the one
 * or two facts a reader would otherwise have to open the page for, the rows
 * carry the rest of the procedure, and the footer names the instrument and its
 * gazette date rather than a bare review stamp.
 *
 * ── The Penang kursus fee, and why it is on none of these cards ───────────
 * The brief flags that Penang's kursus fee rises RM100 → RM120 on 1 September
 * 2026, and that a card carrying it must say which figure applies from when.
 * None of these four articles carries a kursus fee at all — that figure lives
 * in `kursus-kahwin`, which is not in this batch. Rather than say which figure
 * applies from when, these cards do not carry the figure. A number that is not
 * in the article does not go on the article's cover.
 *
 * ── The one asterisk in this set ──────────────────────────────────────────
 * `syarat-sah-nikah` — the 2018 Selangor amendment raising the marriage age to
 * 18 for both parties was gazetted, but the article records that its
 * commencement notification could not be confirmed from the Warta. The card
 * therefore shows the figure that IS in force (18 / 16, section 8, gazetted
 * 27 July 2003), and marks the amendment with the asterisk and the plain-Malay
 * note the C2.4 cards use.
 */
import type { CoverSpec } from './cover-template.mts';

export const P1_COVER_SPECS: CoverSpec[] = [
  {
    id: 'P1-1',
    file: 'cover-borang-nikah.png',
    draft: 'borang-nikah.md',
    kicker: 'Borang nikah',
    title: 'Borang mana yang anda isi, dan fi yang diwartakan',
    figures: [
      {
        eyebrow: 'Anda mengisi',
        value: 'Borang 1',
        sublabel: 'Permohonan Kebenaran Berkahwin',
      },
      {
        eyebrow: 'Fi Borang 1',
        value: 'RM1.00',
        sublabel: 'Fi bercetak pada borang itu sendiri',
      },
    ],
    rows: [
      { label: 'Borang 2', value: 'Kebenaran · RM5.00' },
      { label: 'Borang 5', value: 'Perakuan Nikah · RM15.00' },
      { label: 'Borang 6', value: 'Kad Nikah · RM20.00' },
      { label: 'Hantar', value: '7 hari sebelum akad' },
    ],
    note: 'Fi Perak. Negeri lain mewartakan sendiri.',
    footer: 'Pk. P.U. 30, Warta Perak, 1 Jun 2013 · Disemak 24 Ogos 2026',
    alt:
      'Kad maklumat bertajuk "Borang mana yang anda isi, dan fi yang diwartakan". Pada jalur ungu di ' +
      'tengah, dua fakta bersebelahan: di sebelah kiri, borang yang anda mengisi ialah Borang 1, ' +
      'iaitu Permohonan Kebenaran Berkahwin; di sebelah kanan, fi Borang 1 ialah RM1.00, fi yang ' +
      'bercetak pada borang itu sendiri. Di bawah jalur itu, empat baris: Borang 2 kebenaran ' +
      'RM5.00, Borang 5 Perakuan Nikah RM15.00, Borang 6 Kad Nikah RM20.00, dan borang hendaklah ' +
      'dihantar 7 hari sebelum akad. Nota kecil di bawahnya menyatakan fi ini fi Perak dan negeri ' +
      'lain mewartakan sendiri. Baris kaki kad menamakan sumbernya: Pk. P.U. 30, Warta Perak ' +
      'bertarikh 1 Jun 2013, disemak 24 Ogos 2026.',
  },

  {
    id: 'P1-2',
    file: 'cover-rukun-nikah.png',
    draft: 'rukun-nikah.md',
    kicker: 'Rukun nikah',
    title: 'Lima rukun nikah, dan apa jadi kalau satu tiada',
    figures: [
      {
        eyebrow: 'Bilangan rukun',
        value: 'Lima',
        sublabel: 'Senarai Masjid Wilayah Persekutuan',
      },
      {
        eyebrow: 'Kalau satu tiada',
        value: 'Tidak sah',
        sublabel: 'Seksyen 11, Enakmen Selangor 2003',
      },
    ],
    rows: [
      { label: 'Rukun 1', value: 'Lelaki, bakal suami' },
      { label: 'Rukun 2', value: 'Perempuan, bakal isteri' },
      { label: 'Rukun 3', value: 'Wali' },
      { label: 'Rukun 4', value: 'Dua orang saksi lelaki' },
      { label: 'Rukun 5', value: 'Sighah: ijab dan qabul' },
    ],
    note: 'Rukun cukup tidak bermakna sudah berdaftar.',
    footer: 'Masjid Wilayah Persekutuan · Disemak 24 Ogos 2026',
    alt:
      'Kad maklumat bertajuk "Lima rukun nikah, dan apa jadi kalau satu tiada". Pada jalur ungu di ' +
      'tengah, dua fakta bersebelahan: bilangan rukun ialah lima, mengikut senarai Masjid Wilayah ' +
      'Persekutuan; dan kalau satu rukun tiada, akad itu tidak sah, mengikut seksyen 11 Enakmen ' +
      'Selangor 2003. Di bawah jalur itu, lima rukun disenaraikan mengikut nombor: rukun 1 lelaki ' +
      'bakal suami, rukun 2 perempuan bakal isteri, rukun 3 wali, rukun 4 dua orang saksi lelaki, ' +
      'dan rukun 5 sighah iaitu ijab dan qabul. Nota kecil di bawahnya mengingatkan bahawa rukun ' +
      'yang cukup tidak bermakna perkahwinan itu sudah berdaftar. Baris kaki kad menamakan Masjid ' +
      'Wilayah Persekutuan sebagai sumber, disemak 24 Ogos 2026.',
  },

  {
    id: 'P1-3',
    file: 'cover-syarat-sah-nikah.png',
    draft: 'syarat-sah-nikah.md',
    kicker: 'Syarat sah nikah',
    title: 'Dua set syarat, dan nikah perlu lulus kedua-duanya',
    figures: [
      {
        eyebrow: 'Hukum Syarak',
        value: '7 + 6',
        sublabel: 'Lelaki 7, perempuan 6',
      },
      {
        eyebrow: 'Enakmen negeri',
        value: '3 tambahan',
        sublabel: 'Umur, kebenaran, tempat',
      },
    ],
    rows: [
      { label: 'Wali', value: 'Islam, adil, baligh' },
      { label: 'Umur', value: 'Lelaki 18, perempuan 16' },
      { label: 'Kebenaran', value: 'Pendaftar / Hakim Syarie' },
      { label: 'Tempat akad', value: 'Kariah pihak perempuan' },
    ],
    note: 'Pindaan umur 18 tahun bagi kedua-dua pihak diwartakan 2018.* Kuat kuasanya belum disahkan.',
    footer: '* Belum disahkan sebagai kuat kuasa · Disemak 24 Ogos 2026',
    alt:
      'Kad maklumat bertajuk "Dua set syarat, dan nikah perlu lulus kedua-duanya". Pada jalur ungu ' +
      'di tengah, dua fakta bersebelahan: di bawah label Hukum Syarak, angka 7 tambah 6, iaitu ' +
      'tujuh syarat bagi pihak lelaki dan enam bagi pihak perempuan; di bawah label enakmen negeri, ' +
      'tiga syarat tambahan, iaitu umur, kebenaran dan tempat. Di bawah jalur itu, empat baris: ' +
      'wali hendaklah Islam, adil dan baligh; umur lelaki 18 dan perempuan 16; kebenaran berkahwin ' +
      'daripada Pendaftar atau Hakim Syarie; dan tempat akad di kariah pihak perempuan. Nota kecil ' +
      'di bawahnya menyatakan pindaan umur 18 tahun bagi kedua-dua pihak diwartakan pada 2018, ' +
      'ditanda bintang, dan kuat kuasanya belum disahkan. Baris kaki kad mengulang bahawa bintang ' +
      'itu bermaksud belum disahkan sebagai kuat kuasa, disemak 24 Ogos 2026.',
  },

  {
    id: 'P1-4',
    file: 'cover-lafaz-taklik.png',
    draft: 'lafaz-taklik.md',
    kicker: 'Lafaz taklik',
    title: 'Tiga syarat taklik, dan siapa yang mengesahkannya',
    figures: [
      {
        eyebrow: 'Bilangan syarat',
        value: 'Tiga',
        sublabel: 'Dicetak dalam Borang 4 dan 5',
      },
      {
        eyebrow: 'Kepada mahkamah',
        value: 'RM10.00',
        sublabel: 'Teks Perak, Pk. P.U. 30',
      },
    ],
    rows: [
      { label: 'Syarat (i)', value: 'Ditinggalkan 4 bulan' },
      { label: 'Syarat (ii)', value: 'Tanpa nafkah 4 bulan' },
      { label: 'Syarat (iii)', value: 'Mudarat atau darar syarie' },
      { label: 'Barulah talak', value: 'Aduan · sabit · RM10' },
    ],
    note: 'Empat bulan Qamariah, bukan bulan biasa. Mahkamah Syariah yang mengesahkan talak.',
    footer: 'Teks Perak sahaja · Disemak 24 Ogos 2026',
    alt:
      'Kad maklumat bertajuk "Tiga syarat taklik, dan siapa yang mengesahkannya". Pada jalur ungu di ' +
      'tengah, dua fakta bersebelahan: bilangan syarat ialah tiga, dicetak dalam Borang 4 dan ' +
      'Borang 5; dan RM10.00 diserahkan kepada mahkamah, mengikut teks Perak dalam Pk. P.U. 30. Di ' +
      'bawah jalur itu, empat baris: syarat pertama ditinggalkan 4 bulan, syarat kedua tanpa nafkah ' +
      '4 bulan, syarat ketiga mudarat atau darar syarie, dan barulah talak selepas aduan, sabit dan ' +
      'RM10. Nota kecil di bawahnya menjelaskan empat bulan itu bulan Qamariah, bukan bulan biasa, ' +
      'dan Mahkamah Syariah yang mengesahkan talak. Baris kaki kad menyatakan ini teks Perak ' +
      'sahaja, disemak 24 Ogos 2026.',
  },
];
