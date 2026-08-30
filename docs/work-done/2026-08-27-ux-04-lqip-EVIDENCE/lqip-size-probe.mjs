import sharp from 'sharp';
const urls = [
  'https://images.hellokahwin.com/inspire/hidden-hantaran/1787765217232-images-s-hantaran-berbalut-organza-bincang-mohd-nasir/crop-4x3-article-card.webp',
  'https://images.hellokahwin.com/inspire/hantaran-coklat/1787765191937-images-s-rombongan-bawa-hantaran-terengganu-mohd-hasan/crop-4x3-article-card.webp',
  'https://images.hellokahwin.com/inspire/hantaran-tema-warna/1787765144241-images-s-kotak-hantaran-putih-tema-merah-jambu-qodak-stx/crop-4x3-article-card.webp',
];
for (const u of urls) {
  const r = await fetch(u);
  const src = Buffer.from(await r.arrayBuffer());
  const meta = await sharp(src).metadata();
  for (const [w, q] of [[8,50],[12,45],[16,40],[16,50],[20,40],[24,40]]) {
    const b = await sharp(src).resize({ width: w, withoutEnlargement: true }).webp({ quality: q, effort: 6 }).toBuffer();
    const dataUrl = `data:image/webp;base64,${b.toString('base64')}`;
    process.stdout.write(`  w=${String(w).padStart(2)} q=${q}  raw=${String(b.length).padStart(4)}B  dataURL=${String(dataUrl.length).padStart(4)}chars\n`);
  }
  console.log(`^ source ${meta.width}x${meta.height} ${src.length}B  ${u.split('/').slice(-2)[0].slice(0,40)}\n`);
}
