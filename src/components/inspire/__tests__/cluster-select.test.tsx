import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ClusterSelect } from '../cluster-select';

const CATS = [
  { id: 'p1', name: 'Mas kahwin', parentId: null, isPillar: true, pillarCode: 'P1' },
  { id: 'c11', name: 'Ikut negeri', parentId: 'p1', pillarCode: 'C1.1' },
  { id: 'c12', name: 'Kadar semasa', parentId: 'p1', pillarCode: 'C1.2' },
  { id: 'legacy', name: 'Lama', parentId: null },
];

afterEach(cleanup);

describe('ClusterSelect', () => {
  it('shows "Not in a cluster" when the article has none', () => {
    render(<ClusterSelect categories={CATS} value="" onValueChange={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: 'Cluster' })).toHaveTextContent('Not in a cluster');
    expect(screen.queryByTestId('cluster-pillar')).toBeNull();
  });

  it('shows the chosen cluster and the pillar it sits under', () => {
    render(<ClusterSelect categories={CATS} value="c12" onValueChange={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: 'Cluster' })).toHaveTextContent('Kadar semasa');
    expect(screen.getByTestId('cluster-pillar')).toHaveTextContent('Under pillar: Mas kahwin');
  });

  it('can be locked', () => {
    render(<ClusterSelect categories={CATS} value="c11" onValueChange={vi.fn()} disabled />);
    expect(screen.getByRole('combobox', { name: 'Cluster' })).toBeDisabled();
  });
});
