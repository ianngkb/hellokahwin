#!/usr/bin/env node
// RIGHTS-03 — purge the six object URLs, and the legacy WordPress path, from
// the Cloudflare edge.
//
//   & "$HOME/.claude/skills/tokens/vault.ps1" run cloudflare.twn -EnvVar CF_TOKEN -- `
//       node scripts/rights/rights03-purge-cdn.mjs
//
// WHY THIS EXISTS, AND IT IS THE WHOLE POINT OF THE ITEM. Deleting the objects
// out of R2 did NOT stop them being served. `images.hellokahwin.com` returns
// `Cache-Control: public, max-age=31536000, immutable` and Cloudflare was still
// answering `cf-cache-status: HIT` with the full Getty JPEG after the origin
// object was gone. Verified: `ListObjectsV2` on both prefixes returned 0 objects
// while all six URLs returned HTTP 200.
//
// A YEAR of continued public delivery, from a bucket that no longer holds the
// file. "Deleted at origin" is not "gone", and the DoD asks for a 404 on the
// live URL — which is the right thing to ask for, because the CDN is what a
// reverse-image crawler actually fetches.
//
// The token is `cloudflare.twn` in the vault, NOT `cloudflare.hellokahwin` —
// that one returns `9109 Invalid access token` as of 01 Sept 2026.
const TOKEN = process.env.CF_TOKEN;
if (!TOKEN) { console.error('no CF_TOKEN in the environment — inject it with vault.ps1 run, do not paste it'); process.exit(2); }
const ZONE = process.env.CF_ZONE_ID || 'd8a1aef68b267fc0dc3cccd53b9e5cae'; // hellokahwin.com

const FILES = [
  'https://images.hellokahwin.com/inspire/kursus-kahwin/1787396416141-IN-KursusKahwin-Kelas-1024x576.jpg',
  'https://images.hellokahwin.com/inspire/kursus-kahwin/1787396416141-IN-KursusKahwin-Kelas-1024x576/high.webp',
  'https://images.hellokahwin.com/inspire/kursus-kahwin/1787396416141-IN-KursusKahwin-Kelas-1024x576/low.webp',
  'https://images.hellokahwin.com/inspire/tempat-honeymoon-di-malaysia/1787395669518-IN-TempatHoneymoondiMalaysia-CameronHighland.jpg',
  'https://images.hellokahwin.com/inspire/tempat-honeymoon-di-malaysia/1787395669518-IN-TempatHoneymoondiMalaysia-CameronHighland/high.webp',
  'https://images.hellokahwin.com/inspire/tempat-honeymoon-di-malaysia/1787395669518-IN-TempatHoneymoondiMalaysia-CameronHighland/low.webp',
  'https://hellokahwin.com/wp-content/uploads/2026/01/IN-TempatHoneymoondiMalaysia-CameronHighland.jpg',
];

const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE}/purge_cache`, {
  method: 'POST',
  headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
  body: JSON.stringify({ files: FILES }),
});
const body = await res.json();
console.log(`purge_cache HTTP ${res.status}  success=${body.success}`);
if (body.errors?.length) console.log('errors:', JSON.stringify(body.errors));
// Only claim a purge that happened. Printing the list unconditionally is how a
// 401 gets read later as seven successful purges.
if (body.success) for (const f of FILES) console.log('  purged:', f);
else {
  console.log('  NOTHING WAS PURGED. `10000 Authentication error` means the token');
  console.log('  is valid but has no Zone -> Cache Purge permission on this zone.');
  console.log('  Mint one in the Cloudflare dashboard (My Profile -> API Tokens,');
  console.log('  Zone -> Cache Purge -> Purge, zone hellokahwin.com), store it with');
  console.log('  `vault.ps1 set cloudflare.hellokahwin`, then `vault.ps1 push`.');
}
process.exit(body.success ? 0 : 1);
