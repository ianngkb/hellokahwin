// How this Next app is adapted to run as a Cloudflare Worker.
//
// Three Cloudflare services stand in for what Vercel does implicitly:
//   R2  — holds the rendered page bodies (ISR / "use cache"). Durable, shared
//         by every Worker instance worldwide.
//   D1  — holds "tag X was last revalidated at T", so revalidateTag() can
//         invalidate a page without knowing its URL.
//   DO  — a single-writer queue so a stale page is regenerated once rather
//         than once per concurrent miss.
//
// regionalCache puts a short-lived copy in the Cloudflare colo that served the
// request, so a repeat hit in the same region skips the R2 round-trip.
import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache';
import { withRegionalCache } from '@opennextjs/cloudflare/overrides/incremental-cache/regional-cache';
import d1NextTagCache from '@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache';
import doQueue from '@opennextjs/cloudflare/overrides/queue/do-queue';

export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(r2IncrementalCache, { mode: 'long-lived' }),
  tagCache: d1NextTagCache,
  queue: doQueue,
});
