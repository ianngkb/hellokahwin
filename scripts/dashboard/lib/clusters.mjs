// The cluster progress board, read from the approved Cluster Launch Plan.
// Pillars, clusters, mapped topic counts, demand and priority tier all come from
// that document. Coverage comes from the article register (below) — which is
// empty until the ingest path exists, and the page says so rather than showing
// a hopeful zero.

import fs from 'node:fs';
import path from 'node:path';
import { renderMarkdown } from './md.mjs';

const num = (s) => (s === null || s === undefined ? null : Number(String(s).replace(/[,~\s]/g, '')));

/** Parse `### P1. Nikah & Undang-undang` … `#### C1.1 Borang & pendaftaran nikah` */
export function parseClusterPlan(doc) {
  if (!doc) {
    return { pillars: [], clusters: [], totals: null, error: 'Cluster Launch Plan not found in docs/plans/.' };
  }
  const lines = doc.raw.replace(/\r\n?/g, '\n').split('\n');
  const pillars = [];
  const clusters = [];
  let pillar = null;
  let cluster = null;

  const flushCluster = () => {
    if (cluster) {
      cluster.body = cluster.lines.join('\n').trim();
      delete cluster.lines;
      clusters.push(cluster);
      cluster = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const pm = line.match(/^###\s+(P(\d+))\.\s+(.+?)\s*$/);
    if (pm) {
      flushCluster();
      pillar = {
        code: pm[1],
        order: Number(pm[2]),
        name: pm[3].trim(),
        page: null,
        clusterCount: null,
        topicCount: null,
        volume: null,
        note: '',
      };
      // The line that follows carries the pillar page and totals.
      const look = lines.slice(i + 1, i + 6).join(' ');
      const pageM = look.match(/\*\*Pillar page:\*\*\s*`([^`]+)`/);
      if (pageM) pillar.page = pageM[1];
      const totM = look.match(/\*\*([\d,]+)\s*clusters?,\s*([\d,]+)\s*topics?,\s*~?([\d,]+)\s*searches\/mo\*\*/i);
      if (totM) {
        pillar.clusterCount = num(totM[1]);
        pillar.topicCount = num(totM[2]);
        pillar.volume = num(totM[3]);
      }
      pillars.push(pillar);
      continue;
    }

    const cm = line.match(/^####\s+(C(\d+)\.(\d+))\s+(.+?)\s*$/);
    if (cm) {
      flushCluster();
      cluster = {
        code: cm[1],
        pillar: pillar ? pillar.code : null,
        pillarName: pillar ? pillar.name : null,
        name: cm[4].trim(),
        headKeyword: null,
        headVolume: null,
        headKd: null,
        topicCount: null,
        volume: null,
        tier: null,
        tierReason: null,
        lines: [],
      };
      continue;
    }

    if (cluster) {
      cluster.lines.push(line);
      const hk = line.match(/\*\*Head keyword:\*\*\s*`([^`]+)`,\s*([\d,]+)\/mo,\s*KD\s*([\d.]+)/i);
      if (hk) {
        cluster.headKeyword = hk[1];
        cluster.headVolume = num(hk[2]);
        cluster.headKd = Number(hk[3]);
      }
      const tc = line.match(/\*\*Topics?\s*\((\d+)\)/i);
      if (tc && cluster.topicCount === null) cluster.topicCount = Number(tc[1]);
      const worth = line.match(/\*\*Worth to us:\*\*\s*(?:roughly\s*)?~?([\d,]+)\s*searches/i);
      if (worth) cluster.volume = num(worth[1]);
    }
  }
  flushCluster();

  attachTiers(doc, clusters);

  const short = doc.raw.match(/\*\*([\d,]+)\s*clusters?\*\*[\s\S]{0,200}?\*\*([\d,]+)\s*topics?\*\*/i);
  const totals = {
    pillars: pillars.length,
    clusters: clusters.length,
    topics: clusters.reduce((s, c) => s + (c.topicCount || 0), 0),
    volume: clusters.reduce((s, c) => s + (c.volume || 0), 0),
    statedClusters: short ? num(short[1]) : null,
    statedTopics: short ? num(short[2]) : null,
  };

  return { pillars, clusters, totals, error: null, source: doc.path };
}

/** Priority tiers appear both as tables (Tier 1-2) and as prose lists (Tier 3-4). */
function attachTiers(doc, clusters) {
  const byCode = new Map(clusters.map((c) => [c.code, c]));
  const sec = doc.raw.split(/\n(?=##\s)/).find((s) => /^##\s*\d*\.?\s*Priority tiers/i.test(s));
  if (!sec) return;

  // Split the section into one block per tier, so prose entries that wrap across
  // several lines (Tier 3 and 4 are written as running text) are matched whole.
  const blocks = sec.split(/\n(?=\s*\*\*Tier\s*\d)/).slice(1);
  for (const block of blocks) {
    const tm = block.match(/\*\*Tier\s*(\d)[,.]?\s*([^*]*)\*\*/i);
    if (!tm) continue;
    const tier = { n: Number(tm[1]), label: tm[2].replace(/\.$/, '').trim() };

    const proseLines = [];
    for (const line of block.split('\n')) {
      // Table row: | C2.4 Mas kahwin ikut negeri | ~11,000 | Why first |
      const row = line.match(/^\s*\|\s*(C\d+\.\d+)\b([^|]*)\|([^|]*)\|(.*)\|\s*$/);
      if (row) {
        const c = byCode.get(row[1]);
        if (c && c.tier === null) {
          c.tier = tier.n;
          c.tierLabel = tier.label;
          c.tierReason = row[4].replace(/\|/g, '').trim();
        }
        continue;
      }
      if (/^\s*\|/.test(line)) continue;
      proseLines.push(line);
    }

    // Prose: "C3.1 Ucapan pengantin baru (~14,000, three incumbents …) · C3.2 …"
    const prose = proseLines.join(' ').replace(/\s+/g, ' ');
    const proseRe = /\b(C\d+\.\d+)\s+([^(·]+?)\s*\(([^)]*)\)/g;
    let m;
    while ((m = proseRe.exec(prose))) {
      const c = byCode.get(m[1]);
      if (c && c.tier === null) {
        c.tier = tier.n;
        c.tierLabel = tier.label;
        c.tierReason = m[3].trim();
      }
    }
  }
}

/**
 * The article register: the machine-readable list of articles that actually
 * exist, keyed to their cluster. Two sources, both real files:
 *   1. docs/boardroom/article-register.md — a table the team maintains
 *   2. any docs/work-done entry carrying a `**Cluster:**` line
 * Absent both, the register is empty and the dashboard says why.
 */
/**
 * Which of the eight workflow stages an article currently sits at, read from
 * the status line the writers actually use:
 *   "Stage 4 review board, Stage 5 /humanizer and Stage 6 SEO QC all complete…
 *    Held at Stage 7: the P2 pillar page does not exist yet."
 */
export function parseStage(statusText, fallback) {
  const s = String(statusText || '');
  const held = s.match(/held\s+at\s+stage\s*(\d)/i);
  if (held) return { stage: Number(held[1]), held: true, reason: heldReason(s) };
  // "not published" and "nothing published, by design" must not mark an article
  // live — that would turn held work into coverage.
  const live =
    /\b(published|live on|now live)\b/i.test(s) &&
    !/\b(?:not|never|nothing|isn't|is not|yet to be|pending|awaiting)\b[^.;]{0,30}(?:published|live)/i.test(s);
  if (live) return { stage: 8, held: false, reason: null };
  const stages = [...s.matchAll(/stage\s*(\d)/gi)].map((m) => Number(m[1]));
  if (stages.length) {
    const highest = Math.max(...stages);
    // "Stage 6 … complete" means it is waiting to enter stage 7 — but only when
    // the completion is asserted, not denied. "review is not complete" must not
    // advance an article, which is the direction that would overstate progress.
    const completed = /\bcomplete/i.test(s) && !/\b(?:not|never|isn't|is not|yet to be|pending|awaiting)\b[^.;]{0,30}complete/i.test(s);
    return { stage: completed ? Math.min(8, highest + 1) : highest, held: false, reason: null };
  }
  return { stage: fallback || 3, held: false, reason: null };
}

function heldReason(s) {
  const m = s.match(/held\s+at\s+stage\s*\d\s*[:.\-–—*]*\s*([^.]{5,180})/i);
  if (!m) return null;
  return m[1].replace(/\*+/g, '').replace(/\s+/g, ' ').replace(/^[:\-–—\s]+/, '').trim() || null;
}

export function loadArticleRegister(boardroomDir, workDoneDocs, draftDocs) {
  const file = path.join(boardroomDir, 'article-register.md');
  const articles = [];
  let registerExists = false;

  if (fs.existsSync(file)) {
    registerExists = true;
    const raw = fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*\|\s*([^|]+)\|\s*(C\d+\.\d+)\s*\|([^|]*)\|([^|]*)\|([^|]*)\|\s*$/);
      if (!m) continue;
      const title = m[1].trim();
      if (!title || /^-+$/.test(title) || /^title$/i.test(title)) continue;
      articles.push({
        title,
        cluster: m[2].trim(),
        stage: m[3].trim(),
        owner: m[4].trim(),
        url: m[5].trim(),
        source: 'docs/boardroom/article-register.md',
      });
    }
  }

  // Article drafts carry their own header block, which is a truer register than
  // anything maintained by hand: **Article:** A1, head of cluster C2.4 …
  for (const d of draftDocs || []) {
    const meta = d.meta || {};
    const articleLine = meta.article || '';
    const code = (articleLine.match(/\bA\d+\b/) || [])[0] || null;
    const cluster = (articleLine.match(/C\d+\.\d+/) || (d.raw.match(/cluster\s+(C\d+\.\d+)/i) || [])[1] || '').toString();
    const clusterCode = (String(cluster).match(/C\d+\.\d+/) || [])[0] || null;
    if (!code && !clusterCode) continue;
    const st = parseStage(meta.status || d.statusRaw, 3);
    articles.push({
      code,
      title: d.title,
      cluster: clusterCode,
      pillar: (String(meta.pillar || '').match(/P\d/) || [])[0] || null,
      stageNumber: st.stage,
      held: st.held,
      heldReason: st.reason,
      stage: String(st.stage),
      statusText: (meta.status || d.statusRaw || '').trim(),
      owner: (String(meta.writer || d.owner || '').match(/[a-z]+(?:-[a-z]+)+/) || [''])[0],
      url: (meta.url || '').trim(),
      published: st.stage >= 8,
      date: d.date,
      docId: d.id,
      source: d.path,
      mtime: d.mtime,
    });
  }

  for (const d of workDoneDocs || []) {
    const cl = d.meta && d.meta.cluster ? String(d.meta.cluster).match(/C\d+\.\d+/) : null;
    if (!cl) continue;
    const st = parseStage(d.meta.stage || d.statusRaw, null);
    articles.push({
      code: null,
      title: d.title,
      cluster: cl[0],
      pillar: (String(d.meta['pillar opened'] || d.meta.pillar || '').match(/P\d/) || [])[0] || null,
      stageNumber: st.stage,
      held: st.held,
      heldReason: st.reason,
      stage: String(st.stage),
      statusText: (d.statusRaw || '').trim(),
      owner: d.owner || '',
      url: (d.meta.url || '').trim(),
      published: st.stage >= 8,
      date: d.date,
      docId: d.id,
      source: d.path,
      mtime: d.mtime,
      isSummary: true,
    });
  }

  // One article can have several files (draft, REVIEWED, REVISED). Keep the most
  // advanced version of each so the board is never double-counted.
  const best = new Map();
  const rest = [];
  for (const a of articles) {
    const key = a.code && a.cluster ? a.cluster + '/' + a.code : null;
    if (!key) {
      rest.push(a);
      continue;
    }
    const prev = best.get(key);
    if (!prev || a.stageNumber > prev.stageNumber || (a.stageNumber === prev.stageNumber && a.mtime > prev.mtime)) {
      best.set(key, a);
    }
  }
  const deduped = [...best.values(), ...rest];

  return {
    registerExists,
    registerPath: 'docs/boardroom/article-register.md',
    articles: deduped,
    fileCount: articles.length,
    live: deduped.filter((a) => a.published && !a.isSummary),
    held: deduped.filter((a) => a.held),
    empty: deduped.length === 0,
  };
}

/**
 * Coverage per cluster and per pillar. Coverage counts articles that are LIVE —
 * a publish-ready draft held at stage 7 is not coverage, and counting it as such
 * would be the single easiest way to make this dashboard lie.
 */
export function computeCoverage(plan, register) {
  const liveCounts = new Map();
  const draftCounts = new Map();
  for (const a of register.articles) {
    // A cluster-level completion record summarises articles; it is not one.
    if (a.isSummary) continue;
    const target = a.published ? liveCounts : draftCounts;
    if (a.cluster) target.set(a.cluster, (target.get(a.cluster) || 0) + 1);
  }

  for (const c of plan.clusters) {
    c.articles = liveCounts.get(c.code) || 0;
    c.drafted = draftCounts.get(c.code) || 0;
    c.coverage = c.topicCount ? c.articles / c.topicCount : null;
    c.draftCoverage = c.topicCount ? (c.articles + c.drafted) / c.topicCount : null;
  }
  for (const p of plan.pillars) {
    const mine = plan.clusters.filter((c) => c.pillar === p.code);
    p.articles = mine.reduce((s, c) => s + c.articles, 0);
    p.drafted = mine.reduce((s, c) => s + c.drafted, 0);
    p.mappedTopics = mine.reduce((s, c) => s + (c.topicCount || 0), 0) || p.topicCount || 0;
    p.coverage = p.mappedTopics ? p.articles / p.mappedTopics : null;
    p.draftCoverage = p.mappedTopics ? (p.articles + p.drafted) / p.mappedTopics : null;
  }
  const topics = plan.totals ? plan.totals.topics : 0;
  const articles = register.live.length;
  const drafted = register.articles.filter((a) => !a.published && !a.isSummary).length;
  return {
    articles,
    drafted,
    topics,
    coverage: topics ? articles / topics : null,
    draftCoverage: topics ? (articles + drafted) / topics : null,
  };
}

export function renderClusterBody(cluster) {
  return renderMarkdown(cluster.body || '', { headingOffset: 3 });
}
