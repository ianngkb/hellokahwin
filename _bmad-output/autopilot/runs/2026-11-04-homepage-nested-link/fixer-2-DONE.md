STATUS: done

Round 2 (fix-check 1 at fee1e06).

| # | Layer(s) | file:line | Sev | Class | State | What I did |
| --- | --- | --- | --- | --- | --- | --- |
| F8 | edge | scripts/smoke-prod.mjs:335 | minor | defect-edge | fixed | the four remaining browser-environment messages (exit before DevTools, cannot connect, socket closed, exit mid-check) now carry the "TEST MACHINE, NOT THE SITE:" prefix; 9 uses of NOT_THE_SITE |
| FC1-N1 | fixcheck | scripts/smoke-prod.mjs:423 | minor | defect-edge | fixed | quiet phase has its own budget (QUIET_MS + 8 s) after load; running out of it breaks instead of failing; only Page.* / Runtime.* events count as activity |

Proof: node --check OK; eslint clean; vs prod 11 pass + browser check red on #418 only; CHROME_PATH=C:/nope.exe → "TEST MACHINE, NOT THE SITE: CHROME_PATH=C:/nope.exe does not exist"; vs local next start of this branch 12/12.
