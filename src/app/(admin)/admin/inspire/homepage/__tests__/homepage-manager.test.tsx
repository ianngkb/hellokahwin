import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import { DEFAULT_INSPIRE_HOMEPAGE_CONFIG } from '@/lib/inspire/homepage-curation';

const h = vi.hoisted(() => ({
  save: vi.fn(),
  reset: vi.fn(),
  search: vi.fn(),
  refresh: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: h.refresh }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => h.success(...args),
    error: (...args: unknown[]) => h.error(...args),
  },
}));

vi.mock('../actions', () => ({
  saveInspireHomepageAction: (...args: unknown[]) => h.save(...args),
  resetInspireHomepageAction: (...args: unknown[]) => h.reset(...args),
  searchInspireHomepageArticlesAction: (...args: unknown[]) => h.search(...args),
}));

import { InspireHomepageManager } from '../homepage-manager';

const FIRST = { id: 'article-1', title: 'First story', status: 'Published' as const };
const SECOND = { id: 'article-2', title: 'Second story', status: 'Published' as const };

function renderManager() {
  return render(
    <InspireHomepageManager
      initialConfig={{
        ...DEFAULT_INSPIRE_HOMEPAGE_CONFIG,
        featured: {
          source: 'latest',
          categoryId: null,
          pinnedArticleIds: [FIRST.id, SECOND.id],
        },
      }}
      categories={[]}
      initialPins={{ featured: [FIRST, SECOND], latest: [] }}
    />,
  );
}

describe('Inspire homepage manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.save.mockResolvedValue({ success: true });
    h.reset.mockResolvedValue({ success: true });
    h.search.mockResolvedValue({ articles: [] });
  });

  afterEach(cleanup);

  it('saves explicit up/down pin ordering', async () => {
    const view = renderManager();
    const ui = within(view.container);

    fireEvent.click(ui.getByRole('button', { name: 'Move Second story up' }));
    fireEvent.click(ui.getByRole('button', { name: 'Save Inspire homepage' }));

    await waitFor(() =>
      expect(h.save).toHaveBeenCalledWith(
        expect.objectContaining({
          featured: expect.objectContaining({ pinnedArticleIds: [SECOND.id, FIRST.id] }),
        }),
        'artikel',
      ),
    );
    expect(h.refresh).toHaveBeenCalled();
  });

  it('removes a pin before saving', async () => {
    const view = renderManager();
    const ui = within(view.container);

    fireEvent.click(ui.getByRole('button', { name: 'Remove First story' }));
    fireEvent.click(ui.getByRole('button', { name: 'Save Inspire homepage' }));

    await waitFor(() =>
      expect(h.save).toHaveBeenCalledWith(
        expect.objectContaining({
          featured: expect.objectContaining({ pinnedArticleIds: [SECOND.id] }),
        }),
        'artikel',
      ),
    );
  });

  it('drops an invisible stale pin from the next save', async () => {
    const view = render(
      <InspireHomepageManager
        initialConfig={{
          ...DEFAULT_INSPIRE_HOMEPAGE_CONFIG,
          featured: {
            source: 'latest',
            categoryId: null,
            pinnedArticleIds: [FIRST.id, 'stale-article'],
          },
        }}
        categories={[]}
        initialPins={{ featured: [FIRST], latest: [] }}
      />,
    );
    const ui = within(view.container);

    fireEvent.click(ui.getByRole('button', { name: 'Save Inspire homepage' }));

    await waitFor(() =>
      expect(h.save).toHaveBeenCalledWith(
        expect.objectContaining({
          featured: expect.objectContaining({ pinnedArticleIds: [FIRST.id] }),
        }),
        'artikel',
      ),
    );
  });

  it('resets both zones to automatic latest', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const view = renderManager();
    const ui = within(view.container);

    fireEvent.click(ui.getByRole('button', { name: 'Reset to automatic' }));

    await waitFor(() => expect(h.reset).toHaveBeenCalledOnce());
    expect(h.success).toHaveBeenCalledWith('Inspire homepage reset to automatic');
    expect(h.refresh).toHaveBeenCalled();
  });

  it('saves and resets the site homepage under its own surface, never /artikel', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const view = render(
      <InspireHomepageManager
        surface="home"
        pageLabel="Laman utama (/)"
        initialConfig={DEFAULT_INSPIRE_HOMEPAGE_CONFIG}
        categories={[]}
        initialPins={{ featured: [], latest: [] }}
      />,
    );
    const ui = within(view.container);

    fireEvent.click(ui.getByRole('button', { name: 'Save Laman utama (/)' }));
    await waitFor(() => expect(h.save).toHaveBeenCalledWith(expect.anything(), 'home'));
    await waitFor(() => expect(h.success).toHaveBeenCalledWith('Laman utama (/) updated'));
    await waitFor(() =>
      expect(ui.getByRole('button', { name: 'Reset to automatic' })).not.toBeDisabled(),
    );

    fireEvent.click(ui.getByRole('button', { name: 'Reset to automatic' }));
    await waitFor(() => expect(h.reset).toHaveBeenCalledWith('home'));
  });
});
