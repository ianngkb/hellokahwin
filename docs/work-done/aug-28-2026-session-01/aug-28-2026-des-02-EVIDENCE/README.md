# DES-02 evidence — the canvas, its sources, and what it looked like when it shipped

Canvas: **https://claude.ai/code/artifact/1936d75a-b30a-47ec-9239-fde2c232c0b9**
Written up in [`../aug-28-2026-done-des-02-three-directions-canvas.md`](../aug-28-2026-done-des-02-three-directions-canvas.md).

## `artboards/`

The eleven `.dc.html` artboards and the `canvas.json` that lays them out. These
are the source the published canvas was seeded from, so the canvas is
reproducible rather than a one-off. To rebuild it, run the `/design` skill's
`seed-canvas.mjs` with every `--artboard` in this folder, every `--image` in
`images/`, and `--canvas canvas.json`, then publish the seeded file.

Artboards carry no runtime logic — they are static markup with inline styles
and one `<link>` to Google Fonts for Bodoni Moda, loaded as a variable face and
pinned per surface (`opsz 6` for the wordmark, `opsz 11` for the `h1`).

## `images/`

The eleven photographs, downsampled to fit the canvas budget. Every one came
from `images.hellokahwin.com` on 28 Ogos 2026, from the article that already
uses it. Originals and credits:

| File | Source path under `https://images.hellokahwin.com/inspire/` | Credit |
|---|---|---|
| `akad.webp` | `mas-kahwin-ikut-negeri/1787655861515-images-s-akad-ijab-qabul-mylifestory/high.webp` | MyLifeStory (CC BY 2.0) |
| `wali.webp` | `mas-kahwin-ikut-negeri/1787655861515-images-s-wali-saksi-tok-kadi-mylifestory/high.webp` | MyLifeStory (CC BY 2.0) |
| `c-rombongan.webp` | `persiapan-hantaran-kahwin/1787780683875-images-s-rombongan-hantaran-jalan-azlan-dupree/crop-4x3-article-card.webp` | Azlan DuPree (CC BY 2.0) |
| `c-kek.webp` | `barang-hantaran-berguna/1787781777697-images-s-dulang-kek-coklat-buah-hantaran-azlan-dupree/crop-4x3-article-card.webp` | Azlan DuPree (CC BY 2.0) |
| `c-naikrumah.webp` | `barang-hantaran-perempuan/1787780564669-images-s-bawa-dulang-hantaran-naik-rumah-azlan-dupree/crop-4x3-article-card.webp` | Azlan DuPree (CC BY 2.0) |
| `c-tujuh.webp` | `hantaran-kahwin-bajet/1787780589299-images-s-tujuh-dulang-hantaran-rombongan-azlan-dupree/crop-4x3-article-card.webp` | Azlan DuPree (CC BY 2.0) |
| `c-merah.webp` | `barang-hantaran-tunang/1787780709633-images-s-dulang-terbuka-gubahan-merah-phalinn-ooi/crop-4x3-article-card.webp` | Mohd Fazlin Mohd Effendy Ooi (Phalinn Ooi) (CC BY 2.0) |
| `c-sirih.webp` | `hantaran-tunang-untuk-perempuan/1787780629329-images-s-tepak-sirih-emas-dulang-phalinn-ooi/crop-4x3-article-card.webp` | Mohd Fazlin Mohd Effendy Ooi (Phalinn Ooi) (CC BY 2.0) |
| `c-quran.webp` | `hantaran-tunang-untuk-lelaki/1787780605155-images-s-hantaran-quran-sejadah-phalinn-ooi/crop-4x3-article-card.webp` | Mohd Fazlin Mohd Effendy Ooi (Phalinn Ooi) (CC BY 2.0) |
| `c-bersusun.webp` | `berapa-dulang-hantaran-tunang/1787780661260-images-s-dulang-hantaran-bersusun-phalinn-ooi/crop-4x3-article-card.webp` | Mohd Fazlin Mohd Effendy Ooi (Phalinn Ooi) (CC BY 2.0) |
| `c-organza.webp` | `hidden-hantaran/1787765217232-images-s-hantaran-berbalut-organza-bincang-mohd-nasir/crop-4x3-article-card.webp` | Mohd Nasir Mat Noor (CC BY 2.0) |

**Four of these hold at any size and seven do not.** The object frames are
`c-sirih`, `c-quran`, `c-bersusun` and `c-merah`. The rest are documentary
group photographs that come apart above roughly 300px. That split is the
finding behind the recommendation, and `contact-sheet-six-photographs.jpg` is
where it became visible.

## `render-check/`

The comps as Chrome actually drew them, captured before publishing. Every
artboard was rendered at its real width and its height measured, so no frame in
`canvas.json` clips its content.

| File | Shows |
|---|---|
| `A-warkah-artikel-1440.jpg` | Direction A, the record above the fold |
| `B-dulang-artikel-1440.jpg` | Direction B, the photograph as the page |
| `C-margin-artikel-1440.jpg` | Direction C, the column and its permanent rail |
| `A-warkah-390-terang-gelap.jpg` | A on a phone, light and dark side by side |
| `B-dulang-390-terang-gelap.jpg` | B on a phone — the record is barely reached at the fold |
| `B-dulang-katalog-1440.jpg` | Six covers at 330px: three look expensive, three do not |
| `ujian-empat-kes.jpg` | The four stress cases across all three directions |
| `contact-sheet-six-photographs.jpg` | Six of the eleven, side by side — the library split that decided the recommendation |

Measured heights at capture time, in CSS px: Nota 4738, A 2511, B 2715,
C 2093, Ujian 1943, catalogues 1710 / 1426 / 1402, phones 1000 each.
