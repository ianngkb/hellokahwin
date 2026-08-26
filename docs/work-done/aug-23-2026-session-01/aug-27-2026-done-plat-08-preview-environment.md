# PLAT-08 — a working preview environment, on both projects

**Sprint 02 · platform · 3 pts · owner BMAD · 2026-08-27**
**State: reopened by the CEO after the first report, corrected, and shipped on
the buddy side. The final `done` is the CEO's call, not mine — see the
correction below.**

## The claim

Both projects now produce a preview URL from a pull request, and both were
verified from outside the app rather than by opening a tab.

|                                       | buddy-web                                                    | hellokahwin                                                                              |
| ------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| PR                                    | [ianng89/buddy#43](https://github.com/ianng89/buddy/pull/43) | [ianngkb/hellokahwin#4](https://github.com/ianngkb/hellokahwin/pull/4)                   |
| preview                               | `https://buddy-atc0ltwd6-thepicklebase.vercel.app`           | `https://hellokahwin-hr6ydd2fn-thewednotebook.vercel.app`                                |
| built by                              | `.github/workflows/deploy-preview.yml` (new)                 | the Vercel git integration                                                               |
| preview env vars                      | 3                                                            | 8                                                                                        |
| production secrets widened to preview | **0**                                                        | **0**                                                                                    |
| shipped                               | **merged** `bec3142`, production deploy READY 21:16          | PR open — the preview capability is already live on Vercel, only the banner is in the PR |

**A preview URL is not a public URL.** Opened bare it returns `302 →
vercel.com/sso-api`. It renders for (a) anyone signed into the Vercel team, or
(b) anyone handed a bypass link. Both were measured; see _Preview URLs are
private_ below. The first version of this report said "working preview URL"
without that qualifier, and the CEO was right to reject it.

## Why there was nothing to point at

The two projects failed for two different reasons that looked like one.

**hellokahwin** had all 15 env vars scoped to `production` only, so a preview
build died the moment anything touched the database. The registry recorded that
as a hard blocker on 22 Aug: _"the CLI only takes preview values via `--value`,
i.e. a secret on a command line, which these rules forbid."_ That was a `vercel
env add` limitation read as a Vercel limitation. `POST /v10/projects/{id}/env?upsert=true`
takes the value in a JSON body — nothing reaches a command line. **A blocker
written down once was never re-tested, and it held the item for five days.**

**buddy-web** had all 39 vars scoped to `production` too, but its real problem
was different and not written down anywhere: `apps/web/vercel.json` carries
`ignoreCommand: "exit 0"`, which tells Vercel to **skip** its own git build.
That is deliberate — production is built on GitHub Actions and pushed with
`vercel deploy --prebuilt` (#35) — but the side effect nobody had paid for is
that a pull request produced no deployment at all. Preview env vars alone would
have changed nothing there. If we own the production build, we own the preview
build: hence a second workflow.

## The judgement call: which secrets may live in `preview`

Scoping a var to `preview` means every preview deployment runs with it. The rule
applied was: **a value already public by design may be copied; a server secret
may not, and if a project needs one it gets a weaker credential instead.**

**buddy-web — 3 vars, all already in the browser bundle:**
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `APP_TIMEZONE`.
Not scoped to preview: `SUPABASE_SECRET_KEY`, `SUPABASE_DB_URL`, `OPENAI_API_KEY`,
`TOKEN_ENC_KEY`, `GOOGLE_OAUTH_CLIENT_SECRET`, `TWILIO_*`, `TELEGRAM_*`,
`WA_WEB_*`, `R2_*`, `AUTOPILOT_*`, `VERCEL_TOKEN`. A buddy preview reaches
nothing a browser could not already reach with the anon key under RLS.

**hellokahwin — 8 vars.** Public by design: the Clerk publishable key, three R2
public URLs, two bucket names, `REKOGNITION_ENABLED=false`. Not scoped to
preview: `CLERK_SECRET_KEY`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
`R2_ACCOUNT_ID`, `CRON_SECRET`, `ADMIN_EMAILS`, `WP_SOURCE_URL`. The consequence
is intended: on a preview `/admin` returns 500 and the cron routes cannot
authenticate. A preview is for looking at public pages before they ship.

### The database, which is the only genuinely hard part

There is one Supabase database. No dev, no staging. A preview that renders a real
article **must** read production data, and widening production's `DATABASE_URL`
would have handed every preview deployment write access to live content.

So preview connects as a new role, `hk_preview_ro`:

```
connected as: hk_preview_ro | transaction_read_only: on
articles rows visible: 74      published articles: 74
UPDATE articles        -> refused  [25006] cannot execute UPDATE in a read-only transaction
SELECT audit_logs      -> refused  [42501] permission denied for table audit_logs
SELECT admin_settings  -> refused  [42501] permission denied for table admin_settings
```

SELECT on 14 content tables; `admin_settings`, `article_edit_locks`, `audit_logs`
and `seo_indexnow_submissions` denied; write privileges on **zero** tables; no
USAGE on the `auth` schema; not superuser; `statement_timeout = 8s`.

The role carries `BYPASSRLS`, and it has to. **Every one of the 18 public tables
has RLS enabled with ZERO policies.** The app works only because it connects as
the table OWNER (`postgres`) and `relforcerowsecurity` is false, so the owner is
exempt. Any other role sees zero rows forever. The alternative was adding 18
permissive policies to a production database for the sake of preview. `BYPASSRLS`
skips row filtering but grants no table access, so the GRANT list remains the
whole boundary — and there is deliberately **no** `ALTER DEFAULT PRIVILEGES`
grant, so a new table is invisible to preview until someone opts it in. A preview
that breaks gets noticed; one that silently reads a new admin table does not.

## Preview URLs are private, and automation still gets in

Both projects have `ssoProtection: all_except_custom_domains`, so a preview URL
is not public — a bare request gets a 302 to Vercel's login. Measured across four
caller types, both projects, each with a fresh cookie jar:

| caller                                                  | result                                                           |
| ------------------------------------------------------- | ---------------------------------------------------------------- |
| bare URL, no header, no cookies                         | **302** → `vercel.com/sso-api?url=…&nonce=…`                     |
| …following redirects like a browser                     | **200, 482,404 bytes** — Vercel's login page, no banner          |
| `x-vercel-protection-bypass` **header**                 | **200, 68,954 bytes**, banner present                            |
| `?x-vercel-protection-bypass=…` in the **query string** | **307** → clean path + `Set-Cookie: _vercel_jwt; Max-Age=604800` |

That last row is the hand-over mechanism, and it was verified end to end in a
fresh browser session holding **no Vercel account**:

```
1. click the ?x-vercel-protection-bypass=… link   200   68,931 bytes  MARKER PRESENT
   landed on: the clean URL, bypass cookie set
2. the CLEAN url afterwards, same browser         200   68,931 bytes  MARKER PRESENT
3. a DIFFERENT fresh browser, clean url           200  482,404 bytes  Vercel login — still gated
```

Step 3 is the one that matters: the cookie belongs to whoever clicked the link.
Handing someone a bypass link does **not** make the preview public.

### The decision: deployment protection stays ON

Deliberate, not a default left untouched. What disabling it would expose:

- **hellokahwin.** `src/app/robots.ts` computes `baseUrl` from
  `NEXT_PUBLIC_SITE_URL ?? 'https://hellokahwin.com'`, and `NEXT_PUBLIC_SITE_URL`
  is **not set in preview**. So a preview serves `robots.txt` with `Allow: /` and
  does **not** noindex its own hostname. A publicly readable preview would be a
  fully crawlable duplicate of the entire site on a second host — for a business
  whose whole strategy is organic search, that is self-inflicted duplicate
  content. That alone settles it.
- **buddy-web.** A public preview exposes `/book/[slug]` — the public booking
  surface, backed by real rows — and `/embed/*`, plus any future public route by
  default.

Neither exposure buys anything the bypass link does not already deliver. The
honest cost of the choice: **the bypass secret is a credential**, so a bypass
link is share-with-care and must never be pasted anywhere public. It lives in the
vault (`vercelbypass.buddy-web`, `vercelbypass.hellokahwin`) and in Doppler
`buddy/prd` as `VERCEL_AUTOMATION_BYPASS_SECRET`. buddy's `deploy-preview.yml`
uses it to verify its own output, so a preview that does not render is a red
check rather than a surprise for the reviewer.

## Evidence

**buddy-web** — the marker is the branch name, which production can never
contain. Every row below is **with** the `x-vercel-protection-bypass` header
except where it says otherwise:

```
preview    /login  (bypass header)            200   66,966 bytes  MARKER PRESENT
           PREVIEW DEPLOYMENT · feat/plat-08-preview-environment · cc79020
production /login  (buddy.ian.ng)             200   65,039 bytes  marker absent
preview    /login  (NO bypass header)         302       15 bytes  marker absent
                                              -> vercel.com/sso-api, then a
                                                 482,394-byte Vercel login page
preview    /sprints                           307       15 bytes  marker absent
preview    /definitely-not-a-real-route-xyz   307       15 bytes  marker absent
```

The last two are the whole point of this item. A real route and a nonsense route
return the _same_ 307 with the _same_ 15-byte body — which is exactly how a
redirect was read as a working page earlier this sprint.

**hellokahwin** — same shape, plus a structural comparison, because a content
site can return 200 and render nothing:

```
preview    /artikel/hantaran-mas-kahwin/duit-hantaran-kahwin  200  129,922 bytes  MARKER PRESENT
           PREVIEW DEPLOYMENT · ianng89/hk-plat08-preview · de6724a · read-only database
production same path                                         200  129,227 bytes  marker absent
preview    same path, no bypass header                       302       15 bytes  marker absent
preview    /admin                                            500       98 bytes  marker absent
```

|                           | preview     | production  |
| ------------------------- | ----------- | ----------- |
| `<h2>` / `<h3>` / `<img>` | 8 / 12 / 11 | 8 / 12 / 11 |
| `/artikel/` links         | 43          | 43          |
| `<title>`                 | identical   | identical   |
| bytes                     | 129,922     | 129,227     |

The 695-byte delta is the banner.

## What shipped in code

- **buddy** `.github/workflows/deploy-preview.yml`, `apps/web/lib/preview-banner.ts`
  (+5 tests), `apps/web/components/preview-banner.tsx`, `apps/web/app/layout.tsx`.
- **hellokahwin** `src/lib/preview/banner.ts` (+5 tests),
  `src/components/common/preview-banner.tsx`, `src/app/layout.tsx`.
- **`/tokens` registry** — `buddy-web` added (it was never listed), preview env
  tables for both projects with safe / not-safe to share per var, the read-only
  role, and both bypass secrets.

Every page of a preview now carries `PREVIEW DEPLOYMENT · branch · sha`, so a
preview tab cannot be mistaken for production. The rule is a pure function with
five tests on each side, because the bug worth preventing is a truthiness check
on `VERCEL_ENV` — it is set in production too, to `"production"`.

---

## Retrospective

### What we learned that is not written down

**The one that actually got past me: a qualifier is part of the measurement.**
Every number in the first report was correct, and the 302-without-bypass was
sitting in my own negative controls. What was wrong was the sentence on top —
"working preview URL" — because it described the bare URL and my 200 came from
sending a secret header. The CEO opened the link, got a Vercel login page, and
reopened the item. **An accurate table under an inaccurate headline is a false
report**, and the headline is the only part most readers see. When a measurement
needs a header, a cookie or a session to reproduce, the condition belongs in the
claim itself, not in a row further down.

(Worth separating from the CEO's diagnosis, which was that I had measured while
holding a Vercel session. I had not — every probe used a fresh cookie jar and
this environment has no browser session. The 200 was real; it was the _bare URL_
claim that was not. Both things being true at once is exactly why the qualifier
mattered.)

**A 200 is not health either.** The sprint's existing rule is "a 307 is not
health" — `/sprints` and `/definitely-not-a-real-route-xyz` both redirect.
Tonight went one rung up: the first hellokahwin preview returned **200** _and_
contained the exact marker string the change added, and rendered **zero
articles**. It passed every check we had written down and was still broken. The
only thing that caught it was counting elements against production: 16,052 bytes
and 0 article links, versus 68,218 and 26.

**A blocker recorded once is a fact with an expiry date.** The 22 Aug note said
hellokahwin previews could not be populated without putting a secret on a command
line. It was true of `vercel env add` and false of the REST API, and nobody
re-tested it for five days while the item sat carried-over and unassigned. The
registry now says _use the API, not the CLI_ — and says why the old note was
wrong, so the next reader does not re-derive it.

**Vercel's env LIST endpoint ignores `decrypt=true`.** Only the single-env
`GET /v1/projects/{id}/env/{envId}` returns plaintext. Copying production values
into preview off the list endpoint writes the **ciphertext blob** as the value,
silently, and its length is plausible enough not to notice. Caught by a
1,108-character "publishable key".

**A statically prerendered page bakes `VERCEL_ENV` at build time.** buddy's
`/login` is `○ (Static)`, so `vercel deploy --meta githubCommitRef=…` — which
sets the _runtime_ system env — is far too late. The git metadata has to be
written into `.vercel/.env.preview.local` before `vercel build`, because that is
the file `next build` reads.

**RLS-on-with-no-policies is a trapdoor for any new role.** hellokahwin's tables
are all RLS-enabled with zero policies and rely entirely on connecting as the
table owner. Nothing errors when a new role connects — it just sees an empty
database.

### Which document must change, and who owns the edit

**`skillcentral/skills/startsprint/SKILL.md`, Step 4 — owned by the BMAD agent,
and the edit is made in this run** (buddy `3ca2242`). Step 4 already carried "on
an auth-gated app a status code proves nothing". It now also carries **"a 200
carrying the right string is not health either"**, with the structural-comparison
method and the corollary that you must rebase before comparing.

Second: **`skillcentral/skills/tokens/registry.md` — same owner, edit made**
(buddy `80cebba`). It gained `buddy-web` (absent entirely until tonight), both
preview env tables with safe / not-safe marked per var, the read-only role and
why it needs `BYPASSRLS`, and the two bypass secrets.

### What we did twice

- **Wrote the preview env vars twice.** The first pass copied ciphertext, because
  the list endpoint ignores `decrypt=true`.
- **Deployed the hellokahwin preview three times** — once before the RLS problem
  was understood, once after the role was fixed, once after rebasing onto master
  so the structural comparison had a clean baseline.
- **Ran the buddy build twice locally**, which is the good kind: the first run
  failed on `Type 'ProcessEnv' has no properties in common with type 'PreviewEnv'`,
  and the fix (read the three vars by name) is better code than what it replaced.
- **Chased a wrong negative control.** `buddy-web.vercel.app` is a different
  project and 404s; the production domain is `buddy.ian.ng`. Two minutes, and the
  registry now says so.

### What we nearly shipped, and what caught it

**A report whose headline was wrong — and this one did ship.** It went out as
"working preview URL", the CEO clicked it, and got Vercel's login page. Nothing
in the run caught it; the CEO did. The fix is in the section above and the rule
is now in `startsprint`.

**A preview that returned 200, carried the banner, and had no content.** Caught
by comparing `/artikel/` link counts against production before writing anything
down. Had the report been written from the status code and the marker quote —
which is what the DoD literally asks for — it would have read as a clean pass,
and the first person to click the URL would have found an empty site. That is the
same failure this item exists to prevent, reproduced by the item itself.

Second, smaller: **a structural comparison that showed real differences that were
not a bug.** The branch was 13 commits behind master, so production genuinely had
more headings, images and internal links. Rebasing first turned an ambiguous
result into an exact one.

### One thing that is still open

`C:/Users/Ian Ng/Documents/Code/buddy` had **a second agent committing into it**
during this run. Three commits that are not PLAT-08's (`926c203`, `7d4caa1`,
`949f72c`, all `skillcentral/` docs) landed on the PLAT-08 branch, because a
branch is not isolation. They were left alone — CLAUDE.md forbids `reset` /
`stash` / `checkout --` as a rescue, and the authors may still be live on that
HEAD — and flagged on PR #43. The same run also found `gh`'s **active account
switched underneath it**, from `ianng89` to `ianngkb`, which is global machine
state; the fix that does not fight it is
`vault.ps1 run github.<account> -EnvVar GH_TOKEN -- gh …`, per command.

### Ship status at close of this run

- **buddy** — PR #43 **merged** as `bec3142`, with a **merge commit** rather than
  a squash so the four commits other agents wrote into this checkout reach `main`
  with their own authors (CLAUDE.md's rule, added by one of those very commits).
  `Deploy Production` succeeded on `bec3142`; production deployment
  `dpl_3wKgcHHbenRqrU6VYYe3g5ES1eHJ` READY at 21:16. Verified **by content on
  `main`**, not by ancestry: `deploy-preview.yml`, `preview-banner.tsx`,
  `preview-banner.ts`, its 5 tests, the registry and the `startsprint` rule are
  all present. `https://buddy.ian.ng/login` returns 200 with the banner
  **absent**, which is the correct production behaviour.
  The last preview built from the merged head — `d60b056`, which includes PLAT-06
  — self-verified in CI: `GET /login -> 200`, `preview banner present`.
- **hellokahwin** — PR #4 **open**. Nothing about the preview environment is
  waiting on it: the preview-scoped env vars and `hk_preview_ro` are live on
  Vercel now, and previews build today where every one before this run was
  CANCELED or ERROR. Only the banner is in the PR, and merging it deploys the
  live public site, so that is the owner's call rather than mine at 2am.
- **PLAT-08 is left `in_progress` in the tracker.** The CEO reopened it and said
  not to re-mark it; five evidence rows are attached, including the correction
  and the protection decision.
