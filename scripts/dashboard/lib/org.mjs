// The org chart, read from the real persona files in the machine-wide org chart
// (skillcentral/agents/projects/hellokahwin/<Department>/<agent>.md), plus the
// ownership table from the approved content-production workflow.

import fs from 'node:fs';
import path from 'node:path';
import { renderMarkdown, toPlainText } from './md.mjs';
import { parseDate } from './docs.mjs';

/** Minimal front-matter reader — these files use name/description/tools only. */
function splitFrontMatter(raw) {
  if (!raw.startsWith('---')) return { fm: {}, body: raw };
  const end = raw.indexOf('\n---', 3);
  if (end < 0) return { fm: {}, body: raw };
  const head = raw.slice(3, end).replace(/^\n/, '');
  const body = raw.slice(end + 4).replace(/^\n+/, '');

  const fm = {};
  const lines = head.split('\n');
  let key = null;
  let buf = [];
  const flush = () => {
    if (key) fm[key] = buf.join(' ').replace(/\s+/g, ' ').trim();
    key = null;
    buf = [];
  };
  for (const line of lines) {
    const m = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (m) {
      flush();
      key = m[1];
      const v = m[2].trim();
      if (v && v !== '>-' && v !== '>' && v !== '|' && v !== '|-') buf.push(v);
    } else if (key && line.trim()) {
      buf.push(line.trim());
    }
  }
  flush();
  return { fm, body };
}

function firstSentence(text) {
  const m = String(text || '').match(/^[\s\S]{0,400}?[.!?](?=\s|$)/);
  return (m ? m[0] : String(text || '').slice(0, 200)).trim();
}

/**
 * "You are the Full-Stack Engineer of HelloKahwin…"     -> "Full-Stack Engineer"
 * "You are the Malay Wedding Writer for X at HelloKahwin" -> "Malay Wedding Writer for X"
 */
function roleTitle(body, fallback) {
  const m = body.match(/^You are (?:the |a |an )?(.+?)\s+(?:of|at|for)\s+HelloKahwin\b/m);
  if (m) return m[1].replace(/\s+/g, ' ').trim();
  const m2 = body.match(/^You are (?:the |a |an )?([^,.]+?)(?:,|\.)/m);
  if (m2) return m2[1].replace(/\s+/g, ' ').trim();
  return fallback;
}

function reportsTo(body, fm) {
  const src = body + '\n' + (fm.description || '');
  let m = src.match(/report(?:s|ing)?\s+(?:directly\s+)?to\s+(?:the\s+)?(?:CEO\s+\(the\s+)?`?([a-z][\w-]*-[\w-]+)`?/i);
  if (m) return m[1];
  if (/reports? to (?:the )?CEO/i.test(src)) return 'ceo-hellokahwin';
  if (/report(?:s)? to (?:the )?head of seo/i.test(src)) return 'head-of-seo-content';
  return null;
}

function hiredOn(body) {
  const m =
    body.match(/hired\s+with\s+board\s+approval\s+on\s+([^.,;]+)/i) ||
    body.match(/you\s+were\s+hired\s+on\s+([^.,;]+)/i) ||
    body.match(/founding\s+hire[,\s]+([^.,;]+)/i);
  return m ? parseDate(m[1]) : null;
}

/**
 * The team ownership table from the approved workflow document:
 * | Agent | Owns | Cannot do |
 */
export function parseOwnershipTable(workflowDoc) {
  const map = {};
  if (!workflowDoc) return map;
  const lines = workflowDoc.raw.split('\n');
  for (const line of lines) {
    const m = line.match(/^\s*\|\s*`([a-z][\w-]+)`\s*\|(.+?)\|(.+?)\|\s*$/);
    if (m) {
      map[m[1]] = {
        owns: m[2].trim(),
        cannot: m[3].trim(),
      };
    }
  }
  return map;
}

/** Dated hire/persona-change entries from the org chart's own CHANGELOG. */
export function parseOrgChangelog(orgRoot) {
  const file = path.join(orgRoot || '', 'CHANGELOG.md');
  if (!orgRoot || !fs.existsSync(file)) return [];
  const raw = fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n');
  const out = [];
  const blocks = raw.split(/\n(?=##\s)/).slice(1);
  for (const block of blocks) {
    const headLine = block.split('\n')[0];
    const hm = headLine.match(/^##\s*(.+)$/);
    if (!hm) continue;
    const heading = hm[1].trim();
    const date = parseDate(heading);
    const label = heading.replace(/^[\d-]+\s*[—–-]\s*/, '').trim();
    const bodyMd = block.split('\n').slice(1).join('\n').trim();
    out.push({
      date,
      label,
      heading,
      bodyHtml: renderMarkdown(bodyMd, { headingOffset: 2 }),
      plain: toPlainText(bodyMd),
      hires: [...bodyMd.matchAll(/Hired\s+`([a-z][\w-]+)`/gi)].map((m) => m[1]),
    });
  }
  return out;
}

/**
 * Load every persona file, by department.
 * @param {string} orgRoot
 * @returns {{agents: Array<object>, departments: string[], error: string|null}}
 */
export function loadOrgChart(orgRoot) {
  if (!orgRoot || !fs.existsSync(orgRoot)) {
    return {
      agents: [],
      departments: [],
      error:
        'The org chart folder could not be found. Set HELLOKAHWIN_ORG_CHART to the path of ' +
        'skillcentral/agents/projects/hellokahwin and regenerate.',
    };
  }

  const agents = [];
  const departments = [];
  for (const entry of fs.readdirSync(orgRoot, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue;
    const dept = entry.name;
    departments.push(dept);
    const deptDir = path.join(orgRoot, dept);
    for (const f of fs.readdirSync(deptDir).sort()) {
      if (!f.toLowerCase().endsWith('.md')) continue;
      const full = path.join(deptDir, f);
      const raw = fs.readFileSync(full, 'utf8').replace(/\r\n?/g, '\n');
      const { fm, body } = splitFrontMatter(raw);
      const name = fm.name || f.replace(/\.md$/, '');
      const headings = [];
      agents.push({
        name,
        file: path.relative(orgRoot, full).replace(/\\/g, '/'),
        absPath: full,
        department: dept,
        role: roleTitle(body, name),
        description: fm.description || '',
        summary: firstSentence(fm.description || body),
        reportsTo: reportsTo(body, fm),
        hiredOn: hiredOn(body),
        // Provisional. The authority on who can block is the approved workflow's
        // ownership table; applyOwnership() overrides this whenever that table exists.
        canBlockPublication: /\byou\b[^.]{0,80}\bcan block publication\b/i.test(body),
        hardRules: extractBullets(body, 'Hard rules'),
        body,
        html: renderMarkdown(body, {
          headingOffset: 2,
          collectHeadings: headings,
          // Distinct from the container id ("persona-<name>"), so heading ids
          // inside a persona can never be confused with the persona itself.
          idPrefix: 'pf-' + name,
        }),
        headings,
        plain: toPlainText(body),
        words: toPlainText(body).split(/\s+/).length,
        mtime: fs.statSync(full).mtime.toISOString(),
      });
    }
  }
  return { agents, departments, error: null };
}

function extractBullets(body, headingText) {
  const re = new RegExp('^#{2,3}\\s*' + headingText + '\\s*$', 'im');
  const m = body.match(re);
  if (!m) return [];
  const rest = body.slice(m.index + m[0].length);
  const stop = rest.search(/^#{1,3}\s/m);
  const block = stop >= 0 ? rest.slice(0, stop) : rest;
  return block
    .split('\n')
    .filter((l) => /^\s*[-*]\s+/.test(l))
    .map((l) => l.replace(/^\s*[-*]\s+/, '').replace(/\*\*/g, '').trim())
    .filter(Boolean);
}

/**
 * Attach what each seat owns and cannot do, from the approved workflow table,
 * and take blocking authority from that table rather than from persona prose —
 * the table is the document the board signed off.
 */
export function applyOwnership(agents, ownership, changelog) {
  const hireDates = new Map();
  for (const entry of changelog || []) {
    for (const h of entry.hires) if (entry.date && !hireDates.has(h)) hireDates.set(h, entry.date);
  }
  for (const a of agents) {
    const row = ownership[a.name];
    if (row) {
      a.owns = row.owns;
      a.cannot = row.cannot;
      a.canBlockPublication = /can block publication/i.test(row.owns);
    } else {
      a.owns = null;
      a.cannot = null;
    }
    a.inWorkflowTable = Boolean(row);
    if (!a.hiredOn && hireDates.has(a.name)) a.hiredOn = hireDates.get(a.name);
  }
  return agents;
}

/**
 * Build the reporting tree. Anyone whose manager is unknown or absent becomes a
 * root, so nobody silently disappears from the chart.
 */
export function buildTree(agents) {
  const byName = new Map(agents.map((a) => [a.name, a]));
  const roots = [];
  const children = {};
  for (const a of agents) {
    const mgr = a.reportsTo && byName.has(a.reportsTo) && a.reportsTo !== a.name ? a.reportsTo : null;
    if (!mgr) {
      roots.push(a.name);
    } else {
      if (!children[mgr]) children[mgr] = [];
      children[mgr].push(a.name);
    }
  }
  return { roots, children };
}
