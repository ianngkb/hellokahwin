import { describe, expect, it, vi } from 'vitest';
import { adminSettings } from '@/lib/db/schema/settings';

/**
 * Review R1: only the PUBLIC /artikel read may fall back when the saved
 * curation is unreadable. The admin editor reads strictly, so it can never open
 * on the default and then overwrite the real saved arrangement with it.
 */
let settingsFails = true;

// Every query chain resolves to [] — except a read of admin_settings, which
// rejects while `settingsFails` is set.
function chain(): unknown {
  let table: unknown;
  const resolve = () =>
    table === adminSettings && settingsFails
      ? Promise.reject(new Error('permission denied for table admin_settings'))
      : Promise.resolve([]);
  const proxy: unknown = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === 'then') {
          return (ok: (v: unknown) => unknown, no?: (e: unknown) => unknown) =>
            resolve().then(ok, no);
        }
        if (prop === 'from') {
          return (t: unknown) => {
            table = t;
            return proxy;
          };
        }
        return () => proxy;
      },
    },
  );
  return proxy;
}

vi.mock('@/lib/db/drizzle', () => ({ db: { select: () => chain() } }));

const { getInspireHomepageResolvedData, getPublicInspireHomepageResolvedData } =
  await import('../homepage-queries');
const { DEFAULT_INSPIRE_HOMEPAGE_CONFIG } = await import('../homepage-curation');

describe('resolving the Inspire homepage when the curation is unreadable', () => {
  it('the public /artikel read falls back to the automatic layout', async () => {
    settingsFails = true;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const data = await getPublicInspireHomepageResolvedData();
    expect(data.config).toEqual(DEFAULT_INSPIRE_HOMEPAGE_CONFIG);
    warn.mockRestore();
  });

  it('the admin read refuses, so the editor never opens on a default it could save', async () => {
    settingsFails = true;
    await expect(getInspireHomepageResolvedData()).rejects.toThrow('permission denied');
  });

  it('both reads work normally when the curation is readable', async () => {
    settingsFails = false;
    await expect(getInspireHomepageResolvedData()).resolves.toBeTruthy();
    await expect(getPublicInspireHomepageResolvedData()).resolves.toBeTruthy();
  });
});
