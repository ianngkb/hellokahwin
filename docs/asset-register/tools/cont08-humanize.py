"""Stage 5 /humanizer pass for the eight C2.5 drafts, applied AFTER the review
edits. Prose-only substitutions; front matter and link targets untouched.
Each substitution must match exactly once across the eight files, else it aborts."""
import glob, re, sys

D = 'docs/plans/aug-23-2026-session-01/drafts/ingest/'
subs = [
    # self-congratulation / announcing
    ('Tiada sumber rasmi yang menamakan asal usul nisbah itu, dan itu jawapan yang jujur. Yang boleh dikatakan ialah',
     'Tiada sumber rasmi yang menamakan asal usul nisbah itu. Yang boleh dikatakan ialah'),
    ('Tiada sumber rasmi yang disemak merekodkan sebabnya, dan itu dilaporkan di sini sebagai dapatan, bukan kekurangan. Yang direkodkan ialah amalannya.',
     'Tiada sumber rasmi yang disemak merekodkan sebabnya. Yang direkodkan ialah amalannya.'),
    # dramatic fragment pairs
    ('Angka itu tidak lebih betul daripada 3 balas 5. Ia cuma lebih banyak.',
     'Angka itu tidak lebih betul daripada 3 balas 5, cuma lebih banyak.'),
    ('Itu tidak menjadikannya salah. Ia menjadikannya pilihan. Sesuatu yang',
     'Itu tidak menjadikannya salah, cuma menjadikannya pilihan. Sesuatu yang'),
    ('Senarai itu tidak menyebut nisbah. Ia menyebut barang. Bilangan dulang',
     'Senarai itu menyebut barang, bukan nisbah. Bilangan dulang'),
    # bold mini-headings in numbered lists (A4)
    ('1. **Tambah satu dulang kecil.** Enam menjadi tujuh dengan sedulang manisan atau buah. Ini cara paling murah dan paling kerap.',
     '1. Tambah satu dulang kecil, jadi enam menjadi tujuh dengan sedulang manisan atau buah. Ini cara paling murah dan paling kerap.'),
    ('2. **Gabungkan dua barang dalam satu dulang.** Enam menjadi lima dengan meletakkan kasut dan dompet bersama.',
     '2. Gabungkan dua barang dalam satu dulang, jadi enam menjadi lima dengan meletakkan kasut dan dompet bersama.'),
    ('3. **Terima genap.** Empat balas enam ialah nisbah yang sah di sisi mana-mana sumber yang disemak, kerana tiada sumber yang menetapkan sebaliknya.',
     '3. Terima genap. Empat balas enam tidak dilarang oleh mana-mana sumber yang disemak, kerana tiada sumber yang menetapkan sebaliknya.'),
    # A6 list
    ('1. **Bahagikan mengikut majlis.** Duit hantaran menampung',
     '1. Bahagikan mengikut majlis. Duit hantaran menampung'),
    ('2. **Bahagikan mengikut masa.** Sebahagian pada hari bertunang',
     '2. Bahagikan mengikut masa. Sebahagian pada hari bertunang'),
    ('3. **Kurangkan majlis, bukan angka.** Kajian UiTM 2015',
     '3. Kurangkan majlis, bukan angka. Kajian UiTM 2015'),
    # A8 list
    ('1. **Tolak isi, kekalkan dulang.** Bilangan dulang dikekalkan',
     '1. Tolak isi, kekalkan dulang. Bilangan dulang dikekalkan'),
    ('2. **Tolak nisbah, kekalkan adat lama.** Tiga dulang',
     '2. Tolak nisbah, kekalkan adat lama. Tiga dulang'),
    ('3. **Tolak duit hantaran, kekalkan kenduri.** Setiap keluarga',
     '3. Tolak duit hantaran, kekalkan kenduri. Setiap keluarga'),
    # A7 bold lead-ins
    ('**Satu keluarga mengira duit hantaran sebagai mas kahwin, satu lagi tidak.** Ini percanggahan',
     'Satu keluarga mengira duit hantaran sebagai mas kahwin, satu lagi tidak. Ini percanggahan'),
    ('**Satu keluarga mahu balasan lebih, satu lagi mahu sama.** Tiada sumber',
     'Satu keluarga mahu balasan lebih, satu lagi mahu sama. Tiada sumber'),
    ('**Satu keluarga mahu bayaran penuh pada hari bertunang, satu lagi mahu pada hari nikah.** Rekod Perlis',
     'Satu keluarga mahu bayaran penuh pada hari bertunang, satu lagi mahu pada hari nikah. Rekod Perlis'),
    # hidden-truth phrasing
    ('Perhatikan apa yang tidak ada dalam jadual: nisbah dulang.',
     'Nisbah dulang tidak ada dalam jadual itu.'),
    ('Ini pengecualian yang paling penting, dan ia milik satu negeri sahaja.',
     'Pengecualian ini milik satu negeri sahaja.'),
    ('Yang membuat keluarga berbalah bukan angka, tetapi tanggapan bahawa angka itu peraturan.',
     'Keluarga berbalah bukan kerana angka, tetapi kerana menyangka angka itu peraturan.'),
    ('Kesilapan paling kerap ialah membincangkan ketiga-tiganya sebagai satu angka.',
     'Kesilapan yang kerap ialah membincangkan ketiga-tiganya sebagai satu angka.'),
]
files = {f: open(f, encoding='utf-8').read() for f in sorted(glob.glob(D + 'C2-5-A*.md'))}
for a, b in subs:
    n = sum(t.count(a) for t in files.values())
    if n != 1:
        print('MATCH COUNT', n, 'for:', a[:60]); sys.exit(1)
for f, t in files.items():
    for a, b in subs:
        t = t.replace(a, b)
    files[f] = t
for f, t in files.items():
    open(f, 'w', encoding='utf-8').write(t)
bodies = {f: t.split('\n---\n', 1)[1] for f, t in files.items()}
for f, b in bodies.items():
    dashes = b.count('—') + b.count('–')
    curly = len(re.findall('[“”‘’]', b))
    bold = len(re.findall(r'\*\*[^*]+\*\*', b))
    print(f.split('/')[-1], 'dashes', dashes, 'curly', curly, 'bold spans', bold)
print('humanizer substitutions applied:', len(subs))
