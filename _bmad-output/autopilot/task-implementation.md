# Task: Implement the fixes from investigation-inspire-fixes.md

You already investigated these four issues; your findings are in `_bmad-output/autopilot/investigation-inspire-fixes.md`. That document is the spec — implement its "Proposed fix" sections. Work in this worktree on the current branch (`ianng89/inspire-fixes`). Commit locally in logical commits; NEVER push, never touch the remote.

## Scope (all of it, no deferrals)

### Issue 1 — author attribution
- In `[article-id]/edit/actions.ts`: only run the `listSelectableAuthors()` membership check when `validated.authorId` differs from the article's current `author_id` (read current row first). Preserve the security property: an admin still cannot MOVE an article onto a non-selectable profile.
- Introduce ONE shared house-author constant keyed on the stable profile id `'hellokahwin-editorial'` (and keep email only where genuinely needed), imported by both `src/lib/authors/gate.ts` and `scripts/wp-import.ts`, so `listSelectableAuthors()` recognises the house account on this database WITHOUT any production data edit. Verify the query change actually makes the house account selectable given prod's real row (id `hellokahwin-editorial`, email `editorial@hellokahwin.com`, is_public_author=false, author_slug NULL).
- Check `create/actions.ts:32` (`authorId: user.id`) — new articles must also save without hitting the guard (the changed-only check should cover it; confirm).
- Do NOT make any human profile a public author.

### Issue 2 — media backfill
- New `scripts/backfill-media.ts`: walk `articles.content` (reuse/extract the URL-extraction logic from `extractImageUrlsFromContent()`) plus `articles.cover_image_url`; create one `media` row per distinct R2 URL with all NOT NULL columns (`uploaded_by: 'hellokahwin-editorial'`, sensible `source`, mime from extension, `file_size` from an R2 HeadObject where cheap — or 0 if unavailable, document it). Idempotent via the unique r2_key index (upsert/on-conflict-do-nothing). MUST have a `--dry-run` mode (default) that prints what it would insert; writes only with `--execute`. Do NOT run it against production in this task — dry-run only to prove it works.
- After inserting, populate `media_article_usage` (bulk equivalent of `syncMediaUsage()`), same dry-run discipline.
- Patch `scripts/wp-import.ts` to insert a `schema.media` row alongside each `uploadToR2()` call so future imports don't reopen the gap.

### Issue 3 — navigation
- New server action in `navigation/actions.ts`: "seed from categories" — take `getCategoryFallbackNav()`'s output and insert equivalent `inspire_nav_items` rows (type 'category', label, position, parentId for children). Must `revalidateTag('inspire-nav')`. Idempotent / refuses to run when the table already has rows.
- Empty-state UI in `navigation/page.tsx` + `nav-manager.tsx`: when there are no rows, explain the public nav is currently auto-generated from categories and offer the "Seed from categories" button.

### Issue 4 — editor
In the order the investigation prescribes:
1. Delete the corrupted duplicate sidebar #1 (article-editor.tsx lines ~1935-2614). FIRST diff the two sidebar ranges to confirm sidebar #1 contributes nothing unique beyond the spliced editor; keep the complete sidebar #2 (which has the Delete actions block).
2. Gate/disable `EditorToolbar` when `isReadOnly`.
3. Fix Embed: insert the registered node type `dynamicBlockEmbed` (or remove the menu item if the node needs config the toolbar can't supply — prefer fixing).
4. Fix `handleMediaSelect`: use `.setNodeSelection(pos).updateAttributes('image', …)` pattern (copy from article-editor.tsx:1437-1443); and in `custom-image.ts` add `...this.parent?.()` and declare `data-caption` / `data-caption-url` attributes so captions survive.
5. `article-renderer.tsx` sanitizer: allow `ol: ['type', 'start']`.
6. Register render-only definitions for `galleryBlock`, `sectionBlock`, `figureBlock`, `ctaButtonBlock`, `pdfLinkBlock` in the renderer's extension list; make the silent `catch {}` at ~:862 log the error (server-side console) while still skipping gracefully.
7. Add `.ProseMirror h1…h6` rules (sizes + margins, at minimum h5/h6 distinct) to `globals.css`.
8. Fix the Link popover double-fire (Radix PopoverTrigger asChild composing onto Toggle) — let the Popover manage its own open state.
- Do NOT install @tailwindcss/typography (decision logged: it would restyle the public site). Leave existing `prose` classes as-is.

## Quality bar
- Run the repo's typecheck and test suite (`package.json` scripts; there is a `tsconfig.typecheck.json` and vitest config) and make them pass.
- Add/adjust unit tests where the repo already has patterns for it (e.g. the author-guard change and the sanitizer change deserve tests).
- Match existing code style. No drive-by refactors.

## Completion artifact
When done, write `_bmad-output/autopilot/dev-result.md` containing: commits made (hash + subject), typecheck/test results (actual output summary), what was implemented per issue, anything intentionally not done and why, and exact instructions for the production data steps (backfill command, seed action) that the orchestrator will run at ship time. The task is not done until that file exists and typecheck + tests pass.
