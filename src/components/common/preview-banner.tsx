import { resolvePreviewBadge } from '@/lib/preview/banner';

/**
 * PLAT-08 — a strip that says, on the page itself, "this is a preview of THIS
 * branch at THIS commit".
 *
 * Server Component: `process.env.VERCEL_ENV` is a server value, and reading it
 * here keeps branch and commit out of the client bundle in production. The rule
 * lives in `lib/preview/banner.ts` so it can be unit-tested.
 *
 * The vars are read by name rather than passing `process.env` wholesale — Next
 * types `ProcessEnv` from the env vars it knows about, so a structural
 * `PreviewEnv` parameter shares no properties with it and the build fails.
 *
 * Renders nothing at all on hellokahwin.com and under `pnpm dev`, so the only
 * cost outside a preview is one null check per request.
 */
export function PreviewBanner() {
  const badge = resolvePreviewBadge({
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
    VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
  });
  if (!badge) return null;

  return (
    <aside
      role="status"
      aria-label="Preview deployment"
      className="bg-warning-subtle text-warning-strong border-warning/40 border-b px-4 py-1.5 text-center text-xs font-medium tracking-wide"
    >
      {badge.label} · {badge.branch} · {badge.sha} · read-only database
    </aside>
  );
}
