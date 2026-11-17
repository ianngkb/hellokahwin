# Make the approved editorial seal visible

Ian reported that the deployed website does not show the logomark. The rollout used the wordmark alone in header and footer. Correct the original rebrand with a clearly visible round seal beside the name in the public masthead (including phones), a larger white seal above the name in the footer, and matching compact console/login branding where it fits. Keep A's existing artwork, the wordmark and current favicon; do not redesign them.

Base: `86d78f88d7eff85748ac5eb8d07e170d813c3cfd`, branch `ianngkb/seal-placement`, existing isolated logo workspace. Use one small builder. Reuse outlined SVG source via generator if inlining; no runtime filesystem/font dependency. Preserve accessible link names; avoid duplicate logo announcements. Keep search/menu accessible at 320px and avoid footer column overflow at 768px. Black on light, white on dark.

Acceptance: inspect header/footer at 320, 390, 768 and 1440px; round seal must actually be visible in the primary page layout. Verify generated asset parity, relevant existing tests and format. Controller runs required test/type/lint suite once and one final code review. This corrects the already approved deployment; retain all unrelated files and run records.

Builder: implement and commit; no workers, publishing, independent review, pushing or deploying. Keep changes small. Write `tmp/seal-placement-result.md` LAST with SHA, checks and limits. The existing local preview at http://localhost:3311 uses this worktree and is available for visual checking. Do not stop/restart it.
