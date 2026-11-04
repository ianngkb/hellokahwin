STATUS: done

Fixes for review of 7d3b1f8 (verdict ~/.claude/review-log/hellokahwin/ianngkb-homepage-nested-link.json).

| # | Layer(s) | file:line | Sev | Class | State | What I did |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | blind | scripts/smoke-prod.mjs:295 | major | defect-edge | fixed | Page.setLifecycleEventsEnabled; wait for lifecycle `load` whose loaderId equals Page.navigate's loaderId |
| F2 | blind, edge | scripts/smoke-prod.mjs:299 | minor | defect-edge | fixed | fixed 3 s sleep replaced by a 2 s quiet-period poll bounded by the 30 s deadline |
| F3 | blind, edge | scripts/smoke-prod.mjs:278 | major | defect-edge | fixed | ws.onclose and proc 'exit' reject every pending command; each send has a 20 s timeout |
| F4 | blind | scripts/smoke-prod.mjs:214 | minor | defect-edge | fixed | CHROME_PATH, when set, is used exclusively and asserted to exist |
| F5 | blind | scripts/smoke-prod.mjs:207 | minor | paperwork | fixed | comment names ubuntu-24.04 and points at the workflow pin |
| F6 | edge | scripts/smoke-prod.mjs:328 | major | defect-edge | fixed | asserts Page.navigate has no errorText; Runtime.evaluate asserts h1 text and a React fiber on the DOM (hydrated) |
| F7 | edge | scripts/smoke-prod.mjs:229 | minor | defect-edge | fixed | spawn moved inside try; 'error' listener rejects start-up |
| F8 | edge | scripts/smoke-prod.mjs:214 | minor | defect-edge | fixed | added /snap/bin/chromium and %LOCALAPPDATA% Chrome; every browser-environment failure is prefixed "TEST MACHINE, NOT THE SITE:" so the issue's run log says so |
| F9 | edge | scripts/smoke-prod.mjs:290 | minor | defect-edge | fixed | collector requests also intercepted via Fetch.enable and fulfilled 204; browser killed (no unload) |
| F10 | edge | scripts/smoke-prod.mjs:316 | minor | defect-edge | fixed | win32: taskkill /T /F the process tree; else SIGKILL; waits for exit |
| F11 | edge | src/components/inspire/__tests__/home-hero.test.tsx:25 | minor | test-gap | fixed | new case renders populated heroCrops: picture/source/img present, still no `a a` |

Proof: `pnpm test` 68 files / 878 passed; lint 0 errors; typecheck clean. `node --test scripts/smoke-prod.mjs` vs prod: 11 pass, browser check red on React #418 (the unfixed bug). Same suite vs local `next start` of this branch: 12/12 pass.
