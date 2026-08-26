# Done — Eight more covers, P1 and P6. The generator was extended, not rebuilt.

**Date:** 25 Ogos 2026
**Brief:** `docs/plans/aug-23-2026-session-01/aug-25-2026-brief-covers-p1-p6.md`
**Repo:** `hellokahwin-site`, worktree `pillars-ingest-redirects`
**Nothing was ingested. Nothing was published. No production write of any kind.**

---

## What shipped

Eight PNGs, 2464 × 3080 each, rendered beside their articles in
`docs/plans/aug-23-2026-session-01/drafts/`, plus one contact sheet:

```
cover-borang-nikah.png                        149 KB
cover-rukun-nikah.png                         141 KB
cover-syarat-sah-nikah.png                    153 KB
cover-lafaz-taklik.png                        154 KB
C6-2-A1-harga-sewa-dewan-kahwin-cover.png     172 KB
C6-2-A2-checklist-kahwin-cover.png            147 KB
C6-2-A3-pakej-dewan-kahwin-cover.png          165 KB
C6-2-A4-bajet-kahwin-cover.png                161 KB
p1-p6-covers-contact-sheet.html                62 KB
```

All eight filenames are the ones the drafts' own front matter already asked for,
verified to resolve from each `.md`. Every card is `credit: HelloKahwin`,
`licenseClass: G`, `licensorName: HelloKahwin`.

---

## 1. The flag

`--set`. It already existed and took `figures | kad-tajuk | both`; it now takes
**any registered set name, comma-separated**, and it is **required**.

```
pnpm --silent covers --set p1,p6 --out "<drafts dir>"     # this batch
pnpm --silent covers --set c2-4  --out "<drafts dir>"     # the eight live C2.4 covers
pnpm --silent covers --set p6 --only P6-1 --out "<dir>"   # one cover
pnpm --silent covers --set all --out "<dir>"              # every registered set
```

Registered sets: `kad-tajuk`, `figures`, `p1`, `p6`.
Shorthands: `both` (unchanged), `c2-4` (new alias for the pair), `all`.

**One behavioural change, and it is deliberate.** `--set` used to default to the
two C2.4 sets. It no longer defaults to anything: a bare
`pnpm --silent covers --out "<dir>"` now fails with a message naming every
registered set. The brief asked for a flag "so a caller picks which set to render
rather than the script hardcoding C2.4" — a default that still means C2.4 is the
hardcoding, and with four sets registered a guessing run would drop eight C2.4
PNGs into a P1 drafts folder. Every value that worked before still works.

A set is now one entry in a `SETS` register — spec list, template, credit string,
and the words that head its section on the sheet. **Adding a batch is adding a
spec file and one entry.** There is no second generator.

Also added: `--sheet <name>` to override the contact-sheet filename. Without it
the name is derived — `C2-4-covers-contact-sheet.html` for the C2.4 pair (byte
path unchanged), `p1-p6-covers-contact-sheet.html` for this run.

### The eight live C2.4 covers still regenerate — verified, not assumed

`pnpm --silent covers --set c2-4` re-rendered all sixteen C2.4 files (8 figure
covers + 8 kad-tajuk) and **all sixteen are byte-identical (SHA-256) to the files
currently sitting beside the published articles.** Checked twice: once after the
set register landed, once after the template and formatter changes. The extension
did not touch them.

### Three changes to shared code, all additive except one guard

1. **`cover-template.mts` now reports regions.** `renderCover` returns
   `layout.regions` — the y-band each block actually occupied (`wordmark`,
   `kicker`, `title`, `figure 1: <its value>`, `figure 2: …`, `rows`, `note`,
   `footer`). Purely additive; the pixels are unchanged.
2. **The footer is now capped at ONE line, and it throws on two.** See §5 —
   this is a real bug the P1/P6 batch found in the C2.4 template.
3. **`bytes` is now passed to the contact sheet.** It never was, so every C2.4
   contact sheet ever generated printed `NaN KB` in its per-cover meta line. Fixed.

Typecheck clean (`tsc --noEmit` over the generator, `scripts/covers/**` and
`smart-crop.ts`), eslint clean, prettier applied.

---

## 2. The eight covers and their alt text

Alt text is written against **what the card actually renders**, not against the
article and not against the placeholder alt already in each draft's front matter.
Where the two disagree, see §6.

### P1 — nikah procedure

**`cover-borang-nikah.png`** — *Borang nikah · "Borang mana yang anda isi, dan fi
yang diwartakan"*. Band: **Borang 1** / **RM1.00**. Rows: Borang 2 RM5.00,
Borang 5 RM15.00, Borang 6 RM20.00, hantar 7 hari sebelum akad.

> Kad maklumat bertajuk "Borang mana yang anda isi, dan fi yang diwartakan". Pada
> jalur ungu di tengah, dua fakta bersebelahan: di sebelah kiri, borang yang anda
> mengisi ialah Borang 1, iaitu Permohonan Kebenaran Berkahwin; di sebelah kanan,
> fi Borang 1 ialah RM1.00, fi yang bercetak pada borang itu sendiri. Di bawah
> jalur itu, empat baris: Borang 2 kebenaran RM5.00, Borang 5 Perakuan Nikah
> RM15.00, Borang 6 Kad Nikah RM20.00, dan borang hendaklah dihantar 7 hari
> sebelum akad. Nota kecil di bawahnya menyatakan fi ini fi Perak dan negeri lain
> mewartakan sendiri. Baris kaki kad menamakan sumbernya: Pk. P.U. 30, Warta
> Perak bertarikh 1 Jun 2013, disemak 24 Ogos 2026.

**`cover-rukun-nikah.png`** — *Rukun nikah · "Lima rukun nikah, dan apa jadi kalau
satu tiada"*. Band: **Lima** / **Tidak sah**. Rows: the five rukun, numbered.

> Kad maklumat bertajuk "Lima rukun nikah, dan apa jadi kalau satu tiada". Pada
> jalur ungu di tengah, dua fakta bersebelahan: bilangan rukun ialah lima,
> mengikut senarai Masjid Wilayah Persekutuan; dan kalau satu rukun tiada, akad
> itu tidak sah, mengikut seksyen 11 Enakmen Selangor 2003. Di bawah jalur itu,
> lima rukun disenaraikan mengikut nombor: rukun 1 lelaki bakal suami, rukun 2
> perempuan bakal isteri, rukun 3 wali, rukun 4 dua orang saksi lelaki, dan rukun
> 5 sighah iaitu ijab dan qabul. Nota kecil di bawahnya mengingatkan bahawa rukun
> yang cukup tidak bermakna perkahwinan itu sudah berdaftar. Baris kaki kad
> menamakan Masjid Wilayah Persekutuan sebagai sumber, disemak 24 Ogos 2026.

**`cover-syarat-sah-nikah.png`** — *Syarat sah nikah · "Dua set syarat, dan nikah
perlu lulus kedua-duanya"*. Band: **7 + 6** / **3 tambahan**. Carries the batch's
only asterisk; see §4.

> Kad maklumat bertajuk "Dua set syarat, dan nikah perlu lulus kedua-duanya". Pada
> jalur ungu di tengah, dua fakta bersebelahan: di bawah label Hukum Syarak, angka
> 7 tambah 6, iaitu tujuh syarat bagi pihak lelaki dan enam bagi pihak perempuan;
> di bawah label enakmen negeri, tiga syarat tambahan, iaitu umur, kebenaran dan
> tempat. Di bawah jalur itu, empat baris: wali hendaklah Islam, adil dan baligh;
> umur lelaki 18 dan perempuan 16; kebenaran berkahwin daripada Pendaftar atau
> Hakim Syarie; dan tempat akad di kariah pihak perempuan. Nota kecil di bawahnya
> menyatakan pindaan umur 18 tahun bagi kedua-dua pihak diwartakan pada 2018,
> ditanda bintang, dan kuat kuasanya belum disahkan. Baris kaki kad mengulang
> bahawa bintang itu bermaksud belum disahkan sebagai kuat kuasa, disemak 24 Ogos
> 2026.

**`cover-lafaz-taklik.png`** — *Lafaz taklik · "Tiga syarat taklik, dan siapa yang
mengesahkannya"*. Band: **Tiga** / **RM10.00**.

> Kad maklumat bertajuk "Tiga syarat taklik, dan siapa yang mengesahkannya". Pada
> jalur ungu di tengah, dua fakta bersebelahan: bilangan syarat ialah tiga,
> dicetak dalam Borang 4 dan Borang 5; dan RM10.00 diserahkan kepada mahkamah,
> mengikut teks Perak dalam Pk. P.U. 30. Di bawah jalur itu, empat baris: syarat
> pertama ditinggalkan 4 bulan, syarat kedua tanpa nafkah 4 bulan, syarat ketiga
> mudarat atau darar syarie, dan barulah talak selepas aduan, sabit dan RM10. Nota
> kecil di bawahnya menjelaskan empat bulan itu bulan Qamariah, bukan bulan biasa,
> dan Mahkamah Syariah yang mengesahkan talak. Baris kaki kad menyatakan ini teks
> Perak sahaja, disemak 24 Ogos 2026.

### P6 — cost

**`C6-2-A1-harga-sewa-dewan-kahwin-cover.png`** — *Harga sewa dewan kahwin ·
"Kadar rasmi majlis perbandaran, bukan anggaran"*. Band: **RM60 sejam** /
**RM3,600 sesi**. Rows attribute every rate to its council, and DBKL + MBSA get a
row saying they publish none.

> Kad kos bertajuk "Kadar rasmi majlis perbandaran, bukan anggaran". Pada jalur
> ungu di tengah, dua hujung julat bersebelahan: paling rendah RM60 sejam, di
> Dewan Taman Bunga Melor bawah Majlis Bandaraya Diraja Klang; paling tinggi
> RM3,600 satu sesi, di dewan kategori A Majlis Bandaraya Subang Jaya pada cuti
> am, sesi lapan jam. Di bawah jalur itu, lima baris mengikut pihak berkuasa:
> Majlis Bandaraya Diraja Klang RM60 hingga RM200 sejam; Majlis Bandaraya Petaling
> Jaya RM160 hingga RM450 satu sesi enam jam; Majlis Bandaraya Subang Jaya RM880
> hingga RM3,200 satu sesi lapan jam; Majlis Perbandaran Sepang RM40 hingga RM80
> sejam pada kadar tahun 2016; dan DBKL serta MBSA tiada kadar tersiar. Nota kecil
> di bawahnya menyatakan angka ini kadar sewa sahaja dan cagaran dikira
> berasingan, dan baris kaki kad menyatakan kadar rasmi majlis perbandaran ini
> disemak 24 Ogos 2026.

**`C6-2-A2-checklist-kahwin-cover.png`** — *Checklist kahwin · "Tiga tarikh mati
yang ada dendanya"*. Band: **12 bulan** / **9 bulan**.

> Kad maklumat bertajuk "Tiga tarikh mati yang ada dendanya". Pada jalur ungu di
> tengah, dua fakta masa bersebelahan: mula merancang 12 bulan sebelum majlis,
> dengan bajet dan tarikh didahulukan, bukan tema; dan tempah dewan 9 bulan
> sebelum, dengan cagaran yang dijelaskan sebelum tempahan sah. Di bawah jalur
> itu, empat baris: dewan, cagaran Majlis Bandaraya Subang Jaya 50 peratus
> daripada tempahan; kursus, sijil wajib untuk borang; borang nikah, tempoh ikut
> negeri; dan yuran kursus RM100 seorang mengikut Jabatan Agama Islam Selangor.
> Nota kecil di bawahnya menyatakan katering, pelamin dan fotografi tiada kadar
> rasmi dan perlu sebut harga bertulis. Baris kaki kad menyatakan kadar dewan dan
> kursus rasmi ini disemak 24 Ogos 2026.

**`C6-2-A3-pakej-dewan-kahwin-cover.png`** — *Pakej dewan kahwin · "Apa yang
termasuk, dan apa yang selalu tidak"*. Band: **RM5,000** / **RM1,000**.

> Kad kos bertajuk "Apa yang termasuk, dan apa yang selalu tidak". Pada jalur ungu
> di tengah, dua angka bersebelahan: Dewan Banquet RM5,000, minimum satu sesi
> empat jam di Majlis Bandaraya Petaling Jaya; dan jam tambahan RM1,000, setiap
> jam selepas empat jam pertama. Di bawah jalur itu, empat baris: yang termasuk
> ialah 500 kerusi, 50 meja, sistem PA, penghawa dingin dan juruteknik; persiapan
> RM300 hingga RM600 sejam; cagaran RM2,000 tunai atau bank draf; dan cuti am
> dikenakan bayaran dua kali ganda. Nota kecil di bawahnya menyatakan sarung
> kerusi dan alas meja tidak termasuk, dan MBSA tidak menyiarkan kadarnya. Baris
> kaki kad menamakan senarai kadar Dewan Sivik MBPJ 2024 sebagai sumber, disemak
> 24 Ogos 2026.

**`C6-2-A4-bajet-kahwin-cover.png`** — *Bajet kahwin · "Apa yang boleh diharga
tepat, dan apa yang tidak"*. Band: **2 baris** / **5 baris** — the article's own
two-column structure, rendered as the figure.

> Kad bajet bertajuk "Apa yang boleh diharga tepat, dan apa yang tidak". Pada
> jalur ungu di tengah, dua fakta bersebelahan: dua baris bajet boleh dikunci,
> iaitu sewa dewan dan yuran kursus; lima baris perlu sebut harga, iaitu katering,
> pelamin, foto, baju dan kad. Di bawah jalur itu, empat baris: sewa dewan RM40
> sejam hingga RM3,600 satu sesi; yuran kursus RM100 seorang di Selangor; cagaran
> RM200 hingga RM2,000, yang dipulangkan; dan kos vendor, tiada kadar rasmi. Nota
> kecil di bawahnya menyatakan kadar kursus berbeza ikut negeri dan perlu disemak
> dengan jabatan agama Islam negeri sendiri. Baris kaki kad menamakan MBPJ, MBSJ,
> MBDK, MP Sepang dan JAIS sebagai sumber, disemak 24 Ogos 2026.

---

## 3. Crop verdicts — every crop, and what it broke

The brief asked to be shown all four crops and told which crop broke what. The
generator now does this by construction rather than by eye: `renderCover` reports
the y-band of every block, and each crop window is intersected with them. The
contact sheet carries a **"What each crop breaks"** table (24 rows for this batch)
and repeats the verdict under every crop thumbnail. The console prints it too.

**`crop-4x5-mobile-cover` is clean on all eight.** The canvas is authored at 4:5
exactly, so that crop IS the whole image. Nothing is cut on the surface this
audience reads on. All four crops come out at full target size on all eight covers
— no `UNDERSIZED` warnings.

The other three crops all take the full width and a shorter slice of the height,
so what they destroy is always a horizontal band:

| Cover | focal | `crop-4x3-article-card` | `crop-16x9-og` | `crop-4.3x1-desktop-hero` |
|---|---|---|---|---|
| P1-1 borang-nikah | 0.156, 0.922 | **lost** wordmark, kicker, title | **lost** wordmark, kicker, title; **cut** both figures | **lost** wordmark, kicker, title, both figures; **cut** rows |
| P1-2 rukun-nikah | 0.844, 0.922 | **lost** wordmark, kicker, title | **lost** wordmark, kicker, title; **cut** both figures | **lost** wordmark, kicker, title, both figures; **cut** rows |
| P1-3 syarat-sah-nikah | 0.156, 0.922 | **lost** wordmark, kicker, title | **lost** wordmark, kicker, title, both figures | **lost** wordmark, kicker, title, both figures; **cut** rows |
| P1-4 lafaz-taklik | 0.781, 0.922 | **lost** wordmark, kicker, title | **lost** wordmark, kicker, title, both figures | **lost** wordmark, kicker, title, both figures; **cut** rows |
| P6-1 harga-sewa-dewan | 0.250, 0.250 | **lost** rows, note, footer | **cut** both figures; **lost** rows, note, footer | **lost** wordmark, rows, note, footer, both figures; **cut** kicker |
| P6-2 checklist-kahwin | 0.844, 0.922 | **lost** wordmark, kicker, title | **lost** wordmark, kicker, title; **cut** both figures | **lost** wordmark, kicker, title, both figures; **cut** rows |
| P6-3 pakej-dewan | 0.844, 0.922 | **lost** wordmark, kicker, title | **lost** wordmark, kicker, title; **cut** both figures | **lost** wordmark, kicker, title, both figures; **cut** rows |
| P6-4 bajet-kahwin | 0.156, 0.922 | **lost** wordmark, kicker, title | **lost** wordmark, kicker, title, figure 1; **cut** figure 2 | **lost** wordmark, kicker, title, both figures; **cut** rows |

**This is not new, and it is not something these eight layouts introduced.** The
same analysis run against the eight **live, published** C2.4 figure covers gives
the same shape:

| Live C2.4 cover | `crop-4x3-article-card` | `crop-16x9-og` |
|---|---|---|
| A1, A3, A4, A5, A6, A7 | **lost** wordmark, kicker, title | **lost** wordmark, kicker, title; figures cut or lost |
| A2, A8 | **lost** rows, note, footer | **lost** rows, note, footer; figures cut |

So six of the eight covers now serving `/artikel/*` lose their title in the OG
image and the article card, and the other two lose their rows, note and footer.
**Nobody knew, because nothing measured it.** That is the finding here, and it is
worth more than the eight new PNGs.

**Cause, and the fix that is not mine to make.** `ingest-article.mts` passes no
`focalPointOverride`, so a flat graphic with no faces falls through to sharp's
saliency attention crop, which lands wherever the ink is densest — measured across
these sixteen covers, y = 0.250, 0.922 and nothing in between. `processSmartCrops`
**already accepts** `focalPointOverride`, and graphic-kit spec §7.2 already
specifies `{x: 0.5, y: 0.5}`. Wiring the article file through to it is a one-file
change on the ingest path. It was called out on the C2.4 contact sheet on 24 Ogos
and it is still not done; it is now measured rather than suspected. **It should be
its own brief, and it should come before these eight are ingested** — otherwise
eight more covers ship with unreadable OG images.

I did not fix it here. The brief said do not fix quietly; it also did not put the
ingest path in scope.

---

## 4. Figures that had to be asterisked

**One, and it is on `cover-syarat-sah-nikah.png`.**

The Selangor amendment raising the marriage age to 18 for both parties was
gazetted (Warta Kerajaan Negeri Selangor, Jil. 71 No. 17, 24 Ogos 2018), but the
article records plainly that its commencement notification could not be confirmed
from the Warta. So the card shows the figure that *is* in force — **lelaki 18,
perempuan 16**, section 8 — and marks the amendment:

> Nota: *Pindaan umur 18 tahun bagi kedua-dua pihak diwartakan 2018.\* Kuat
> kuasanya belum disahkan.*
> Footer: *\* Belum disahkan sebagai kuat kuasa · Disemak 24 Ogos 2026*

Same convention as the C2.4 cards, wording adapted because what is unconfirmed
here is a commencement date, not a rate.

**"Tiada kadar" rendered as a value, not a blank** — one card, `P6-1`:

> **DBKL, MBSA** — *Tiada kadar tersiar*

DBKL lists twenty halls with no rate and routes bookings to Tempah@KL; MBSA
publishes procedure and SOPs and no rate list. The article refuses to estimate
either, and the card says so on the card rather than leaving a reader to fill the
gap from a 2015 blog. `P6-4` carries the same shape for vendor costs
(*Kos vendor — Tiada kadar rasmi*), and `P6-3` says it in the note
(*MBSA tidak menyiarkan kadarnya*).

**The Penang kursus fee is on none of these eight cards.** The brief flagged that
Penang's kursus fee rises RM100 → RM120 on 1 September 2026 and that a card
carrying it must say which figure applies from when. None of these four P1
articles carries a kursus fee at all — that figure lives in `kursus-kahwin`, which
is not in this batch. Rather than date a figure, the cards do not carry it. The
only kursus fee anywhere in this batch is the **Selangor** RM100 (JAIS), which
appears on `P6-2` and `P6-4` because both articles state it, and which the 1
September change does not touch.

**No number was carried between articles**, and no number was sourced
independently. Where two drafts quote the same council, each card follows its own
article.

---

## 5. Baked review dates — the full list

**All eight carry `Disemak 24 Ogos 2026` in the footer.** That exact date is in
every one of the eight articles, on every source line in their `## Sumber`
sections, so this is inside the brief's rule rather than an exception to it.

| File | Baked date string |
|---|---|
| `cover-borang-nikah.png` | `Pk. P.U. 30, Warta Perak, 1 Jun 2013 · Disemak 24 Ogos 2026` |
| `cover-rukun-nikah.png` | `Masjid Wilayah Persekutuan · Disemak 24 Ogos 2026` |
| `cover-syarat-sah-nikah.png` | `* Belum disahkan sebagai kuat kuasa · Disemak 24 Ogos 2026` |
| `cover-lafaz-taklik.png` | `Teks Perak sahaja · Disemak 24 Ogos 2026` |
| `C6-2-A1-harga-sewa-dewan-kahwin-cover.png` | `Kadar rasmi majlis perbandaran · Disemak 24 Ogos 2026` |
| `C6-2-A2-checklist-kahwin-cover.png` | `Kadar dewan dan kursus rasmi · Disemak 24 Ogos 2026` |
| `C6-2-A3-pakej-dewan-kahwin-cover.png` | `Senarai kadar Dewan Sivik MBPJ 2024 · Disemak 24 Ogos 2026` |
| `C6-2-A4-bajet-kahwin-cover.png` | `MBPJ, MBSJ, MBDK, MP Sepang dan JAIS · Disemak 24 Ogos 2026` |

Two things worth saying plainly about this.

**It is a day, not a month.** The eight C2.4 PNGs carry `Disemak Ogos 2026`, which
goes stale in January and is the debt the brief warned about. `24 Ogos 2026` goes
stale on 25 Ogos in the strictest reading. In practice both are regenerated by one
command and neither is hand-drawn, so the debt is a command, not a redraw. But if
the standing preference is *no date in the artwork at all*, say so once and I will
strip it from the footer of all sixteen files in one run — it is a one-line change
per spec.

**On a cost card the date is load-bearing.** MP Sepang's rate has been in force
since 1 July 2016 and is the cheapest published rate in the Klang Valley; a rate
without a date is a rate nobody can check. `P6-1` therefore carries `(2016)` next
to the Sepang figure in the row itself, independent of the footer stamp. That one
I would keep whatever is decided about review stamps.

### A separate bug this batch found in the C2.4 template

**The footer silently rendered onto the plum plate whenever it wrapped to two
lines.** `cover-template.mts` allowed two footer lines, but the footer is
bottom-anchored at `CANVAS_HEIGHT − 55`, so a second line pushes the first
baseline to exactly `PLATE_BOTTOM` — that line lands *on* the dark plum plate in
`--muted-foreground`, a warm mid-grey chosen for the cream field, with the brass
rule cutting through it. Effectively unreadable. It never bit C2.4 because all
eight of those footers happen to fit on one line.

The template now throws with the arithmetic in the message rather than rendering
it. Two of my footers hit the guard on the first pass and were shortened.

---

## 6. One thing for the Editorial Review Board

**The alt text in the drafts' own front matter describes a different graphic from
the one that now exists.** Each writer wrote a placeholder alt describing an
imagined card — e.g. `borang-nikah` describes "enam borang nikah disusun mendatar
mengikut turutan… setiap satu dengan fi bercetak di sebelahnya"; the four P6
drafts all describe "kad tajuk… di atas latar krim dengan garis tembaga".

I did not edit the drafts — they are in editorial review in parallel and the brief
says not to touch them. The contact sheet prints, per cover, the **exact
front-matter block that should replace the current one**, alt text folded the same
way the drafts fold theirs. It is a copy-paste per file when the board is ready.

Also for the board: `borang-nikah`, `rukun-nikah`, `syarat-sah-nikah` and
`lafaz-taklik` write `cover.file` without a leading `./`, while the four P6 drafts
write `./`. Both resolve, but the C2.4 batch standardised on `./` and the
generated blocks use it.

---

## Rules observed

- `pnpm --silent`, never `pnpm run`, on every invocation.
- No production write of any kind. Nothing ingested, nothing published.
- The eight live C2.4 articles were not touched; their sixteen cover files
  regenerate byte-identical.
