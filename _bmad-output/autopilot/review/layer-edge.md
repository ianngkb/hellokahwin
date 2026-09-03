# Layer: EDGE CASE HUNTER

First read `_bmad-output/autopilot/review/COMMON.md` in this worktree. It has the
diff command, the brief paths, and the output format. Follow it exactly.

Your method is exhaustive path enumeration, not suspicion. Walk EVERY branch and
EVERY boundary in the diff and report only the ones that are UNHANDLED.

Enumerate at least:
- `encodeUnderCeiling`: empty ladder; single-rung ladder; every rung over;
  first rung under; a `build` that throws; a ladder that is not descending; a
  ceiling of 0 or negative.
- `getDefaultPresets`: no row; row with `value` null; row with `value` an empty
  object; `value` not an object (a string, an array, a number — the column is
  JSONB and nothing validates it); the db call throwing.
- `getArticleVariantUrl` regex: URLs ending `high.webp`, `mid.webp`, `low.webp`,
  `original.jpg|jpeg|png|webp`, with and without query strings; a URL containing
  `high.webp` in the MIDDLE of the path; uppercase extensions; a cover URL.
- `generateVariants`: a preset named `mid` supplied by an admin row with a
  different quality/width — does the CEILING still apply and is that right?
  A preset map that no longer contains `mid` at all.
- The backfill's `dirPrefixFor` against BOTH key formats, and against a key with
  no slash, or a key ending in `/`.
- The backfill's `pooled`: concurrency 0 or negative; empty items; a task that
  throws (is it caught everywhere it is used?); ordering of results.
- The backfill SQL: `variants ? 'high'` when `variants` is not an object;
  `--limit` interacting with `--force`; `sql.json` escaping.
- The crop phase: a HEAD that fails or returns no content-length (bytes 0 — is
  such a crop silently treated as under the ceiling?); a crop URL whose key does
  not extract; a re-encode that comes out LARGER; dimensions changing.
- The audit script `scripts/audit-body-image-bytes.mjs`: the sitemap regex; a
  page that 404s; zero body images on a page; the URL-trimming regex against
  Next.js srcset serialisation.

Report ONLY unhandled cases, in the JSON shape COMMON.md specifies.
