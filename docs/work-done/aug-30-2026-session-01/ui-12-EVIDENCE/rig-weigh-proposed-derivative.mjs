// What WOULD a row-thumbnail rendition of crop-4x3-article-card weigh?
// Measured, not estimated: fetch the real production crop, resize with the
// pipeline's own sharp settings, and weigh the result.
import sharp from 'sharp';
const URLS = process.argv.slice(2);
console.log('asset                              4x3@q80 full   528x396@q50   528x396@q30   low.webp(today)');
for (const u of URLS) {
  const buf = Buffer.from(await (await fetch(u)).arrayBuffer());
  const m = await sharp(buf).metadata();
  const q50 = await sharp(buf).resize({ width: 528, withoutEnlargement: true }).webp({ quality: 50 }).toBuffer();
  const q30 = await sharp(buf).resize({ width: 528, withoutEnlargement: true }).webp({ quality: 30 }).toBuffer();
  const slug = u.match(/inspire\/([^/]+)\//)?.[1] ?? u.slice(-30);
  console.log(
    `${slug.padEnd(34)} ${String(Math.round(buf.length/1024)).padStart(5)} KB      ${String(Math.round(q50.length/1024)).padStart(4)} KB       ${String(Math.round(q30.length/1024)).padStart(4)} KB      (${m.width}x${m.height})`,
  );
}
