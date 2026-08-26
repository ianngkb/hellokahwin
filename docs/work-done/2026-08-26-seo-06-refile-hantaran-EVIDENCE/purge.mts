import { purgeVercelEdge, edgePurgeSuccessNotice, edgePurgeFailureNotice } from '../src/lib/cache/edge-purge';
const paths = [
  '/artikel/hiasan-dekorasi/hantaran-kahwin', '/artikel/hiasan-dekorasi/hantaran-tunang',
  '/artikel/hantaran-mas-kahwin/hantaran-kahwin', '/artikel/hantaran-mas-kahwin/hantaran-tunang',
  '/artikel/hantaran-mas-kahwin', '/artikel/hiasan-dekorasi', '/artikel/idea-dan-nasihat', '/artikel/perancangan',
  '/artikel', '/', '/sitemap.xml',
];
const r = await purgeVercelEdge(paths);
console.log(JSON.stringify({ ok: r.ok, skipped: r.skipped, status: (r as any).status, detail: r.detail }, null, 1));
console.log(r.ok ? edgePurgeSuccessNotice(r) : edgePurgeFailureNotice(r));
