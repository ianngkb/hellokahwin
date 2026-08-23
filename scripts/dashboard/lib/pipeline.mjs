// The content pipeline — the eight article stages and the six pillar-opening
// steps — read from the approved content-production workflow document.

import { renderMarkdown, toPlainText } from './md.mjs';

/** `### Stage 4 — The Editorial Review Board (/bmad-party-mode)` */
export function parseWorkflow(doc) {
  if (!doc) {
    return {
      stages: [],
      pillarSteps: [],
      seats: [],
      loops: [],
      error: 'The content-production workflow document was not found in docs/plans/.',
    };
  }
  const raw = doc.raw.replace(/\r\n?/g, '\n');

  const stages = [];
  const blocks = raw.split(/\n(?=###\s+Stage\s)/).slice(1);
  for (const block of blocks) {
    const head = block.split('\n')[0];
    const hm = head.match(/^###\s+Stage\s+(\d+)\s*[—–-]\s*(.+?)\s*$/);
    if (!hm) continue;
    const body = block.split('\n').slice(1).join('\n');
    const cut = body.search(/^###\s/m);
    const stageBody = (cut >= 0 ? body.slice(0, cut) : body).trim();
    // An agent name, not just any backticked token — `/humanizer` is a skill,
    // and stages owned by "the writer" name no agent at all.
    const ownerM = stageBody.match(/`([a-z]+(?:-[a-z]+){1,4})`/);
    const owner = ownerM ? ownerM[1] : /\bthe writer\b/i.test(stageBody) ? 'the assigned writer' : null;
    const gateM = stageBody.match(/\*\*Gate:\*\*\s*([\s\S]+?)(?:\n\n|$)/);
    stages.push({
      n: Number(hm[1]),
      name: hm[2].replace(/\s*\([^)]*\)\s*$/, '').trim(),
      fullName: hm[2].trim(),
      owner,
      gate: gateM ? gateM[1].replace(/\s+/g, ' ').trim() : null,
      bodyHtml: renderMarkdown(stageBody, { headingOffset: 3 }),
      plain: toPlainText(stageBody),
    });
  }

  // Pillar-opening steps: | P1 | Confirm … | `head-of-seo-content` | Gate |
  const pillarSteps = [];
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*\|\s*(P\d)\s*\|([^|]+)\|([^|]+)\|([^|]*)\|\s*$/);
    if (!m) continue;
    const ownerM = m[3].match(/`([a-z][\w-]+)`/);
    pillarSteps.push({
      code: m[1],
      step: m[2].trim(),
      owner: ownerM ? ownerM[1] : m[3].trim(),
      gate: m[4].trim(),
    });
  }

  // Review board seats: | `editorial-verification-lead` | "Is this true…" |
  const seats = [];
  const seatSection = raw.split(/\n(?=###\s)/).find((s) => /Editorial Review Board/i.test(s.split('\n')[0]));
  if (seatSection) {
    for (const line of seatSection.split('\n')) {
      const m = line.match(/^\s*\|\s*`?([a-zA-Z][\w -]+?)`?\s*\|\s*(.+?)\s*\|\s*$/);
      if (!m) continue;
      if (/^seat$/i.test(m[1].trim()) || /^-+$/.test(m[1].trim())) continue;
      seats.push({ seat: m[1].trim(), question: m[2].trim() });
    }
  }

  const loops = [];
  const loopSection = raw.split(/\n(?=##\s)/).find((s) => /standing loops/i.test(s.split('\n')[0]));
  if (loopSection) {
    for (const m of loopSection.matchAll(/\*\*(.+?loop)\*\*\s*\(`([^`]+)`\)\s*:\s*([\s\S]*?)(?=\n\n|$)/gi)) {
      loops.push({ name: m[1].trim(), owner: m[2].trim(), detail: m[3].replace(/\s+/g, ' ').trim() });
    }
  }

  return { stages, pillarSteps, seats, loops, error: null, source: doc.path };
}

/**
 * Place each known article on the board. Articles come from the article
 * register; with no register there are no cards, and the board says so.
 */
export function buildBoard(workflow, register) {
  const columns = workflow.stages.map((s) => ({ ...s, cards: [] }));
  const unplaced = [];
  for (const a of register.articles) {
    if (a.isSummary) continue; // a cluster-level record, not a card
    const col = columns.find((c) => c.n === a.stageNumber);
    if (col) col.cards.push(a);
    else unplaced.push(a);
  }
  for (const c of columns) c.cards.sort((x, y) => String(x.code || '').localeCompare(String(y.code || '')));
  return {
    columns,
    unplaced,
    empty: columns.every((c) => c.cards.length === 0),
    stuck: columns.flatMap((c) => c.cards.filter((a) => a.held)),
  };
}

/**
 * Pillar readiness: a pillar cannot take articles until its page exists, and no
 * pillar page exists until the engineer builds it. Read from the register plus
 * the cluster plan, never assumed.
 */
const NOT_DEPLOYED = /not deployed|awaiting board approval|not live|verified locally/i;

/**
 * Pillar readiness has three honest states, not two. "Built" and "live" are
 * different things here: the pages exist locally and are waiting on a board
 * approval to deploy, and a dashboard that showed them as live would be wrong
 * in the direction that costs the most.
 */
export function pillarReadiness(plan, workDoneDocs) {
  return plan.pillars.map((p) => {
    const evidence = (workDoneDocs || []).find((d) => p.page && d.raw.includes(p.page));
    let state = 'not-built';
    if (evidence) {
      const declared = (evidence.statusRaw || '') + ' ' + evidence.raw.slice(0, 4000);
      state = NOT_DEPLOYED.test(declared) ? 'built-not-deployed' : 'live';
    }
    return {
      evidence: evidence ? evidence.path : null,
      state,
      code: p.code,
      name: p.name,
      page: p.page,
      articles: p.articles || 0,
      drafted: p.drafted || 0,
      mappedTopics: p.mappedTopics || p.topicCount || 0,
    };
  });
}
