-- UNDO for SEO-05: restore meta_title and meta_description on five articles.
-- Captured 2026-08-26T17:08:59.240Z from production (pooler aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres).
-- Every value below is the LITERAL pre-write value read from the live row.
-- title (the H1) is NOT restored because this item never writes it; it is recorded here for reference only.
-- updated_at is restored too: it is the sitemap lastmod, so a rollback must roll that back as well.
-- Addressed by id. Run inside the transaction; check the row count before commit.
begin;
-- dewan-kahwin   H1 (unchanged by SEO-05): "10 Dewan Kahwin Murah di Selangor & KL – Sesuai untuk Bajet Bawah RM5,000"
update articles set
  meta_title = '10 Dewan Kahwin Murah di Selangor & KL – Sesuai untuk Bajet Bawah RM5,000',
  meta_description = 'Mencari dewan kahwin murah di Selangor dan Kuala Lumpur kini bukan lagi satu cabaran. Banyak dewan komuniti dan…',
  updated_at = '2026-08-25T18:01:59.511Z'::timestamptz
where id = '4d367182-1f4a-431c-8fda-a215ccd034d7';
-- goodies-kahwin   H1 (unchanged by SEO-05): "20+ Idea Goodies Kahwin dan Hadiah yang Patut Dielakkan"
update articles set
  meta_title = '20+ Idea Goodies Kahwin dan Hadiah yang Patut Dielakkan',
  meta_description = 'Memilih goodies kahwin yang simple tetapi tetap nampak eksklusif bukanlah sesuatu yang mustahil. Dengan idea yang tepat, bajet…',
  updated_at = '2026-08-25T18:01:59.511Z'::timestamptz
where id = 'f81fc042-3c42-4fb2-9d1d-c3c508843737';
-- kursus-kahwin   H1 (unchanged by SEO-05): "Kursus Kahwin: Panduan Lengkap Daftar, Syarat & Tempat di Seluruh Malaysia"
update articles set
  meta_title = 'Kursus Kahwin: Panduan Lengkap Daftar, Syarat & Tempat di Seluruh Malaysia',
  meta_description = 'Kursus kahwin ialah kursus wajib untuk pasangan Muslim sebelum memohon nikah. Ia memberi ilmu asas rumah tangga seperti…',
  updated_at = '2026-08-25T18:01:59.511Z'::timestamptz
where id = '1c2e96ae-340f-4226-bb32-363da8cbe3d0';
-- mas-kahwin-ikut-negeri   H1 (unchanged by SEO-05): "Mas kahwin ikut negeri 2026: kadar minimum setiap negeri"
update articles set
  meta_title = 'Mas Kahwin Ikut Negeri: Negeri Mana Paling Tinggi & Paling Rendah?',
  meta_description = 'Kadar minimum mas kahwin ikut negeri bagi 14 bidang kuasa, RM22.50 hingga RM300, berserta pihak berkuasa dan tarikh setiap kadar. Disemak Ogos 2026.',
  updated_at = '2026-08-25T18:01:59.511Z'::timestamptz
where id = 'b1484478-a5b5-44ce-85c2-10f2c2a32d0c';
-- tempat-honeymoon-di-malaysia   H1 (unchanged by SEO-05): "19 Tempat Honeymoon di Malaysia yang Wajib Masuk Wishlist Pasangan"
update articles set
  meta_title = '19 Tempat Honeymoon di Malaysia yang Wajib Masuk Wishlist Pasangan',
  meta_description = 'Tempat honeymoon di Malaysia sering menjadi pilihan pasangan kerana di sinilah bermulanya detik istimewa yang menetapkan rentak awal…',
  updated_at = '2026-08-25T18:01:59.511Z'::timestamptz
where id = '3dcdff4c-d262-4333-8a75-4f826a207918';
-- expect: UPDATE 1 five times.
commit;
-- After running this, revalidate the origin (POST /api/cron/revalidate-content) and
-- purge the Vercel edge for all three URL strings of each article, or the CDN keeps the new titles.
