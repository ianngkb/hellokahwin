# HelloKahwin — implement A, Refined Classic

Ian selected A and explicitly asked to replace the branding throughout the website. This is the Autopilot Quick build brief; routing and planning are complete.

## Outcome

- Recreate the approved artwork as clean outlined vectors: a round editorial seal, legible HK, gently curved connecting crossbar and short K; unified mixed-case HelloKahwin in the light Fashion Publication style. Reference `astra-a-refined-classic.png` in this folder and the right-hand original `wordmark-options.png`. Inspect both images before drawing. Preserve A rather than replacing it with a generic font or the B straight crossbar.
- Use black/white logo treatments across public header/footer, console/sidebar/login branding, brand downloads, browser/home-screen icons and any sharing/metadata/cover-template logo uses found in the repo. Keep the wordmark the main masthead, with a modest seal where appropriate.
- Update the SVG registry, generated inline markup, raster compatibility logo and icon generator coherently. Retain old asset URLs as updated compatible variants where useful. Remove stale split-name, gold-logo and old-proportion claims. Do not redesign unrelated site colours or editorial content.
- Artwork must work on light/dark surfaces with accessible names and fit existing mobile navigation. Use a strengthened small-size variant if required; inspect 16/32/48px output rather than assuming the display seal scales down.

## Boundaries and verification

No deployment, migrations, auth-flow changes or external publishing. Use existing isolated branch `ianngkb/logo`, based on `origin/master` at `ed8071d88409bb1a9c28c14e0ba5162d8f75bab8`. Preserve unrelated changes. No extra workers or independent review from the builder.

Inspect all logo consumers, choose licensed/repo fonts if needed, and record the artwork source. Prefer native SVG drawing/generation for final assets; no new AI image round is required. Use apply_patch for source edits. Dependency installation is allowed. Keep generation reproducible where practical and do not weaken existing checks to hide failures.

Builder: implement, run targeted brand consistency/format/type checks, inspect rendered artwork, commit the finished change, then report SHA and checks. Do not run the full suite repeatedly. The controller will run `pnpm test`, `pnpm typecheck`, `pnpm lint` once on the integrated change, arrange one bounded code review, start the dev preview on the registered port, and queue through /imdone. The live site waits for Ian's separate deploy request.

The existing concept artifact is related task work and may be committed alongside this implementation; update its status to selected A / implemented locally when true. Do not claim the website is live. Keep a short completion report at `tmp/logo-build-result.md` with files changed, exact check outcomes and any limits. No hidden test failures.
