/**
 * PLAT-08 — "show me before you ship" needs somewhere to point.
 *
 * A Vercel preview URL and hellokahwin.com are the same app at two different
 * hostnames, and once a reviewer has the tab open there is nothing on the page
 * that says which one they are looking at. This resolves the badge the preview
 * banner paints, as a pure function of the environment so the rule worth
 * pinning down — render on preview and NOWHERE else — is testable without a
 * browser.
 *
 * VERCEL_ENV / VERCEL_GIT_COMMIT_REF / VERCEL_GIT_COMMIT_SHA are Vercel system
 * env vars, injected on every deployment because the project has
 * `autoExposeSystemEnvs` on. They are absent under `pnpm dev`, which is the
 * right answer there too — no banner.
 */
export type PreviewBadge = {
  label: string;
  branch: string;
  sha: string;
};

/** Vercel's system env vars, narrowed to the three this reads. */
export type PreviewEnv = {
  VERCEL_ENV?: string;
  VERCEL_GIT_COMMIT_REF?: string;
  VERCEL_GIT_COMMIT_SHA?: string;
};

/**
 * The badge for a preview deployment, or `null` everywhere else.
 *
 * The `=== 'preview'` comparison is exact on purpose. A truthiness check would
 * paint the banner on hellokahwin.com too, since VERCEL_ENV is set in
 * production as well — to 'production'. That is the one bug this can have.
 */
export function resolvePreviewBadge(env: PreviewEnv): PreviewBadge | null {
  if (env.VERCEL_ENV !== 'preview') return null;
  return {
    label: 'PREVIEW DEPLOYMENT',
    branch: env.VERCEL_GIT_COMMIT_REF || 'unknown branch',
    sha: env.VERCEL_GIT_COMMIT_SHA ? env.VERCEL_GIT_COMMIT_SHA.slice(0, 7) : 'unknown',
  };
}
