import { UAParser } from 'ua-parser-js';

export interface DeviceInfo {
  browser: string | null;
  os: string | null;
  device_type: string | null;
}

/**
 * Browser / OS / device type from the REQUEST user agent, parsed on the server
 * at collect time.
 *
 * The Wedding Notebook parsed this in the browser tracker and posted it; doing
 * it here instead keeps `ua-parser-js` out of the public bundle entirely, and
 * means a client cannot claim a browser it is not running. Same output shape
 * as the twn-new client parse: a UA with no device type is a desktop.
 */
export function parseDevice(ua: string | null | undefined): DeviceInfo {
  if (!ua) return { browser: null, os: null, device_type: null };
  const result = new UAParser(ua).getResult();
  return {
    browser: result.browser.name ?? 'unknown',
    os: result.os.name ?? 'unknown',
    device_type: result.device.type ?? 'desktop',
  };
}
