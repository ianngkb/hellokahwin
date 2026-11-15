import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HORIZONTAL_MARK_SVG } from '../horizontal-mark-svg';

describe('bundled horizontal wordmark', () => {
  it('matches public/brand/logos/hellokahwin-horizontal.svg byte for byte', () => {
    const onDisk = readFileSync(
      join(process.cwd(), 'public/brand/logos/hellokahwin-horizontal.svg'),
      'utf8',
    );
    // If this fails: node scripts/cloudflare/inline-wordmark.mjs
    expect(HORIZONTAL_MARK_SVG).toBe(onDisk);
  });
});
