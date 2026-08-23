// Views the board actually reads: the timeline, what is blocked, what is
// waiting on an approval, who produced what, and what changed recently.
// Everything here is derived from documents already parsed — nothing new is
// asserted that a file does not say.

import { renderMarkdown, toPlainText, slugify } from './md.mjs';
import { sectionByTitle, collapseListItems, daysBetween } from './docs.mjs';

const TIMELINE_TYPES = {
  meeting: { label: 'Board meeting', weight: 0 },
  decision: { label: 'Decision', weight: 1 },
  plan: { label: 'Plan', weight: 2 },
  brief: { label: 'Brief', weight: 2 },
  proposal: { label: 'Proposal', weight: 2 },
  research: { label: 'Research', weight: 2 },
  audit: { label: 'Audit', weight: 2 },
  framework: { label: 'Framework', weight: 2 },
  strategy: { label: 'Strategy', weight: 2 },
  doctrine: { label: 'Doctrine', weight: 2 },
  org: { label: 'Org design', weight: 2 },
  workflow: { label: 'Workflow', weight: 2 },
  memory: { label: 'Company memory', weight: 3 },
  'work-done': { label: 'Work completed', weight: 4 },
  hire: { label: 'Org change', weight: 5 },
};

/** Ids must survive being used as an anchor and inside a click handler. */
const idSafe = (v) => String(v === null || v === undefined ? '' : v).replace(/[^A-Za-z0-9_.:-]/g, '-');

/**
 * The anchor a document actually has on the page. Most get one from the
 * timeline; the decision log and the folder READMEs are deliberately not
 * timeline events, so they point at the section that presents their content.
 */
function anchorFor(d, withDisclosure) {
  if (d.type === 'decision-log') return 'decisions';
  if (d.type === 'index') return d.path.startsWith('work-done/') ? 'workdone' : 'plans';
  // Documents rendered as an expandable disclosure own the "doc-" id. Everything
  // else (drafts, meetings, company memory) is anchored by its timeline row.
  // Emitting the same id in both places made getElementById return whichever
  // came first, so half the navigation quietly landed on the wrong element.
  if (withDisclosure && withDisclosure.has(d.path)) return 'doc-' + d.id;
  return 'tl-doc-' + d.id;
}

export function buildTimeline({ docs, decisions, orgChangelog, withDisclosure }) {
  const events = [];

  for (const d of docs) {
    if (d.type === 'index' || d.type === 'decision-log') continue;
    const kind = TIMELINE_TYPES[d.type] ? d.type : 'plan';
    events.push({
      id: 'tl-doc-' + d.id,
      anchor: anchorFor(d, withDisclosure),
      date: d.date,
      kind,
      kindLabel: TIMELINE_TYPES[kind].label,
      title: d.title,
      owner: d.owner,
      session: d.session,
      status: d.status,
      statusRaw: d.statusRaw,
      docPath: d.path,
      docId: d.id,
      summary: d.plain.slice(0, 260),
    });
  }

  for (const dec of decisions) {
    events.push({
      id: 'dec-' + dec.id,
      date: dec.date,
      kind: 'decision',
      kindLabel: 'Decision',
      title: 'D' + dec.number + ' — ' + dec.title,
      owner: null,
      session: null,
      status: null,
      docPath: dec.source,
      decisionId: dec.id,
      summary: (dec.basis ? 'Basis: ' + dec.basis : dec.narrative || '').slice(0, 260),
    });
  }

  for (const entry of orgChangelog || []) {
    events.push({
      id: 'org-' + slugify(entry.heading),
      date: entry.date,
      kind: 'hire',
      kindLabel: entry.hires.length ? 'Hire' : 'Org change',
      title: entry.hires.length
        ? 'Hired ' + entry.hires.join(', ')
        : 'Org chart updated — ' + entry.label,
      owner: 'ceo-hellokahwin',
      session: null,
      status: null,
      docPath: 'org-chart/CHANGELOG.md',
      summary: entry.plain.slice(0, 260),
    });
  }

  return events.sort((a, b) => {
    const byDate = (b.date || '').localeCompare(a.date || '');
    if (byDate !== 0) return byDate;
    return TIMELINE_TYPES[a.kind].weight - TIMELINE_TYPES[b.kind].weight;
  });
}

const BLOCK_SECTIONS = [
  { titles: ['follow-up', 'follow up'], reason: 'Open follow-up', severity: 'follow-up' },
  { titles: ['what i need from the ceo'], reason: 'Waiting on the CEO', severity: 'approval' },
  { titles: ['what i need from the board'], reason: 'Waiting on the board', severity: 'approval' },
  { titles: ['what i need from the owner'], reason: 'Waiting on the owner', severity: 'approval' },
  { titles: ['owner requests'], reason: 'Waiting on the owner', severity: 'approval' },
  // Ordered most specific first: sectionByTitle prefix-matches, so this bare
  // entry would otherwise re-file a request already claimed above.
  { titles: ['what i need'], reason: 'Waiting on a decision', severity: 'approval' },
  { titles: ['risks'], reason: 'Flagged risk', severity: 'risk' },
];

/**
 * Items something is holding up. Sources are all explicit: a DRAFT status line,
 * a Follow-ups section, a "what I need from…" section, or an open meeting action.
 */
export function buildBlocked(docs, today, withDisclosure) {
  const items = [];

  for (const d of docs) {
    if (d.type === 'index') continue;

    // Finished work that cannot go live until someone approves it. This is a
    // different, more expensive kind of blocked than an unwritten plan.
    if (/awaiting board approval|not deployed|awaiting the board|pending board approval/i.test(d.statusRaw || '')) {
      items.push({
        id: 'blk-hold-' + d.id,
        title: d.title,
        reason: 'Built and finished, held for board approval',
        severity: 'approval',
        detail: d.statusRaw,
        owner: d.owner,
        docPath: d.path,
        docId: d.id,
        anchor: anchorFor(d, withDisclosure),
        since: d.date,
        waitingDays: d.date && today ? daysBetween(d.date, today) : null,
      });
    }

    if (d.status === 'HELD') {
      items.push({
        id: 'blk-held-' + d.id,
        title: d.title,
        reason: 'Finished and waiting on an approval to go live',
        severity: 'approval',
        detail: d.statusRaw || 'HELD',
        owner: d.owner,
        docPath: d.path,
        docId: d.id,
        anchor: anchorFor(d, withDisclosure),
        since: d.date,
        waitingDays: d.date && today ? daysBetween(d.date, today) : null,
      });
    }

    if (d.status === 'DRAFT') {
      items.push({
        id: 'blk-draft-' + d.id,
        title: d.title,
        reason: 'Nothing executes while a plan reads DRAFT',
        severity: 'approval',
        detail: d.statusRaw || 'DRAFT',
        owner: d.owner,
        docPath: d.path,
        docId: d.id,
        anchor: anchorFor(d, withDisclosure),
        since: d.date,
        waitingDays: d.date && today ? daysBetween(d.date, today) : null,
      });
    }

    const claimedSections = new Set();
    for (const spec of BLOCK_SECTIONS) {
      if (spec.severity === 'risk') continue; // risks are informational, not blocks
      const sec = sectionByTitle(d.sections, ...spec.titles);
      if (!sec || !sec.body.trim()) continue;
      if (claimedSections.has(sec.title)) continue; // already filed under a more specific reason
      claimedSections.add(sec.title);
      const bullets = collapseListItems(sec.body);
      const entries = bullets.length ? bullets : [sec.body.replace(/\s+/g, ' ').trim()];
      for (const e of entries) {
        const text = e.replace(/\s+/g, ' ').trim();
        if (!text || text.length < 8) continue;
        if (/^none\b|^nothing\b|^n\/a\b/i.test(text)) continue;
        items.push({
          id: 'blk-' + d.id + '-' + slugify(text).slice(0, 30),
          title: text.replace(/\*\*/g, '').slice(0, 220),
          titleHtml: renderMarkdown(text.slice(0, 400)).replace(/^<p>|<\/p>$/g, ''),
          reason: spec.reason,
          severity: spec.severity,
          detail: sec.title,
          owner: d.owner,
          docPath: d.path,
          docId: d.id,
        anchor: anchorFor(d, withDisclosure),
          since: d.date,
          waitingDays: d.date && today ? daysBetween(d.date, today) : null,
        });
      }
    }

    // Meeting action tables: | Action | Owner (agent) | Due |
    if (d.type === 'meeting') {
      const sec = sectionByTitle(d.sections, 'actions');
      if (sec) {
        for (const line of sec.body.split('\n')) {
          const m = line.match(/^\s*\|([^|]+)\|([^|]+)\|([^|]*)\|\s*$/);
          if (!m) continue;
          const action = m[1].trim();
          if (!action || /^-+$/.test(action) || /^action$/i.test(action)) continue;
          items.push({
            id: 'blk-act-' + d.id + '-' + slugify(action).slice(0, 30),
            title: action.replace(/\*\*/g, ''),
            titleHtml: renderMarkdown(action).replace(/^<p>|<\/p>$/g, ''),
            reason: 'Open action from ' + d.title,
            severity: 'action',
            detail: 'Due: ' + (m[3].trim() || 'unstated'),
            owner: m[2].replace(/`/g, '').trim(),
            docPath: d.path,
            docId: d.id,
        anchor: anchorFor(d, withDisclosure),
            since: d.date,
            waitingDays: d.date && today ? daysBetween(d.date, today) : null,
          });
        }
      }
    }
  }

  // The same request can be reached by more than one route; the board sees it
  // once, under the most specific reason.
  const seenItems = new Map();
  for (const it of items) {
    const key = it.docPath + '::' + it.title.toLowerCase().replace(/s+/g, ' ').slice(0, 120);
    if (!seenItems.has(key)) seenItems.set(key, it);
  }
  const items2 = [...seenItems.values()];

  const order = { approval: 0, action: 1, 'follow-up': 2, risk: 3 };
  return items2.sort((a, b) => (order[a.severity] - order[b.severity]) || (b.waitingDays || 0) - (a.waitingDays || 0));
}

/** The approvals queue is the subset of blocked items that sit with the board. */
export function buildApprovals(blocked) {
  return blocked.filter((b) => b.severity === 'approval');
}

/** What each agent has actually produced, from plans and completion records. */
export function buildActivity(agents, docs, decisions) {
  const byAgent = new Map(agents.map((a) => [a.name, { produced: [], completed: [], decisions: [] }]));
  const orphan = new Map();

  const bucket = (name) => {
    if (!name) return null;
    if (byAgent.has(name)) return byAgent.get(name);
    if (!orphan.has(name)) orphan.set(name, { produced: [], completed: [], decisions: [] });
    return orphan.get(name);
  };

  for (const d of docs) {
    if (d.type === 'index') continue;
    const b = bucket(d.owner);
    if (!b) continue;
    if (d.type === 'work-done') b.completed.push(d);
    else b.produced.push(d);
  }

  for (const dec of decisions) {
    const mentioned = new Set();
    for (const m of (dec.plain || '').matchAll(/`?\b([a-z]+(?:-[a-z]+){1,4})\b`?/g)) {
      if (byAgent.has(m[1])) mentioned.add(m[1]);
    }
    for (const name of mentioned) byAgent.get(name).decisions.push(dec);
  }

  const result = {};
  for (const [name, v] of byAgent) {
    result[name] = {
      produced: v.produced.length,
      completed: v.completed.length,
      decisions: v.decisions.length,
      words: [...v.produced, ...v.completed].reduce((s, d) => s + d.words, 0),
      items: [...v.completed, ...v.produced]
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        .map((d) => ({ title: d.title, type: d.type, date: d.date, status: d.status, docId: d.id, path: d.path })),
    };
  }
  return { byAgent: result, unknownOwners: [...orphan.keys()] };
}

/**
 * The weekly article count — the company's leading indicator. Counted from the
 * article register, so it stays zero until articles actually exist.
 */
export function weeklyArticleCount(register, today, weeks = 12) {
  const buckets = [];
  const end = new Date(today + 'T00:00:00Z');
  for (let w = weeks - 1; w >= 0; w--) {
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - w * 7 - 6);
    const stop = new Date(end);
    stop.setUTCDate(stop.getUTCDate() - w * 7);
    buckets.push({
      from: start.toISOString().slice(0, 10),
      to: stop.toISOString().slice(0, 10),
      count: 0,
    });
  }
  for (const a of register.articles) {
    if (!a.published || a.isSummary) continue;
    const d = a.publishedOn || a.date;
    if (!d) continue;
    const b = buckets.find((x) => d >= x.from && d <= x.to);
    if (b) b.count++;
  }
  const published = register.articles.filter((a) => a.published && !a.isSummary);
  return {
    buckets,
    total: published.length,
    drafted: register.articles.filter((a) => !a.published && !a.isSummary).length,
    empty: published.length === 0,
  };
}

/** Recently touched documents, newest first — the "what changed" feed. */
export function recentChanges(docs, agents, withDisclosure) {
  // docId here is the ANCHOR the page emits, not the raw document id — the feed
  // navigates by it, and a bare id scrolls to nothing.
  const all = [
    ...docs
      .filter((d) => d.type !== 'index')
      .map((d) => ({ kind: 'document', title: d.title, path: d.path, docId: anchorFor(d, withDisclosure), mtime: d.mtime })),
    ...agents.map((a) => ({
      kind: 'persona',
      title: a.role + ' (' + a.name + ')',
      path: 'org-chart/' + a.file,
      docId: 'agent-' + idSafe(a.name),
      mtime: a.mtime,
    })),
  ];
  return all.sort((a, b) => b.mtime.localeCompare(a.mtime));
}

/**
 * The board's checkpoint table, read from the approved growth plan:
 * | Metric | Baseline (21 Aug) | 30 days | 60 days | 90 days |
 */
export function parseCheckpoints(planDoc) {
  if (!planDoc) return { rows: [], horizons: [], error: 'Growth plan not found in docs/plans/.' };
  const sec = sectionByTitle(planDoc.sections, 'metrics & review cadence', 'metrics');
  if (!sec) return { rows: [], horizons: [], error: 'The growth plan has no metrics table.' };

  const lines = sec.body.split('\n').filter((l) => l.trim().startsWith('|'));
  if (lines.length < 3) return { rows: [], horizons: [], error: 'The growth plan metrics table could not be read.' };

  const cells = (l) =>
    l
      .replace(/^\s*\|/, '')
      .replace(/\|\s*$/, '')
      .split('|')
      .map((c) => c.replace(/\*\*/g, '').trim());

  const header = cells(lines[0]);
  const horizons = header.slice(1);
  const rows = [];
  for (const line of lines.slice(2)) {
    const c = cells(line);
    if (!c[0]) continue;
    rows.push({
      metric: c[0],
      key: c[0].toLowerCase(),
      values: c.slice(1),
      numbers: c.slice(1).map((v) => {
        const m = String(v).match(/-?[\d,.]+/);
        return m ? Number(m[0].replace(/,/g, '')) : null;
      }),
    });
  }
  return { rows, horizons, error: null, source: planDoc.path };
}

/** Everything that can be searched from the one box at the top of the page. */
export function buildSearchIndex(docs, agents, decisions, clusters, withDisclosure) {
  const rows = [];
  for (const d of docs) {
    rows.push({
      id: d.id,
      kind: d.type,
      title: d.title,
      sub: d.path,
      text: (d.title + ' ' + d.path + ' ' + d.plain).toLowerCase().slice(0, 4000),
      target: anchorFor(d, withDisclosure),
    });
  }
  for (const a of agents) {
    rows.push({
      id: 'agent-' + a.name,
      kind: 'person',
      title: a.role,
      sub: a.name + ' · ' + a.department,
      text: (a.name + ' ' + a.role + ' ' + a.description + ' ' + a.plain).toLowerCase().slice(0, 4000),
      // Must match the id render.mjs emits for this person.
      target: 'agent-' + idSafe(a.name),
    });
  }
  for (const dec of decisions) {
    rows.push({
      id: dec.id,
      kind: 'decision',
      title: 'D' + dec.number + ' — ' + dec.title,
      sub: dec.date + ' · ' + dec.group,
      text: (dec.title + ' ' + (dec.basis || '') + ' ' + (dec.predictionText || '') + ' ' + dec.plain).toLowerCase(),
      target: 'decision-' + dec.id,
    });
  }
  for (const c of clusters) {
    rows.push({
      id: 'cluster-' + c.code,
      kind: 'cluster',
      title: c.code + ' ' + c.name,
      sub: (c.pillarName || '') + ' · Tier ' + (c.tier || '?'),
      text: (c.code + ' ' + c.name + ' ' + (c.headKeyword || '') + ' ' + toPlainText(c.body || '')).toLowerCase(),
      target: 'cluster-' + c.code,
    });
  }
  return rows;
}
