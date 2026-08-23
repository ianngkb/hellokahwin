// Zero-dependency Markdown -> HTML. Covers exactly what the HelloKahwin docs use:
// ATX headings, tables, fenced code, blockquotes, nested lists, hr, and inline
// bold/italic/code/links. Nothing else is needed, so nothing else is here.

export function escapeHtml(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function slugify(s) {
  return (
    String(s === null || s === undefined ? '' : s)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'x'
  );
}

// --- inline ---------------------------------------------------------------

// Split on backticks so code spans render verbatim and are never re-parsed as
// markup. Odd-indexed segments are the code spans; an unmatched trailing
// backtick leaves its segment as ordinary text.
function inline(src) {
  const parts = String(src === null || src === undefined ? '' : src).split('`');
  const codeCount = Math.floor((parts.length - 1) / 2);
  let out = '';
  for (let i = 0; i < parts.length; i++) {
    const isCode = i % 2 === 1 && Math.ceil(i / 2) <= codeCount;
    if (isCode) {
      out += '<code>' + escapeHtml(parts[i]) + '</code>';
    } else {
      out += emphasise(escapeHtml(parts[i]));
    }
  }
  return out;
}

// Only these schemes may reach an href/src. Anything else (javascript:, data:,
// vbscript:) is rendered as inert text rather than a working link.
const SAFE_URL = /^(?:https?:\/\/|mailto:|#|\/|\.{0,2}\/|[\w.-]+(?:[/#?]|$))/i;
function safeUrl(href) {
  const h = String(href).trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(h) && !/^(?:https?|mailto):/i.test(h)) return null;
  return SAFE_URL.test(h) ? h : null;
}

// Inline markup for a chunk that is already HTML-escaped and holds no code spans.
function emphasise(s) {
  // Images before links (same bracket shape).
  //
  // The character classes are bounded on purpose. Unbounded, they are quadratic
  // on a run of unmatched brackets: with no closing bracket anywhere, the global
  // scan restarts at every position. Measured before bounding: 3,000 brackets
  // 2.3ms, 6,000 8.8ms, 12,000 35.3ms, 24,000 136.7ms. No real link text or URL
  // in these documents comes close to the limits.
  s = s.replace(
    /!\[([^\]]{0,300})\]\(([^)\s]{1,500})(?:\s+&quot;[^&]{0,200}&quot;)?\)/g,
    (_m, alt, href) => {
      const safe = safeUrl(href);
      return safe ? '<img src="' + safe + '" alt="' + alt + '" loading="lazy">' : alt;
    }
  );
  s = s.replace(
    /\[([^\]]{1,300})\]\(([^)\s]{1,500})(?:\s+&quot;[^&]{0,200}&quot;)?\)/g,
    (_m, text, href) => {
      const safe = safeUrl(href);
      if (!safe) return text;
      return (
        '<a href="' + safe + '"' +
        (/^https?:/i.test(safe) ? ' target="_blank" rel="noopener"' : '') +
        '>' + text + '</a>'
      );
    }
  );

  s = s.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s.,;:!?)]|$)/g, '$1<em>$2</em>');
  s = s.replace(/(^|[\s(])_([^_\n]+)_(?=[\s.,;:!?)]|$)/g, '$1<em>$2</em>');
  s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  return s;
}

export const renderInline = inline;

// --- block ----------------------------------------------------------------

function isTableDelim(line) {
  // The length cap keeps a pathological line of pipes and spaces away from the
  // nested quantifier below, which would otherwise backtrack badly.
  if (!line.includes('|') || line.length > 2000) return false;
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);
}

function splitRow(line) {
  let l = line.trim();
  if (l.startsWith('|')) l = l.slice(1);
  if (l.endsWith('|')) l = l.slice(0, -1);
  const cells = [];
  let cur = '';
  let inCode = false;
  for (let i = 0; i < l.length; i++) {
    const ch = l[i];
    if (ch === '\\' && l[i + 1] === '|') {
      cur += '|';
      i++;
      continue;
    }
    if (ch === '`') inCode = !inCode;
    if (ch === '|' && !inCode) {
      cells.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  cells.push(cur);
  return cells.map((c) => c.trim());
}

function alignments(delim) {
  return splitRow(delim).map((c) => {
    const left = c.startsWith(':');
    const right = c.endsWith(':');
    if (left && right) return 'center';
    if (right) return 'right';
    return 'left';
  });
}

/**
 * Render markdown to HTML.
 * @param {string} markdown
 * @param {{headingOffset?: number, collectHeadings?: Array<{level:number,text:string,id:string}>}} [opts]
 */
export function renderMarkdown(markdown, opts) {
  const options = opts || {};
  const headingOffset = options.headingOffset || 0;
  const collect = options.collectHeadings;
  // Dozens of documents are embedded in one page and many share heading text
  // ("Rules", "Evidence", "Output"). Without a per-document prefix their ids
  // collide and getElementById returns whichever happens to come first.
  const idPrefix = options.idPrefix ? options.idPrefix + '--' : '';
  const lines = String(markdown === null || markdown === undefined ? '' : markdown)
    .replace(/\r\n?/g, '\n')
    .split('\n');
  const out = [];
  let i = 0;

  const listStack = []; // { tag, indent, closeLi }

  // A nested list belongs INSIDE the <li> above it, not beside it. When a deeper
  // level opens we reopen the previous item by stripping its </li>, and put that
  // </li> back when the nested list closes.
  function popList() {
    const entry = listStack.pop();
    out.push('</' + entry.tag + '>' + (entry.closeLi ? '</li>' : ''));
  }
  function openList(tag, indent) {
    let closeLi = false;
    if (listStack.length && out.length && out[out.length - 1].endsWith('</li>')) {
      out[out.length - 1] = out[out.length - 1].slice(0, -5);
      closeLi = true;
    }
    listStack.push({ tag: tag, indent: indent, closeLi: closeLi });
    out.push('<' + tag + '>');
  }
  function closeAllLists() {
    while (listStack.length) popList();
  }

  while (i < lines.length) {
    const line = lines[i];

    // fenced code
    const fence = line.match(/^\s*(`{3,}|~{3,})\s*([\w-]*)\s*$/);
    if (fence) {
      closeAllLists();
      const closer = fence[1][0] === '`' ? /^\s*`{3,}\s*$/ : /^\s*~{3,}\s*$/;
      const lang = fence[2] || '';
      const buf = [];
      i++;
      while (i < lines.length && !closer.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      out.push(
        '<pre class="md-code"' +
          (lang ? ' data-lang="' + escapeHtml(lang) + '"' : '') +
          '><code>' +
          escapeHtml(buf.join('\n')) +
          '</code></pre>'
      );
      continue;
    }

    // blank
    if (!line.trim()) {
      closeAllLists();
      i++;
      continue;
    }

    // hr
    if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      closeAllLists();
      out.push('<hr>');
      i++;
      continue;
    }

    // heading
    const h = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (h) {
      closeAllLists();
      const level = Math.min(6, h[1].length + headingOffset);
      const text = h[2];
      const id = idPrefix + slugify(text);
      if (collect) collect.push({ level: h[1].length, text: text, id: id });
      out.push('<h' + level + ' id="' + id + '">' + inline(text) + '</h' + level + '>');
      i++;
      continue;
    }

    // table
    if (line.includes('|') && i + 1 < lines.length && isTableDelim(lines[i + 1])) {
      closeAllLists();
      const header = splitRow(line);
      const align = alignments(lines[i + 1]);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      const th = header
        .map((c, n) => '<th style="text-align:' + (align[n] || 'left') + '">' + inline(c) + '</th>')
        .join('');
      const tb = rows
        .map((r) => {
          const tds = header
            .map(
              (_h, n) =>
                '<td style="text-align:' + (align[n] || 'left') + '">' + inline(r[n] || '') + '</td>'
            )
            .join('');
          return '<tr>' + tds + '</tr>';
        })
        .join('');
      out.push(
        '<div class="md-table-wrap"><table class="md-table"><thead><tr>' +
          th +
          '</tr></thead><tbody>' +
          tb +
          '</tbody></table></div>'
      );
      continue;
    }

    // blockquote
    if (/^\s*>/.test(line)) {
      closeAllLists();
      const buf = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      // Cap the recursion: ">>>>>…" nested hundreds deep would otherwise
      // recurse until the stack gives out.
      const depth = options.depth || 0;
      out.push(
        '<blockquote>' +
          (depth >= 8
            ? '<p>' + inline(buf.join(' ')) + '</p>'
            : renderMarkdown(buf.join('\n'), {
                headingOffset: headingOffset,
                idPrefix: options.idPrefix,
                depth: depth + 1,
              })) +
          '</blockquote>'
      );
      continue;
    }

    // list item
    const li = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
    if (li) {
      const indent = li[1].replace(/\t/g, '    ').length;
      const ordered = /\d/.test(li[2]);
      const tag = ordered ? 'ol' : 'ul';

      // Close any deeper levels first.
      while (listStack.length && listStack[listStack.length - 1].indent > indent) {
        popList();
      }
      const top = listStack[listStack.length - 1];
      if (!top || indent > top.indent) {
        openList(tag, indent);
      } else if (top.tag !== tag) {
        popList();
        openList(tag, indent);
      }

      // Absorb lazy continuation lines belonging to this item.
      const buf = [li[3]];
      i++;
      while (i < lines.length) {
        const nxt = lines[i];
        if (!nxt.trim()) break;
        if (/^(\s*)([-*+]|\d+[.)])\s+/.test(nxt)) break;
        if (/^#{1,6}\s/.test(nxt)) break;
        if (/^\s*>/.test(nxt)) break;
        if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(nxt)) break;
        if (/^\s*(?:`{3,}|~{3,})/.test(nxt)) break;
        if (nxt.includes('|') && i + 1 < lines.length && isTableDelim(lines[i + 1])) break;
        buf.push(nxt.trim());
        i++;
      }
      out.push('<li>' + inline(buf.join(' ')) + '</li>');
      continue;
    }

    // paragraph
    closeAllLists();
    const buf = [line];
    i++;
    while (i < lines.length) {
      const nxt = lines[i];
      if (!nxt.trim()) break;
      if (/^#{1,6}\s/.test(nxt)) break;
      if (/^\s*>/.test(nxt)) break;
      if (/^(\s*)([-*+]|\d+[.)])\s+/.test(nxt)) break;
      if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(nxt)) break;
      if (/^\s*(?:`{3,}|~{3,})/.test(nxt)) break;
      if (nxt.includes('|') && i + 1 < lines.length && isTableDelim(lines[i + 1])) break;
      buf.push(nxt);
      i++;
    }
    out.push('<p>' + inline(buf.join('\n')) + '</p>');
  }

  closeAllLists();
  return out.join('\n');
}

/** Strip markdown to plain text — used for search indexing and excerpts. */
export function toPlainText(markdown) {
  return String(markdown === null || markdown === undefined ? '' : markdown)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+[.)]\s+/gm, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
