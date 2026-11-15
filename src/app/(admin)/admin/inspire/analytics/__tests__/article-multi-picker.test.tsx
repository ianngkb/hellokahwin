import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';

const search = vi.fn();
vi.mock('@/app/(admin)/admin/inspire/analytics/actions', () => ({
  searchArticlesForPickerAction: (q: string) => search(q),
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

import { ArticleMultiPicker, type PickerArticle } from '@/components/admin/article-multi-picker';
import { MAX_COMPARE_ARTICLES } from '@/lib/analytics/compare-limits';

/** The reusable picker (R11): search by title, chips, the cap at six. */

function art(n: number, status = 'published'): PickerArticle {
  return { id: `id-${n}`, title: `Garden venue guide ${n}`, status };
}

beforeEach(() => {
  vi.useFakeTimers();
  search.mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function typeAndSettle(text: string) {
  fireEvent.change(screen.getByLabelText('Search articles by title'), { target: { value: text } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });
}

describe('ArticleMultiPicker', () => {
  it('has a visible label and a human placeholder', () => {
    render(<ArticleMultiPicker value={[]} onChange={() => {}} max={6} />);
    const input = screen.getByLabelText('Search articles by title');
    expect(input.getAttribute('placeholder')).toBe('Search articles by title…');
  });

  it('does not search under 2 characters', async () => {
    render(<ArticleMultiPicker value={[]} onChange={() => {}} max={6} />);
    await typeAndSettle('g');
    expect(search).not.toHaveBeenCalled();
  });

  it('searches, shows status in plain words, and adds a pick', async () => {
    search.mockResolvedValue({ articles: [art(1), art(2, 'in_review')] });
    const onChange = vi.fn();
    render(<ArticleMultiPicker value={[]} onChange={onChange} max={6} />);
    await typeAndSettle('garden');
    expect(search).toHaveBeenCalledWith('garden');
    expect(screen.getByText('In review')).toBeTruthy();
    fireEvent.click(screen.getByText('Garden venue guide 1'));
    expect(onChange).toHaveBeenCalledWith([art(1)]);
  });

  it(`refuses a pick past the cap of ${MAX_COMPARE_ARTICLES} with the message`, async () => {
    expect(MAX_COMPARE_ARTICLES).toBe(6);
    const six = [1, 2, 3, 4, 5, 6].map((n) => art(n));
    search.mockResolvedValue({ articles: [art(7)] });
    const onChange = vi.fn();
    render(<ArticleMultiPicker value={six} onChange={onChange} max={MAX_COMPARE_ARTICLES} />);
    expect(screen.getByText('6 of 6 picked — remove one to add another.')).toBeTruthy();
    await typeAndSettle('garden');
    fireEvent.click(screen.getByText('Garden venue guide 7'));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('Compare up to 6 articles at a time');
  });

  it('removes a chip, and an already-picked result cannot be added twice', async () => {
    search.mockResolvedValue({ articles: [art(1)] });
    const onChange = vi.fn();
    render(<ArticleMultiPicker value={[art(1), art(2)]} onChange={onChange} max={6} />);
    fireEvent.click(screen.getByLabelText('Remove Garden venue guide 2'));
    expect(onChange).toHaveBeenLastCalledWith([art(1)]);
    onChange.mockClear();
    await typeAndSettle('garden');
    expect(screen.getByText('Picked')).toBeTruthy();
    fireEvent.click(screen.getAllByText('Garden venue guide 1').at(-1)!);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows disabledIds as "Already added" and refuses them', async () => {
    search.mockResolvedValue({ articles: [art(3)] });
    const onChange = vi.fn();
    render(<ArticleMultiPicker value={[]} onChange={onChange} max={6} disabledIds={['id-3']} />);
    await typeAndSettle('garden');
    expect(screen.getByText('Already added')).toBeTruthy();
    fireEvent.click(screen.getByText('Garden venue guide 3'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('T4-F7: one emoji is one character, so it does not trigger a search', async () => {
    render(<ArticleMultiPicker value={[]} onChange={() => {}} max={6} />);
    await typeAndSettle('💍');
    expect(search).not.toHaveBeenCalled();
    expect(screen.queryByText('Searching…')).toBeNull();
  });

  it('T4-F6: drops a response that lands after the box was cleared or the picker unmounted', async () => {
    const { toast } = await import('sonner');
    vi.mocked(toast.error).mockClear();
    let resolve!: (v: unknown) => void;
    let reject!: (e: unknown) => void;
    search.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    render(<ArticleMultiPicker value={[]} onChange={() => {}} max={6} />);
    await typeAndSettle('garden');
    expect(search).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByLabelText('Search articles by title'), { target: { value: '' } });
    await act(async () => {
      resolve({ articles: [art(1)] });
    });
    // Retyping the same term must not show the late answer as if it were fresh.
    search.mockImplementationOnce(() => new Promise((_r, j) => (reject = j)));
    fireEvent.change(screen.getByLabelText('Search articles by title'), {
      target: { value: 'garden' },
    });
    expect(screen.queryByText('Garden venue guide 1')).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(search).toHaveBeenCalledTimes(2);
    cleanup(); // unmount with the second request in flight
    await act(async () => {
      reject(new Error('network'));
    });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('T4-F2: two quick picks before the parent re-renders keep both', async () => {
    search.mockResolvedValue({ articles: [art(1), art(2)] });
    const onChange = vi.fn();
    // `value` stays [] — the URL-backed prop has not caught up yet.
    render(<ArticleMultiPicker value={[]} onChange={onChange} max={6} />);
    await typeAndSettle('garden');
    fireEvent.click(screen.getByText('Garden venue guide 1'));
    fireEvent.click(screen.getByText('Garden venue guide 2'));
    expect(onChange).toHaveBeenNthCalledWith(1, [art(1)]);
    expect(onChange).toHaveBeenNthCalledWith(2, [art(1), art(2)]);
  });

  // I-F15: a failed search is NOT "no articles match" — the admin would
  // conclude the article does not exist.
  it('I-F15: a search error shows a persistent failure message, never "No articles match"', async () => {
    search.mockResolvedValue({ error: 'Could not search articles — please try again.' });
    render(<ArticleMultiPicker value={[]} onChange={() => {}} max={MAX_COMPARE_ARTICLES} />);
    await typeAndSettle('garden');
    expect(screen.getByRole('alert').textContent).toBe(
      'Could not search articles — please try again.',
    );
    expect(screen.queryByText(/No articles match/)).toBeNull();
  });

  it('I-F15: an authorisation error and a thrown action both read as failures too', async () => {
    search.mockResolvedValueOnce({ error: 'Forbidden' });
    render(<ArticleMultiPicker value={[]} onChange={() => {}} max={MAX_COMPARE_ARTICLES} />);
    await typeAndSettle('garden');
    expect(screen.getByRole('alert').textContent).toBe('Couldn’t search articles: Forbidden');
    search.mockRejectedValueOnce(new Error('network'));
    await typeAndSettle('gardens');
    expect(screen.getByRole('alert').textContent).toMatch(/Could not search articles/);
    expect(screen.queryByText(/No articles match/)).toBeNull();
    // A later successful empty search is a real "no match" again.
    search.mockResolvedValueOnce({ articles: [] });
    await typeAndSettle('gardenz');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText(/No articles match/)).toBeTruthy();
  });

  // I-F14: the server searches at most 200 code points; the box must never
  // show more than it searched.
  it('I-F14: caps the box at 200 code points (emoji-safe), so the shown term is the searched term', async () => {
    search.mockResolvedValue({ articles: [] });
    render(<ArticleMultiPicker value={[]} onChange={() => {}} max={MAX_COMPARE_ARTICLES} />);
    const long = '💍'.repeat(150) + 'x'.repeat(100); // 250 code points
    await typeAndSettle(long);
    const box = screen.getByLabelText('Search articles by title') as HTMLInputElement;
    expect(Array.from(box.value)).toHaveLength(200);
    expect(box.value).toBe('💍'.repeat(150) + 'x'.repeat(50));
    expect(search).toHaveBeenLastCalledWith(box.value);
    expect(screen.getByText('Searches use up to 200 characters.')).toBeTruthy();
  });

  it('truncates long chip titles with the full title on hover', () => {
    const long = { id: 'x', title: 'A very long article title '.repeat(6).trim(), status: 'draft' };
    render(<ArticleMultiPicker value={[long]} onChange={() => {}} max={6} />);
    const chipText = screen.getByTitle(long.title);
    expect(chipText.className).toContain('truncate');
  });
});
