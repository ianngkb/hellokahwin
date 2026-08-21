import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// jsdom has no matchMedia; components with breakpoint listeners need this stub.
//
// Guarded on `window` because this setup file runs before EVERY test file, and a
// large share of the suite (auth, storage, cron, api routes) opts into the plain
// `node` environment via a `@vitest-environment node` docblock. There is no
// `window` there, so an unguarded `Object.defineProperty(window, …)` throws at
// setup time and those files fail to LOAD — surfacing as failed FILES with zero
// failed tests, which reads like an infra glitch rather than a broken stub.
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}
