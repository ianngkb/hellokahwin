/**
 * Only allow http(s) URLs, to prevent `javascript:` XSS. Auto-prepends
 * `https://` for a plain domain, because editors and vendors routinely supply
 * `studioaisyah.my` rather than a full URL.
 *
 * Lifted out of `components/inspire/article-renderer.tsx` when the image-credit
 * block needed the same guard. Duplicating a security check is how one copy
 * quietly stops matching the other, so there is one.
 */
export function safeHref(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (/^[a-z0-9][\w.-]*\.[a-z]{2,}/i.test(url)) return `https://${url}`;
  return null;
}
