/**
 * Stand-in for `sharp` in the Cloudflare Worker build ONLY (next.config.ts
 * aliases `sharp` here when NEXT_PUBLIC_HOSTING=cloudflare).
 *
 * sharp is a native module: OpenNext cannot bundle it and a Worker cannot load
 * it. The resize/encode the site needs on a Worker goes through Cloudflare
 * Images (`@/lib/storage/image-engine`). What is left on sharp — smart crops —
 * is admin-only, closed on the preview, and stays on Vercel until the
 * media-tools step (docs/cloudflare.md). Reaching it here fails loudly.
 */
function sharpUnavailable(): never {
  throw new Error(
    'sharp is not available on Cloudflare Workers — resize/encode uses the Images binding (image-engine); smart crops wait for media-tools and run on Vercel (docs/cloudflare.md)',
  );
}

export default sharpUnavailable;
