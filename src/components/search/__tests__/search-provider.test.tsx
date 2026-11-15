import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchProvider, isEditableTarget } from '../search-provider';
import { SearchTrigger } from '../search-trigger';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

function renderPage() {
  return render(
    <SearchProvider>
      <SearchTrigger variant="navbar" header />
      <input aria-label="Lain" />
      <div contentEditable data-testid="editor" />
    </SearchProvider>,
  );
}

const dialog = () => screen.queryByRole('dialog');

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('SearchProvider — ways in', () => {
  it('the trigger is a /cari link that opens the screen instead once hydrated', async () => {
    renderPage();
    const trigger = screen.getByRole('button', { name: 'Cari artikel' });
    expect(trigger).toHaveAttribute('href', '/cari');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Cari' })).toHaveFocus());
  });

  it('opens on "/" and on Ctrl+K / ⌘K from the page', async () => {
    renderPage();
    fireEvent.keyDown(document.body, { key: '/' });
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });
    await waitFor(() => expect(dialog()).toBeNull());

    fireEvent.keyDown(document.body, { key: 'k', ctrlKey: true });
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });
    await waitFor(() => expect(dialog()).toBeNull());

    fireEvent.keyDown(document.body, { key: 'K', metaKey: true });
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('does not steal "/" or Ctrl+K while the reader types in another field', () => {
    renderPage();
    const other = screen.getByRole('textbox', { name: 'Lain' });
    fireEvent.keyDown(other, { key: '/' });
    fireEvent.keyDown(other, { key: 'k', ctrlKey: true });
    fireEvent.keyDown(screen.getByTestId('editor'), { key: '/' });
    expect(dialog()).toBeNull();
  });

  it('Esc closes and gives focus back to the trigger', async () => {
    renderPage();
    const trigger = screen.getByRole('button', { name: 'Cari artikel' });
    trigger.focus();
    fireEvent.click(trigger);
    const input = await screen.findByRole('combobox', { name: 'Cari' });
    await waitFor(() => expect(input).toHaveFocus());
    fireEvent.keyDown(input, { key: 'Escape' });
    await waitFor(() => expect(dialog()).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('without a provider the trigger stays a plain link to /cari', () => {
    render(<SearchTrigger variant="topbar" />);
    const link = screen.getByRole('button', { name: 'Cari artikel' });
    expect(link).toHaveAttribute('href', '/cari');
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});

describe('isEditableTarget', () => {
  it('treats inputs, textareas, selects and contenteditable as typing', () => {
    expect(isEditableTarget(document.createElement('input'))).toBe(true);
    expect(isEditableTarget(document.createElement('textarea'))).toBe(true);
    expect(isEditableTarget(document.createElement('select'))).toBe(true);
    expect(isEditableTarget(document.createElement('button'))).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});
