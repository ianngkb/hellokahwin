import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({
  restore: vi.fn(),
  detail: vi.fn(),
  rename: vi.fn(),
}));

vi.mock('../version-actions', () => ({
  restoreVersionAction: (...a: unknown[]) => h.restore(...a),
  getVersionDetailAction: (...a: unknown[]) => h.detail(...a),
  renameVersionAction: (...a: unknown[]) => h.rename(...a),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { VersionsSheet } from '../versions-sheet';
import type { VersionListEntry } from '../version-actions';

const ARTICLE_ID = '11111111-1111-4111-8111-111111111111';

function entry(n: number, overrides: Partial<VersionListEntry> = {}): VersionListEntry {
  return {
    id: `v${n}`,
    versionNumber: n,
    actorType: 'human',
    label: null,
    note: null,
    createdByLabel: 'ed@hk.test',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    title: `Title ${n}`,
    ...overrides,
  };
}

function renderSheet(props: Partial<Parameters<typeof VersionsSheet>[0]> = {}) {
  const onRestored = vi.fn();
  render(
    <VersionsSheet
      articleId={ARTICLE_ID}
      open
      onOpenChange={() => {}}
      versions={[
        entry(3),
        entry(2, { label: 'Before refresh' }),
        entry(1, { actorType: 'import' }),
      ]}
      loading={false}
      error={null}
      onRefresh={() => {}}
      onRestored={onRestored}
      {...props}
    />,
  );
  return { onRestored };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('VersionsSheet', () => {
  it('lists versions newest first, marks the latest, and offers no restore for it', () => {
    renderSheet();
    const rows = screen.getAllByTestId('version-row');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('v3');
    expect(rows[0]).toHaveTextContent('Latest');
    expect(rows[0].querySelector('button')?.textContent).not.toBe('Restore');
    expect(screen.getAllByRole('button', { name: 'Restore' })).toHaveLength(2);
    expect(rows[1]).toHaveTextContent('Before refresh');
    expect(rows[2]).toHaveTextContent('Original');
  });

  it('restores only after confirmation, then hands the editor back to reload', async () => {
    h.restore.mockResolvedValue({ success: true, versionNumber: 2, skippedTagCount: 0 });
    const { onRestored } = renderSheet();

    fireEvent.click(screen.getAllByRole('button', { name: 'Restore' })[0]);
    expect(h.restore).not.toHaveBeenCalled();
    expect(screen.getByText('Restore v2?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Restore v2' }));
    await waitFor(() => expect(h.restore).toHaveBeenCalledWith(ARTICLE_ID, 'v2'));
    await waitFor(() => expect(onRestored).toHaveBeenCalled());
  });

  it('with unsaved edits, the restore stays disabled until the admin accepts losing them', async () => {
    h.restore.mockResolvedValue({ success: true, versionNumber: 2, skippedTagCount: 0 });
    renderSheet({ editorIsDirty: true });

    fireEvent.click(screen.getAllByRole('button', { name: 'Restore' })[0]);
    const confirm = screen.getByRole('button', { name: 'Restore v2' });
    expect(confirm).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox'));
    expect(confirm).not.toBeDisabled();
    fireEvent.click(confirm);
    await waitFor(() => expect(h.restore).toHaveBeenCalled());
  });

  it('a refused restore leaves the editor alone', async () => {
    h.restore.mockResolvedValue({
      error: 'Could not restore v2: Pinterest Board Name is required',
    });
    const { onRestored } = renderSheet();
    fireEvent.click(screen.getAllByRole('button', { name: 'Restore' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Restore v2' }));
    await waitFor(() => expect(h.restore).toHaveBeenCalled());
    expect(onRestored).not.toHaveBeenCalled();
  });

  it('opens preview & compare for a version', async () => {
    h.detail.mockResolvedValue({
      success: true,
      detail: {
        id: 'v2',
        versionNumber: 2,
        label: 'Before refresh',
        title: 'Title 2',
        excerpt: null,
        metaTitle: null,
        metaDescription: null,
        coverImageUrl: null,
        tagNames: [],
        blocks: ['Old words'],
        wordCount: 2,
        changes: [{ field: 'title', label: 'Title', version: 'Title 2', current: 'Title 3' }],
        onlyInVersion: ['Old words'],
        onlyInCurrent: ['New words'],
        currentWordCount: 2,
      },
    });
    renderSheet();
    fireEvent.click(screen.getAllByRole('button', { name: 'Preview & compare' })[1]);
    await waitFor(() => expect(screen.getByTestId('version-changes')).toBeInTheDocument());
    expect(h.detail).toHaveBeenCalledWith(ARTICLE_ID, 'v2');
    expect(screen.getByText('Text that restoring would bring back')).toBeInTheDocument();
    expect(screen.getByText('Text that restoring would remove')).toBeInTheDocument();
  });

  it('shows a load error with a retry', () => {
    const onRefresh = vi.fn();
    renderSheet({ versions: [], error: 'Could not load the version history.', onRefresh });
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRefresh).toHaveBeenCalled();
  });
});
