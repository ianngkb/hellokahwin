// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { parseDevice } from '../device';

describe('parseDevice (ua-parser-js 1.x, MIT — F9)', () => {
  it('parses a desktop Chrome UA', () => {
    expect(
      parseDevice(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      ),
    ).toEqual({ browser: 'Chrome', os: 'Windows', device_type: 'desktop' });
  });

  it('parses a mobile Safari UA', () => {
    expect(
      parseDevice(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
      ),
    ).toEqual({ browser: 'Mobile Safari', os: 'iOS', device_type: 'mobile' });
  });

  it('returns nulls for a missing UA', () => {
    expect(parseDevice('')).toEqual({ browser: null, os: null, device_type: null });
  });
});
