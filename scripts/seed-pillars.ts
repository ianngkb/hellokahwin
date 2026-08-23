/**
 * Seed the seven pillars and twenty-six clusters approved by the board on
 * 23 Aug 2026.
 *
 *   pnpm tsx scripts/seed-pillars.ts --db <url>            # plan only (default)
 *   pnpm tsx scripts/seed-pillars.ts --db <url> --commit   # write
 *
 * SAFETY, and it is not decoration. This script creates public URLs on a live
 * site. Three guards, all deliberate:
 *
 *  1. `--dry-run` is the default. Writing needs `--commit`, typed on purpose.
 *  2. The database URL must be passed explicitly with `--db`. There is no
 *     implicit fallback to DATABASE_URL, because that variable points at
 *     production and a script whose default is production is a script that
 *     eventually runs against production by accident.
 *  3. It never touches a row it did not create. Existing rows are matched by
 *     `pillar_code`, which only this script sets; anything without one is
 *     invisible to it. No renames, no reparenting, no deletes, ever.
 *
 * Re-running is safe and is the normal case: it updates the name, entity
 * phrase, intro and ordering of rows it owns and leaves everything else alone.
 */
import postgres from 'postgres';
import { PILLARS } from '../src/lib/inspire/pillars';

interface Args {
  db: string;
  commit: boolean;
}

function parseArgs(argv: string[]): Args {
  let db = '';
  let commit = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--db') db = argv[++i] ?? '';
    else if (argv[i] === '--commit') commit = true;
    else if (argv[i] === '--dry-run') commit = false;
  }
  if (!db) {
    console.error(
      'Refusing to run without an explicit --db <postgres-url>.\n' +
        'There is deliberately no default: DATABASE_URL points at production.',
    );
    process.exit(1);
  }
  return { db, commit };
}

/** Redacted for logs — the host tells you which database, the password does not. */
function describeTarget(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}:${u.port || '5432'}${u.pathname}`;
  } catch {
    return '<unparseable url>';
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sql = postgres(args.db, { prepare: false, max: 2 });

  console.log(`Target: ${describeTarget(args.db)}`);
  console.log(args.commit ? 'Mode:   COMMIT (will write)\n' : 'Mode:   DRY RUN (no writes)\n');

  // Slug collisions are the one failure that would be expensive to undo: a
  // pillar silently adopting an existing category's slug would either fail on
  // the unique index or, worse, be interpreted later as "that category IS the
  // pillar". Check before touching anything.
  const existing = await sql<{ slug: string; pillar_code: string | null }[]>`
    select slug, pillar_code from inspire_categories`;
  const foreignSlugs = new Set(existing.filter((r) => !r.pillar_code).map((r) => r.slug));
  const wanted = PILLARS.flatMap((p) => [p.slug, ...p.clusters.map((c) => c.slug)]);
  const collisions = wanted.filter((s) => foreignSlugs.has(s));
  if (collisions.length > 0) {
    console.error(
      `Refusing to run: ${collisions.length} slug(s) already belong to a category ` +
        `this script does not own:\n  ${collisions.join('\n  ')}\n` +
        "Resolve by hand — renaming somebody else's category is not this script's call.",
    );
    await sql.end();
    process.exit(1);
  }

  const byCode = new Map(
    existing.filter((r) => r.pillar_code).map((r) => [r.pillar_code as string, r.slug]),
  );

  let inserts = 0;
  let updates = 0;
  const plan: string[] = [];

  for (const [pillarIndex, pillar] of PILLARS.entries()) {
    const pillarExists = byCode.has(pillar.code);
    plan.push(`${pillarExists ? 'update' : 'INSERT'}  ${pillar.code}  /artikel/${pillar.slug}`);
    pillarExists ? updates++ : inserts++;
    for (const cluster of pillar.clusters) {
      const clusterExists = byCode.has(cluster.code);
      plan.push(`  ${clusterExists ? 'update' : 'INSERT'}  ${cluster.code}  ${cluster.slug}`);
      clusterExists ? updates++ : inserts++;
    }
  }

  console.log(plan.join('\n'));
  console.log(`\n${inserts} to insert, ${updates} to update.`);

  if (!args.commit) {
    console.log('\nDry run — nothing written. Re-run with --commit to apply.');
    await sql.end();
    return;
  }

  // One transaction: seven pillars each followed by their clusters, so a
  // failure halfway cannot leave a cluster parented to a pillar that does not
  // exist.
  await sql.begin(async (tx) => {
    for (const [pillarIndex, pillar] of PILLARS.entries()) {
      const [pillarRow] = await tx<{ id: string }[]>`
        insert into inspire_categories
          (name, slug, parent_id, display_order, pillar_code, entity_phrase, intro, is_pillar)
        values
          (${pillar.name}, ${pillar.slug}, null, ${pillarIndex + 1},
           ${pillar.code}, ${pillar.entityPhrase}, ${pillar.intro}, true)
        on conflict (slug) do update set
          name = excluded.name,
          display_order = excluded.display_order,
          pillar_code = excluded.pillar_code,
          entity_phrase = excluded.entity_phrase,
          intro = excluded.intro,
          is_pillar = true,
          updated_at = now()
        returning id`;

      for (const [clusterIndex, cluster] of pillar.clusters.entries()) {
        await tx`
          insert into inspire_categories
            (name, slug, parent_id, display_order, pillar_code, entity_phrase, is_pillar)
          values
            (${cluster.name}, ${cluster.slug}, ${pillarRow.id}, ${clusterIndex + 1},
             ${cluster.code}, ${cluster.entityPhrase}, false)
          on conflict (slug) do update set
            name = excluded.name,
            parent_id = excluded.parent_id,
            display_order = excluded.display_order,
            pillar_code = excluded.pillar_code,
            entity_phrase = excluded.entity_phrase,
            is_pillar = false,
            updated_at = now()`;
      }
    }
  });

  const [{ n }] = await sql<{ n: number }[]>`
    select count(*)::int as n from inspire_categories where pillar_code is not null`;
  console.log(`\nDone. ${n} pillar/cluster categories now present.`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
