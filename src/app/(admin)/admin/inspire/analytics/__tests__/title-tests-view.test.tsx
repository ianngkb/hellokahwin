import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { sideStats } from '@/lib/analytics/title-test-math';

const loadTitleTests = vi.fn();
const loadTitleTestCandidate = vi.fn();
vi.mock('../title-tests-data', () => ({
  loadTitleTests: () => loadTitleTests(),
  loadTitleTestCandidate: (id: string) => loadTitleTestCandidate(id),
}));
vi.mock('../title-test-controls', () => ({
  StartTitleTestForm: ({ articleId }: { articleId: string }) => (
    <div data-testid="start-form">{articleId}</div>
  ),
  EndTitleTestButton: () => <button type="button">End test</button>,
}));

import { TitleTestsView } from '../title-tests-view';

const ID = 'c123dbd2-c7a9-4f0f-81b1-eac68bf67058';
const side = (impressions: number, clicks: number) =>
  sideStats({ impressions, clicks, positionSum: impressions * 6 });

const test = (over: Record<string, unknown> = {}) => ({
  id: 't1',
  articleId: ID,
  articleTitle: 'Marriage registration',
  oldTitle: 'Old one',
  newTitle: 'New one',
  startedAt: new Date('2026-11-12T18:14:15Z'),
  endedAt: null,
  windows: {
    changeDay: '2026-11-12',
    days: 3,
    after: { from: '2026-11-13', to: '2026-11-15' },
    before: { from: '2026-11-09', to: '2026-11-11' },
  },
  google: {
    before: side(400, 6),
    after: side(410, 9),
    verdict: { kind: 'waiting', reason: 'Only 3 full days of Google data since the change.' },
  },
  ...over,
});

beforeEach(() => {
  loadTitleTests.mockReset();
  loadTitleTestCandidate.mockReset();
});
afterEach(cleanup);

describe('TitleTestsView', () => {
  it('shows a running test with its verdict, numbers and End test', async () => {
    loadTitleTests.mockResolvedValue({ tests: [test()], dailyThrough: '2026-11-15' });
    render(await TitleTestsView({}));
    expect(screen.getByText('Old one')).toBeTruthy();
    expect(screen.getByText('New one')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('Not enough data yet');
    expect(screen.getByText('Seen on Google')).toBeTruthy();
    expect(screen.getByText('410')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'End test' })).toBeTruthy();
    expect(screen.queryByTestId('start-form')).toBeNull();
  });

  it('says a failed Google read failed, never zero', async () => {
    loadTitleTests.mockResolvedValue({ tests: [test({ google: null })], dailyThrough: null });
    render(await TitleTestsView({}));
    expect(screen.getByText("This panel couldn't load")).toBeTruthy();
  });

  it('has an empty state and a failed state for the list', async () => {
    loadTitleTests.mockResolvedValue({ tests: [], dailyThrough: null });
    render(await TitleTestsView({}));
    expect(screen.getByText('No title tests yet')).toBeTruthy();
    cleanup();
    loadTitleTests.mockResolvedValue({ tests: null, dailyThrough: null });
    render(await TitleTestsView({}));
    expect(screen.getByText("This panel couldn't load")).toBeTruthy();
  });

  it('shows the start form for a published article with no running test', async () => {
    loadTitleTests.mockResolvedValue({ tests: [], dailyThrough: null });
    loadTitleTestCandidate.mockResolvedValue({
      id: ID,
      title: 'Marriage registration',
      status: 'published',
      googleTitle: 'Old one',
      runningTestId: null,
    });
    render(await TitleTestsView({ start: ID }));
    expect(screen.getByTestId('start-form').textContent).toBe(ID);
  });

  it('refuses to start a second test on the same article', async () => {
    loadTitleTests.mockResolvedValue({ tests: [], dailyThrough: null });
    loadTitleTestCandidate.mockResolvedValue({
      id: ID,
      title: 'Marriage registration',
      status: 'published',
      googleTitle: 'Old one',
      runningTestId: 't1',
    });
    render(await TitleTestsView({ start: ID }));
    expect(screen.queryByTestId('start-form')).toBeNull();
    expect(screen.getByText(/already has a test running/)).toBeTruthy();
  });
});
