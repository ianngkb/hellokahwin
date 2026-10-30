import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { ChangeBadge } from '../change-badge';
import { DateRangePicker, spanDays } from '../date-range-picker';
import { PageSearch } from '../page-search';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/admin/site-analytics',
  useSearchParams: () => new URLSearchParams(),
}));

// Each call returns a promise the test resolves by hand, so ordering is explicit.
const pendingSearches = vi.hoisted(
  () => [] as Array<{ query: string; resolve: (v: unknown) => void }>,
);
vi.mock('@/app/(admin)/admin/site-analytics/actions', () => ({
  searchPagesAction: vi.fn(
    (query: string) => new Promise((resolve) => pendingSearches.push({ query, resolve })),
  ),
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('ChangeBadge (F38)', () => {
  it('shows a neutral 0% with no arrow when the change rounds to 0', () => {
    const { container } = render(
      <ChangeBadge current={1003} previous={1000} higherIsBetter={true} />,
    );
    expect(container.textContent).toBe('0%');
    expect(container.querySelector('svg')).toBeNull();
  });

  it('shows an arrow for a change that rounds to 1% or more', () => {
    const { container } = render(<ChangeBadge current={1010} previous={1000} higherIsBetter />);
    expect(container.textContent).toBe('1%');
    expect(container.querySelector('svg')).not.toBeNull();
  });
});

describe('DateRangePicker (F45)', () => {
  it('counts an inclusive span', () => {
    expect(spanDays('2026-10-01', '2026-10-01')).toBe(1);
    expect(spanDays('2025-10-30', '2026-10-30')).toBe(366);
  });

  it('refuses a custom range over 366 days with an inline hint', () => {
    render(<DateRangePicker from="2026-10-01" to="2026-10-30" today="2026-10-30" />);
    fireEvent.click(screen.getByRole('button', { name: /2026|days|month|today/i }));

    const [fromInput, toInput] = screen.getAllByDisplayValue(/2026-10-/);
    const apply = screen.getByRole('button', { name: 'Apply' });

    fireEvent.change(fromInput, { target: { value: '2025-10-30' } });
    fireEvent.change(toInput, { target: { value: '2026-10-30' } });
    expect(apply).toBeEnabled();
    expect(screen.queryByText(/Max 366 days/)).toBeNull();

    fireEvent.change(fromInput, { target: { value: '2025-10-29' } });
    expect(apply).toBeDisabled();
    expect(screen.getByText('Max 366 days')).toBeInTheDocument();
  });
});

describe('PageSearch (F43, F44)', () => {
  beforeEach(() => {
    pendingSearches.length = 0;
    vi.useFakeTimers();
  });

  const props = { from: '2026-10-01', to: '2026-10-30', traffic: 'human' };

  async function typeAndSettle(value: string) {
    fireEvent.change(screen.getByPlaceholderText('Search pages...'), { target: { value } });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
  }

  async function answer(i: number, pathnames: string[]) {
    await act(async () => {
      pendingSearches[i].resolve(pathnames.map((pathname) => ({ pathname, title: null })));
    });
  }

  it('clears results as soon as the query text changes', async () => {
    render(<PageSearch {...props} />);
    await typeAndSettle('art');
    await answer(0, ['/artikel']);
    expect(screen.getByText('/artikel')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search pages...'), {
      target: { value: 'artx' },
    });
    expect(screen.queryByText('/artikel')).toBeNull();
  });

  it('drops a late response from a search the user has since cleared', async () => {
    render(<PageSearch {...props} />);
    await typeAndSettle('art');
    // Clear the box while the 'art' search is still in flight…
    await typeAndSettle('');
    // …then type again, so the dropdown is open when the stale answer lands.
    fireEvent.change(screen.getByPlaceholderText('Search pages...'), {
      target: { value: 'b' },
    });
    await answer(0, ['/stale']);
    expect(screen.queryByText('/stale')).toBeNull();
  });

  it('clears results when the range or traffic changes', async () => {
    const { rerender } = render(<PageSearch {...props} />);
    await typeAndSettle('art');
    await answer(0, ['/artikel']);
    expect(screen.getByText('/artikel')).toBeInTheDocument();

    rerender(<PageSearch {...props} traffic="bot" />);
    expect(screen.queryByText('/artikel')).toBeNull();
  });
});
