/**
 * DES-15 — `CascadeProbe` must not re-subscribe on a claim that did not change.
 *
 * ⚠ READ THIS BEFORE TRUSTING THE FIRST TEST. Review flagged the effect's
 * original `[claim]` dependency as an unconditional render -> effect -> setState
 * -> render loop, because every caller passes an inline object literal. That
 * diagnosis was confident, specific and WRONG, and it died the moment it was
 * run: `setRows` re-renders `CascadeProbe`, not its parent, so the `claim` prop
 * keeps its identity across those renders and the effect never re-fires. With
 * `[claim]` restored the suite passed 3/3. "I understand the cause" is not a
 * test.
 *
 * What IS true is narrower: when a PARENT re-renders, an object-literal
 * dependency makes the effect tear down and re-subscribe a ResizeObserver for a
 * claim that has not changed. That is what the first test below measures, and
 * it is written so it can go red — verified by putting `[claim]` back and
 * watching it fail, then restoring `[claimKey]` and watching it pass. A test
 * that has only ever been seen green proves nothing about what it can catch.
 */
import { describe, expect, it, vi, beforeAll } from 'vitest';
import { render } from '@testing-library/react';
import { CascadeProbe } from '../cascade-probe';

beforeAll(() => {
  // jsdom ships neither of these; the component guards `document.fonts` with
  // `?.` but observes unconditionally.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

describe('CascadeProbe (DES-15)', () => {
  it('does not re-subscribe when a parent re-renders with an unchanged claim', () => {
    let subscriptions = 0;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor() {
          subscriptions++;
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    // A NEW object every render — exactly how the reference page calls it.
    const tree = () => (
      <CascadeProbe label=".s-h2 test" claim={{ 'font-weight': '600' }}>
        <h2 className="s-h2">Nisbah dulang</h2>
      </CascadeProbe>
    );
    const { rerender } = render(tree());
    const afterFirst = subscriptions;
    rerender(tree());
    rerender(tree());
    // Two further parent renders, same claim: with `[claimKey]` the effect is
    // never torn down, so the count does not move. With `[claim]` it climbs by
    // one per parent render and this assertion fails.
    expect(afterFirst).toBe(1);
    expect(subscriptions).toBe(1);
  });

  it('reports a lost declaration rather than the claimed one', () => {
    // No stylesheet is loaded here, so nothing can satisfy a claim of 600 and
    // the probe must say so. jsdom answers `getComputedStyle(h2).fontWeight`
    // with the KEYWORD `bold`, not `700` — asserted as measured rather than as
    // assumed, because the first version of this test asserted `400` and the
    // number that came back was neither.
    // Scoped to THIS render's container — `screen` searches the whole document,
    // and without auto-cleanup that is every earlier test's DOM as well.
    const { container } = render(
      <CascadeProbe label=".s-h2 test" claim={{ 'font-weight': '600' }}>
        <h2 className="s-h2">Nisbah dulang</h2>
      </CascadeProbe>,
    );
    expect(container.textContent).toMatch(/declaration\(s\) LOST/);
    expect(container.textContent).toMatch(/claims 600/);
    // The one thing a probe must never do is echo its own claim back as the
    // reading — that is the hand-typed table this component exists to replace.
    expect(container.textContent).not.toMatch(/reader gets 600/);
  });

  it('resolves an em claim against the element own font-size', () => {
    const { container } = render(
      <CascadeProbe label=".s-h2 test" claim={{ 'letter-spacing': '-0.01em' }}>
        <h2 style={{ fontSize: '26px' }}>Nisbah dulang</h2>
      </CascadeProbe>,
    );
    // -0.01em of 26px is -0.260px — the px a claim means differs at every width,
    // which is why the claim is never stored as px.
    expect(container.textContent).toMatch(/claims -0\.01em = -0\.260px/);
  });
});
