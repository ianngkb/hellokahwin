import { describe, it, expect } from 'vitest';
import { classifyTrend } from '@/lib/analytics/article-trend';

describe('classifyTrend', () => {
  it('reports growth as an up delta with a rounded percentage', () => {
    expect(classifyTrend(150, 100)).toEqual({ kind: 'delta', pct: 50, direction: 'up' });
  });

  it('reports decline as a down delta with an absolute percentage', () => {
    expect(classifyTrend(75, 100)).toEqual({ kind: 'delta', pct: 25, direction: 'down' });
  });

  it('reports an unchanged count as a flat 0% delta', () => {
    expect(classifyTrend(100, 100)).toEqual({ kind: 'delta', pct: 0, direction: 'flat' });
  });

  it('labels a brand-new article (no prior window) as "new", never +∞', () => {
    // A just-published article: views this week, nothing last week. Must not
    // divide by zero or render a misleading red/∞ figure.
    expect(classifyTrend(42, 0)).toEqual({ kind: 'new' });
  });

  it('returns "none" when both windows are empty (renders an em-dash)', () => {
    expect(classifyTrend(0, 0)).toEqual({ kind: 'none' });
  });

  it('treats a drop to zero from a real prior as a -100% down delta', () => {
    expect(classifyTrend(0, 200)).toEqual({ kind: 'delta', pct: 100, direction: 'down' });
  });

  it('rounds the percentage to the nearest whole number', () => {
    // (133 - 100) / 100 = 33%. (134-100)/99 etc rounding sanity.
    expect(classifyTrend(133, 100)).toEqual({ kind: 'delta', pct: 33, direction: 'up' });
    expect(classifyTrend(1, 3)).toEqual({ kind: 'delta', pct: 67, direction: 'down' });
  });
});
