// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, type NextFetchEvent } from 'next/server';

// Clerk is replaced by a marker response so the test can see exactly which
// requests were handed to it. The real matcher is kept: it is the thing under
// test, together with the order of the branches in middleware.ts.
const clerkHandled = vi.fn();
vi.mock('@clerk/nextjs/server', async () => {
  const actual =
    await vi.importActual<typeof import('@clerk/nextjs/server')>('@clerk/nextjs/server');
  return {
    createRouteMatcher: actual.createRouteMatcher,
    clerkMiddleware: () => (req: NextRequest) => {
      clerkHandled(req.nextUrl.pathname);
      return new Response(null, { status: 299, headers: { 'x-test': 'clerk' } });
    },
  };
});

const { default: middleware } = await import('../middleware');

function run(path: string) {
  const req = new NextRequest(new URL(path, 'https://hellokahwin.com'));
  return middleware(req, {} as NextFetchEvent) as Response;
}

const isClerk = (res: Response) => res.headers.get('x-test') === 'clerk';
const isRewrite = (res: Response) => res.headers.has('x-middleware-rewrite');

beforeEach(() => clerkHandled.mockClear());

describe('middleware — the admin sign-in gate', () => {
  it.each([
    '/admin',
    '/admin/articles',
    '/admin/site-analytics',
    '/login',
    '/no-access',
    '/api/v1/inspire/upload',
  ])('hands %s to Clerk', (path) => {
    const res = run(path);
    expect(isClerk(res)).toBe(true);
    expect(clerkHandled).toHaveBeenCalledWith(path);
  });

  // The regression this guards: `/admin/` used to be REWRITTEN onto the admin
  // route, which skips Clerk entirely (measured at the time: `/admin` → 307
  // /login, `/admin/` → 500 from inside the route). A trailing-slash variant of
  // any Clerk surface must come back as a visible redirect, never a rewrite.
  it.each(['/admin/', '/admin/articles/', '/login/', '/api/v1/inspire/upload/'])(
    'never rewrites %s past Clerk',
    (path) => {
      const res = run(path);
      expect(isRewrite(res)).toBe(false);
      if (!isClerk(res)) {
        expect([301, 308]).toContain(res.status);
        expect(new URL(res.headers.get('location')!).pathname).toBe(path.replace(/\/+$/, ''));
      }
    },
  );

  it.each(['/', '/artikel', '/artikel/busana-pengantin', '/brand'])(
    'keeps Clerk off the public page %s',
    (path) => {
      run(path);
      expect(clerkHandled).not.toHaveBeenCalled();
    },
  );
});
