# Merged review findings — fix ALL of them (no deferrals)

Reviewed HEAD: 73b2275b8489712628ab4ec7c66a8dee6ca516d2 (base d37d44d).
Layers: Blind Hunter + Edge Case Hunter (below); Acceptance Auditor appended separately.
Duplicates across layers merged, highest severity kept.

1. **critical | scripts/wp-import.ts:1270** — `--clean` on a slug containing `%` or `_` makes SQL `LIKE` treat them as wildcards and deletes unrelated media rows. Fix: escape LIKE metacharacters with an explicit ESCAPE clause, or use a starts-with comparison that is not pattern-based.
2. **major | src/app/(admin)/admin/inspire/navigation/actions.ts:42** — two admins seeding concurrently both pass the pre-transaction emptiness check and duplicate the menu. Fix: re-check emptiness INSIDE the transaction with a lock (e.g. pg advisory lock or `SELECT ... FOR UPDATE`/table lock) before inserting.
3. **major | scripts/backfill-media.ts:260** — `--limit 0` or negative scans/writes everything instead of failing. Fix: validate limit is a positive safe integer, reject otherwise.
4. **major | scripts/backfill-media.ts:327** — two referenced URLs resolving to one original key (e.g. high/low variants both referenced): second URL is discarded and never gets a usage link. Fix: keep a per-URL alias map so every referenced URL can be matched for usage linking (or resolve usage by canonical r2_key).
5. **major | scripts/backfill-media.ts:420** — R2 object ≥ 2 GiB overflows Postgres `integer` for file_size, aborting mid-run. Fix: cap/reject oversized values before writing (do NOT migrate the column in this run).
6. **major | scripts/backfill-media.ts:430** — hard-coded `HOUSE_AUTHOR_ID` as uploaded_by fails the FK on installations using the `WP_IMPORT_AUTHOR_ID` override or missing the house profile. Fix: resolve uploader as `process.env.WP_IMPORT_AUTHOR_ID ?? HOUSE_AUTHOR_ID` AND verify the profile row exists before any writes (clear error + abort if not).
7. **major | src/lib/authors/queries.ts:255** — app hardcodes `hellokahwin-editorial` while the importer supports `WP_IMPORT_AUTHOR_ID`; a non-default override makes the configured house author unselectable. Fix: one shared resolution of the house id that honours the env override in both places (keep the constant as the default).
8. **major | scripts/wp-import.ts:1238** — on conflict, `RETURNING` omits already-existing media rows, so their article-usage rows are silently skipped. Fix: after the insert, select all pending keys (inserted + pre-existing) and build usage rows from that.
9. **major | scripts/wp-import.ts:1280** — stale-media deletion failure is swallowed; dead media rows remain silently. Fix: surface the failure (non-zero exit / explicit error summary) rather than log-and-continue.
10. **major | src/components/inspire/editor-toolbar.tsx:101** — inserting a media URL already present in the document updates the FIRST matching image, leaving the newly inserted one without caption/variants. Fix: capture the exact insertion position of the new node and select THAT node (not a search by non-unique src).
11. **minor | src/components/inspire/article-renderer.tsx:949** — regex-extracted caption attributes stay HTML-entity-encoded, so captions/URLs with `&` or quotes render wrong. Fix: decode entities on the extracted values (or parse the sanitized HTML properly).
12. **minor | scripts/wp-import.ts:1122/1136** — duplicate `<img src>` occurrences: first replacement hits all, later iterations upload/register unused duplicates as used. Fix: dedupe extracted source URLs before downloading/recording.
13. **minor | src/lib/inspire/content-media.ts:33** — gallery `data-images` containing a null entry throws and skips valid later URLs. Fix: guard each entry is a non-null object before reading `src`.

## Appended from Acceptance Auditor
14. **major | src/components/inspire/article-renderer.tsx:155** - the five nested custom-node fallbacks render EMPTY elements, so a gallery/figure/CTA/PDF nested inside a blockquote/list/table still disappears (it no longer throws, but the content is gone). Fix: give the render-only definitions semantic output preserving attributes/content (e.g. images of a gallery, the figure image + caption, the CTA link, the PDF link) so nested content degrades to something readable.
15. **minor | article-renderer.tsx:923 (+ article-editor.tsx editorProps class)** - dead `prose`/`prose-*`/`not-prose` classes remain while @tailwindcss/typography is not installed. Decision stands: do NOT install the plugin. Close this by REMOVING the inert typography classes at the named sites (renderer + editor), relying on the existing .inspire-prose / .ProseMirror rules.

Duplicates confirmed by acceptance (already listed above): editor-toolbar duplicate-src insert (#10), wp-import URL dedupe (#12), nav seed race (#2), WP_IMPORT_AUTHOR_ID coherence (#6/#7).
