'use client';

import { useEffect } from 'react';

/**
 * How long to wait for photos before printing anyway.
 *
 * A flat 10s was too tight: real articles here routinely carry 30+ full-width
 * photos, and on a cold R2 cache a 4G-ish connection can still be fetching the
 * tail of that set well past ten seconds — printing then yields a PDF of blank
 * boxes, which is the exact failure this component exists to prevent. So the
 * budget scales with how much there actually is to load: a fixed base for the
 * first paint plus a per-image allowance, capped so a genuinely dead CDN can
 * never strand the user on a page whose dialog never opens.
 */
const SETTLE_BASE_MS = 8_000;
const SETTLE_PER_IMAGE_MS = 700;
const SETTLE_CEILING_MS = 60_000;

function imageSettleTimeoutMs(imageCount: number): number {
  return Math.min(SETTLE_BASE_MS + imageCount * SETTLE_PER_IMAGE_MS, SETTLE_CEILING_MS);
}

/**
 * Waits for one `<img>` to have actual pixels available to paint.
 *
 * `complete` covers the already-cached case (an image that finished before this
 * effect ran fires no further `load` event, so listening alone would hang), and
 * `decode()` covers the rest — it resolves only once the bitmap is decoded and
 * ready, which is strictly later than `load`.
 *
 * Neither path ever rejects, but neither is a *guarantee* of progress either:
 * the `load`/`error` fallback only settles if one of those events actually
 * fires, and a request that stalls mid-flight (dead CDN, hung socket) fires
 * neither. The caller's timeout is what actually guarantees the dialog opens —
 * this function is best-effort fidelity, not the liveness mechanism.
 *
 * `signal` ties the fallback listeners to the effect's lifetime so a cancelled
 * run leaves nothing attached to a detached DOM.
 */
function whenImageSettled(img: HTMLImageElement, signal: AbortSignal): Promise<void> {
  if (img.complete && img.naturalWidth > 0) return Promise.resolve();

  return new Promise<void>((resolve) => {
    img
      .decode()
      .then(() => resolve())
      .catch(() => {
        // Safari rejects `decode()` on images that are still loading, and any
        // browser rejects on a genuine 404 — fall back to the event pair.
        if (img.complete || signal.aborted) {
          resolve();
          return;
        }
        img.addEventListener('load', () => resolve(), { once: true, signal });
        img.addEventListener('error', () => resolve(), { once: true, signal });
      });
  });
}

/**
 * Opens the browser's print dialog once the page is actually printable
 * (spec-article-draft-client-review).
 *
 * The waiting is the entire point of this component. `window.print()` snapshots
 * the document synchronously, so calling it on mount — before webfonts have
 * swapped in and before the cover/body photos have decoded — produces a PDF
 * with fallback-font reflow and blank or half-painted images. The sequence is:
 *
 *   1. `document.fonts.ready` — no fallback-to-webfont reflow mid-print.
 *   2. every `<img>` inside `.article-print-root` settled — the cover photo and
 *      every body image have real pixels. Scoped to the print root so a
 *      stray off-paper image can't hold the dialog up.
 *   3. one `requestAnimationFrame` — lets the browser commit the resulting
 *      layout before the snapshot is taken.
 *
 * Step 2 is bounded by a timeout so a single dead image URL degrades to "print
 * without that photo" instead of "the dialog never opens".
 */
export function AutoPrint() {
  useEffect(() => {
    // Once-only is enforced per effect RUN by `cancelled`, not by a ref that
    // outlives the run. React strict mode deliberately mounts, unmounts and
    // re-mounts in dev: a ref set on the first run would still be set on the
    // second, so the second run would bail — after the first run's cleanup had
    // already cancelled everything it scheduled. Result: the dialog never
    // opened in dev. Each run instead starts with a fresh `cancelled = false`,
    // schedules its own work, and cancels exactly that work in its own cleanup.
    let cancelled = false;
    let rafId = 0;
    const controller = new AbortController();

    const print = () => {
      if (cancelled) return;
      // Coalesce the timeout race and the happy path — whichever wins, print once.
      cancelled = true;
      controller.abort();
      rafId = requestAnimationFrame(() => window.print());
    };

    const root = document.querySelector('.article-print-root');
    const images = root ? Array.from(root.querySelectorAll('img')) : [];

    const ready = (async () => {
      // `document.fonts` is absent in a handful of older engines — treat a
      // missing Font Loading API as "fonts are as ready as they'll get".
      await document.fonts?.ready?.catch?.(() => {});
      if (cancelled) return;

      await Promise.all(images.map((img) => whenImageSettled(img, controller.signal)));
    })();

    const timeout = setTimeout(print, imageSettleTimeoutMs(images.length));
    void ready.then(print).catch(print);

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeout);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return null;
}
