import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';

/**
 * The cluster editor (R15): member links, accessible names, the "room left"
 * hint, the over-cap copy and the ONE-call batch add that keeps whatever
 * could not be added staged for a retry.
 */

const h = vi.hoisted(() => ({
  search: vi.fn(),
  addMany: vi.fn(),
  saveSeries: vi.fn(),
  toast: { error: vi.fn(), success: vi.fn() },
}));

// The Series box panel's on/off control is the Radix Checkbox, which measures
// itself with a ResizeObserver; jsdom has none. Same shim as the sibling
// analytics dashboard tests.
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

vi.mock('@/app/(admin)/admin/inspire/clusters/actions', () => ({
  searchClusterArticlesAction: (q: string) => h.search(q),
  addClusterMembersAction: (input: unknown) => h.addMany(input),
  deleteClusterAction: vi.fn(),
  removeClusterMemberAction: vi.fn(),
  renameClusterAction: vi.fn(),
  reorderClusterMembersAction: vi.fn(),
  updateClusterSeriesAction: (input: unknown) => h.saveSeries(input),
}));
vi.mock('sonner', () => ({ toast: h.toast }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

import {
  ClusterEditor,
  type EditorCluster,
} from '@/app/(admin)/admin/inspire/clusters/[cluster-id]/cluster-editor';
import { MAX_CLUSTER_MEMBERS } from '@/lib/validations/article-cluster';

const CLUSTER = '11111111-1111-4111-8111-111111111111';

function cluster(
  members: EditorCluster['members'],
  series: Partial<Pick<EditorCluster, 'description' | 'eyebrow' | 'slug' | 'seriesEnabled'>> = {},
): EditorCluster {
  return {
    id: CLUSTER,
    name: 'Budget',
    description: null,
    eyebrow: null,
    slug: null,
    seriesEnabled: false,
    ...series,
    members,
  };
}
const member = (n: number, title = `Member ${n}`) => ({
  articleId: `m-${n}`,
  title,
  status: 'published',
  showsThisSeries: false,
  otherSeries: null,
});
const pick = (n: number) => ({ id: `p-${n}`, title: `Garden guide ${n}`, status: 'published' });

beforeEach(() => {
  vi.useFakeTimers();
  h.search.mockReset();
  h.addMany.mockReset();
  h.saveSeries.mockReset();
  h.toast.error.mockReset();
  h.toast.success.mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/** Searches (results: picks 1–3 plus any asked for), then clicks the given picks. */
async function stage(...ns: number[]) {
  const shown = [...new Set([1, 2, 3, ...ns])];
  h.search.mockResolvedValue({ articles: shown.map(pick) });
  fireEvent.change(screen.getByLabelText('Search articles by title'), {
    target: { value: 'garden' },
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });
  for (const n of ns) fireEvent.click(screen.getByText(`Garden guide ${n}`));
}

async function clickAdd() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /to cluster$/ }));
    await vi.runAllTimersAsync();
  });
}

describe('ClusterEditor', () => {
  it('links each member title to the article editor, not a missing page', () => {
    render(<ClusterEditor cluster={cluster([member(1)])} />);
    expect(screen.getByRole('link', { name: 'Member 1' }).getAttribute('href')).toBe(
      '/admin/inspire/m-1/edit',
    );
  });

  it('an untitled member is "Untitled article" in its text AND its controls', () => {
    render(<ClusterEditor cluster={cluster([member(1, ''), member(2, '  ')])} />);
    expect(screen.getAllByText('Untitled article')).toHaveLength(2);
    expect(screen.getAllByLabelText('Move “Untitled article” down')).toHaveLength(2);
    expect(screen.getAllByLabelText('Remove “Untitled article” from this cluster')).toHaveLength(2);
    expect(screen.queryByLabelText('Move “” up')).toBeNull();
  });

  it('the room hint counts down as articles are staged', async () => {
    const members = Array.from({ length: MAX_CLUSTER_MEMBERS - 2 }, (_, i) => member(i));
    render(<ClusterEditor cluster={cluster(members)} />);
    expect(screen.getByText('There is room for 2 more articles in this cluster.')).toBeTruthy();
    await stage(); // search shows picks 1 and 2, nothing staged yet
    fireEvent.click(screen.getByText('Garden guide 1'));
    expect(screen.getByText('There is room for 1 more article after these.')).toBeTruthy();
    fireEvent.click(screen.getByText('Garden guide 2'));
    expect(screen.getByText('Adding these fills the cluster.')).toBeTruthy();
  });

  it('a pick past the room left uses the cluster wording, not the comparison page copy', async () => {
    const members = Array.from({ length: MAX_CLUSTER_MEMBERS - 1 }, (_, i) => member(i));
    render(<ClusterEditor cluster={cluster(members)} />);
    await stage(1, 2);
    const alert = screen.getByRole('alert').textContent ?? '';
    expect(alert).toContain('This cluster only has room for 1 more article');
    expect(alert).not.toContain('Compare up to');
  });

  it('adds every staged pick in ONE call, in the order picked', async () => {
    h.addMany.mockResolvedValue({ success: true, added: ['p-2', 'p-1'], failed: [] });
    render(<ClusterEditor cluster={cluster([member(1)])} />);
    await stage(2, 1);
    await clickAdd();
    expect(h.addMany).toHaveBeenCalledTimes(1);
    expect(h.addMany).toHaveBeenCalledWith({ clusterId: CLUSTER, articleIds: ['p-2', 'p-1'] });
    expect(h.toast.success).toHaveBeenCalledWith('Added 2 articles');
    expect(screen.queryByLabelText('Picked articles')).toBeNull();
  });

  it('partial failure keeps the failed pick staged (and drops the one already in)', async () => {
    h.addMany.mockResolvedValue({
      success: true,
      added: ['p-1'],
      failed: [
        { articleId: 'p-2', error: 'A cluster can hold up to 50 articles' },
        { articleId: 'p-3', error: 'Already in this cluster' },
      ],
    });
    render(<ClusterEditor cluster={cluster([member(1)])} />);
    await stage(1, 2, 3);
    await clickAdd();
    const chips = screen.getByLabelText('Picked articles').textContent ?? '';
    expect(chips).toContain('Garden guide 2');
    expect(chips).not.toContain('Garden guide 1');
    expect(chips).not.toContain('Garden guide 3');
    expect(h.toast.error).toHaveBeenCalledWith(
      '“Garden guide 2”: A cluster can hold up to 50 articles',
    );
  });

  it('a cluster-wide refusal is one error and keeps every pick staged', async () => {
    h.addMany.mockResolvedValue({ error: 'Unauthorized' });
    render(<ClusterEditor cluster={cluster([])} />);
    await stage(1, 2);
    await clickAdd();
    expect(h.addMany).toHaveBeenCalledTimes(1);
    expect(h.toast.error).toHaveBeenCalledTimes(1);
    expect(h.toast.error).toHaveBeenCalledWith('Unauthorized');
    const chips = screen.getByLabelText('Picked articles').textContent ?? '';
    expect(chips).toContain('Garden guide 1');
    expect(chips).toContain('Garden guide 2');
  });

  it('a staged pick that becomes a member after the refresh drops out of the staging list', async () => {
    const { rerender } = render(<ClusterEditor cluster={cluster([member(1)])} />);
    await stage(1, 2);
    rerender(
      <ClusterEditor
        cluster={cluster([
          member(1),
          {
            articleId: 'p-1',
            title: 'Garden guide 1',
            status: 'published',
            showsThisSeries: false,
            otherSeries: null,
          },
        ])}
      />,
    );
    const chips = screen.getByLabelText('Picked articles').textContent ?? '';
    expect(chips).toContain('Garden guide 2');
    expect(chips).not.toContain('Garden guide 1');
  });
});

describe('Series box settings', () => {
  it('says the box is not on the public site yet, whatever the switch says', () => {
    const { unmount } = render(<ClusterEditor cluster={cluster([member(1)])} />);
    expect(screen.getByText(/The series box is not on the public site yet/)).toBeTruthy();
    unmount();
    render(
      <ClusterEditor
        cluster={cluster([member(1)], { description: 'Intro', seriesEnabled: true })}
      />,
    );
    expect(
      screen.getByText(/Saved as on\. The series box is not on the public site yet/),
    ).toBeTruthy();
    expect(screen.queryByText(/Readers see this box on/)).toBeNull();
  });

  it('saves the four fields in one call', async () => {
    h.saveSeries.mockResolvedValue({ success: true });
    render(<ClusterEditor cluster={cluster([member(1)])} />);
    fireEvent.change(screen.getByLabelText('Intro text'), {
      target: { value: 'Everything about pelamin.' },
    });
    fireEvent.change(screen.getByLabelText('Web address name'), {
      target: { value: 'idea-pelamin' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save series box' }));
      await vi.runAllTimersAsync();
    });
    expect(h.saveSeries).toHaveBeenCalledWith({
      id: CLUSTER,
      description: 'Everything about pelamin.',
      eyebrow: '',
      slug: 'idea-pelamin',
      seriesEnabled: false,
    });
  });

  it('puts a refusal about the intro on the intro field', async () => {
    h.saveSeries.mockResolvedValue({
      error: 'Add the intro text readers will see before switching the series box on',
    });
    render(<ClusterEditor cluster={cluster([member(1)])} />);
    fireEvent.click(screen.getByRole('checkbox'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save series box' }));
      await vi.runAllTimersAsync();
    });
    expect(
      screen.getByText('Add the intro text readers will see before switching the series box on'),
    ).toBeTruthy();
  });
});
