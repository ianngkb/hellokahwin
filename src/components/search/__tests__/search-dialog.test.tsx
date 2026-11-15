import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SearchResponse, SearchResultArticle } from '@/lib/search/contract';
import { POPULAR_SEARCHES } from '@/lib/search/contract';
import { SearchDialog, announcementFor } from '../search-dialog';
import { HINT_TEXT } from '../copy';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

function article(n: number, over: Partial<SearchResultArticle> = {}): SearchResultArticle {
  return {
    id: `id-${n}`,
    title: `Mas kahwin negeri ${n}`,
    slug: `mas-kahwin-${n}`,
    href: `/artikel/hantaran-mas-kahwin/mas-kahwin-${n}`,
    categorySlug: 'hantaran-mas-kahwin',
    categoryName: 'Hantaran & Mas Kahwin',
    excerpt: null,
    thumbnailUrl: n % 2 ? `https://cdn.example/${n}.jpg` : null,
    publishedAt: '2026-11-15T02:00:00Z',
    ...over,
  };
}

function ok(data: Partial<SearchResponse>): Response {
  const body: SearchResponse = {
    query: 'mas kahwin',
    articles: [],
    total: 0,
    mode: 'exact',
    suggestion: null,
    ...data,
  };
  return new Response(JSON.stringify({ data: body }), { status: 200 });
}

/** A test-only fake of GET /api/v1/search, answering per query. */
function fakeApi(
  handler: (q: string, signal?: AbortSignal | null) => Promise<Response> | Response,
) {
  const fn = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost');
    expect(url.pathname).toBe('/api/v1/search');
    return Promise.resolve(handler(url.searchParams.get('q') ?? '', init?.signal));
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => value });
}

function renderDialog(initialQuery = '') {
  const onOpenChange = vi.fn();
  render(<SearchDialog open onOpenChange={onOpenChange} initialQuery={initialQuery} />);
  const input = screen.getByRole('combobox', { name: 'Cari' });
  return { input, onOpenChange };
}

function type(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } });
}

beforeEach(() => {
  push.mockReset();
  setOnline(true);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('SearchDialog — before typing (E2) and one letter (Q1)', () => {
  it('shows the hint and the popular searches, labelled "Cari", focused on open', async () => {
    fakeApi(() => ok({}));
    const { input } = renderDialog();
    expect(screen.getByText(HINT_TEXT)).toBeInTheDocument();
    for (const term of POPULAR_SEARCHES) {
      expect(screen.getByRole('button', { name: term })).toBeInTheDocument();
    }
    await waitFor(() => expect(input).toHaveFocus());
    // Real form: Enter works without the script.
    const form = input.closest('form')!;
    expect(form.getAttribute('action')).toBe('/cari');
    expect(form.getAttribute('method')).toBe('get');
    expect(input.getAttribute('name')).toBe('q');
  });

  it('asks for one more letter and sends no request under two characters', async () => {
    const api = fakeApi(() => ok({}));
    const { input } = renderDialog();
    type(input, 'm');
    expect(screen.getByText(/satu huruf lagi/i)).toBeInTheDocument();
    expect(screen.queryByText(HINT_TEXT)).not.toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 300));
    expect(api).not.toHaveBeenCalled();
  });

  it('a popular chip runs that search straight away', async () => {
    const api = fakeApi((q) => ok({ query: q, articles: [article(1)], total: 1 }));
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'hantaran' }));
    await screen.findByRole('option');
    expect(api).toHaveBeenCalledTimes(1);
    expect(new URL(String(api.mock.calls[0][0]), 'http://x').searchParams.get('q')).toBe(
      'hantaran',
    );
  });
});

describe('SearchDialog — typing (Q2–Q4)', () => {
  it('debounces typing into one request and aborts a stale one', async () => {
    const signals: AbortSignal[] = [];
    const api = fakeApi((q, signal) => {
      if (signal) signals.push(signal);
      // The first request hangs until aborted; the second answers.
      return signals.length === 1
        ? new Promise<Response>(() => {})
        : ok({ query: q, articles: [article(1)], total: 1 });
    });
    const { input } = renderDialog();
    type(input, 'ma');
    type(input, 'mas');
    type(input, 'mas k');
    await waitFor(() => expect(api).toHaveBeenCalledTimes(1));
    expect(new URL(String(api.mock.calls[0][0]), 'http://x').searchParams.get('q')).toBe('mas k');
    expect(new URL(String(api.mock.calls[0][0]), 'http://x').searchParams.get('limit')).toBe('6');
    // Loading shows skeletons, not a word.
    expect(
      input.closest('[data-slot="search-dialog"]')!.querySelector('[aria-busy="true"]'),
    ).not.toBeNull();
    type(input, 'mas ka');
    await waitFor(() => expect(api).toHaveBeenCalledTimes(2));
    expect(signals[0].aborted).toBe(true);
    await screen.findByRole('option');
  });

  it('renders rows with category, title, Malay date, count, and the "see all" link', async () => {
    fakeApi((q) => ok({ query: q, articles: [1, 2, 3, 4, 5, 6].map((n) => article(n)), total: 9 }));
    const { input } = renderDialog();
    type(input, 'mas kahwin');
    const options = await screen.findAllByRole('option');
    expect(options).toHaveLength(6);
    expect(options[0]).toHaveAttribute('href', '/artikel/hantaran-mas-kahwin/mas-kahwin-1');
    expect(options[0]).toHaveTextContent('Hantaran & Mas Kahwin');
    expect(options[0]).toHaveTextContent('15 November 2026');
    expect(options[0].querySelector('img')).not.toBeNull();
    expect(options[1].querySelector('img')).toBeNull(); // neutral placeholder
    expect(screen.getByText('9 hasil')).toBeInTheDocument();
    const seeAll = screen.getByRole('link', { name: /Lihat semua 9 hasil/ });
    expect(seeAll).toHaveAttribute('href', '/cari?q=mas+kahwin');
    expect(screen.queryByText('Padanan hampir')).not.toBeInTheDocument();
    expect(input).toHaveAttribute('aria-expanded', 'true');
  });

  it('one result has no "see all" link (Q4)', async () => {
    fakeApi((q) => ok({ query: q, articles: [article(1)], total: 1 }));
    const { input } = renderDialog();
    type(input, 'mas kahwin terengganu');
    await screen.findByRole('option');
    expect(screen.getByText('1 hasil')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Lihat semua/ })).not.toBeInTheDocument();
  });

  it('labels approximate matches and offers the suggestion', async () => {
    const api = fakeApi((q) =>
      ok({
        query: q,
        articles: [article(1)],
        total: 1,
        mode: 'approximate',
        suggestion: 'hantaran',
      }),
    );
    const { input } = renderDialog();
    type(input, 'hantarn');
    await screen.findByRole('option');
    expect(screen.getByText('Padanan hampir')).toBeInTheDocument();
    expect(screen.getByText(/Mungkin maksud anda/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'hantaran' }));
    expect(input).toHaveValue('hantaran');
    await waitFor(() => expect(api).toHaveBeenCalledTimes(2));
  });
});

describe('SearchDialog — keyboard (§8)', () => {
  it('arrows move aria-activedescendant through one listbox; Enter opens the highlighted article', async () => {
    fakeApi((q) => ok({ query: q, articles: [article(1), article(2), article(3)], total: 3 }));
    const { input, onOpenChange } = renderDialog();
    type(input, 'mas kahwin');
    const options = await screen.findAllByRole('option');
    expect(screen.getAllByRole('listbox')).toHaveLength(1);
    expect(input).not.toHaveAttribute('aria-activedescendant');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveAttribute('aria-activedescendant', options[0].id);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'End' });
    expect(input).toHaveAttribute('aria-activedescendant', options[2].id);
    fireEvent.keyDown(input, { key: 'ArrowDown' }); // wraps
    expect(input).toHaveAttribute('aria-activedescendant', options[0].id);
    fireEvent.keyDown(input, { key: 'ArrowUp' }); // wraps back
    expect(input).toHaveAttribute('aria-activedescendant', options[2].id);

    fireEvent.submit(input.closest('form')!);
    expect(push).toHaveBeenCalledWith('/artikel/hantaran-mas-kahwin/mas-kahwin-3');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('Enter with nothing highlighted goes to the results page', async () => {
    fakeApi((q) => ok({ query: q, articles: [article(1)], total: 1 }));
    const { input } = renderDialog();
    type(input, 'doa pengantin');
    await screen.findByRole('option');
    fireEvent.submit(input.closest('form')!);
    expect(push).toHaveBeenCalledWith('/cari?q=doa+pengantin');
  });

  it('Enter on an empty field does nothing', () => {
    fakeApi(() => ok({}));
    const { input } = renderDialog();
    fireEvent.submit(input.closest('form')!);
    expect(push).not.toHaveBeenCalled();
  });
});

describe('SearchDialog — nothing found, failed, offline (Q5, F1, F2)', () => {
  it('no results names the query, offers the suggestion and the popular chips', async () => {
    fakeApi((q) => ok({ query: q, mode: 'none', suggestion: 'dewan kahwin' }));
    const { input } = renderDialog();
    type(input, 'dewan komuniti setiawangsa');
    expect(await screen.findByText(/Tiada artikel untuk/)).toHaveTextContent(
      'Tiada artikel untuk “dewan komuniti setiawangsa”.',
    );
    expect(screen.getByRole('button', { name: 'dewan kahwin' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'nikah' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Tiada hasil.');
  });

  it.each([
    ['a 500', () => new Response('{"error":"x"}', { status: 500 })],
    ['a network error', () => Promise.reject(new TypeError('Failed to fetch'))],
    ['an unexpected body', () => new Response('{"data":{"articles":[]}}', { status: 200 })],
  ])('%s says the search failed — never "Tiada" — and Cuba lagi retries', async (_n, fail) => {
    let calls = 0;
    const api = fakeApi((q) => {
      calls += 1;
      return calls === 1 ? fail() : ok({ query: q, articles: [article(1)], total: 1 });
    });
    const { input } = renderDialog();
    type(input, 'hantaran tunang');
    expect(await screen.findByText('Carian gagal.', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText('Semak sambungan anda dan cuba lagi.')).toBeInTheDocument();
    expect(screen.queryByText(/Tiada/)).not.toBeInTheDocument(); // panel AND live region
    expect(screen.getByRole('status')).toHaveTextContent('Carian gagal.');
    expect(input).toHaveValue('hantaran tunang'); // query is never cleared

    fireEvent.click(screen.getByRole('button', { name: 'Cuba lagi' }));
    await screen.findByRole('option');
    expect(api).toHaveBeenCalledTimes(2);
  });

  it('a request still pending after 8 seconds fails', async () => {
    vi.useFakeTimers();
    fakeApi(
      (_q, signal) =>
        new Promise<Response>((_resolve, reject) => {
          signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          );
        }),
    );
    const { input } = renderDialog();
    type(input, 'pelamin');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(screen.getByText('Mencari…')).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(screen.getByText('Carian gagal.', { selector: 'p' })).toBeInTheDocument();
  });

  it('offline says so without sending a request, and re-runs when the connection returns', async () => {
    setOnline(false);
    const api = fakeApi((q) => ok({ query: q, articles: [article(1)], total: 1 }));
    const { input } = renderDialog();
    expect(screen.getByText('Tiada sambungan internet.', { selector: 'p' })).toBeInTheDocument();
    type(input, 'nikah');
    await new Promise((r) => setTimeout(r, 300));
    expect(api).not.toHaveBeenCalled();

    setOnline(true);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    await screen.findByRole('option');
    expect(api).toHaveBeenCalled();
  });
});

describe('announcementFor', () => {
  const res = (n: number, total = n): SearchResponse => ({
    query: 'q',
    articles: Array.from({ length: n }, (_, i) => article(i)),
    total,
    mode: 'exact',
    suggestion: null,
  });
  it('is silent while typing and loading', () => {
    expect(announcementFor({ status: 'idle' }, true)).toBe('');
    expect(announcementFor({ status: 'short' }, true)).toBe('');
    expect(announcementFor({ status: 'loading', query: 'q', slow: false }, true)).toBe('');
  });
  it('speaks the settled outcome', () => {
    expect(announcementFor({ status: 'success', query: 'q', response: res(6, 9) }, true)).toBe(
      '9 hasil.',
    );
    expect(announcementFor({ status: 'success', query: 'q', response: res(1) }, true)).toBe(
      '1 hasil.',
    );
    expect(announcementFor({ status: 'success', query: 'q', response: res(0) }, true)).toBe(
      'Tiada hasil.',
    );
    expect(announcementFor({ status: 'error', query: 'q' }, true)).toBe('Carian gagal.');
    expect(announcementFor({ status: 'idle' }, false)).toBe('Tiada sambungan internet.');
  });
});
