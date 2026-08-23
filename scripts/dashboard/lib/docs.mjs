// Reads the real document tree — docs/boardroom, docs/plans, docs/work-done —
// and turns each file into a structured record. Nothing here invents content:
// every field is either lifted from the file or explicitly null.

import fs from 'node:fs';
import path from 'node:path';
import { renderMarkdown, toPlainText, slugify } from './md.mjs';

// English and Malay. The writers date their drafts in Malay ("23 Ogos 2026"),
// and without these the date silently fell back to the file's mtime.
const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
  // Malay: Januari Februari Mac April Mei Jun Julai Ogos September Oktober November Disember
  mac: 3, mei: 5, jul_: 7, julai: 7, ogo: 8, ogos: 8, okt: 10, dis: 12, disember: 12,
};

/** Month number from an English or Malay month word, else null. */
function monthOf(word) {
  if (!word) return null;
  const w = String(word).toLowerCase().replace(/\.$/, '');
  if (MONTHS[w] !== undefined) return MONTHS[w];
  if (MONTHS[w.slice(0, 4)] !== undefined) return MONTHS[w.slice(0, 4)];
  if (MONTHS[w.slice(0, 3)] !== undefined) return MONTHS[w.slice(0, 3)];
  return null;
}

/** ISO date (YYYY-MM-DD) from the many shapes these documents use, else null. */
export function parseDate(text) {
  if (!text) return null;
  const s = String(text);

  let m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return valid(Number(m[1]), Number(m[2]), Number(m[3]));

  // "23 Aug 2026" / "23 Ogos 2026" / "21 November 2026"
  m = s.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})\.?\s+(\d{4})\b/);
  if (m) {
    const mo = monthOf(m[2]);
    if (mo) return valid(Number(m[3]), mo, Number(m[1]));
  }

  // "aug-23-2026" (the filename convention)
  m = s.match(/\b([a-z]{3,9})-(\d{1,2})-(\d{4})\b/i);
  if (m) {
    const mo = monthOf(m[1]);
    if (mo) return valid(Number(m[3]), mo, Number(m[2]));
  }

  // "Aug 23 2026" / "Nov 21, 2026"
  m = s.match(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})\b/);
  if (m) {
    const mo = monthOf(m[1]);
    if (mo) return valid(Number(m[3]), mo, Number(m[2]));
  }
  return null;
}

/** Reject a date that does not exist (31 Feb, month 13) rather than rolling it over. */
function valid(year, month, day) {
  if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return d.toISOString().slice(0, 10);
}

export function addDays(isoDate, days) {
  const d = new Date(isoDate + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a, b) {
  const da = new Date(a + 'T00:00:00Z').getTime();
  const db = new Date(b + 'T00:00:00Z').getTime();
  if (Number.isNaN(da) || Number.isNaN(db)) return null;
  return Math.round((db - da) / 86400000);
}

const NEGATORS = /\b(?:not|never|no longer|isn't|is not|are not|yet to be|awaiting|pending|without)\b/;

/**
 * True when `stem` appears in the text but is negated shortly before it.
 * "not yet approved" is the opposite of APPROVED, and reading it as approval is
 * the worst direction to be wrong in on a page the board decides from.
 */
function negated(text, stem) {
  const re = new RegExp(stem, 'g');
  let m;
  while ((m = re.exec(text))) {
    // Look back a short window — far enough for "not yet" or "no longer",
    // short enough not to reach across into an unrelated clause.
    const window = text.slice(Math.max(0, m.index - 40), m.index);
    const at = window.search(NEGATORS);
    if (at !== -1 && !/[.;]/.test(window.slice(at))) return true;
  }
  return false;
}

export function normaliseStatus(raw) {
  if (!raw) return null;
  const s = String(raw).toLowerCase();

  if (/supersed/.test(s) && !negated(s, 'supersed')) return 'SUPERSEDED';
  if (/abandon/.test(s) && !negated(s, 'abandon')) return 'ABANDONED';

  const awaiting = /awaiting (?:board|ceo|the board|approval)|awaiting approval|pending approval|not deployed/.test(s);
  // Finished work waiting on an approval is NOT a draft. Calling it DRAFT
  // undersells work that is done; calling it COMPLETED oversells work that is
  // not live. It gets its own status because the difference is the whole point.
  if (awaiting && /\bbuilt\b|\bcomplete|\bverified\b|\bfinished\b|\bready\b|publish-ready/.test(s)) {
    return 'HELD';
  }
  if (/\bdraft\b/.test(s) || awaiting) return 'DRAFT';
  // Anything still negated falls through to OTHER rather than to a positive status.
  if (negated(s, 'approv') || negated(s, 'complet') || negated(s, 'deploy') || negated(s, 'done')) {
    return 'OTHER';
  }
  if (/\bapproved\b|\baccepted\b/.test(s)) return 'APPROVED';
  if (/\bcompleted\b|\bcomplete\b|\bdone\b/.test(s)) return 'COMPLETED';
  if (/\bpartial\b/.test(s)) return 'PARTIAL';
  if (/decision|operative|proceeding/.test(s)) return 'DECISION';
  return 'OTHER';
}

/** Pull the `**Key:** value` block that sits under the title of every document. */
function parseMeta(lines) {
  const meta = {};
  let lastKey = null;
  let sawBlank = false;

  for (let i = 0; i < Math.min(lines.length, 40); i++) {
    const line = lines[i];

    if (/^\s*#{1,6}\s/.test(line)) break;
    if (/^\s*-{3,}\s*$/.test(line)) break;

    if (!line.trim()) {
      sawBlank = true;
      lastKey = null;
      continue;
    }

    if (line.includes('**')) {
      // A line can carry several pairs separated by the middle dot.
      const fragments = line.split(/\s+[·|]\s+/);
      let matchedAny = false;
      for (const frag of fragments) {
        const m = frag.match(/^\s*\*\*(.+?):\*\*\s*(.*)$/) || frag.match(/^\s*\*\*(.+?):\s*(.*?)\*\*\s*$/);
        if (m) {
          const key = m[1].trim().toLowerCase();
          meta[key] = (m[2] || '').trim();
          lastKey = key;
          matchedAny = true;
        }
      }
      if (matchedAny) {
        sawBlank = false;
        continue;
      }
    }

    // Continuation of the previous value — only when no blank line intervened,
    // so ordinary prose after the meta block is never absorbed into a field.
    if (lastKey && !sawBlank) {
      meta[lastKey] = (meta[lastKey] + ' ' + line.trim()).trim();
      continue;
    }

    if (sawBlank) lastKey = null;
  }
  return meta;
}

/** A status declaration anywhere in the body, for docs that state it late. */
function findStatusAnywhere(body) {
  const m =
    body.match(/^\s*\*\*Status:\*\*\s*(.+)$/m) ||
    body.match(/^\s*\*\*Status:\s*([^*]+)\*\*/m) ||
    body.match(/^\s*Status:\s*(.+)$/m);
  return m ? m[1].trim() : null;
}

/** Split a document into its `## ` sections, keeping raw markdown per section. */
export function splitSections(body) {
  const lines = body.replace(/\r\n?/g, '\n').split('\n');
  const sections = [];
  let current = { title: null, level: 0, lines: [] };
  let inFence = false;
  for (const line of lines) {
    if (/^\s*(?:`{3,}|~{3,})/.test(line)) inFence = !inFence;
    const h = inFence ? null : line.match(/^(#{2,3})\s+(.*)$/);
    if (h) {
      sections.push(current);
      current = { title: h[2].trim(), level: h[1].length, lines: [] };
      continue;
    }
    current.lines.push(line);
  }
  sections.push(current);
  return sections
    .map((s) => ({ title: s.title, level: s.level, body: s.lines.join('\n').trim() }))
    .filter((s) => s.title || s.body);
}

/** Find one named section's raw markdown (case-insensitive, prefix match). */
export function sectionByTitle(sections, ...names) {
  for (const n of names) {
    const needle = n.toLowerCase();
    const hit = sections.find((s) => s.title && s.title.toLowerCase().startsWith(needle));
    if (hit) return hit;
  }
  return null;
}

const TYPE_BY_TOKEN = {
  brief: 'brief',
  plan: 'plan',
  proposal: 'proposal',
  research: 'research',
  audit: 'audit',
  framework: 'framework',
  clusters: 'strategy',
  production: 'doctrine',
  visual: 'strategy',
  org: 'org',
  workflow: 'workflow',
  done: 'work-done',
};

function classify(relPath, fileName) {
  const rel = relPath.replace(/\\/g, '/');
  if (/\/drafts\//.test(rel)) return 'draft';
  if (/^boardroom\/meetings\//.test(rel)) return 'meeting';
  if (/^boardroom\/ceo-memory\.md$/.test(rel)) return 'memory';
  if (/^boardroom\/decision-log\.md$/.test(rel)) return 'decision-log';
  if (/readme\.md$/i.test(fileName)) return 'index';
  const token = fileName.replace(/^[a-z]{3,9}-\d{1,2}-\d{4}-/i, '').split('-')[0].toLowerCase();
  if (TYPE_BY_TOKEN[token]) return TYPE_BY_TOKEN[token];
  if (/^work-done\//.test(rel)) return 'work-done';
  if (/^plans\//.test(rel)) return 'plan';
  return 'document';
}

function walk(dir, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'dashboard' || e.name === 'node_modules' || e.name.startsWith('.')) continue;
      walk(full, out);
    } else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Read every markdown document under the docs root.
 * @param {string} docsRoot
 * @returns {Array<object>} document records
 */
export function loadDocuments(docsRoot, onError) {
  const files = walk(docsRoot, []);
  return files
    .map((full) => {
      try {
    const raw = fs.readFileSync(full, 'utf8').replace(/\r\n?/g, '\n');
    const rel = path.relative(docsRoot, full).replace(/\\/g, '/');
    const fileName = path.basename(full);
    const stat = fs.statSync(full);

    const lines = raw.split('\n');
    let titleIdx = lines.findIndex((l) => /^#\s+/.test(l));
    const title = titleIdx >= 0 ? lines[titleIdx].replace(/^#\s+/, '').trim() : fileName;
    const afterTitle = lines.slice(titleIdx >= 0 ? titleIdx + 1 : 0);

    const meta = parseMeta(afterTitle);
    const body = afterTitle.join('\n').trim();
    const sections = splitSections(body);

    const statusRaw = meta.status || findStatusAnywhere(body);
    const sessionFolder = rel.split('/').find((seg) => /-session-\d+$/.test(seg)) || null;

    const date =
      parseDate(meta.date) ||
      parseDate(fileName) ||
      parseDate(rel) ||
      // Last resort before the filesystem: a date the document states about itself,
      // e.g. ceo-memory's "_Last updated: 2026-08-23_".
      parseDate(body.slice(0, 600)) ||
      stat.mtime.toISOString().slice(0, 10);

    const owner =
      (meta.owner || meta.author || meta.from || '').split(/[·,(]/)[0].trim() || null;

    const plain = toPlainText(body);
    const headings = [];
    const html = renderMarkdown(body, {
      headingOffset: 1,
      collectHeadings: headings,
      idPrefix: slugify(rel.replace(/\.md$/, '')),
    });

    return {
      id: slugify(rel.replace(/\.md$/, '')),
      path: rel,
      absPath: full,
      fileName,
      title,
      type: classify(rel, fileName),
      meta,
      statusRaw: statusRaw || null,
      status: normaliseStatus(statusRaw),
      session: meta.session || sessionFolder,
      owner,
      date,
      mtime: stat.mtime.toISOString(),
      words: plain ? plain.split(/\s+/).length : 0,
      raw,
      body,
      html,
      plain,
      sections,
      headings,
    };
      } catch (err) {
        // A file removed or locked between the walk and the read must not take
        // the whole run down. It is skipped and reported on the page instead.
        if (onError) onError({ path: full, error: String(err && err.message ? err.message : err) });
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * Flatten a markdown list into one string per top-level item, joining the
 * wrapped continuation lines these documents use heavily.
 */
export function collapseListItems(markdown) {
  const lines = String(markdown || '').split('\n');
  const items = [];
  let cur = null;
  for (const line of lines) {
    const start = line.match(/^[ \t]{0,3}(?:[-*+]|\d+[.)])\s+(.*)$/);
    if (start) {
      if (cur !== null) items.push(cur.trim());
      cur = start[1];
      continue;
    }
    if (cur !== null) {
      if (!line.trim()) {
        items.push(cur.trim());
        cur = null;
        continue;
      }
      if (/^\s*#{1,6}\s/.test(line) || /^\s*(?:-{3,})\s*$/.test(line)) {
        items.push(cur.trim());
        cur = null;
        continue;
      }
      cur += ' ' + line.trim();
    }
  }
  if (cur !== null) items.push(cur.trim());
  return items.filter(Boolean);
}

/** Revision history entries, where a document keeps one. */
export function parseRevisions(doc) {
  const sec = sectionByTitle(doc.sections, 'revision history', 'revisions', 'what changed');
  if (!sec) return [];
  const out = [];
  // Both shapes appear in these documents, and entries wrap across lines:
  //   - **v4 (23 Aug 2026)** — board directive: ...
  //   - v1 (23 Aug 2026) — first draft, ...
  for (const item of collapseListItems(sec.body)) {
    const clean = item.replace(/\*\*/g, '').trim();
    const parts = clean.match(/^(v\d+[\w.]*)\s*(?:\(([^)]*)\))?\s*[—–-]\s*(.+)$/i);
    if (!parts) continue;
    out.push({
      version: parts[1].trim(),
      date: parseDate(parts[2] || '') || null,
      note: parts[3].replace(/\s+/g, ' ').trim(),
    });
  }
  return out;
}

/** Which document (if any) this one supersedes, by filename mention. */
export function findSupersedes(doc, allDocs) {
  const hits = new Set();
  const re = /supersed(?:es|ed by|ing)?\s+[`"']?([\w.-]+\.md)[`"']?/gi;
  let m;
  while ((m = re.exec(doc.raw))) {
    const target = allDocs.find((d) => d.fileName === m[1]);
    if (target && target.path !== doc.path) hits.add(target.path);
  }
  return [...hits];
}
