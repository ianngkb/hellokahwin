# CONT-07: append the five photographs this run licensed, and patch
# digunakan_dalam on the six rows it reuses.
#
# APPEND, NEVER REWRITE. Other writers append to this file concurrently, so the
# script re-reads the file at run time, refuses if an id it wants is taken, and
# only ever adds rows at the end or edits the one cell it names.
import csv
import os
import shutil
import sys

REG = r"C:\Users\Ian Ng\orca\workspaces\hkdocs-cont08\docs\asset-register\asset-register.csv"
BEFORE = REG + ".before-cont07"

SCOPE = "laman hellokahwin.com dan akaun sosial HelloKahwin, tanpa had tempoh"
CHECKED = "27 Ogos 2026"
LOG = ("Halaman foto Flickr, pautan lesen Creative Commons dibaca di sumber sebelum "
       "muat turun, disemak 27 Ogos 2026; log docs/work-done/aug-23-2026-session-01/"
       "aug-27-2026-done-cont-07-c21-hantaran.md")

NEW = [
    dict(
        asset_id="HK-P-0085",
        fail="S-serah-dulang-hantaran-lelaki-azlan-dupree.jpg",
        perihal_ms=("Lelaki bersongkok hitam berbaju putih memegang dulang hantaran berisi kotak "
                    "hadiah berbalut dan bunga ros merah putih, bersama dua perempuan bertudung; "
                    "majlis pertunangan Wangsa Maju, Kuala Lumpur, 6 Februari 2012"),
        credit_url="https://www.flickr.com/photos/diloz/6920261445/",
        nota=("Asal 3801x2534, melepasi had cover 2464x2400 tanpa dibesarkan. Empat penjuru "
              "diperiksa 1:1, tiada tera air. Tajuk Flickr \"marlina + hazary | engagement\", "
              "huraian \"wangsa maju, kuala lumpur\". Cover bagi hantaran-untuk-lelaki DENGAN NOTA "
              "KELEMAHAN: ini potret berkumpulan, dulang berada di bawah kanan bingkai dan "
              "terpotong sedikit di tepi. Carian Flickr \"dulang hantaran\" dengan penapis lesen "
              "4,5,7,9,10 memulangkan sifar hasil pada 27 Ogos 2026. Senarai naik taraf. "
              "Orang yang boleh dikenali; tiada pelepasan model."),
        digunakan_dalam="hantaran-untuk-lelaki",
    ),
    dict(
        asset_id="HK-P-0086",
        fail="S-bawa-dulang-hantaran-naik-rumah-azlan-dupree.jpg",
        perihal_ms=("Empat perempuan berbaju kurung mendaki anak tangga rumah sambil mendukung "
                    "dulang hantaran berhias bunga, satu membawa kek putih dan satu lagi dulang "
                    "perak berbunga ros kuning; majlis pertunangan Gombak, Kuala Lumpur, "
                    "28 April 2012"),
        credit_url="https://www.flickr.com/photos/diloz/7005207290/",
        nota=("Asal 3888x2592, melepasi had cover 2464x2400. Empat penjuru diperiksa 1:1, tiada "
              "tera air. Tajuk Flickr \"nizam + izmira // the engagement\", huraian \"gombak, "
              "kuala lumpur\". Subjek tajam di tengah kanan, cahaya siang, kontras bertahan pada "
              "kad 320px. Cover bagi barang-hantaran-perempuan. Orang yang boleh dikenali."),
        digunakan_dalam="barang-hantaran-perempuan",
    ),
    dict(
        asset_id="HK-P-0087",
        fail="S-rombongan-hantaran-jalan-azlan-dupree.jpg",
        perihal_ms=("Sembilan ahli keluarga berbaju ungu dan merah jambu berdiri sebaris di jalan "
                    "taman perumahan, setiap seorang memegang dulang hantaran beralas kain putih "
                    "berhias ungu yang sama; majlis pertunangan Wangsa Maju, Kuala Lumpur, "
                    "6 Februari 2012"),
        credit_url="https://www.flickr.com/photos/diloz/6920295857/",
        nota=("Asal 3888x2592, melepasi had cover 2464x2400. Empat penjuru diperiksa 1:1, tiada "
              "tera air. Tajuk Flickr \"marlina + hazary | engagement\". Warna sepadan, cahaya "
              "siang terang, kontras kekal pada kad 320px dan menonjol dalam grid pillar. "
              "Cover bagi persiapan-hantaran-kahwin. Orang yang boleh dikenali."),
        digunakan_dalam="persiapan-hantaran-kahwin;adat-hantaran-ikut-keluarga",
    ),
    dict(
        asset_id="HK-P-0088",
        fail="S-dulang-kek-coklat-buah-hantaran-azlan-dupree.jpg",
        perihal_ms=("Pengantin perempuan berbaju putih duduk di lantai dikelilingi lapan perempuan "
                    "berbaju kurung, dengan dulang hantaran berisi kek berais putih, coklat dan "
                    "buah berbalut plastik merah di hadapan mereka; majlis pertunangan Wangsa Maju, "
                    "Kuala Lumpur, 6 Februari 2012"),
        credit_url="https://www.flickr.com/photos/diloz/6920232339/",
        nota=("Asal 3888x2592, melepasi had cover 2464x2400. Empat penjuru diperiksa 1:1, tiada "
              "tera air. Tajuk Flickr \"marlina + hazary | engagement\". Cover bagi "
              "barang-hantaran-berguna. NOTA: subjek berada pada satu pertiga bawah bingkai, jadi "
              "titik fokus perlu ditetapkan ke bawah supaya dulang bertahan pada potongan hero "
              "letterbox 2464x700. Orang yang boleh dikenali."),
        digunakan_dalam="barang-hantaran-berguna",
    ),
    dict(
        asset_id="HK-P-0089",
        fail="S-tujuh-dulang-hantaran-rombongan-azlan-dupree.jpg",
        perihal_ms=("Tujuh perempuan berbaju kurung berdiri sebaris di halaman rumah, setiap "
                    "seorang memegang dulang hantaran berhias bunga putih dan hijau, satu membawa "
                    "kek berais putih; majlis pertunangan Gombak, Kuala Lumpur, 28 April 2012"),
        credit_url="https://www.flickr.com/photos/diloz/7151296655/",
        nota=("Asal 3888x2592, melepasi had cover 2464x2400. Empat penjuru diperiksa 1:1, tiada "
              "tera air. Tajuk Flickr \"nizam + izmira // the engagement\". Dulang boleh dikira "
              "satu per satu dalam bingkai, cahaya siang, kontras bertahan pada kad 320px. "
              "Cover bagi hantaran-kahwin-bajet. Orang yang boleh dikenali."),
        digunakan_dalam="hantaran-kahwin-bajet;tempat-beli-hantaran",
    ),
]

# fail -> slugs to ADD to digunakan_dalam on an existing row
PATCH = {
    "S-dulang-buah-hantaran-mohd-hasan.jpg": [
        "hantaran-untuk-lelaki", "hantaran-kahwin-bajet", "barang-hantaran-berguna",
        "persiapan-hantaran-kahwin", "tempat-beli-hantaran",
    ],
    "S-dulang-hantaran-masjid-mylifestory.jpg": ["hantaran-untuk-lelaki", "hantaran-kahwin-bajet"],
    "S-dulang-berkaki-hiasan-farritz.jpg": [
        "barang-hantaran-perempuan", "persiapan-hantaran-kahwin", "tempat-beli-hantaran",
    ],
    "S-serah-hantaran-akad-mylifestory.jpg": ["barang-hantaran-perempuan"],
    "S-tepak-sirih-muzium-negara-marcin-konsek.jpg": [
        "barang-hantaran-berguna", "adat-hantaran-ikut-keluarga",
    ],
    "S-rombongan-lelaki-bincang-hantaran-azlan-dupree.jpg": ["adat-hantaran-ikut-keluarga"],
}


def build_row(fields, spec):
    r = {k: "" for k in fields}
    r["asset_id"] = spec["asset_id"]
    r["status_guna"] = "boleh-guna"
    r["fail"] = spec["fail"]
    r["r2_key"] = "TIDAK BERKENAAN"
    r["perihal_ms"] = spec["perihal_ms"]
    r["pencipta"] = "Azlan DuPree"
    r["bukti_pencipta"] = "blok-kredit-vendor"
    r["licensor_name"] = "Azlan DuPree"
    r["license_class"] = "S"
    r["skop_lesen"] = SCOPE
    r["tarikh_geran"] = CHECKED
    r["tarikh_semak_semula"] = "TIDAK BERKENAAN"
    r["bukti_lesen"] = LOG
    r["credit"] = "Kredit: Azlan DuPree (CC BY 2.0)"
    r["credit_url"] = spec["credit_url"]
    r["digunakan_dalam"] = spec["digunakan_dalam"]
    r["dijana_ai"] = "tidak"
    r["tarikh_diperoleh"] = CHECKED
    r["log_takedown"] = ""
    r["nota"] = spec["nota"]
    return r


def main():
    with open(REG, encoding="utf-8", newline="") as fh:
        rd = csv.DictReader(fh)
        fields = rd.fieldnames
        rows = list(rd)

    if not os.path.exists(BEFORE):
        shutil.copyfile(REG, BEFORE)
        print(f"before-copy written: {os.path.basename(BEFORE)} ({len(rows)} rows)")

    taken = {r["asset_id"] for r in rows}
    by_fail = {r["fail"]: r for r in rows}

    for spec in NEW:
        if spec["asset_id"] in taken:
            sys.exit(f"REFUSING: {spec['asset_id']} already exists. Another run appended. "
                     "Re-derive the next free id and re-run.")
        if spec["fail"] in by_fail:
            sys.exit(f"REFUSING: {spec['fail']} already registered as "
                     f"{by_fail[spec['fail']]['asset_id']}.")

    added = [build_row(fields, s) for s in NEW]

    patched = 0
    for fail, slugs in PATCH.items():
        row = by_fail.get(fail)
        if row is None:
            sys.exit(f"REFUSING: {fail} is not in the register; nothing to patch.")
        cur = [s for s in (row["digunakan_dalam"] or "").split(";") if s and s != "TIDAK BERKENAAN"]
        for s in slugs:
            if s not in cur:
                cur.append(s)
        new_val = ";".join(cur)
        if new_val != row["digunakan_dalam"]:
            row["digunakan_dalam"] = new_val
            patched += 1
            print(f"  patched {row['asset_id']:<11} {fail} -> {new_val}")

    with open(REG, "w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=fields, lineterminator="\n")
        w.writeheader()
        w.writerows(rows + added)

    print(f"appended {len(added)} rows ({NEW[0]['asset_id']}..{NEW[-1]['asset_id']}), "
          f"patched {patched} cells, total {len(rows) + len(added)} rows")


if __name__ == "__main__":
    main()
