import postgres from 'postgres';
const db = process.argv[process.argv.indexOf('--db') + 1];
const sql = postgres(db, { prepare: false, max: 2 });
const rows = await sql`
  select id, slug, status, created_at, updated_at, published_at
  from articles where status = 'published' order by updated_at desc`;
console.log('published articles:', rows.length);
// distribution of gaps between consecutive updates across the corpus
const ts = rows.map(r => new Date(r.updated_at as unknown as string).getTime()).sort((a,b)=>b-a);
const now = Date.now();
console.log('newest updated_at:', new Date(ts[0]).toISOString(), '=', ((now-ts[0])/3600e3).toFixed(1), 'h ago');
const gaps: number[] = [];
for (let i = 0; i < ts.length - 1; i++) gaps.push((ts[i] - ts[i+1]) / 3600e3);
const sorted = [...gaps].sort((a,b)=>a-b);
const q = (p: number) => sorted[Math.floor(p * (sorted.length - 1))];
console.log('gaps between consecutive article edits (hours): n=' + gaps.length,
  'p50=' + q(0.5).toFixed(2), 'p75=' + q(0.75).toFixed(2), 'p90=' + q(0.9).toFixed(2), 'max=' + q(1).toFixed(2));
for (const w of [1, 3, 6, 12, 24, 24*7]) {
  const n = ts.filter(t => now - t <= w * 3600e3).length;
  console.log(`  edits in the last ${String(w).padStart(4)}h: ${n}`);
}
// per-calendar-day counts, last 14 days
const byDay = new Map<string, number>();
for (const t of ts) { const d = new Date(t).toISOString().slice(0,10); byDay.set(d, (byDay.get(d)??0)+1); }
console.log('edits per day:'); for (const [d,n] of [...byDay].sort().reverse().slice(0,14)) console.log(`  ${d}  ${n}`);
await sql.end();
