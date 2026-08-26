// Rule 5: render all four crop windows LOCALLY, from the repo's own pure
// geometry, before anything is written. Cheap, needs no R2, and it is the only
// way to see the desktop hero guillotine a subject that sits low in the frame.
import sharp from 'sharp';
import { readdir } from 'node:fs/promises';
import { computeCropWindow, detectSaliencyFocalPoint, CROP_TARGETS } from '../../src/lib/storage/smart-crop';

const dir = process.argv[2];
const files = (await readdir(dir)).filter((f) => f.endsWith('.jpg'));
for (const f of files) {
  const buf = await sharp(dir + '/' + f).toBuffer();
  const md = await sharp(buf).metadata();
  const fp = await detectSaliencyFocalPoint(buf);
  console.log(`\n${f}  ${md.width}x${md.height}  saliency focal x=${fp.x.toFixed(3)} y=${fp.y.toFixed(3)}`);
  const tiles: { input: Buffer; top: number; left: number }[] = [];
  let x = 0;
  for (const t of CROP_TARGETS) {
    const w = computeCropWindow(md.width!, md.height!, t.aspectRatio, fp, null);
    const { left, top, width, height } = w;
    const up = t.outputWidth > width || t.outputHeight > height;
    console.log(`  ${t.name.padEnd(26)} window ${width}x${height} @ ${left},${top}  target ${t.outputWidth}x${t.outputHeight}  ${up ? 'UPSCALE' : 'ok'}`);
    const tile = await sharp(buf).extract({ left, top, width, height }).resize(560, Math.round(560 / t.aspectRatio), { fit: 'fill' }).jpeg({ quality: 82 }).toBuffer();
    tiles.push({ input: tile, top: 0, left: x });
    x += 570;
  }
  const H = Math.max(...CROP_TARGETS.map((t) => Math.round(560 / t.aspectRatio)));
  await sharp({ create: { width: x, height: H, channels: 3, background: '#111' } })
    .composite(tiles).jpeg({ quality: 82 }).toFile(dir + '/../crops-' + f.replace(/\.jpg$/, '') + '.jpg');
}
