import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

/**
 * The article editor's **Series** panel, ported from TWN.
 *
 *   1. It tells the truth about readers. An article can sit in several clusters
 *      but shows AT MOST ONE series — the first reader-facing one it joined. A
 *      switched-on cluster that loses that race names the one that won. While
 *      the public box is not on the site, it says so instead of promising one.
 *   2. A failed read is not an empty list: "Couldn't load series — refresh to
 *      try again", and no picker that would write into a state it could not read.
 *   3. Adding and removing go straight through the cluster actions.
 */

const h = vi.hoisted(() => ({
  load: vi.fn(),
  addMember: vi.fn(),
  removeMember: vi.fn(),
  toast: { error: vi.fn(), success: vi.fn() },
}));

// The Radix Select measures itself with a ResizeObserver and scrolls the
// highlighted option into view; jsdom has neither.
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}

vi.mock('@/app/(admin)/admin/inspire/clusters/actions', () => ({
  getArticleSeriesPanelAction: (id: string) => h.load(id),
  addClusterMemberAction: (input: unknown) => h.addMember(input),
  removeClusterMemberAction: (input: unknown) => h.removeMember(input),
}));
vi.mock('sonner', () => ({ toast: h.toast }));

import { ArticleSeriesPanel, type SeriesPanelMembership } from '../article-series-panel';
import { SERIES_BOX_ON_SITE } from '@/lib/validations/article-cluster';

type SeriesPanelCluster = {
  id: string;
  name: string;
  seriesEnabled: boolean;
  memberCount: number;
};

const ARTICLE = '11111111-1111-4111-8111-111111111111';
const PELAMIN = '22222222-2222-4222-8222-222222222222';
const VENUES = '33333333-3333-4333-8333-333333333333';

function membership(over: Partial<SeriesPanelMembership> = {}): SeriesPanelMembership {
  return {
    clusterId: PELAMIN,
    name: 'Choosing a pelamin',
    seriesEnabled: true,
    isFirstEnabled: true,
    isShown: true,
    ...over,
  };
}

function cluster(over: Partial<SeriesPanelCluster> = {}): SeriesPanelCluster {
  return {
    id: PELAMIN,
    name: 'Choosing a pelamin',
    seriesEnabled: true,
    memberCount: 4,
    ...over,
  };
}

/** Render and wait for the one on-mount read to settle. */
async function mountPanel() {
  render(<ArticleSeriesPanel articleId={ARTICLE} />);
  await waitFor(() => expect(h.load).toHaveBeenCalled());
  await waitFor(() => expect(screen.queryByText('Loading series…')).not.toBeInTheDocument());
}

beforeEach(() => {
  vi.clearAllMocks();
  h.load.mockResolvedValue({ memberships: [], clusters: [] });
  h.addMember.mockResolvedValue({ success: true });
  h.removeMember.mockResolvedValue({ success: true });
});

afterEach(cleanup);

describe('while the series box is not on the public site', () => {
  it('is the current state of HelloKahwin', () => {
    expect(SERIES_BOX_ON_SITE).toBe(false);
  });

  it('says readers see nothing yet, and never claims a reader-facing box', async () => {
    h.load.mockResolvedValue({ memberships: [membership()], clusters: [cluster()] });
    await mountPanel();
    expect(screen.getByText(/not on the public site yet/)).toBeInTheDocument();
    expect(screen.queryByText('Shown to readers')).not.toBeInTheDocument();
    expect(screen.queryByText('Readers see this one here')).not.toBeInTheDocument();
    expect(screen.getByText('Series on')).toBeInTheDocument();
    expect(screen.getByText('This article shows this one')).toBeInTheDocument();
  });
});

describe('the membership list', () => {
  it('reads its data once, for this article, on mount', async () => {
    await mountPanel();
    expect(h.load).toHaveBeenCalledTimes(1);
    expect(h.load).toHaveBeenCalledWith(ARTICLE);
  });

  it('names each cluster and links to its editor', async () => {
    h.load.mockResolvedValue({ memberships: [membership()], clusters: [cluster()] });
    await mountPanel();
    const link = screen.getByRole('link', { name: 'Choosing a pelamin' });
    expect(link).toHaveAttribute('href', `/admin/inspire/clusters/${PELAMIN}`);
  });

  it('shows no series badge for a cluster that is switched off', async () => {
    h.load.mockResolvedValue({
      memberships: [membership({ seriesEnabled: false, isFirstEnabled: false, isShown: false })],
      clusters: [cluster({ seriesEnabled: false })],
    });
    await mountPanel();
    expect(screen.queryByText('Series on')).not.toBeInTheDocument();
    expect(screen.queryByText('This article shows this one')).not.toBeInTheDocument();
  });

  it('names the OTHER series when this article joined that one first', async () => {
    h.load.mockResolvedValue({
      memberships: [
        membership({
          clusterId: VENUES,
          name: 'Garden venues',
          isFirstEnabled: false,
          isShown: false,
        }),
        membership(),
      ],
      clusters: [cluster(), cluster({ id: VENUES, name: 'Garden venues' })],
    });
    await mountPanel();
    expect(
      screen.getByText('“Choosing a pelamin” is the series this article shows'),
    ).toBeInTheDocument();
  });

  it('says a switched-on series shows nothing yet when it has nothing to list', async () => {
    h.load.mockResolvedValue({
      memberships: [membership({ isShown: false })],
      clusters: [cluster({ memberCount: 1 })],
    });
    await mountPanel();
    expect(
      screen.getByText('No box shows here yet — this series needs another published article.'),
    ).toBeInTheDocument();
  });

  it('only the slot holder is told it needs another article; the other row names the holder', async () => {
    h.load.mockResolvedValue({
      memberships: [
        membership({ isShown: false }),
        membership({
          clusterId: VENUES,
          name: 'Garden venues',
          isFirstEnabled: false,
          isShown: false,
        }),
      ],
      clusters: [cluster({ memberCount: 1 }), cluster({ id: VENUES, name: 'Garden venues' })],
    });
    await mountPanel();
    expect(
      screen.getByText('“Choosing a pelamin” is the series this article shows'),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText('No box shows here yet — this series needs another published article.'),
    ).toHaveLength(1);
  });

  it('says so plainly when the article is in no cluster', async () => {
    await mountPanel();
    expect(screen.getByText(/not in any cluster yet/)).toBeInTheDocument();
  });
});

describe('adding and removing', () => {
  it('offers only the clusters this article is not already in', async () => {
    h.load.mockResolvedValue({
      memberships: [membership()],
      clusters: [cluster(), cluster({ id: VENUES, name: 'Garden venues', seriesEnabled: false })],
    });
    await mountPanel();
    fireEvent.click(screen.getByRole('combobox'));
    expect(await screen.findByText(/Garden venues/)).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Choosing a pelamin/ })).toBeNull();
  });

  it('saves the pick immediately through the cluster action, then re-reads', async () => {
    h.load.mockResolvedValue({
      memberships: [],
      clusters: [cluster({ id: VENUES, name: 'Garden venues' })],
    });
    await mountPanel();
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(await screen.findByText(/Garden venues/));
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() =>
      expect(h.addMember).toHaveBeenCalledWith({ clusterId: VENUES, articleId: ARTICLE }),
    );
    expect(h.toast.success).toHaveBeenCalledWith('Added to “Garden venues”');
    await waitFor(() => expect(h.load).toHaveBeenCalledTimes(2));
  });

  it('shows a refusal and does not re-read when the add is refused', async () => {
    h.load.mockResolvedValue({
      memberships: [],
      clusters: [cluster({ id: VENUES, name: 'Garden venues' })],
    });
    h.addMember.mockResolvedValue({ error: 'A cluster can hold up to 50 articles' });
    await mountPanel();
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(await screen.findByText(/Garden venues/));
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() =>
      expect(h.toast.error).toHaveBeenCalledWith('A cluster can hold up to 50 articles'),
    );
    expect(h.load).toHaveBeenCalledTimes(1);
  });

  it('removes through the cluster action, named so the button is unambiguous', async () => {
    h.load.mockResolvedValue({ memberships: [membership()], clusters: [cluster()] });
    await mountPanel();
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove this article from Choosing a pelamin' }),
    );
    await waitFor(() =>
      expect(h.removeMember).toHaveBeenCalledWith({ clusterId: PELAMIN, articleId: ARTICLE }),
    );
    expect(h.toast.success).toHaveBeenCalledWith('Removed from “Choosing a pelamin”');
  });

  it('says there is nothing to pick rather than showing an empty dropdown', async () => {
    h.load.mockResolvedValue({ memberships: [membership()], clusters: [cluster()] });
    await mountPanel();
    expect(screen.getByText('This article is already in every cluster.')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).toBeNull();
  });
});

describe('when the read fails', () => {
  it('says so in its own words and shows nothing else', async () => {
    h.load.mockResolvedValue({ error: "Couldn't load series" });
    await mountPanel();
    expect(screen.getByText("Couldn't load series — refresh to try again")).toBeInTheDocument();
    expect(screen.queryByText(/not in any cluster yet/)).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add' })).toBeNull();
  });

  it('treats a rejected call the same way, never as "no series"', async () => {
    h.load.mockRejectedValue(new Error('network'));
    await mountPanel();
    expect(screen.getByText("Couldn't load series — refresh to try again")).toBeInTheDocument();
  });
});
