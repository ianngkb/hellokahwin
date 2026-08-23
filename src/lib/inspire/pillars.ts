/**
 * The seven pillars and twenty-six clusters, exactly as the board approved them
 * on 23 Aug 2026 in `aug-23-2026-clusters-launch-plan.md`.
 *
 * This file is the source of truth for the SEED, not for the live site. Once
 * seeded, the categories live in `inspire_categories` and the site reads them
 * from there — editors can rename a cluster or rewrite an intro in the admin
 * without touching code. What this file guarantees is that the seven pillars
 * and twenty-six clusters exist, with the right codes, slugs and entity
 * phrases, and that re-running the seed produces no surprises.
 *
 * `entityPhrase` is the cluster's HEAD KEYWORD from the plan, and it is
 * load-bearing rather than decorative: the plan's linking rules require anchors
 * to be the target's Malay entity phrase, so this is the string that appears in
 * every internal link pointing at this category.
 *
 * Slugs are written out rather than derived. A generated slug would silently
 * change if someone edited a cluster name, and a changed slug is a changed URL.
 */

export interface ClusterDef {
  /** `C1.1` … `C7.5` — the plan's own identifiers. */
  code: string;
  slug: string;
  name: string;
  /** The cluster's head keyword; the anchor text for links pointing here. */
  entityPhrase: string;
}

export interface PillarDef {
  /** `P1` … `P7`. */
  code: string;
  slug: string;
  name: string;
  entityPhrase: string;
  intro: string;
  clusters: ClusterDef[];
}

export const PILLARS: PillarDef[] = [
  {
    code: 'P1',
    slug: 'nikah-undang-undang',
    name: 'Nikah & Undang-undang',
    entityPhrase: 'nikah dan undang-undang perkahwinan',
    intro:
      'Segala prosedur dan syarat sah nikah di Malaysia, dijelaskan dalam bahasa yang mudah — daripada borang pertama hingga sijil nikah di tangan.\n\nSetiap artikel di bawah menyatakan enakmen negeri mana yang dirujuk dan sumber rasminya. Kami melaporkan prosedur; kami tidak mengeluarkan fatwa.',
    clusters: [
      {
        code: 'C1.1',
        slug: 'borang-pendaftaran-nikah',
        name: 'Borang & pendaftaran nikah',
        entityPhrase: 'borang nikah',
      },
      {
        code: 'C1.2',
        slug: 'rukun-syarat-sah-nikah',
        name: 'Rukun, syarat & sah nikah',
        entityPhrase: 'rukun nikah',
      },
      {
        code: 'C1.3',
        slug: 'kursus-kahwin-saringan-pra-nikah',
        name: 'Kursus kahwin & saringan pra-nikah',
        entityPhrase: 'kursus kahwin',
      },
      {
        code: 'C1.4',
        slug: 'soal-jawab-hukum-nikah',
        name: 'Soal-jawab hukum nikah',
        entityPhrase: 'nikah siri',
      },
    ],
  },
  {
    code: 'P2',
    slug: 'hantaran-mas-kahwin',
    name: 'Hantaran & Mas Kahwin',
    entityPhrase: 'hantaran dan mas kahwin',
    intro:
      'Hantaran, mas kahwin dan dulang — bahagian paling Melayu dalam sesebuah perkahwinan, dan bahagian yang paling banyak menimbulkan persoalan.\n\nKadar mengikut negeri, nisbah dulang, susunan gubahan dan etika yang jarang ditulis di mana-mana.',
    clusters: [
      {
        code: 'C2.1',
        slug: 'hantaran-kahwin-panduan',
        name: 'Hantaran kahwin',
        entityPhrase: 'hantaran kahwin',
      },
      {
        code: 'C2.2',
        slug: 'hantaran-tunang-panduan',
        name: 'Hantaran tunang',
        entityPhrase: 'hantaran tunang',
      },
      {
        code: 'C2.3',
        slug: 'gubahan-dulang-hantaran',
        name: 'Gubahan & dulang hantaran',
        entityPhrase: 'dulang hantaran',
      },
      {
        code: 'C2.4',
        slug: 'mas-kahwin-ikut-negeri-panduan',
        name: 'Mas kahwin ikut negeri',
        entityPhrase: 'mas kahwin ikut negeri',
      },
      {
        code: 'C2.5',
        slug: 'nisbah-dulang-duit-hantaran',
        name: 'Nisbah dulang, duit hantaran & etika',
        entityPhrase: 'duit hantaran',
      },
    ],
  },
  {
    code: 'P3',
    slug: 'ucapan-doa',
    name: 'Ucapan, Doa & Adab Majlis',
    entityPhrase: 'ucapan dan doa perkahwinan',
    intro:
      'Untuk tetamu, keluarga dan sesiapa yang perlu berkata sesuatu pada hari itu.\n\nUcapan, doa, pantun dan adab majlis — lengkap dengan maksud dan sebutan, bukan sekadar senarai untuk disalin.',
    clusters: [
      {
        code: 'C3.1',
        slug: 'ucapan-pengantin-baru',
        name: 'Ucapan pengantin baru',
        entityPhrase: 'ucapan pengantin baru',
      },
      {
        code: 'C3.2',
        slug: 'doa-perkahwinan',
        name: 'Doa perkahwinan',
        entityPhrase: 'doa pengantin baru',
      },
      {
        code: 'C3.3',
        slug: 'ulang-tahun-pantun-adab-tetamu',
        name: 'Ulang tahun perkahwinan, pantun & adab tetamu',
        entityPhrase: 'ucapan ulang tahun perkahwinan',
      },
      {
        code: 'C3.4',
        slug: 'aturcara-pengacara-majlis',
        name: 'Aturcara & pengacara majlis',
        entityPhrase: 'aturcara majlis perkahwinan',
      },
    ],
  },
  {
    code: 'P4',
    slug: 'busana-pengantin',
    name: 'Busana & Penampilan Pengantin',
    entityPhrase: 'busana pengantin',
    intro:
      'Baju nikah, baju sanding, songket, inai dan solekan — apa yang sesuai, apa yang berbaloi, dan berapa harganya sebenarnya.',
    clusters: [
      {
        code: 'C4.1',
        slug: 'baju-pengantin-nikah-sanding-songket',
        name: 'Baju pengantin: nikah, sanding & songket',
        entityPhrase: 'baju nikah',
      },
      {
        code: 'C4.2',
        slug: 'inai-solekan-aksesori-pengantin',
        name: 'Inai, solekan & aksesori pengantin',
        entityPhrase: 'inai pengantin',
      },
    ],
  },
  {
    code: 'P5',
    slug: 'pelamin-kad-cenderahati',
    name: 'Pelamin, Kad & Cenderahati Majlis',
    entityPhrase: 'pelamin, kad kahwin dan cenderahati',
    intro:
      'Benda yang dibeli, dibuat dan diberi: pelamin, kad jemputan, dekorasi, doorgift dan bunga telur.\n\nHarga sebenar, saiz sebenar, dan apa yang patut diminta daripada vendor sebelum membayar deposit.',
    clusters: [
      { code: 'C5.1', slug: 'pelamin-idea', name: 'Pelamin', entityPhrase: 'pelamin' },
      {
        code: 'C5.2',
        slug: 'kad-kahwin-jemputan',
        name: 'Kad kahwin & jemputan',
        entityPhrase: 'kad jemputan kahwin',
      },
      {
        code: 'C5.3',
        slug: 'dekorasi-khemah-tema-majlis',
        name: 'Dekorasi, khemah & tema majlis',
        entityPhrase: 'khemah kenduri',
      },
      {
        code: 'C5.4',
        slug: 'doorgift-bunga-telur-hadiah',
        name: 'Doorgift, bunga telur & hadiah kahwin',
        entityPhrase: 'goodies kahwin',
      },
    ],
  },
  {
    code: 'P6',
    slug: 'venue-perancangan',
    name: 'Venue, Kos & Perancangan',
    entityPhrase: 'venue dan perancangan perkahwinan',
    intro:
      'Di mana hendak buat majlis, berapa kosnya, dan apa yang perlu diselesaikan dahulu.\n\nDewan, venue, bajet dan checklist — dengan kapasiti dan julat harga yang disahkan, bukan salinan iklan vendor.',
    clusters: [
      {
        code: 'C6.1',
        slug: 'dewan-venue-majlis',
        name: 'Dewan & venue majlis',
        entityPhrase: 'dewan majlis perkahwinan',
      },
      {
        code: 'C6.2',
        slug: 'kos-bajet-checklist-perkahwinan',
        name: 'Kos, bajet & checklist perkahwinan',
        entityPhrase: 'checklist kahwin',
      },
    ],
  },
  {
    code: 'P7',
    slug: 'sebelum-nikah',
    name: 'Sebelum Nikah: Jodoh, Merisik & Tunang',
    entityPhrase: 'sebelum nikah',
    intro:
      'Sebelum ada tarikh, ada perjalanan: mencari jodoh, taaruf, merisik, meminang, cincin dan majlis pertunangan.\n\nBahagian yang paling awal dalam perjalanan seorang bakal pengantin, dan yang paling sedikit ditulis dengan betul.',
    clusters: [
      {
        code: 'C7.1',
        slug: 'jodoh-taaruf-istikharah',
        name: 'Jodoh, taaruf & istikharah jodoh',
        entityPhrase: 'taaruf',
      },
      {
        code: 'C7.2',
        slug: 'merisik-meminang',
        name: 'Merisik & meminang',
        entityPhrase: 'merisik',
      },
      {
        code: 'C7.3',
        slug: 'cincin-tunang-nikah',
        name: 'Cincin tunang, nikah & merisik',
        entityPhrase: 'cincin tunang',
      },
      {
        code: 'C7.4',
        slug: 'majlis-pertunangan-doa',
        name: 'Majlis pertunangan & doa',
        entityPhrase: 'doa majlis pertunangan',
      },
      {
        code: 'C7.5',
        slug: 'adat-perkahwinan-melayu-mandi-bunga',
        name: 'Adat perkahwinan Melayu & mandi bunga',
        entityPhrase: 'mandi bunga',
      },
    ],
  },
];

/** Every slug this file would claim, pillars and clusters together. */
export function allPillarSlugs(): string[] {
  return PILLARS.flatMap((p) => [p.slug, ...p.clusters.map((c) => c.slug)]);
}

/** Every code this file would claim. */
export function allPillarCodes(): string[] {
  return PILLARS.flatMap((p) => [p.code, ...p.clusters.map((c) => c.code)]);
}
