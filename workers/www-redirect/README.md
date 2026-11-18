# www-redirect

Standalone Cloudflare Worker (TWN account) bound to the route `www.hellokahwin.com/*`.
It answers every www request with a 301 to `https://hellokahwin.com` + path + query, so www never touches Vercel.

Deploy: `vault.ps1 run cloudflare.workers-twn -EnvVar CLOUDFLARE_API_TOKEN -- npx wrangler deploy` from this folder.
Needs the www DNS record proxied (CNAME -> hellokahwin.com). Rollback: unproxied CNAME back to Vercel, then `npx wrangler delete`.
