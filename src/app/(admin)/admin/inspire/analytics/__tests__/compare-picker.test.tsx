import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { Suspense, use, useEffect, useState } from 'react';

const search = vi.fn();
vi.mock('@/app/(admin)/admin/inspire/analytics/actions', () => ({
  searchArticlesForPickerAction: (q: string) => search(q),
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
// A navigation that never commits: like Next's router, `push` schedules an
// update inside the caller's transition that suspends (here, forever), so the
// transition stays pending and the server `selected` prop stays stale —
// exactly the window in which a second quick pick used to drop the first.
const push = vi.fn();
const never = new Promise<never>(() => {});
let startNavigationUpdate: () => void = () => {};
function PendingNavigation() {
  const [navigating, setNavigating] = useState(false);
  useEffect(() => {
    startNavigationUpdate = () => setNavigating(true);
  }, []);
  if (navigating) use(never);
  return null;
}
function renderPicker(ui: React.ReactElement) {
  return render(
    <>
      <Suspense fallback={null}>
        <PendingNavigation />
      </Suspense>
      {ui}
    </>,
  );
}
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import { ComparePicker } from '../compare-picker';

/** T4-F2: each pick builds on the live selection, not the stale server prop. */

const art = (n: number) => ({ id: `id-${n}`, title: `Garden venue guide ${n}`, status: 'draft' });

beforeEach(() => {
  vi.useFakeTimers();
  search.mockReset();
  push.mockReset();
  push.mockImplementation(() => startNavigationUpdate());
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('ComparePicker', () => {
  it('two quick picks while navigation is pending keep both articles in the URL', async () => {
    search.mockResolvedValue({ articles: [art(1), art(2), art(3)] });
    renderPicker(<ComparePicker selected={[art(3)]} />);
    fireEvent.change(screen.getByLabelText('Search articles by title'), {
      target: { value: 'garden' },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    fireEvent.click(screen.getByText('Garden venue guide 1'));
    fireEvent.click(screen.getByText('Garden venue guide 2'));
    expect(push).toHaveBeenCalledTimes(2);
    expect(push.mock.calls[0][0]).toContain(`ids=${['id-3', 'id-1'].join(',')}`);
    expect(push.mock.calls[1][0]).toContain(`ids=${['id-3', 'id-1', 'id-2'].join(',')}`);
    expect(screen.getByText('Updating the comparison…')).toBeTruthy();
  });

  it('shows a pick as a chip straight away, before the server prop catches up', async () => {
    search.mockResolvedValue({ articles: [art(1)] });
    renderPicker(<ComparePicker selected={[art(3)]} />);
    fireEvent.change(screen.getByLabelText('Search articles by title'), {
      target: { value: 'garden' },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    fireEvent.click(screen.getByText('Garden venue guide 1'));
    expect(screen.getByLabelText('Remove Garden venue guide 1')).toBeTruthy();
    expect(screen.getByLabelText('Remove Garden venue guide 3')).toBeTruthy();
  });

  it('shows the server selection again once nothing is pending', () => {
    renderPicker(<ComparePicker selected={[art(3)]} />);
    expect(screen.getByLabelText('Remove Garden venue guide 3')).toBeTruthy();
    expect(screen.queryByText('Updating the comparison…')).toBeNull();
  });

  it('a removal right after a pick keeps the pick', async () => {
    search.mockResolvedValue({ articles: [art(1)] });
    renderPicker(<ComparePicker selected={[art(3), art(4)]} />);
    fireEvent.change(screen.getByLabelText('Search articles by title'), {
      target: { value: 'garden' },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    fireEvent.click(screen.getByText('Garden venue guide 1'));
    fireEvent.click(screen.getByLabelText('Remove Garden venue guide 4'));
    expect(push.mock.calls[1][0]).toContain(`ids=${['id-3', 'id-1'].join(',')}`);
  });
});
