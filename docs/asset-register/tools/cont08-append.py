"""CONT-08 (26 Ogos 2026): append eight licensed-photograph rows HK-P-0077..0084
and patch `digunakan_dalam` on ten reused rows. Run from the docs repo root.
Idempotent: refuses if HK-P-0077 already exists. The before-copy is
asset-register.csv.before-cont08, taken by the caller before running this."""
import csv, io, sys

p = 'docs/asset-register/asset-register.csv'
raw = open(p, encoding='utf-8', newline='').read()
rows = list(csv.reader(io.StringIO(raw)))
hdr, data = rows[0], rows[1:]
idx = {h: i for i, h in enumerate(hdr)}
assert hdr[0] == 'asset_id' and len(hdr) == 20, hdr
if any(r[0] == 'HK-P-0077' for r in data):
    print('already applied'); sys.exit(0)

SCOPE = 'laman hellokahwin.com dan akaun sosial HelloKahwin, tanpa had tempoh'
LOG = 'docs/work-done/aug-23-2026-session-01/aug-26-2026-done-cont-08-c25-nisbah.md'
FL = ('Halaman foto Flickr, pautan lesen Creative Commons dibaca di sumber sebelum '
      'muat turun, disemak 26 Ogos 2026; log ' + LOG)


def row(aid, fail, perihal, pencipta, cls, bukti, credit, url, used, nota):
    r = [''] * 20
    r[idx['asset_id']] = aid
    r[idx['status_guna']] = 'boleh-guna'
    r[idx['fail']] = fail
    r[idx['r2_key']] = 'TIDAK BERKENAAN'
    r[idx['perihal_ms']] = perihal
    r[idx['pencipta']] = pencipta
    r[idx['bukti_pencipta']] = 'blok-kredit-vendor'
    r[idx['licensor_name']] = pencipta
    r[idx['license_class']] = cls
    r[idx['skop_lesen']] = SCOPE
    r[idx['tarikh_geran']] = '26 Ogos 2026'
    r[idx['tarikh_semak_semula']] = 'TIDAK BERKENAAN'
    r[idx['bukti_lesen']] = bukti
    r[idx['credit']] = credit
    r[idx['credit_url']] = url
    r[idx['digunakan_dalam']] = used
    r[idx['dijana_ai']] = 'tidak'
    r[idx['tarikh_diperoleh']] = '26 Ogos 2026'
    r[idx['log_takedown']] = ''
    r[idx['nota']] = nota
    return r


AZ = 'Azlan DuPree'
AZC = 'Kredit: Azlan DuPree (CC BY 2.0)'
AZN = ('Tajuk Flickr "nizam + izmira // the engagement", huraian "gombak, kuala lumpur", '
       'diambil 28 April 2012. Tiada tera air (diperiksa 1:1). Orang yang boleh dikenali; '
       'tiada pelepasan model. ')
new = [
    row('HK-P-0077', 'S-rombongan-lelaki-bincang-hantaran-azlan-dupree.jpg',
        'Lima orang lelaki dua keluarga duduk bersila di ruang tamu, dulang hantaran (kek dan gubahan bunga) di hadapan; majlis pertunangan Gombak, Kuala Lumpur, 28 April 2012',
        AZ, 'S', FL, AZC, 'https://www.flickr.com/photos/diloz/7005208784/',
        'cara-tetapkan-duit-hantaran;adat-hantaran-berbeza-negeri',
        'Asal 3888x2592. ' + AZN + 'Cover bagi cara-tetapkan-duit-hantaran.'),
    row('HK-P-0078', 'S-dulang-hantaran-tunang-lantai-azlan-dupree.jpg',
        'Hitam putih: tiga perempuan di sofa, dulang hantaran balasan beralas renda disusun di lantai ruang tamu; majlis pertunangan Gombak, 28 April 2012',
        AZ, 'S', FL, AZC, 'https://www.flickr.com/photos/diloz/7005204008/',
        'nisbah-hantaran;hantaran-kahwin-5-balas-7',
        'Asal 3888x2592, monokrom. ' + AZN + 'Cover bagi hantaran-kahwin-5-balas-7 dengan nota kelemahan: hitam putih, dulang di bawah kanan bingkai, titik fokus perlu disemak pada potongan hero 4.3x1.'),
    row('HK-P-0079', 'S-serah-kotak-cincin-hantaran-azlan-dupree.jpg',
        'Wakil pihak lelaki berbaju batik jingga memerhati lelaki lebih tua berkopiah putih memegang kotak cincin terbuka; majlis pertunangan Gombak, 28 April 2012',
        AZ, 'S', FL, AZC, 'https://www.flickr.com/photos/diloz/7005210670/',
        'hantaran-tunang-3-balas-5', 'Asal 3888x2592. ' + AZN),
    row('HK-P-0080', 'S-wakil-keluarga-pegang-kotak-cincin-azlan-dupree.jpg',
        'Lelaki lebih tua bersongkok dan berbaju melayu putih bersamping songket memegang kotak cincin kecil sambil tersenyum, seorang lagi menuding jari; majlis pertunangan Gombak, 28 April 2012',
        AZ, 'S', FL, AZC, 'https://www.flickr.com/photos/diloz/7005212244/',
        'bilangan-dulang-hantaran-ganjil;cara-tetapkan-duit-hantaran', 'Asal 3888x2592. ' + AZN),
    row('HK-P-0081', 'S-ibu-sarung-cincin-tunang-azlan-dupree.jpg',
        'Perempuan lebih tua bertudung kelabu menyarungkan cincin ke jari bakal pengantin perempuan berbaju hijau zamrud berselendang renda putih; majlis pertunangan Gombak, 28 April 2012',
        AZ, 'S', FL, AZC, 'https://www.flickr.com/photos/diloz/7005217554/',
        'hantaran-tunang-3-balas-5', 'Asal 3888x2592. ' + AZN),
    row('HK-P-0082', 'S-arak-pengantin-lelaki-payung-kuning-sham-hardy.jpg',
        "Pengantin lelaki berbaju melayu putih bertanjak diarak di bawah payung kuning berumbai bersama rombongan di jalan kampung; tajuk Flickr Aziah's Wedding, 15 April 2012",
        'Sham Hardy', 'S', FL.replace('Creative Commons', 'Creative Commons (CC BY-SA 2.0)'),
        'Kredit: Sham Hardy (CC BY-SA 2.0)', 'https://www.flickr.com/photos/xshamx/6962844678/',
        'adat-hantaran-berbeza-negeri',
        'Asal 5184x3456, tiada tera air. Lesen CC BY-SA 2.0: potongan (karya terbitan) dikongsi di bawah lesen yang sama; kredit dan pautan lesen wajib dipaparkan. Lokasi tidak dinyatakan pada halaman foto; pakaian dan latar Malaysia; jurugambar yang sama seperti HK-P-0039. Orang yang boleh dikenali. Cover bagi adat-hantaran-berbeza-negeri.'),
    row('HK-P-0083', 'S-bunga-manggar-jalan-kuala-krai-nuraishah-affandi.jpg',
        'Dua bunga manggar berkilat dipacak di tepi jalan di sebelah papan tanda Jalan Tuan Guru Haji Abdul Rahman, Kuala Krai, Kelantan, 2 September 2011',
        'Nuraishah Bazilah Affandi', 'S', FL, 'Kredit: Nuraishah Bazilah Affandi (CC BY 2.0)',
        'https://www.flickr.com/photos/gulaley/6168703583/', 'adat-hantaran-berbeza-negeri',
        'Asal 3696x2448. Huraian Flickr: "Lokasi: Jalan Tuan Guru Haji Abdul Rahman, 18000 Kuala Krai, Kelantan." Tiada orang dalam bingkai.'),
    row('HK-P-0084', 'S-bincang-hantaran-dua-keluarga-mohd-nasir.jpg',
        'Empat lelaki dua keluarga berbincang di atas tikar di ruang tamu, dulang hantaran di lantai; Majlis Pertunangan Zeeana & Halim, 22 November 2009',
        'Mohd Nasir Mat Noor', 'S', FL, 'Kredit: Mohd Nasir Mat Noor (CC BY 2.0)',
        'https://www.flickr.com/photos/mynasir/4127524530/',
        'bilangan-dulang-hantaran-ganjil;cara-tetapkan-duit-hantaran',
        'Asal 4752x3168, tiada tera air (empat penjuru diperiksa 1:1; set Zeeana yang sama seperti HK-P-0040, 0041, 0055, 0056, 0057). Tajuk Flickr "Bincang". Cover bagi bilangan-dulang-hantaran-ganjil dengan nota kelemahan: cahaya denyar dalam rumah, latar ruang tamu penuh. Orang yang boleh dikenali.'),
]

add_use = {
    'HK-P-0009': ['hantaran-kahwin-5-balas-7', 'hantaran-wajib-atau-adat'],
    'HK-P-0010': ['nisbah-hantaran'],
    'HK-P-0015': ['duit-hantaran-kahwin'],
    'HK-P-0034': ['hantaran-wajib-atau-adat'],
    'HK-P-0035': ['duit-hantaran-kahwin'],
    'HK-P-0037': ['hantaran-kahwin-5-balas-7', 'duit-hantaran-kahwin'],
    'HK-P-0038': ['nisbah-hantaran', 'hantaran-kahwin-5-balas-7', 'bilangan-dulang-hantaran-ganjil'],
    'HK-P-0040': ['hantaran-tunang-3-balas-5'],
    'HK-P-0057': ['hantaran-tunang-3-balas-5', 'hantaran-wajib-atau-adat'],
    'HK-P-0061': ['hantaran-wajib-atau-adat'],
}
edited = 0
for r in data:
    if r[0] in add_use:
        cur = [x for x in r[idx['digunakan_dalam']].split(';') if x]
        for s in add_use[r[0]]:
            if s not in cur:
                cur.append(s)
        r[idx['digunakan_dalam']] = ';'.join(sorted(cur))
        edited += 1
assert edited == 10, edited
data.extend(new)
out = io.StringIO()
w = csv.writer(out, lineterminator='\n')
w.writerow(hdr)
w.writerows(data)
open(p, 'w', encoding='utf-8', newline='').write(out.getvalue())
print('rows before', len(rows) - 1, 'after', len(data), 'patched', edited)
