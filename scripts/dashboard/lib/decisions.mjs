// The decision tracker. Reads docs/boardroom/decision-log.md and splits every
// entry into what was decided, the evidence behind it, and what was predicted.
//
// Outcomes are NOT invented. They come from an optional register the CEO keeps
// at docs/boardroom/prediction-outcomes.md. With no register, every prediction
// reads "not yet scored" — which is the truth, and the point.

import fs from 'node:fs';
import path from 'node:path';
import { renderMarkdown, toPlainText, slugify } from './md.mjs';
import { parseDate, addDays } from './docs.mjs';

/** Numbered entries under `## <date> — <heading>` groups. */
export function parseDecisionLog(doc) {
  if (!doc) return [];
  const raw = doc.raw.replace(/\r\n?/g, '\n');
  const groups = raw.split(/\n(?=##\s)/).slice(1);
  const out = [];

  for (const group of groups) {
    const lines = group.split('\n');
    const heading = (lines[0].match(/^##\s*(.+)$/) || [, ''])[1].trim();
    const groupDate = parseDate(heading);
    const groupLabel = heading.replace(/^[\d\s—–-]*[—–-]\s*/, '').trim() || heading;
    const bodyLines = lines.slice(1);

    // Split into numbered items, keeping their numbers and wrapped lines.
    let cur = null;
    const items = [];
    for (const line of bodyLines) {
      const start = line.match(/^\s*(\d+)\.\s+(.*)$/);
      if (start) {
        if (cur) items.push(cur);
        cur = { n: Number(start[1]), text: start[2] };
        continue;
      }
      if (cur) {
        if (!line.trim()) continue;
        cur.text += ' ' + line.trim();
      }
    }
    if (cur) items.push(cur);

    for (const item of items) {
      out.push(buildDecision(item, groupDate, groupLabel, doc.path));
    }
  }
  return out.sort((a, b) => (a.date === b.date ? b.number - a.number : (b.date || '').localeCompare(a.date || '')));
}

function sliceField(text, label, stops) {
  const re = new RegExp('\\b' + label + ':\\s*', 'i');
  const m = text.match(re);
  if (!m) return null;
  let rest = text.slice(m.index + m[0].length);
  let cut = rest.length;
  for (const s of stops) {
    const sm = rest.match(new RegExp('\\b' + s + ':\\s*', 'i'));
    if (sm && sm.index < cut) cut = sm.index;
  }
  return rest
    .slice(0, cut)
    .replace(/\s+/g, ' ')
    .replace(/[.;\s]+$/, '')
    .trim() || null;
}

const FIELD_LABELS = ['Basis', 'Prediction', 'Consequence', 'Approved by', 'Supersedes'];

function buildDecision(item, groupDate, groupLabel, sourcePath) {
  const text = item.text.replace(/\s+/g, ' ').trim();
  const titleMatch = text.match(/^\*\*(.+?)\*\*/);
  const title = titleMatch ? titleMatch[1].replace(/\.$/, '').trim() : text.split('. ')[0];
  const rest = titleMatch ? text.slice(titleMatch[0].length).trim() : text;

  const basis = sliceField(text, 'Basis', FIELD_LABELS.filter((l) => l !== 'Basis'));
  const predictionText = sliceField(text, 'Prediction', FIELD_LABELS.filter((l) => l !== 'Prediction'));
  const consequence = sliceField(text, 'Consequence', FIELD_LABELS.filter((l) => l !== 'Consequence'));

  const narrative = rest
    .replace(/\bBasis:[\s\S]*$/i, '')
    .replace(/\bPrediction:[\s\S]*$/i, '')
    .replace(/\s+/g, ' ')
    // The bold lead-in is lifted into the title, which can leave the remainder
    // starting mid-sentence on a comma or dash.
    .replace(/^[\s,;:—–-]+/, '')
    .trim();

  return {
    id: 'D' + item.n + '-' + slugify(title).slice(0, 40),
    number: item.n,
    date: groupDate,
    group: groupLabel,
    title,
    titleHtml: renderMarkdown(title).replace(/^<p>|<\/p>$/g, ''),
    narrative,
    narrativeHtml: narrative ? renderMarkdown(narrative).replace(/^<p>|<\/p>$/g, '') : '',
    basis,
    basisHtml: basis ? renderMarkdown(basis).replace(/^<p>|<\/p>$/g, '') : '',
    consequence,
    consequenceHtml: consequence ? renderMarkdown(consequence).replace(/^<p>|<\/p>$/g, '') : '',
    predictionText,
    predictions: predictionText ? extractPredictions(predictionText, groupDate) : [],
    source: sourcePath,
    plain: toPlainText(text),
  };
}

/**
 * Turn prediction prose into checkable claims.
 * Only claims that state a number or a date become checkable; the rest are kept
 * as narrative so nothing is quietly dropped.
 */
export function extractPredictions(text, decisionDate) {
  const out = [];
  const seen = new Set();

  // "150 clicks @30d", "500 @60d", "1,500 @90d"
  const horizonRe = /([\d,]+)\s*(clicks|impressions|articles)?\s*@\s*(\d+)\s*d\b/gi;
  let m;
  let lastMetric = null;
  while ((m = horizonRe.exec(text))) {
    const value = Number(m[1].replace(/,/g, ''));
    const metric = (m[2] || lastMetric || 'clicks').toLowerCase();
    lastMetric = metric;
    const days = Number(m[3]);
    const due = decisionDate ? addDays(decisionDate, days) : null;
    const key = metric + ':' + value + ':' + days;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      claim: m[0].trim(),
      metric,
      target: value,
      horizonDays: days,
      dueDate: due,
      checkable: true,
    });
  }

  // "1,500 clicks/28d by 21 Nov 2026" — an explicit calendar deadline.
  const byDateRe = /([\d,]+)\s*(clicks|impressions|articles)[^.;]{0,40}?\bby\s+([0-9]{1,2}\s+[A-Za-z]{3,9}\s+[0-9]{4}|[0-9]{4}-[0-9]{2}-[0-9]{2})/gi;
  while ((m = byDateRe.exec(text))) {
    const value = Number(m[1].replace(/,/g, ''));
    const metric = m[2].toLowerCase();
    const due = parseDate(m[3]);
    const key = metric + ':' + value + ':' + due;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      claim: m[0].trim(),
      metric,
      target: value,
      horizonDays: due && decisionDate ? null : null,
      dueDate: due,
      checkable: true,
    });
  }

  if (!out.length) {
    out.push({
      claim: text.trim(),
      metric: null,
      target: null,
      horizonDays: null,
      dueDate: /next meeting/i.test(text) ? null : parseDate(text),
      dueLabel: /next meeting/i.test(text) ? 'next board meeting' : null,
      checkable: false,
    });
  }
  return out;
}

const OUTCOME_FILE = 'prediction-outcomes.md';

/**
 * Read the CEO's outcome register, if it exists. Format is one row per scored
 * prediction:  | D7 | 150 clicks @30d | 2026-09-22 | hit \| missed \| partial | note |
 */
export function loadOutcomes(boardroomDir) {
  const file = path.join(boardroomDir, OUTCOME_FILE);
  if (!fs.existsSync(file)) {
    return {
      exists: false,
      file: 'docs/boardroom/' + OUTCOME_FILE,
      rows: [],
      note:
        'No outcome register exists yet, so no prediction has been scored. Create ' +
        'docs/boardroom/' + OUTCOME_FILE + ' and the dashboard will score them on the next run.',
    };
  }
  const raw = fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n');
  const rows = [];
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*\|\s*(D\d+)\s*\|(.+?)\|(.+?)\|(.+?)\|(.*?)\|\s*$/i);
    if (!m) continue;
    const verdict = m[4].trim().toLowerCase();
    if (!/^(hit|missed|partial|open)$/.test(verdict)) continue;
    rows.push({
      decision: m[1].toUpperCase(),
      claim: m[2].trim(),
      scoredOn: parseDate(m[3]) || m[3].trim(),
      verdict,
      note: m[5].trim(),
    });
  }
  return { exists: true, file: 'docs/boardroom/' + OUTCOME_FILE, rows, note: null };
}

/**
 * Attach recorded outcomes, and — where a prediction is measured in Search
 * Console clicks or impressions and the horizon has passed — the measured
 * figure alongside it. A measurement is only shown when it was actually pulled.
 */
export function scorePredictions(decisions, outcomes, gsc, today) {
  const byDecision = new Map();
  for (const r of outcomes.rows) {
    if (!byDecision.has(r.decision)) byDecision.set(r.decision, []);
    byDecision.get(r.decision).push(r);
  }

  for (const d of decisions) {
    const recorded = byDecision.get('D' + d.number) || [];
    d.outcomes = recorded;
    for (const p of d.predictions) {
      const match = recorded.find(
        (r) => r.claim && p.claim && r.claim.toLowerCase().includes(p.claim.toLowerCase().slice(0, 12))
      );
      p.recorded = match || null;
      p.state = 'open';
      p.measured = null;

      if (match) {
        p.state = match.verdict;
      } else if (p.dueDate && today && p.dueDate < today) {
        p.state = 'overdue';
      }

      if (p.checkable && p.metric && gsc && gsc.ok && gsc.current) {
        const actual =
          p.metric === 'clicks' ? gsc.current.clicks : p.metric === 'impressions' ? gsc.current.impressions : null;
        if (actual !== null && actual !== undefined) {
          p.measured = {
            value: actual,
            window: gsc.current.range,
            source: 'Google Search Console, pulled ' + gsc.pulledAt,
            atTarget: actual >= p.target,
            progress: p.target ? Math.min(1, actual / p.target) : null,
          };
        }
      }
      if (p.dueDate && today) p.daysToDue = Math.round((new Date(p.dueDate) - new Date(today)) / 86400000);
    }
  }
  return decisions;
}
