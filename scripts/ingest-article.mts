/**
 * Turn an approved article file into a row in the database — Stage 7 of the
 * content production workflow.
 *
 *   pnpm ingest <file.md> --db <url>            # validate + plan only (default)
 *   pnpm ingest <file.md> --db <url> --commit   # write
 *   pnpm ingest <file.md> --db <url> --commit --update   # allow overwriting
 *
 * Committing to a non-local database REFUSES if the checkout is behind
 * origin/master: ingest runs from the checkout, not the deployed app, and a
 * stale one deletes live image renditions. See assertIngestPipelineCurrent.
 *
 * The design goal is that publishing becomes BORING. Every judgement call is
 * made in the file by the people who own it, and this script makes none of its
 * own: it validates, refuses loudly with everything wrong at once, or writes.
 * It never invents a meta description, never guesses a category, never
 * publishes an image whose source it cannot name.
 *
 * SAFETY, same three guards as the pillar seed and for the same reason:
 *  1. Dry run is the default; writing needs `--commit`.
 *  2. `--db` is mandatory. No implicit DATABASE_URL, because that points at
 *     production and a script that defaults to production eventually runs
 *     against it by accident.
 *  3. Everything happens in ONE transaction. A half-ingested article — rows
 *     written, images missing — is worse than a refusal.
 *
 * It also does not PUBLISH. `status` defaults to draft in the file format;
 * putting a page in front of readers stays a board-approved act.
 */
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, dirname, basename, extname } from 'node:path';
import postgres from 'postgres';
import { marked } from 'marked';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { generateLqip } from '../src/lib/storage/lqip';
import { generateJSON } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import { InternalAwareLink, normaliseInternalLinkMarks } from '../src/lib/inspire/internal-links';
import UnderlineExtension from '@tiptap/extension-underline';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import ImageExtension from '@tiptap/extension-image';
import {
  parseArticleFile,
  allImages,
  creditLine,
  bodyInternalLinks,
  type ArticleImage,
  type ArticleBodyImage,
} from '../src/lib/inspire/article-file';
import {
  purgeVercelEdge,
  pathsInvalidatedByIngest,
  edgePurgeSuccessNotice,
  edgePurgeFailureNotice,
} from '../src/lib/cache/edge-purge';
import {
  submitSitemapToGsc,
  gscPropertyFor,
  gscSitemapUrlFor,
  gscSubmitSuccessNotice,
  gscSubmitFailureNotice,
  gscSubmitSkippedNotice,
} from '../src/lib/seo/gsc-sitemap';

// R2 and the variant pipeline are imported DYNAMICALLY, inside main(), after
// the environment has been settled by `bootstrapEnv()`. See the long comment
// there: both modules read process.env at module-load time, and a static
// import here would evaluate them before `--db` had been applied — which is
// exactly the defect this arrangement fixes.
type R2Module = typeof import('../src/lib/r2/client');
type VariantsModule = typeof import('../src/lib/storage/image-variants');
type SmartCropModule = typeof import('../src/lib/storage/smart-crop');

interface Args {
  file: string;
  db: string;
  commit: boolean;
  update: boolean;
  /**
   * Skip R2 entirely. LOCAL DATABASES ONLY — it writes `local://` URLs that no
   * browser can load, so letting it near a real database would create articles
   * with permanently broken images.
   */
  skipMedia: boolean;
  /**
   * Bypass the stale-checkout guard. Only for a checkout whose ingest path has
   * been independently confirmed current — see `assertIngestPipelineCurrent`.
   */
  allowStaleCheckout: boolean;
  /**
   * Actually set `status: published`. Without it, an article whose file says
   * `published` is inserted as a DRAFT and the run says so. Publishing is a
   * board-approved act and does not happen because a file asked for it.
   */
  publish: boolean;
  /** Base URL of a running site whose content caches should be dropped after the write. */
  revalidateUrl: string;
}

/** Hosts that are unambiguously a throwaway database on this machine. */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);

/**
 * Mirrors DEFAULT_PRESETS in lib/storage/image-variants.ts. Duplicated on
 * purpose: importing it would pull the module (and the global Drizzle client
 * it binds) back into this file's static graph, which is what bootstrapEnv
 * exists to prevent. Two lines of drift risk beats re-arming the defect.
 */
const DEFAULT_PRESET_FALLBACK: Record<string, { quality: number; maxWidth: number }> = {
  low: { quality: 30, maxWidth: 1200 },
  high: { quality: 80, maxWidth: 2400 },
};

function isLocalDb(url: string): boolean {
  try {
    return LOCAL_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

function parseArgs(argv: string[]): Args {
  let file = '';
  let db = '';
  let commit = false;
  let update = false;
  let skipMedia = false;
  let publish = false;
  let revalidateUrl = '';
  let allowStaleCheckout = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--db') db = argv[++i] ?? '';
    else if (a === '--revalidate-url') revalidateUrl = argv[++i] ?? '';
    else if (a === '--commit') commit = true;
    else if (a === '--dry-run') commit = false;
    else if (a === '--update') update = true;
    else if (a === '--skip-media') skipMedia = true;
    else if (a === '--publish') publish = true;
    else if (a === '--allow-stale-checkout') allowStaleCheckout = true;
    else if (!a.startsWith('--')) file = a;
  }
  const problems: string[] = [];
  if (!file) problems.push('no article file given: pnpm ingest <file.md> --db <url>');
  if (!db)
    problems.push(
      'no --db <postgres-url> given. There is deliberately no default: DATABASE_URL points at production.',
    );
  // `local://` URLs would render as broken images on a real site. The flag
  // exists for local verification and must never reach a hosted database.
  if (skipMedia && db && !isLocalDb(db))
    problems.push(
      '--skip-media only works against a local database. It writes placeholder image URLs that no browser can load.',
    );
  // A real run against a real database with no way to clear the caches would
  // write an article the site cannot show. Refuse up front rather than produce
  // a row nobody can see.
  if (commit && db && !isLocalDb(db) && !revalidateUrl)
    problems.push(
      '--revalidate-url is required when committing to a non-local database. Without it the article is written but the site keeps serving its cached pages, so nobody sees it.',
    );
  if (problems.length) {
    console.error(problems.map((p) => `  - ${p}`).join('\n'));
    process.exit(1);
  }
  return { file, db, commit, update, skipMedia, publish, revalidateUrl, allowStaleCheckout };
}

/**
 * Settle the environment BEFORE any module that reads it is loaded.
 *
 * TWO DEFECTS THIS FIXES, and they compounded — fixing either one naively
 * would have armed the other. Both were caught in review; neither was
 * theoretical.
 *
 * 1. **Nothing loaded `.env` at all.** `tsx` does not read env files, and this
 *    script never asked it to. Probed: with no loader, `R2_ACCESS_KEY_ID` and
 *    `R2_BUCKET_NAME` are both absent, so `getR2Client()` throws and the image
 *    half of ingest could not have worked — not "unproven", broken.
 *
 * 2. **`--db` did not actually control the target.** `getDefaultPresets()`
 *    reads through the GLOBAL Drizzle client in `lib/db/drizzle.ts`, which
 *    binds `process.env.DATABASE_URL` at module load and knows nothing about
 *    this script's flag. A run believed to be local would read from whatever
 *    DATABASE_URL happened to be — production, in any shell where it is set.
 *
 * The compounding: `.env` in this worktree holds the PRODUCTION DATABASE_URL.
 * Adding a bare `dotenv.config()` to fix (1) would have pointed the global
 * client at production while writes went to `--db`. A split-brain run reading
 * production and writing elsewhere is worse than either bug alone.
 *
 * So the order below is load-bearing and must not be rearranged:
 *   a. `--db` is written into process.env FIRST;
 *   b. the env files are then loaded WITHOUT override, so they can supply R2
 *      credentials but cannot touch DATABASE_URL;
 *   c. the assertion proves (b) held;
 *   d. only then are the env-reading modules imported.
 */
async function bootstrapEnv(
  dbUrl: string,
): Promise<{ r2: R2Module; variants: VariantsModule; smartCrop: SmartCropModule }> {
  // (a) One source of truth for the database target, set before anything reads it.
  process.env.DATABASE_URL = dbUrl;

  // (b) `override: false` is the whole safety property here, not a default to
  //     shrug at: it lets the files supply R2_* and CRON_SECRET while leaving
  //     the DATABASE_URL set above untouched.
  const dotenv = await import('dotenv');
  for (const file of ['.env.local', '.env']) {
    dotenv.config({ path: file, override: false, quiet: true });
  }

  // (c) Cheap, and it fails loudly rather than silently writing to the wrong
  //     database if dotenv's behaviour ever changes under us.
  if (process.env.DATABASE_URL !== dbUrl) {
    console.error(
      'Refusing: loading the environment changed the database target away from --db.\n' +
        'This would read one database and write another. Aborting before any write.',
    );
    process.exit(1);
  }

  // (d) Now safe to load the modules that bind env at import time.
  const [r2, variants, smartCrop] = await Promise.all([
    import('../src/lib/r2/client'),
    import('../src/lib/storage/image-variants'),
    import('../src/lib/storage/smart-crop'),
  ]);
  return { r2, variants, smartCrop };
}

/**
 * The image-quality presets, read over THIS script's connection.
 *
 * `getDefaultPresets()` from the variants module would do the same job through
 * the global Drizzle client. `bootstrapEnv` now points that client at the same
 * database, so it would be correct — but correct-by-coincidence, resting on a
 * global that some future import could rebind. Reading it here over the
 * connection this script opened makes `--db` the only thing that decides, and
 * removes the question.
 */
async function readPresets(
  sql: postgres.Sql,
  fallback: Record<string, { quality: number; maxWidth: number }>,
): Promise<Record<string, { quality: number; maxWidth: number }>> {
  try {
    const [row] = await sql<{ value: unknown }[]>`
      select value from admin_settings where key = 'image_quality_presets' limit 1`;
    if (row?.value) return row.value as Record<string, { quality: number; maxWidth: number }>;
  } catch {
    // Table may not exist on a fresh database — the built-in defaults stand.
  }
  return fallback;
}

function describeTarget(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}:${u.port || '5432'}${u.pathname}`;
  } catch {
    return '<unparseable url>';
  }
}

/** Fail with a list, in the same shape the validator uses. */
function refuse(problems: string[]): never {
  console.error(
    `\nRefusing to ingest. ${problems.length} problem${problems.length === 1 ? '' : 's'}:\n  - ` +
      problems.join('\n  - ') +
      '\n\nNothing was written.',
  );
  process.exit(1);
}

/**
 * The node vocabulary markdown can produce, and nothing more.
 *
 * Deliberately NOT `createArticleBaseExtensions()`: that list is built on
 * `novel`, which is ESM-only and cannot be loaded from a CLI script, and it
 * carries editor-side extensions (drag handles, slash commands) that have no
 * meaning here. These are the same direct `@tiptap/*` imports the server-side
 * renderer uses, so anything generated here is renderable by exactly the
 * vocabulary that renders it.
 *
 * The custom blocks (figureBlock and friends) are absent on purpose — markdown
 * never produces them, and the credited figures are appended below as plain
 * JSON, which needs no extension to construct.
 */
function markdownExtensions() {
  return [
    StarterKit,
    ImageExtension,
    InternalAwareLink.configure({ openOnClick: false, defaultProtocol: 'https' }),
    UnderlineExtension,
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
  ];
}

/**
 * Markdown → the TipTap JSON the site renders.
 *
 * Goes through HTML because `generateJSON` is the same function the editor
 * uses. Rolling a bespoke converter here would be the first step towards two
 * content shapes that render differently.
 */
function markdownToTiptap(markdown: string): unknown {
  const html = marked.parse(markdown, { async: false, gfm: true }) as string;
  const doc = generateJSON(html, markdownExtensions() as never[]);
  // `generateJSON` fills the missing rel/target from TipTap's Link defaults,
  // which are `rel="noopener noreferrer nofollow" target="_blank"` — so every
  // internal link a writer put in the markdown would be STORED nofollowed.
  // The renderer no longer emits that, but the row should not claim it either.
  normaliseInternalLinkMarks(doc);
  return doc;
}

/**
 * THE URL A READER'S BROWSER ACTUALLY FETCHES, which is not the same thing as
 * the URL of the file we uploaded.
 *
 * `next.config.ts` sets `images.unoptimized: true` — every variant is made by
 * Sharp at upload time, so Next serves the `src` byte-for-byte and there is no
 * image optimiser behind it to rescue a large one. Whatever goes in this
 * attribute is what a phone downloads.
 *
 * Ingest used to store `up.url`, the ORIGINAL upload. `getArticleVariantUrl`
 * in the renderer cannot rewrite that: its pattern only matches a URL already
 * ending in `high.webp` / `low.webp` / `original.<ext>`, and an original keyed
 * `…/1787-foto.jpg` matches none of them, so it is returned untouched and
 * served whole. Several of the sourced photographs are 12–15 MB. That is the
 * defect, and it is why this returns the `high` variant instead — which is
 * also the shape every one of the 29 existing articles already stores
 * (`…/<timestamp>-<name>/high.webp`), so the renderer's low/high swap works on
 * an ingested figure exactly as it does everywhere else.
 *
 * Falls back to the original only when there are no variants at all, which is
 * the `--skip-media` local path.
 */
function figureSrc(up: { url: string; variants: unknown }): string {
  const high = (up.variants as { high?: { url?: string } } | null)?.high?.url;
  return typeof high === 'string' && high ? high : up.url;
}

/**
 * Replace each markdown image with a figureBlock carrying the credit.
 *
 * The credit rides in `data-caption` / `data-caption-url` because that is the
 * node's existing visible-attribution slot, and the renderer already emits it
 * as a followed link (`rel="noopener noreferrer"`, no nofollow) — which the
 * approved strategy requires, since a nofollow credit is worth much less to the
 * vendor and vendor goodwill is what supplies the programme.
 */
function toFigureBlock(image: ArticleImage, url: string) {
  return {
    type: 'figureBlock',
    attrs: {
      src: url,
      alt: image.alt,
      'data-caption': creditLine(image),
      'data-caption-url': image.creditUrl ?? null,
    },
  };
}

/**
 * The body blocks with the credited figures put where the file asked for them.
 *
 * An image carrying `placeAfter: n` is inserted below the nth top-level block;
 * one without it is appended after the body, which is the behaviour every
 * existing file relies on. Insertions run from the LAST declared position
 * backwards so that each splice cannot shift an index that has not been used
 * yet — doing it forwards silently drifts every figure after the first by the
 * number of figures already inserted above it.
 */
function composeBody(
  bodyNodes: unknown[],
  images: ArticleBodyImage[],
  srcFor: (image: ArticleBodyImage) => string,
): unknown[] {
  const nodes = [...bodyNodes];
  const declared = images
    .map((image, index) => ({ image, index }))
    .filter((entry) => typeof entry.image.placeAfter === 'number')
    .sort((a, b) => b.image.placeAfter! - a.image.placeAfter! || b.index - a.index);
  for (const { image } of declared) {
    nodes.splice(image.placeAfter!, 0, toFigureBlock(image, srcFor(image)));
  }
  const appended = images
    .filter((image) => typeof image.placeAfter !== 'number')
    .map((image) => toFigureBlock(image, srcFor(image)));
  return [...nodes, ...appended];
}

/**
 * Refuse to ingest from a checkout whose IMAGE PIPELINE is behind origin/master.
 *
 * WHY THIS EXISTS — CONT-15 / UI-16, 02 Sept 2026, measured twice on a stopwatch.
 *
 * This script does NOT run inside the deployed app. It runs from whatever
 * checkout the operator is standing in, and `processSmartCrops` REPLACES the
 * whole `cover_image_smart_crops` object rather than merging into it. So an
 * ingest from a stale checkout does not merely skip a new rendition rung — it
 * DELETES the rung the live site is already serving, with no deploy and no
 * code change to show for it.
 *
 *   19:51  UI-16 ships `crop-4x3-article-card-md` and deploys it (5c18c74).
 *   20:12  Six articles ingested from checkouts cut BEFORE that commit; all
 *          six land without `-md`. The renderer falls through to the full
 *          1600x1200 crop: 4,742,962 B across six covers, on the LCP element,
 *          about 12.5x the asset the previous code served.
 *   20:38  Backfilled. Audit green: low 102/102, md 102/102, exit 0.
 *   20:52  One article re-ingested from a stale checkout.
 *   21:00  Audit red again, the same six, both columns. 22 minutes.
 *
 * `crop-4x3-article-card-sm` survived all of it precisely because that rung has
 * been on master since Sprint 05, so even the stale checkouts had it. That is
 * the signature: the OLD rungs live, the NEW rung dies.
 *
 * At the time of writing, 10 of 16 site-line checkouts lacked the fix — the
 * main clone among them, 28 commits behind. No deployed fix can reach any of
 * them, which is why this guard lives in the thing that actually runs.
 *
 * IT FIRES ON THE SYMPTOM, NOT ON REF DISTANCE. A checkout can sit behind
 * master for a hundred reasons that never touch ingest, and a guard that blocks
 * all of them teaches people to type the override reflexively. So this compares
 * the ingest-relevant sources against origin/master and refuses only when THOSE
 * differ — naming the rendition rungs that would actually be destroyed.
 *
 * Scope: only when WRITING (`--commit`) to a NON-LOCAL database. Dry runs and
 * local development are never blocked.
 */
const INGEST_PIPELINE_PATHS = [
  'src/lib/storage/midsize-cover.ts',
  'src/lib/storage/smart-crop.ts',
  'src/lib/storage/image-variants.ts',
  'src/lib/storage/lqip.ts',
  'scripts/ingest-article.mts',
];

function renditionNames(source: string): string[] {
  return [...source.matchAll(/NAME:\s*'([^']+)'/g)].map((m) => m[1]).sort();
}

function assertIngestPipelineCurrent(args: Args): void {
  if (!args.commit || isLocalDb(args.db) || args.allowStaleCheckout) return;

  const git = (...a: string[]) =>
    execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

  let head: string;
  try {
    head = git('rev-parse', 'HEAD');
  } catch {
    refuse([
      'cannot determine which git checkout this ingest is running from. Ingest writes image renditions ' +
        'generated by THIS checkout, and a stale one silently deletes renditions the live site depends ' +
        'on. Run it from inside the repository, or pass --allow-stale-checkout if you have ' +
        'independently confirmed the image pipeline here is current.',
    ]);
  }

  // A stale checkout has a stale `origin/master` ref too, so the ref must be
  // refreshed before it can be trusted. That is the whole trap.
  try {
    git('fetch', '--quiet', 'origin', 'master');
  } catch {
    refuse([
      'could not fetch origin/master to verify this checkout. Ingest from a stale checkout DELETES ' +
        'image renditions the live site is serving, so an unverifiable checkout is refused rather ' +
        'than trusted. Restore the network, or pass --allow-stale-checkout if you have independently ' +
        'confirmed the image pipeline here is current.',
    ]);
  }
  const master = git('rev-parse', 'FETCH_HEAD');

  let drifted: string[];
  try {
    drifted = git('diff', '--name-only', head, master, '--', ...INGEST_PIPELINE_PATHS)
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    return; // cannot compare (shallow clone, missing objects) — do not block on it
  }
  if (drifted.length === 0) return;

  // Name what would actually be destroyed, so the override is a decision
  // rather than a habit.
  let lost: string[] = [];
  try {
    const mine = renditionNames(git('show', `${head}:src/lib/storage/midsize-cover.ts`));
    const theirs = renditionNames(git('show', `${master}:src/lib/storage/midsize-cover.ts`));
    lost = theirs.filter((n) => !mine.includes(n));
  } catch {
    lost = [];
  }

  const behind = git('rev-list', '--count', `${head}..${master}`);
  const detail = lost.length
    ? `this checkout writes ${lost.length === 1 ? 'one fewer rendition' : `${lost.length} fewer renditions`} ` +
      `than origin/master. Publishing would DELETE ${lost.join(', ')} from every row it touches.`
    : 'the image pipeline here differs from origin/master, so the renditions this run writes may not ' +
      'match what the live site expects.';

  refuse([
    `the image pipeline in this checkout is behind origin/master (${behind} commit${behind === '1' ? '' : 's'}), ` +
      'and ingest runs from the checkout rather than from the deployed app, replacing each row’s ' +
      `smart-crop object wholesale. ${detail}\n` +
      `      HEAD           ${head.slice(0, 7)}\n` +
      `      origin/master  ${master.slice(0, 7)}\n` +
      `      drifted        ${drifted.join('\n                     ')}\n` +
      '      Fix:  git merge --ff-only origin/master   (or rebase onto it), then re-run.\n' +
      '      Override, only if you have confirmed the ingest path is unchanged:  --allow-stale-checkout',
  ]);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  assertIngestPipelineCurrent(args);

  // Before anything else touches the environment. See bootstrapEnv().
  const {
    r2: r2Module,
    variants: variantsModule,
    smartCrop: smartCropModule,
  } = await bootstrapEnv(args.db);

  // CRON_SECRET can only be checked AFTER the env files are loaded — it lives
  // in one of them. Still strictly before any write: discovering it missing
  // once the row is in the database leaves the article written and the site
  // stale, which is the half-done state this script exists to avoid.
  if (args.revalidateUrl && !process.env.CRON_SECRET) {
    console.error(
      '  - --revalidate-url was given but CRON_SECRET is not set in the environment or in ' +
        '.env.local / .env, so the caches could not be cleared after the write.',
    );
    process.exit(1);
  }

  // VERCEL_TOKEN is checked here too, and DELIBERATELY only warns where
  // CRON_SECRET refuses. The two failures are not the same size: without
  // CRON_SECRET the origin never rebuilds and the article is invisible
  // indefinitely, which is the half-done state this script exists to prevent.
  // Without VERCEL_TOKEN the origin is correct and only the CDN copy lags — up
  // to five minutes on the pillar, an hour on the sitemap — so refusing would
  // block a correct publish over a bounded staleness. Said before the write,
  // not after, so the operator can stop and re-run under the vault rather than
  // discover it once the row is in.
  if (args.revalidateUrl && !process.env.VERCEL_TOKEN) {
    console.warn(
      '⚠ VERCEL_TOKEN is not set, so the Vercel EDGE cache will NOT be purged after the\n' +
        '  write. The article will be correct at the origin but the pillar page can serve a\n' +
        '  pre-publish copy for up to 5 minutes and the sitemap for up to an hour.\n' +
        '  To purge it, re-run under the vault:\n' +
        '    vault.ps1 run vercel.twn -EnvVar VERCEL_TOKEN -Cmd pwsh,"-NoProfile","-Command",\'<ingest command>\'\n',
    );
  }

  // And the same again for the Google credential, WARN not refuse, for the same
  // reason: the article is correct and live either way, and only the
  // announcement is lost. Said BEFORE the write so the operator can stop and
  // supply it, rather than discover it once the row is in and the caches are
  // already dropped.
  //
  // Not a hard failure, but not a small one either — this is the difference
  // between publishing and publishing into a drawer. Four articles were live
  // for a day on 26 Aug 2026 while Search Console reported `URL is unknown to
  // Google` for every one of them.
  if (
    args.revalidateUrl &&
    !process.env.GSC_SERVICE_ACCOUNT_JSON &&
    !process.env.GSC_CREDENTIALS_PATH
  ) {
    console.warn(
      '⚠ No GSC credential (GSC_SERVICE_ACCOUNT_JSON or GSC_CREDENTIALS_PATH), so Google\n' +
        '  will NOT be asked to re-read the sitemap. The article will be live and in the\n' +
        '  sitemap, but Google finds it on its own schedule — days, on this property.\n' +
        '  To supply it:\n' +
        '    $env:GSC_CREDENTIALS_PATH = "$HOME/.claude/secrets/gsc-service-account.json"\n' +
        '  or inject GSC_SERVICE_ACCOUNT_JSON from Doppler (project hellokahwin, config prd).\n',
    );
  }

  const filePath = resolve(args.file);
  const fileDir = dirname(filePath);

  const raw = await readFile(filePath, 'utf8');
  // Throws ArticleFileError listing every problem — including any image whose
  // credit, licence class or licensor is missing. This is the gate.
  const { frontMatter, markdown } = parseArticleFile(raw);

  console.log(`File:   ${basename(filePath)}`);
  console.log(`Target: ${describeTarget(args.db)}`);
  console.log(args.commit ? 'Mode:   COMMIT (will write)\n' : 'Mode:   DRY RUN (no writes)\n');

  const sql = postgres(args.db, { prepare: false, max: 2 });
  const problems: string[] = [];

  // ── Resolve everything BEFORE writing anything ──────────────────────────

  const [pillar] = await sql<{ id: string; name: string; slug: string }[]>`
    select id, name, slug from inspire_categories where pillar_code = ${frontMatter.pillar}`;
  if (!pillar)
    problems.push(
      `pillar ${frontMatter.pillar} does not exist in this database — run scripts/seed-pillars.ts first`,
    );

  const [cluster] = await sql<{ id: string; name: string; parent_id: string | null }[]>`
    select id, name, parent_id from inspire_categories where pillar_code = ${frontMatter.cluster}`;
  if (!cluster) problems.push(`cluster ${frontMatter.cluster} does not exist in this database`);
  else if (pillar && cluster.parent_id !== pillar.id)
    problems.push(
      `cluster ${frontMatter.cluster} does not belong to pillar ${frontMatter.pillar} — check the cluster plan`,
    );

  const [author] = await sql<{ id: string }[]>`
    select id from profiles where id = ${frontMatter.author} or email = ${frontMatter.author} limit 1`;
  if (!author) problems.push(`author "${frontMatter.author}" matches no profile`);

  const [existing] = await sql<{ id: string }[]>`
    select id from articles where slug = ${frontMatter.slug} limit 1`;
  if (existing && !args.update)
    problems.push(
      `an article already exists at slug "${frontMatter.slug}". Pass --update to overwrite it deliberately.`,
    );

  // Internal links are validated, never invented. A link to an unpublished or
  // non-existent article is a dead link on a page we are asking Google to
  // trust, so it refuses the file rather than shipping it.
  for (const link of frontMatter.internalLinks) {
    const [target] = await sql<{ slug: string }[]>`
      select slug from articles where slug = ${link.slug} and status = 'published' limit 1`;
    if (!target) {
      // A hub slug here is the common case, not a typo, and the generic message
      // sent one run hunting for a dead link that was in fact a live page.
      // Pillar and cluster hubs are categories, not articles, so they can never
      // resolve — and they never needed to. Say so.
      const [hub] = await sql<{ slug: string; pillar_code: string | null }[]>`
        select slug, pillar_code from inspire_categories where slug = ${link.slug} limit 1`;
      problems.push(
        hub
          ? `internalLinks: "${link.slug}" is a CATEGORY hub (${hub.pillar_code ?? 'no pillar code'}), not an article, ` +
              `so it cannot resolve here — /artikel/${hub.slug} is live regardless. Link it from the body prose instead, ` +
              `or drop this entry: internalLinks is validated, never rendered.`
          : `internalLinks: no published article with slug "${link.slug}" — fix the link or publish the target first`,
      );
    }
  }

  // And the links written in the PROSE, which went unchecked until review
  // caught it. Only the front-matter list was validated, which is the wrong way
  // round on this site: the whole pillar/cluster design exists to make internal
  // link structure load-bearing, so a dead link in the body is a defect in the
  // thing being built, not a cosmetic slip.
  for (const slug of bodyInternalLinks(markdown)) {
    const [target] = await sql<{ slug: string }[]>`
      select slug from articles where slug = ${slug} and status = 'published' limit 1`;
    if (!target)
      problems.push(
        `body link: no published article with slug "${slug}" — fix the link in the article text, or publish the target first`,
      );
  }

  // Image files must exist on disk before anything is uploaded.
  const images = allImages(frontMatter);
  const imageBuffers = new Map<string, Buffer>();
  for (const image of images) {
    const imagePath = resolve(fileDir, image.file);
    try {
      imageBuffers.set(image.file, await readFile(imagePath));
    } catch {
      // Names the resolved path, not just the declared one. The two ways this
      // fails look identical in the front matter and need opposite fixes:
      // a graphic that was specified but never rendered (Stage 6b did not
      // finish — go render it, or stage a copy without it and record the gap),
      // and a path that is right relative to the wrong directory, which is what
      // a staging copy one level down does to every `images/…` entry.
      problems.push(
        `image not found: ${image.file}\n      resolved to: ${imagePath}\n` +
          `      (a declared-but-never-rendered graphic, or a path relative to the wrong directory — ` +
          `paths resolve against the ARTICLE FILE, not the drafts root)`,
      );
    }
  }

  // --publish ON A FILE THAT SAYS `status: draft` IS A CONTRADICTION, AND IT
  // USED TO RESOLVE SILENTLY IN FAVOUR OF THE FILE.
  //
  // CONT-13, 1 Sept 2026. An article was ingested to production with --commit
  // --publish --revalidate-url and every step succeeded: images uploaded, caches
  // dropped, the Vercel edge purged, Google asked to re-read the sitemap. The
  // run printed `Status:  draft` on line 4 of a twenty-line success report and
  // `Done. /artikel/... (draft)` at the end, and nothing else marked it. The
  // article was not in the sitemap, not on the pillar page, and not reachable by
  // a reader. The operator had asked to publish; the file's YAML said draft; the
  // tool did the file's bidding and reported success.
  //
  // The asymmetry is the whole point. `status: published` WITHOUT --publish is a
  // file asking for something the operator did not authorise, and the existing
  // note on that line handles it correctly. --publish WITHOUT `status: published`
  // is the operator authorising something the file did not ask for, which is
  // never intentional: nobody types --publish meaning "leave it a draft". So it
  // is refused rather than warned about, because a warning inside a success
  // report is exactly what did not fire the first time.
  if (args.publish && frontMatter.status !== 'published')
    problems.push(
      `--publish was passed but the file says \`status: ${frontMatter.status ?? 'draft'}\`.\n` +
        `      Nothing would reach a reader: the article is written as a draft, and the\n` +
        `      sitemap, the pillar page and every category listing select on\n` +
        `      status = 'published'.\n` +
        `      Set \`status: published\` in the front matter, or drop --publish if you meant\n` +
        `      to stage a draft.`,
    );

  // The body, converted once and reused for the write. Done HERE, before the
  // refuse gate, so a `placeAfter` pointing past the end of the article is
  // caught with everything else rather than after 15 MB has gone to R2.
  const content = markdownToTiptap(markdown) as { type: string; content?: unknown[] };
  const bodyNodes = content.content ?? [];
  for (const image of frontMatter.images) {
    if (typeof image.placeAfter === 'number' && image.placeAfter > bodyNodes.length)
      problems.push(
        `${image.file}: placeAfter is ${image.placeAfter} but the body has only ` +
          `${bodyNodes.length} top-level blocks`,
      );
  }

  if (problems.length) {
    await sql.end();
    refuse(problems);
  }

  console.log(`Pillar:  ${pillar.name} (${frontMatter.pillar})`);
  console.log(`Cluster: ${cluster.name} (${frontMatter.cluster})`);
  // A file may ASK to be published; only --publish makes it so. Putting a page
  // in front of readers is a board-approved act and does not happen because a
  // YAML field said `published`.
  const effectiveStatus =
    frontMatter.status === 'published' && args.publish ? 'published' : 'draft';
  console.log(
    `Status:  ${effectiveStatus}` +
      (frontMatter.status === 'published' && !args.publish
        ? '  (file asks for published; pass --publish to honour it)'
        : ''),
  );
  // Defaults to 'ai' via the schema — everything arriving here came through the
  // agent pipeline unless the file explicitly says otherwise. Every ingested
  // article lands at `pending_review` regardless of what this says, so declaring
  // `human` does not buy a writer a way past the owner's queue.
  const authorship = frontMatter.authorship;
  console.log(`Author:  ${authorship} · review_status pending_review`);
  console.log(`Images:  ${images.length}, every one credited`);
  for (const image of images) {
    console.log(
      `  ${image.file}  →  "${image.credit}" [${image.licenseClass}] ${image.licensorName}`,
    );
  }
  console.log(`Tags:    ${frontMatter.tags.join(', ') || '(none)'}`);
  console.log(`Links:   ${frontMatter.internalLinks.length} internal, all resolved`);
  console.log(`URL:     /artikel/${pillar.slug}/${frontMatter.slug}`);

  if (!args.commit) {
    console.log('\nDry run — nothing written. Re-run with --commit to apply.');
    await sql.end();
    return;
  }

  // ── Upload through the EXISTING pipeline ────────────────────────────────
  //
  // `generateVariants` is what the admin uploader runs and what produced the
  // derivatives already in the bucket. Ingest calls it rather than writing a
  // second uploader, so there is one place where an image becomes web-ready.
  const uploaded = new Map<
    string,
    {
      url: string;
      key: string;
      variants: unknown;
      lqip?: string | null;
      smartCrops?: unknown;
      focalPoint?: unknown;
      detectionData?: unknown;
      width?: number;
      height?: number;
      size: number;
    }
  >();
  // One timestamp for the whole run, so every image of an article shares a
  // prefix and a re-ingest is visibly a new generation rather than a partial
  // overwrite of the last one.
  const uploadStamp = Date.now();
  if (!args.skipMedia) {
    const r2 = r2Module.getR2Client();
    const bucket = r2Module.getR2Bucket();
    const publicUrl = r2Module.getR2PublicUrl();
    // Read over THIS script's connection, not the global one — `--db` decides.
    const presets = await readPresets(sql, DEFAULT_PRESET_FALLBACK);

    for (const image of images) {
      const buffer = imageBuffers.get(image.file)!;
      const ext = (extname(image.file) || '.jpg').toLowerCase();
      // Slug derived from the DECLARED PATH, not the basename: two images named
      // `hero.jpg` in different folders produced the same key before review
      // caught it, and the second silently overwrote the first under an
      // immutable cache header. Stripping to [a-z0-9-] also disposes of spaces,
      // Unicode, `?` and `#`, any of which would otherwise produce a key that
      // cannot be fetched back.
      const name = image.file
        .replace(/^\.\/+/, '')
        .replace(/\.[^.]+$/, '')
        .normalize('NFKD')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();
      // MATCHES THE EXISTING BUCKET SHAPE, verified against real objects:
      //   inspire/amankila-bali/1787396256716-cover.jpg
      //   inspire/amankila-bali/1787396256716-cover/crop-16x9-og.webp
      // The timestamp is what makes a re-ingest write a NEW object rather than
      // overwrite one already served under `max-age=31536000, immutable` — a
      // replaced byte-stream at a cached URL is unfixable for a year.
      const base = `${uploadStamp}-${name || 'image'}`;
      const key = `inspire/${frontMatter.slug}/${base}${ext}`;
      const meta = await sharp(buffer).metadata();

      await r2.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: `image/${(meta.format ?? 'jpeg').replace('jpg', 'jpeg')}`,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
      const variants = await variantsModule.generateVariants(buffer, key, presets);

      // The named crops every existing article uses. Without this an ingested
      // cover rendered through the generic fallback while all 29 existing
      // articles used crop-16x9-og / crop-4.3x1-desktop-hero / …, so the first
      // ingested article would have looked visibly unlike the rest of the site.
      // Rekognition is optional (REKOGNITION_ENABLED=false falls back to the
      // Sharp saliency focal point), so this works without AWS.
      let smartCrops: unknown = null;
      let focalPoint: unknown = null;
      let detectionData: unknown = null;
      try {
        const crops = await smartCropModule.processSmartCrops(key, { originalBuffer: buffer });
        smartCrops = crops.smartCrops;
        focalPoint = crops.focalPoint;
        detectionData = crops.detectionData;
        console.log(`  uploaded ${image.file} (+${Object.keys(crops.smartCrops).length} crops)`);
      } catch (err) {
        // The variants are already up and the article is usable; losing the
        // crops costs framing, not the image. Say so rather than hide it.
        console.warn(
          `  uploaded ${image.file} BUT smart crops failed: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }

      // Blur placeholder. Derived from the same 4:3 crop the card renders
      // (falling back to the original when crops failed above), so the blur
      // and the photograph that replaces it are framed identically.
      const cardCropUrl = (smartCrops as Record<string, { url: string }> | null)?.[
        'crop-4x3-article-card'
      ]?.url;
      let lqip: string | null = null;
      try {
        lqip = cardCropUrl
          ? await generateLqip(Buffer.from(await (await fetch(cardCropUrl)).arrayBuffer()))
          : await generateLqip(buffer);
      } catch (err) {
        // Say it rather than hide it: a null placeholder is the old flat
        // plate, which is a degradation, not a broken article.
        console.warn(
          `  no blur placeholder for ${image.file}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      uploaded.set(image.file, {
        url: `${publicUrl}/${key}`,
        key,
        variants,
        lqip,
        smartCrops,
        focalPoint,
        detectionData,
        width: meta.width,
        height: meta.height,
        size: buffer.length,
      });
    }
  } else {
    console.log('\n--skip-media: images are NOT uploaded; media rows reference local paths.');
    for (const image of images) {
      uploaded.set(image.file, {
        url: `local://${frontMatter.slug}/${image.file}`,
        key: `local/${frontMatter.slug}/${image.file}`,
        variants: null,
        size: imageBuffers.get(image.file)!.length,
      });
    }
  }

  // The credited figures, placed where the approved file asked for them and
  // appended after the body when it did not ask. Ingest still guesses nothing.
  const contentWithFigures = {
    ...content,
    content: composeBody(bodyNodes, frontMatter.images, (image) =>
      figureSrc(uploaded.get(image.file)!),
    ),
  };

  const cover = uploaded.get(frontMatter.cover.file)!;

  // ── WHAT `articles.content` IS, FOR ANYONE WRITING IT BY HAND ────────────
  //
  // A ProseMirror/TipTap DOCUMENT: `{ type: 'doc', content: [ …block nodes ] }`.
  // Never an HTML string. Not for the WordPress-migrated rows either, which is
  // the belief that keeps coming back. Census on production, 26 Aug 2026:
  //
  //   shape   doc_type  wordpress_migrated  rows
  //   object  doc       true                29
  //   object  doc       false               32
  //
  //   select jsonb_typeof(content), content->>'type', wp_id is not null,
  //          count(*) from articles group by 1,2,3;
  //
  // Zero rows have ever held a jsonb string except the eight the
  // double-encoding bug below produced, and those were objects that had been
  // stringified — not HTML.
  //
  // WHY THIS IS WRITTEN DOWN. `kursus-kahwin` is a WordPress row and its fee
  // section was replaced on 26 Aug from a written instruction that described
  // the column as "a legacy jsonb object holding a TipTap HTML string" and gave
  // an HTML find-string to substring-replace. That instruction cannot be
  // followed, and the near-miss is the point: the obvious way to make it
  // followable is to render the document to HTML, patch the string, and write
  // it back — which rewrites all 18 `image` nodes on that row with the Next.js
  // Image attributes (`data-nimg`, `loading`, generated `class`/`style`) that
  // exist only in the render. The same instruction forbids exactly that
  // collateral edit, two paragraphs above the method that causes it.
  //
  // SO: to edit a legacy row by hand, walk `doc.content`, splice the nodes, and
  // carry every other node across by identity. Build replacement nodes with
  // `generateJSON(html, markdownExtensions())` — the function `markdownToTiptap`
  // above uses — so hand-written sections and ingested ones are the same shape
  // rather than two shapes that render differently. Then assert it: the node
  // count outside the spliced window, and the `image` nodes, must be
  // byte-identical before and after.
  //
  // The one other place that repeats the HTML-string belief is the header
  // comment of `scripts/audit-internal-links.mts` ("the raw TipTap HTML string
  // the WordPress-migration rows carry"). Its `typeof content === 'string'`
  // branch is unreachable against this database — harmless as defence, wrong as
  // documentation.
  //
  // ── EVERY jsonb PARAMETER BELOW GOES THROUGH `sql.json()`. DO NOT
  //    "SIMPLIFY" IT BACK TO `JSON.stringify()`. ────────────────────────────
  //
  // postgres.js reads the `::jsonb` cast that follows a placeholder and uses it
  // to type the PARAMETER, then serialises the value with that type's
  // serializer — and the json serializer is `JSON.stringify`. Hand it a string
  // that has ALREADY been stringified and it stringifies it a second time, so
  // Postgres receives `"{\"type\":\"doc\"}"` and stores a jsonb STRING
  // scalar instead of the object. Probed against a real database:
  //
  //   ${JSON.stringify(doc)}::jsonb   ->  jsonb_typeof = string   (the bug)
  //   ${JSON.stringify(doc)}::text::jsonb -> object  (the cast decides, not the value)
  //   ${sql.json(doc)}::jsonb         ->  jsonb_typeof = object   (correct)
  //
  // This shipped: all eight articles ingested on 24 Aug stored `content`,
  // `cover_image_variants`, `cover_image_smart_crops`, `media.variants` and
  // their siblings as jsonb strings, while all 29 legacy articles held objects.
  // It hid for a day because Drizzle's `jsonb` column runs `JSON.parse` on a
  // string value on the way out, so every RENDER path saw a proper document and
  // nothing looked wrong. What does not recover is SQL: `content->'content'` is
  // NULL on a string row, so any query, migration, backfill or audit that
  // reaches into the document silently sees an empty article.
  //
  // The `as never` casts are only there because these values are typed
  // `unknown` upstream; they carry no runtime meaning.
  // Hoisted out of the transaction closure: what the write actually DID is the
  // input to the publishing steps below (which caches to drop, and whether
  // Google has anything to be told about). Read after `sql.begin` resolves, so
  // it is only ever consulted for a transaction that committed.
  let wrote: { inserted: boolean; contentChanged: boolean } | null = null;

  await sql.begin(async (tx) => {
    const [row] = await tx<{ id: string; inserted: boolean; content_changed: boolean }[]>`
      insert into articles
        (title, slug, excerpt, content, cover_image_url, cover_image_variants,
         cover_image_smart_crops, cover_image_focal_point, cover_image_detection_data,
         cover_image_lqip,
         meta_description, status, author_id, primary_category_id, published_at,
         authorship, review_status, is_ai_generated)
      values
        (${frontMatter.title}, ${frontMatter.slug}, ${frontMatter.excerpt ?? null},
         ${sql.json(contentWithFigures as never)}::jsonb, ${cover.url},
         ${cover.variants ? sql.json(cover.variants as never) : null}::jsonb,
         ${cover.smartCrops ? sql.json(cover.smartCrops as never) : null}::jsonb,
         ${cover.focalPoint ? sql.json(cover.focalPoint as never) : null}::jsonb,
         ${cover.detectionData ? sql.json(cover.detectionData as never) : null}::jsonb,
         ${cover.lqip ?? null},
         ${frontMatter.metaDescription}, ${effectiveStatus}, ${author.id}, ${pillar.id},
         ${effectiveStatus === 'published' ? (frontMatter.publishedAt ?? new Date().toISOString()) : null},
         ${authorship}::article_authorship,
         'pending_review'::article_review_status,
         ${authorship !== 'human'})
      on conflict (slug) do update set
        title = excluded.title,
        excerpt = excluded.excerpt,
        content = excluded.content,
        cover_image_url = excluded.cover_image_url,
        cover_image_variants = excluded.cover_image_variants,
        cover_image_smart_crops = excluded.cover_image_smart_crops,
        cover_image_focal_point = excluded.cover_image_focal_point,
        cover_image_detection_data = excluded.cover_image_detection_data,
        cover_image_lqip = excluded.cover_image_lqip,
        meta_description = excluded.meta_description,
        status = excluded.status,
        primary_category_id = excluded.primary_category_id,
        -- These three were MISSING, and their absence had teeth. Re-ingesting a
        -- draft with --publish flipped the status to published while leaving
        -- published_at NULL: a live article with no date, a wrong sitemap
        -- lastmod, and a JSON-LD datePublished of null. The approved author was
        -- silently ignored on update too, so a byline correction in the file
        -- never reached the page.
        author_id = excluded.author_id,
        published_at = excluded.published_at,
        -- Re-ingested after an edit, the article is AI content again and goes
        -- BACK in the owner's queue. Carrying a previous "reviewed" forward
        -- would mean a human sign-off silently covering text they never read —
        -- the one outcome this whole tag exists to prevent.
        -- (No backticks in this comment: it lives inside a tagged template
        -- literal, where a backtick would terminate the SQL string.)
        authorship = excluded.authorship,
        review_status = excluded.review_status,
        reviewed_at = null,
        reviewed_by = null,
        -- Compat mirror for rollback safety — removed in the follow-up migration that drops these columns.
        is_ai_generated = excluded.is_ai_generated,
        human_reviewed_at = null,
        -- ── updated_at IS THE SITEMAP'S lastmod, SO IT ONLY MOVES ON A REAL EDIT ──
        --
        -- (No backticks anywhere in this comment, and none in the RETURNING
        -- comment below either: both live inside a tagged template literal,
        -- where a backtick terminates the SQL string. The warning fifteen lines
        -- up says exactly this and it still cost a run — esbuild reports it as
        -- 'Expected ";" but found now', which names neither the comment nor the
        -- backtick. pnpm typecheck does not cover scripts/, so nothing catches
        -- it before the CLI is actually invoked.)
        --
        -- This used to be an unconditional now(). That made every re-ingest of
        -- an unchanged article tell Google, through src/app/sitemap.ts, that the
        -- article had just been modified. Two costs, and the second is the one
        -- that bites: a lastmod that moves without content moving is a lie
        -- Google learns to discount, and it left the run with NO honest signal
        -- for whether the sitemap needed resubmitting at all — every ingest
        -- looked like a change.
        --
        -- Inside DO UPDATE, the unqualified articles. columns are the row as it
        -- was BEFORE this statement and excluded. is what we are writing, so
        -- this compares old against new. IS DISTINCT FROM (not <>) because
        -- half these columns are nullable and null <> null is null, which would
        -- read as "unchanged" for every article without an excerpt.
        --
        -- WHAT IS DELIBERATELY NOT IN THIS LIST: review_status, reviewed_at,
        -- reviewed_by, human_reviewed_at. Every re-ingest resets those by design
        -- (see the comment above), so including them would make the predicate
        -- permanently true and this whole clause a no-op with extra steps. They
        -- are bookkeeping about who has read the article, not the article.
        --
        -- THE ONE BLIND SPOT, stated so the next reader does not have to find
        -- it: tag and cluster membership are reconciled BELOW, outside this
        -- statement, by a delete-then-reinsert that cannot report whether the
        -- set actually changed. So an ingest that changes ONLY tags or ONLY the
        -- cluster does not move lastmod. That is the correct trade today —
        -- neither changes the article's URL, its text, or anything a search
        -- engine renders — but if tags ever become part of the indexed page,
        -- this predicate has to grow a companion rather than be trusted as-is.
        updated_at = case
          when (articles.title, articles.excerpt, articles.content, articles.cover_image_url,
                articles.cover_image_variants, articles.cover_image_smart_crops,
                articles.cover_image_focal_point, articles.cover_image_detection_data,
                articles.meta_description, articles.status, articles.primary_category_id,
                articles.author_id, articles.published_at, articles.authorship)
               is distinct from
               (excluded.title, excluded.excerpt, excluded.content, excluded.cover_image_url,
                excluded.cover_image_variants, excluded.cover_image_smart_crops,
                excluded.cover_image_focal_point, excluded.cover_image_detection_data,
                excluded.meta_description, excluded.status, excluded.primary_category_id,
                excluded.author_id, excluded.published_at, excluded.authorship)
          then now() else articles.updated_at end
      -- xmax = 0 is the standard way to tell an INSERT from a DO UPDATE in a
      -- single RETURNING: an inserted row has no deleting transaction stamped on
      -- it. A new article always changes the sitemap — it adds a URL.
      --
      -- updated_at = now() reads the value the CASE above just settled.
      -- now() is TRANSACTION time, fixed for the whole statement, so this is
      -- exact rather than a race: it is true when the CASE took the now()
      -- branch and false when it carried the old timestamp forward, which is
      -- strictly earlier. This is the signal the sitemap resubmission is gated
      -- on — see the GSC call at the end of main().
      returning id, (xmax = 0) as inserted, (updated_at = now()) as content_changed`;

    wrote = { inserted: row.inserted, contentChanged: row.content_changed };

    // Both the pillar AND the cluster. The pillar link is what puts the article
    // at /artikel/<pillar>/<slug>; the cluster link is what makes it appear in
    // the right section of the pillar page and what scopes its sibling links.
    // On --update these are RECONCILED, not merely added. Adding only would
    // leave an article listed under the cluster it was moved OUT of, on a page
    // whose entire job is to be an accurate map of its pillar. Only categories
    // that participate in the pillar architecture are touched — a legacy
    // WordPress category on an older article is somebody else's decision.
    await tx`
      delete from article_categories
      where article_id = ${row.id}
        and category_id <> ${pillar.id}
        and category_id <> ${cluster.id}
        and category_id in (select id from inspire_categories where pillar_code is not null)`;
    for (const categoryId of [pillar.id, cluster.id]) {
      await tx`
        insert into article_categories (article_id, category_id)
        values (${row.id}, ${categoryId})
        on conflict do nothing`;
    }

    // Same reconciliation for tags: a tag removed from the approved file must
    // come off the article, not linger in the sidebar.
    await tx`delete from article_tags where article_id = ${row.id}`;
    for (const tagName of frontMatter.tags) {
      const tagSlug = tagName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const [tag] = await tx<{ id: string }[]>`
        insert into inspire_tags (name, slug) values (${tagName}, ${tagSlug})
        on conflict (slug) do update set name = excluded.name
        returning id`;
      await tx`
        insert into article_tags (article_id, tag_id) values (${row.id}, ${tag.id})
        on conflict do nothing`;
    }

    for (const image of images) {
      const up = uploaded.get(image.file)!;
      const [mediaRow] = await tx<{ id: string }[]>`
        insert into media
          (filename, r2_key, url, original_url, mime_type, file_size, width, height,
           alt, caption, variants, smart_crops, focal_point, detection_data,
           credit, credit_url, license_class, licensor_name,
           source, original_article_id, uploaded_by)
        values
          (${basename(image.file)}, ${up.key}, ${up.url}, ${up.url},
           ${'image/' + (extname(image.file).slice(1) || 'jpeg')}, ${up.size},
           ${up.width ?? null}, ${up.height ?? null}, ${image.alt}, ${image.caption ?? ''},
           ${up.variants ? sql.json(up.variants as never) : null}::jsonb,
           ${up.smartCrops ? sql.json(up.smartCrops as never) : null}::jsonb,
           ${up.focalPoint ? sql.json(up.focalPoint as never) : null}::jsonb,
           ${up.detectionData ? sql.json(up.detectionData as never) : null}::jsonb,
           ${image.credit}, ${image.creditUrl ?? null}, ${image.licenseClass}, ${image.licensorName},
           'article_upload', ${row.id}, ${author.id})
        on conflict (r2_key) do update set
          alt = excluded.alt,
          caption = excluded.caption,
          variants = excluded.variants,
          smart_crops = excluded.smart_crops,
          focal_point = excluded.focal_point,
          detection_data = excluded.detection_data,
          width = excluded.width,
          height = excluded.height,
          file_size = excluded.file_size,
          mime_type = excluded.mime_type,
          credit = excluded.credit,
          credit_url = excluded.credit_url,
          license_class = excluded.license_class,
          licensor_name = excluded.licensor_name,
          updated_at = now()
        returning id`;
      await tx`
        insert into media_article_usage (media_id, article_id)
        values (${mediaRow.id}, ${row.id})
        on conflict do nothing`;
    }
  });

  console.log(`\nDone. /artikel/${pillar.slug}/${frontMatter.slug} (${effectiveStatus})`);
  console.log('It will appear on the pillar page under its cluster with no further action.');

  // Drop the content caches. The public read layer caches with
  // `revalidate: false` and is invalidated only by `revalidateTag` calls from
  // the admin write paths — none of which fire for a direct database write. An
  // ingested article would otherwise sit in the database and be invisible on
  // the site indefinitely: no pillar entry, no sitemap row, no page. Caught in
  // review; it is the difference between an ingest path that works and one
  // that appears to.
  if (args.revalidateUrl) {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      console.warn(
        '\n⚠ CRON_SECRET is not set, so the caches were NOT dropped. The article is in\n' +
          '  the database but the site will keep serving cached pages until they are.',
      );
    } else {
      const endpoint = new URL('/api/cron/revalidate-content', args.revalidateUrl).toString();
      // Three attempts. A cold serverless function or a momentary blip must not
      // be the reason a correctly-written article stays invisible, and the
      // request is idempotent so retrying costs nothing.
      let ok = false;
      let detail = '';
      for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { authorization: `Bearer ${secret}` },
          });
          ok = res.ok;
          detail = `HTTP ${res.status}`;
        } catch (err) {
          detail = err instanceof Error ? err.message : String(err);
        }
        if (!ok && attempt < 3) await new Promise((r) => setTimeout(r, attempt * 1000));
      }
      if (!ok) {
        // Non-zero exit: the row is written but the site is still serving the
        // old pages, so the run did NOT achieve what it was asked to. Reporting
        // that as success is how a publishing path quietly stops working.
        console.error(
          `\n⚠ Cache drop failed after 3 attempts (${detail}).\n` +
            '  The article IS written, but the site will keep serving stale pages until the\n' +
            '  caches are cleared. Re-run the revalidate call before calling this published.',
        );
        await sql.end();
        process.exit(2);
      }

      // ── The SECOND cache ────────────────────────────────────────────────
      //
      // The origin is now correct. In front of it sits the Vercel edge, which
      // holds its own copy of the rendered HTML and which the call above
      // cannot reach: `next.config.ts` sets an explicit
      // `Vercel-CDN-Cache-Control` on the pillar and article routes, and that
      // header opts them out of purge-on-revalidate. Measured 25 Aug 2026, the
      // pillar served a 717-second-old `noindex` copy 457 seconds after the
      // last write. Delete exactly the three paths this ingest invalidated —
      // see `@/lib/cache/edge-purge` for why the tag is the path and why the
      // `dangerously-` form is the only one that helps.
      //
      // The success line moved DOWN here on purpose. "Content caches dropped —
      // the article is visible on the site now" printing while a reader still
      // got the old page is precisely the failure that let the original bug
      // survive review; it may only be said once BOTH caches are clear.
      const purgePaths = pathsInvalidatedByIngest(pillar.slug, frontMatter.slug);
      const purge = await purgeVercelEdge(purgePaths);
      if (purge.ok) {
        console.log(edgePurgeSuccessNotice(purge));

        // ── The THIRD step: tell Google ─────────────────────────────────────
        //
        // Everything above clears OUR caches. None of it reaches Google, which
        // holds its own copy of the sitemap and re-reads it on a schedule that
        // has run to days on this property. Publishing that nobody is told about
        // is publishing into a drawer: on 26 Aug 2026, four articles that had
        // been live for a day still inspected as `URL is unknown to Google`.
        //
        // This is INSIDE the `purge.ok` branch on purpose, and it is the one
        // ordering constraint in the whole chain. `/sitemap.xml` is the
        // longest-lived edge entry on the site (`s-maxage=3600`), so asking
        // Google to fetch it while the CDN still holds the pre-publish copy
        // hands Google an hour-old sitemap WITHOUT the new article — and
        // records a `last_downloaded` that moved, so every dashboard reports
        // success. A failed purge means the sitemap Google would fetch is the
        // wrong one, and the right response is to not send Google after it.
        //
        // The Indexing API is NOT the alternative here: Google restricts it to
        // JobPosting and BroadcastEvent and using it for articles is a policy
        // violation. See the header of `@/lib/seo/gsc-sitemap`.
        // Both derived from the PROPERTY, never from --revalidate-url. They are
        // the same thing on a normal production publish, and deliberately
        // separable when they are not: a run can revalidate a local server or a
        // preview deployment while the sitemap that matters is production's.
        // Deriving the sitemap from --revalidate-url instead produced, on the
        // first end-to-end run of this code, a literal
        //   HTTP 400 Could not process sitemap 'http://127.0.0.1:3199/sitemap.xml'
        // from Google — the property was right and the file was not under it.
        const gscProperty = gscPropertyFor(args.revalidateUrl);
        const gscSitemap = gscSitemapUrlFor(gscProperty);
        if (!wrote?.contentChanged) {
          // Nothing the sitemap carries moved — no URL added or removed, no
          // lastmod bumped (see the `updated_at` CASE on the upsert). Google is
          // deliberately left alone. This is the branch a repeat ingest of an
          // unchanged article takes, and it is the difference between a
          // publishing signal and background noise.
          console.log('\n' + gscSubmitSkippedNotice(gscSitemap));
        } else {
          const gsc = await submitSitemapToGsc(gscProperty, gscSitemap);
          if (gsc.ok) {
            console.log('\n' + gscSubmitSuccessNotice(gsc));
          } else {
            // Same shape as the edge-purge failure and for the same reason: the
            // article IS published and correct, and only the announcement
            // failed. A degradation is not a corruption, so the publish stands
            // and the exit code does not change — but it is never reported as
            // if Google had been told.
            console.error(gscSubmitFailureNotice(gsc));
          }
        }
      } else {
        // NOT a non-zero exit, unlike the origin failure above, and the
        // difference is the point: that one leaves the article invisible, this
        // one leaves it correct but up to five minutes late. A degradation is
        // not a corruption, so the publish stands — but the operator is told,
        // in the terms they act on, and is never told the caches are clear.
        console.error(edgePurgeFailureNotice(purge));
        // And the consequence one step further down the chain, said out loud
        // rather than left as a silent absence in the log. Google is NOT told
        // when the purge fails, deliberately: the sitemap Google would come and
        // fetch is the pre-publish copy the CDN is still holding, and an
        // invitation to read the wrong sitemap is worse than no invitation —
        // it moves `last_downloaded` and makes the failure look like success.
        console.error(
          '\n  Google was also NOT asked to re-read the sitemap, on purpose: until the\n' +
            '  edge is purged, the sitemap it would fetch is the pre-publish copy. Purge\n' +
            '  first, then resubmit — by hand in Search Console, or by re-running this.',
        );
      }
    }
  } else if (!args.skipMedia) {
    // Only worth shouting about on a real run: a --skip-media run is a local
    // verification and has no site in front of it to go stale.
    console.warn(
      '\n⚠ No --revalidate-url given, so the site caches were NOT dropped. The article is\n' +
        '  in the database and will stay invisible on the site until they are. Pass the\n' +
        '  site base URL to finish the job.',
    );
  }
  await sql.end();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
