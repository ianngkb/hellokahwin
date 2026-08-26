/**
 * The eight board-approved `kad-tajuk` covers.
 *
 * Every string in this file is quoted verbatim from a board decision. NOTHING
 * here is this script's wording:
 *
 *   skop + title   spec §7.4, `aug-24-2026-spec-graphic-template-kit.md`
 *                  ("These strings are board-approved, 24 Ogos 2026. Render them
 *                  exactly." Five title lines and three skop lines were changed
 *                  at that board; two of the originals were blocking findings.)
 *   alt            Editorial Review Board, ruling 3, `aug-24-2026-done-board-c24-cover-alt-text.md`
 *                  (revised, `/humanizer`-passed, then approved)
 *   filename       ruling 4, `./<slug>-kad-tajuk.png`
 *   credit block   ruling 4 — `credit: "Grafik: HelloKahwin"`, licenceClass G
 *
 * A rewrite goes back through the board. If a string here needs to change,
 * change it there first.
 */
import type { KadTajukSpec } from './kad-tajuk-template.mts';

function card(
  id: string,
  slug: string,
  draft: string,
  skop: string,
  titleLine: string,
  alt: string,
): KadTajukSpec {
  return { id, slug, draft, file: `${slug}-kad-tajuk.png`, skop, titleLine, alt };
}

export const KAD_TAJUK_SPECS: KadTajukSpec[] = [
  card(
    'HK-C-0001',
    'mas-kahwin-ikut-negeri',
    'A1-mas-kahwin-ikut-negeri-REVIEWED.md',
    '14 bidang kuasa',
    'Kadar minimum mas kahwin mengikut negeri',
    'Kad tajuk bertulis kadar minimum mas kahwin mengikut negeri, bagi 14 bidang kuasa, disemak Ogos 2026.',
  ),
  card(
    'HK-C-0002',
    'apa-itu-mas-kahwin',
    'A2-apa-itu-mas-kahwin-REVIEWED.md',
    'Asas',
    'Apa itu mas kahwin',
    'Kad tajuk artikel asas, bertulis apa itu mas kahwin, disemak Ogos 2026.',
  ),
  card(
    'HK-C-0003',
    'mas-kahwin-johor',
    'A3-mas-kahwin-johor-REVIEWED.md',
    'Johor',
    'Kadar yang beredar, belum disahkan',
    'Kad tajuk bagi Johor, bertulis kadar yang beredar belum disahkan, disemak Ogos 2026.',
  ),
  card(
    'HK-C-0004',
    'mas-kahwin-kelantan-terengganu',
    'A4-mas-kahwin-kelantan-terengganu-REVIEWED.md',
    'Kelantan dan Terengganu',
    'Tiada kadar tetap di dua negeri',
    'Kad tajuk bagi Kelantan dan Terengganu, bertulis tiada kadar tetap di dua negeri, disemak Ogos 2026.',
  ),
  card(
    'HK-C-0005',
    'mas-kahwin-perak',
    'A5-mas-kahwin-perak-REVIEWED.md',
    'Perak',
    'Tiada kadar minimum, tetapi ada fi rasmi',
    'Kad tajuk bagi Perak, bertulis tiada kadar minimum tetapi ada fi rasmi, disemak Ogos 2026.',
  ),
  card(
    'HK-C-0006',
    'mas-kahwin-pahang-negeri-sembilan',
    'A6-mas-kahwin-pahang-negeri-sembilan-REVIEWED.md',
    'Pahang dan Negeri Sembilan',
    'Kedua-dua negeri menetapkan kadar minimum',
    'Kad tajuk bagi Pahang dan Negeri Sembilan, bertulis kedua-dua negeri menetapkan kadar minimum, disemak Ogos 2026.',
  ),
  card(
    'HK-C-0007',
    'mas-kahwin-sabah-sarawak',
    'A7-mas-kahwin-sabah-sarawak-REVIEWED.md',
    'Sabah dan Sarawak',
    'Mas kahwin di bawah dua undang-undang berasingan',
    'Kad tajuk bagi Sabah dan Sarawak, bertulis mas kahwin di bawah dua undang-undang berasingan, disemak Ogos 2026.',
  ),
  card(
    'HK-C-0008',
    'mas-kahwin-melebihi-kadar-minimum',
    'A8-mas-kahwin-melebihi-kadar-minimum-REVIEWED.md',
    'Soal jawab',
    'Bolehkah mas kahwin melebihi kadar minimum?',
    'Kad tajuk soal jawab, bertulis bolehkah mas kahwin melebihi kadar minimum, disemak Ogos 2026.',
  ),
];
