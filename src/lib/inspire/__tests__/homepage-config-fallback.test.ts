import { describe, expect, it, vi } from 'vitest';

/**
 * Vercel preview builds connect as `hk_preview_ro`, which cannot read
 * `admin_settings`; prerendering /artikel then died with "permission denied".
 * The public read must fall back to the automatic layout instead.
 */
let settingsRead: () => Promise<unknown[]> = () => Promise.resolve([]);

vi.mock('@/lib/db/drizzle', () => ({
  db: {
    select: () => ({
      from: () => ({ where: () => ({ limit: () => settingsRead() }) }),
    }),
  },
}));

const { getInspireHomepageConfig, getInspireHomepageConfigOrDefault } =
  await import('../homepage-queries');
const { DEFAULT_INSPIRE_HOMEPAGE_CONFIG } = await import('../homepage-curation');

describe('the public homepage curation read', () => {
  it('falls back to the automatic layout when admin_settings is unreadable', async () => {
    settingsRead = () => Promise.reject(new Error('permission denied for table admin_settings'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(getInspireHomepageConfigOrDefault()).resolves.toEqual({
      config: DEFAULT_INSPIRE_HOMEPAGE_CONFIG,
      invalid: false,
    });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('still surfaces the failure to the strict (admin) read', async () => {
    settingsRead = () => Promise.reject(new Error('permission denied for table admin_settings'));
    await expect(getInspireHomepageConfig()).rejects.toThrow('permission denied');
  });

  it('returns the default config when nothing has been saved', async () => {
    settingsRead = () => Promise.resolve([]);
    await expect(getInspireHomepageConfigOrDefault()).resolves.toEqual({
      config: DEFAULT_INSPIRE_HOMEPAGE_CONFIG,
      invalid: false,
    });
  });
});
