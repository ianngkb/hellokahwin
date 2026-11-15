import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';

const track = vi.fn();
vi.mock('@/lib/analytics/tracker', () => ({ track: (...a: unknown[]) => track(...a) }));

import { ArticleClickTracker } from '../article-click-tracker';

afterEach(() => {
  cleanup();
  track.mockReset();
});

function renderBody(html: string) {
  return render(
    <ArticleClickTracker articleId="art-1">
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </ArticleClickTracker>,
  );
}

describe('ArticleClickTracker', () => {
  it('records a click on a link inside the body (delegated, innerHTML links too)', () => {
    const { container } = renderBody(
      `<p>Baca <a href="${window.location.origin}/artikel/adat/merisik"><strong>ini</strong></a></p>`,
    );
    fireEvent.click(container.querySelector('strong')!);
    expect(track).toHaveBeenCalledWith('article_link_click', {
      href: '/artikel/adat/merisik',
      link_type: 'internal_article',
      article_id: 'art-1',
    });
  });

  it('ignores clicks that are not on a link, and mailto links', () => {
    const { container } = renderBody('<p id="p">text <a href="mailto:a@b.c">mail</a></p>');
    fireEvent.click(container.querySelector('#p')!);
    fireEvent.click(container.querySelector('a')!);
    expect(track).not.toHaveBeenCalled();
  });

  it('never blocks navigation, even when tracking throws', () => {
    track.mockImplementation(() => {
      throw new Error('quota');
    });
    const { container } = renderBody('<a href="https://example.com/x">out</a>');
    const evt = new MouseEvent('click', { bubbles: true, cancelable: true });
    container.querySelector('a')!.dispatchEvent(evt);
    expect(evt.defaultPrevented).toBe(false);
  });
});
