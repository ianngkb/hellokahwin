// Assembles the single self-contained HTML page.
//
// Two rules run through every function here:
//   1. Nothing is printed that a source did not supply.
//   2. When a source is empty or unreachable, the page says so in plain words —
//      never a hopeful zero, never a blank space.

import { escapeHtml, renderInline } from './md.mjs';
import { lineChart, barChart, formatNumber as fmt, formatPosition as pos1 } from './charts.mjs';
import { CSS, JS } from './assets.mjs';
import { MIGRATION_DATE } from './config.mjs';

const e = escapeHtml;
const pct = (v, digits = 0) => (v === null || v === undefined ? '–' : (v * 100).toFixed(digits) + '%');

function pill(status) {
  const s = (status || 'none').toLowerCase();
  const label = status || 'no status line';
  return '<span class="pill ' + e(s) + '">' + e(label) + '</span>';
}

function emptyState(title, why) {
  return '<div class="empty"><strong>' + e(title) + '</strong>' + why + '</div>';
}

function failState(title, why) {
  return '<div class="fail"><strong>' + e(title) + '</strong>' + e(why) + '</div>';
}

function selectFilter(key, label, values) {
  const opts = ['<option value="">' + e(label) + ': all</option>']
    .concat(values.filter(Boolean).map((v) => '<option value="' + e(v) + '">' + e(v) + '</option>'))
    .join('');
  return '<select data-filter="' + e(key) + '" aria-label="' + e(label) + '">' + opts + '</select>';
}

const uniq = (arr) => [...new Set(arr.filter(Boolean))].sort();

/** Truncate without pretending the sentence ended there. */
const clip = (text, n) => {
  const t = String(text || '').trim();
  return t.length <= n ? t : t.slice(0, n).replace(/[\s,;:.-]+$/, '') + '…';
};

// --------------------------------------------------------------------------
// Documents rendered in place
// --------------------------------------------------------------------------

function docDisclosure(doc, extraSummary) {
  const bodyId = 'body-' + doc.id;
  return (
    '<details class="doc" id="doc-' + e(doc.id) + '" data-row ' +
    'data-status="' + e(doc.status || '') + '" data-owner="' + e(doc.owner || '') + '" ' +
    'data-session="' + e(doc.session || '') + '" data-kind="' + e(doc.type) + '" ' +
    'data-text="' + e(doc.title + ' ' + doc.path) + '">' +
    '<summary><span class="caret">▶</span>' +
    '<span style="flex:1;min-width:200px">' +
    '<span style="font-weight:600;font-size:14.5px">' + e(doc.title) + '</span>' +
    '<div class="tl-meta"><span class="mono">' + e(doc.path) + '</span>' +
    (doc.owner ? '<span>owner: ' + e(doc.owner) + '</span>' : '') +
    '<span>' + e(doc.date) + '</span>' +
    '<span>' + fmt(doc.words) + ' words</span></div>' +
    (extraSummary || '') +
    '</span>' +
    pill(doc.status) +
    '</summary>' +
    '<div class="doc-body md" id="' + e(bodyId) + '">' + doc.html + '</div>' +
    '<div class="expand-note"><a href="#" data-expand="' + e(bodyId) + '">Expand the whole document</a>' +
    ' &nbsp;·&nbsp; <span class="mono">' + e(doc.path) + '</span></div>' +
    '</details>'
  );
}

// --------------------------------------------------------------------------
// Sections
// --------------------------------------------------------------------------

function sectionOverview(d) {
  const g = d.gsc;
  const target30 = d.checkpoints.rows.find((r) => /clicks/.test(r.key));
  const next = target30 && target30.numbers[1] !== null ? target30.numbers[1] : null;

  const clicksKpi = g.ok
    ? (function () {
        const cur = g.current.clicks;
        const prev = g.previous ? g.previous.clicks : null;
        const delta = prev === null ? null : cur - prev;
        const cls = delta === null ? 'flat' : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
        const arrow = delta === null ? '' : delta > 0 ? '▲' : delta < 0 ? '▼' : '■';
        return (
          '<div class="kpi"><div class="label">Clicks · last 28 days</div>' +
          '<div class="value">' + fmt(cur) + '</div>' +
          '<div class="note"><span class="delta ' + cls + '">' + arrow + ' ' + (delta === null ? '–' : fmt(Math.abs(delta))) +
          '</span> vs the 28 days before' + (next ? ' · next checkpoint ' + fmt(next) : '') + '</div>' +
          (next ? '<div class="bar"><span style="width:' + Math.min(100, (cur / next) * 100).toFixed(1) + '%"></span></div>' : '') +
          '</div>'
        );
      })()
    : '<div class="kpi"><div class="label">Clicks · last 28 days</div><div class="value">–</div>' +
      '<div class="note">Search Console unreachable — see Metrics</div></div>';

  const coverage = d.coverage;
  const kpis = [
    clicksKpi,
    g.ok
      ? '<div class="kpi"><div class="label">Impressions · 28 days</div><div class="value">' + fmt(g.current.impressions) +
        '</div><div class="note">CTR ' + pct(g.current.ctr, 2) + ' · avg position ' + pos1(g.current.position) + '</div></div>'
      : '<div class="kpi"><div class="label">Impressions · 28 days</div><div class="value">–</div><div class="note">not pulled</div></div>',
    '<div class="kpi"><div class="label">Articles live</div><div class="value">' + fmt(coverage.articles) +
      '</div><div class="note">' + (coverage.drafted
        ? fmt(coverage.drafted) + ' more drafted and not published'
        : 'of ' + fmt(coverage.topics) + ' mapped topics') +
      ' · ' + pct(coverage.coverage, 1) + ' of the strategy live</div>' +
      '<div class="bar"><span style="width:' + ((coverage.coverage || 0) * 100).toFixed(1) + '%"></span></div></div>',
    '<div class="kpi"><div class="label">Decisions logged</div><div class="value">' + fmt(d.decisions.length) +
      '</div><div class="note">' + fmt(d.openPredictions) + ' prediction' + (d.openPredictions === 1 ? '' : 's') + ' still open</div></div>',
    '<div class="kpi"><div class="label">Waiting on the board</div><div class="value">' + fmt(d.approvals.length) +
      '</div><div class="note">' + (d.approvals.length ? 'oldest waiting ' + fmt(Math.max(...d.approvals.map((a) => a.waitingDays || 0))) + ' days' : 'nothing queued') + '</div></div>',
    '<div class="kpi"><div class="label">Blocked or open</div><div class="value">' + fmt(d.blocked.length) +
      '</div><div class="note">follow-ups, actions and approvals</div></div>',
    '<div class="kpi"><div class="label">People</div><div class="value">' + fmt(d.agents.length) +
      '</div><div class="note">' + fmt(d.departments.length) + ' departments · ' +
      fmt(d.agents.filter((a) => a.canBlockPublication).length) + ' with blocking authority</div></div>',
    '<div class="kpi"><div class="label">Documents read</div><div class="value">' + fmt(d.docs.length) +
      '</div><div class="note">' + fmt(d.docs.reduce((s, x) => s + x.words, 0)) + ' words across the boardroom, plans and work-done</div></div>',
  ].join('');

  const sources = d.sourceStatus
    .map(
      (s) =>
        '<div class="src"><span class="' + (s.ok ? 'ok' : 'no') + '">' + (s.ok ? '✔' : '✘') + '</span> ' +
        e(s.name) + ' <span class="muted">' + e(s.detail) + '</span>' +
        '<div class="path">' + e(s.path) + '</div></div>'
    )
    .join('');

  return (
    '<section class="panel" id="overview">' +
    '<h2>Where the company stands</h2>' +
    '<p class="lede">Every figure below is read from a file in this repository or pulled live from Search Console at generation time. Nothing is typed in by hand.</p>' +
    '<div class="kpis">' + kpis + '</div>' +
    '<h3 style="font-size:14px;margin:20px 0 8px">What changed since you last looked</h3>' +
    '<div class="card pad"><p class="tiny muted" id="changed-head" style="margin:0 0 8px">Loading…</p>' +
    '<div class="tl" id="changed-feed"></div></div>' +
    '<h3 style="font-size:14px;margin:20px 0 8px">Sources this page read</h3>' +
    '<div class="sources">' + sources + '</div>' +
    '</section>'
  );
}

function sectionTimeline(d) {
  const events = d.timeline;
  const filters =
    '<div class="filters">' +
    selectFilter('kind', 'Type', uniq(events.map((x) => x.kindLabel))) +
    selectFilter('owner', 'Owner', uniq(events.map((x) => x.owner))) +
    selectFilter('session', 'Session', uniq(events.map((x) => x.session))) +
    selectFilter('status', 'Status', uniq(events.map((x) => x.status))) +
    '<input data-filter="text" placeholder="Filter by words…">' +
    '<span class="count" data-count></span></div>';

  const items = events
    .map(
      (x) =>
        '<div class="tl-item card" data-row data-kind="' + e(x.kindLabel) + '" data-owner="' + e(x.owner || '') +
        '" data-session="' + e(x.session || '') + '" data-status="' + e(x.status || '') +
        '" data-text="' + e(x.title + ' ' + x.summary) + '" id="' + e(x.id) + '">' +
        '<div class="tl-head" onclick="location.hash=\'' + e(x.docId ? 'doc-' + x.docId : x.decisionId ? 'decision-' + x.decisionId : x.id) + '\'">' +
        '<div class="tl-date">' + e(x.date || '—') + '</div>' +
        '<div style="flex:1;min-width:180px"><div class="tl-title">' + e(x.title) + '</div>' +
        '<div class="tl-meta"><span>' + e(x.kindLabel) + '</span>' +
        (x.owner ? '<span>' + e(x.owner) + '</span>' : '') +
        (x.session ? '<span>' + e(x.session) + '</span>' : '') +
        '<span class="mono">' + e(x.docPath) + '</span></div></div>' +
        (x.status ? pill(x.status) : '') +
        '</div></div>'
    )
    .join('');

  return (
    '<section class="panel" id="timeline">' +
    '<h2>Timeline</h2>' +
    '<p class="lede">Every meeting, decision, plan and completed piece of work in date order — the record of what happened and when. Click any entry to jump to the document itself.</p>' +
    filters +
    (events.length ? '<div class="tl">' + items + '</div>'
      : emptyState('The timeline is empty.', 'No meetings, decisions, plans or completion records were found under docs/.')) +
    '</section>'
  );
}

function sectionDecisions(d) {
  const decs = d.decisions;
  const reg = d.outcomes;

  const banner = reg.exists
    ? '<div class="card pad tiny"><strong>' + fmt(reg.rows.length) + ' outcome' + (reg.rows.length === 1 ? '' : 's') +
      ' recorded</strong> in <span class="mono">' + e(reg.file) + '</span>.</div>'
    : emptyState(
        'No prediction has been scored yet.',
        'The dashboard scores predictions from <span class="mono">' + e(reg.file) + '</span>, which does not exist yet. ' +
          'Until the CEO records outcomes there, every prediction below reads <em>open</em> — which is the honest state, not a gap in the page. ' +
          'Where a prediction is measured in Search Console clicks, the live figure is shown beside it so the board can see the gap now.'
      );

  const filters =
    '<div class="filters">' +
    selectFilter('group', 'Meeting', uniq(decs.map((x) => x.group))) +
    '<input data-filter="text" placeholder="Filter decisions…">' +
    '<span class="count" data-count></span></div>';

  const cards = decs
    .map((dec) => {
      const preds = dec.predictions
        .map((p) => {
          const measured = p.measured
            ? '<div class="progress"><div class="tiny muted">measured ' + fmt(p.measured.value) + ' / ' + fmt(p.target) +
              ' — ' + e(p.measured.window) + '</div><div class="bar ' + (p.measured.atTarget ? 'ok' : '') +
              '"><span style="width:' + ((p.measured.progress || 0) * 100).toFixed(1) + '%"></span></div></div>'
            : '';
          const due = p.dueDate
            ? '<span class="tiny muted">due ' + e(p.dueDate) +
              (p.daysToDue !== undefined && p.daysToDue !== null
                ? ' (' + (p.daysToDue >= 0 ? 'in ' + p.daysToDue + ' days' : Math.abs(p.daysToDue) + ' days ago') + ')'
                : '') + '</span>'
            : p.dueLabel
              ? '<span class="tiny muted">due at the ' + e(p.dueLabel) + '</span>'
              : '<span class="tiny muted">no date stated</span>';
          return (
            '<div class="pred-row"><span class="pred-claim">' + e(clip(p.claim, 130)) + '</span>' +
            '<span class="pred-state ' + e(p.state) + '">' + e(p.state) + '</span>' + due + measured +
            (p.recorded && p.recorded.note ? '<span class="tiny">— ' + e(p.recorded.note) + '</span>' : '') +
            '</div>'
          );
        })
        .join('');

      return (
        '<div class="dec" id="decision-' + e(dec.id) + '" data-row data-group="' + e(dec.group) +
        '" data-text="' + e(dec.title + ' ' + (dec.basis || '') + ' ' + (dec.predictionText || '')) + '">' +
        '<div class="dhead"><span class="dnum">D' + dec.number + '</span>' +
        '<h3>' + dec.titleHtml + '</h3>' +
        '<span class="tiny muted mono">' + e(dec.date || '') + ' · ' + e(dec.group) + '</span></div>' +
        '<div class="dgrid">' +
        '<div class="dcell"><div class="k">What was decided</div><div class="v">' +
        (dec.narrativeHtml || '<span class="muted">Stated in the title only.</span>') + '</div></div>' +
        '<div class="dcell"><div class="k">Evidence it rests on</div><div class="v">' +
        (dec.basisHtml || '<span class="muted">No basis recorded in the log.</span>') + '</div></div>' +
        '<div class="dcell"><div class="k">What was predicted</div><div class="v">' +
        (dec.predictionText ? e(dec.predictionText) : '<span class="muted">No prediction was made.</span>') + '</div></div>' +
        (dec.consequenceHtml ? '<div class="dcell"><div class="k">Consequence</div><div class="v">' + dec.consequenceHtml + '</div></div>' : '') +
        '</div>' +
        (dec.predictions.length && dec.predictionText ? '<div class="pred"><div class="k tiny muted" style="text-transform:uppercase;letter-spacing:.05em;font-weight:650">What actually happened</div>' + preds + '</div>' : '') +
        '</div>'
      );
    })
    .join('');

  const open = d.openPredictionRows;
  const openTable = open.length
    ? '<div class="dt-wrap"><table class="dt"><thead><tr><th>Decision</th><th>Prediction</th><th>Due</th><th>State</th><th>Measured now</th></tr></thead><tbody>' +
      open
        .map(
          (r) =>
            '<tr><td><a href="#decision-' + e(r.decisionId) + '">D' + r.number + '</a></td>' +
            '<td>' + e(clip(r.claim, 90)) + '</td>' +
            '<td class="mono">' + e(r.dueDate || r.dueLabel || '—') + '</td>' +
            '<td><span class="pred-state ' + e(r.state) + '">' + e(r.state) + '</span></td>' +
            '<td>' + (r.measured ? fmt(r.measured.value) + ' / ' + fmt(r.target) : '<span class="muted">not measurable from Search Console</span>') + '</td></tr>'
        )
        .join('') +
      '</tbody></table></div>'
    : emptyState('No open predictions.', 'Every prediction in the log has either been scored or carries no date.');

  return (
    '<section class="panel" id="decisions">' +
    '<h2>Decision tracker</h2>' +
    '<p class="lede">What was decided, the evidence behind it, what was predicted — and what actually happened. The last column is the one that makes this more than a filing cabinet.</p>' +
    banner +
    '<h3 style="font-size:14px;margin:18px 0 8px">Open predictions and when they come due</h3>' +
    openTable +
    '<h3 style="font-size:14px;margin:22px 0 8px">Every decision</h3>' +
    filters +
    (decs.length ? cards : emptyState('No decisions found.', 'docs/boardroom/decision-log.md was not found or holds no numbered entries.')) +
    '</section>'
  );
}

function sectionPlans(d) {
  const plans = d.planDocs;
  const byStatus = {};
  for (const p of plans) {
    const k = p.status || 'NO STATUS LINE';
    byStatus[k] = (byStatus[k] || 0) + 1;
  }
  const strip = Object.entries(byStatus)
    .sort()
    .map(([k, v]) => '<div class="kpi"><div class="label">' + e(k) + '</div><div class="value">' + v + '</div></div>')
    .join('');

  const filters =
    '<div class="filters">' +
    selectFilter('status', 'Status', uniq(plans.map((p) => p.status))) +
    selectFilter('kind', 'Type', uniq(plans.map((p) => p.type))) +
    selectFilter('owner', 'Owner', uniq(plans.map((p) => p.owner))) +
    selectFilter('session', 'Session', uniq(plans.map((p) => p.session))) +
    '<input data-filter="text" placeholder="Filter plans…">' +
    '<span class="count" data-count></span></div>';

  const items = plans
    .map((p) => {
      const revs = d.revisions[p.path] || [];
      const sup = d.supersedes[p.path] || [];
      let extra = '';
      if (revs.length) {
        extra +=
          '<div class="tiny muted" style="margin-top:4px">Revisions: ' +
          revs.map((r) => '<b>' + e(r.version) + '</b>' + (r.date ? ' ' + e(r.date) : '')).join(' · ') +
          '</div>';
      }
      if (sup.length) {
        extra += '<div class="tiny muted">Supersedes: ' + sup.map((s) => '<span class="mono">' + e(s) + '</span>').join(', ') + '</div>';
      }
      if (p.statusRaw && p.status !== p.statusRaw) {
        extra += '<div class="tiny muted">Status line: “' + e(p.statusRaw.slice(0, 160)) + '”</div>';
      }
      return docDisclosure(p, extra);
    })
    .join('');

  return (
    '<section class="panel" id="plans">' +
    '<h2>Plans</h2>' +
    '<p class="lede">Every plan with its status, revision history and what it superseded. Each one opens and reads in place — no downloads.</p>' +
    '<div class="kpis" style="margin-bottom:14px">' + strip + '</div>' +
    filters +
    (plans.length ? items : emptyState('No plans found.', 'Nothing was found under docs/plans/.')) +
    '</section>'
  );
}

function sectionWorkDone(d) {
  const done = d.workDoneDocs;
  const counts = { COMPLETED: 0, PARTIAL: 0, ABANDONED: 0, OTHER: 0 };
  for (const w of done) counts[w.status] = (counts[w.status] || 0) + 1;

  const strip =
    '<div class="kpis" style="margin-bottom:14px">' +
    '<div class="kpi"><div class="label">Completed</div><div class="value">' + (counts.COMPLETED || 0) + '</div></div>' +
    '<div class="kpi"><div class="label">Partial</div><div class="value">' + (counts.PARTIAL || 0) +
    '</div><div class="note">shown as prominently as completed</div></div>' +
    '<div class="kpi"><div class="label">Abandoned</div><div class="value">' + (counts.ABANDONED || 0) +
    '</div><div class="note">never quietly dropped</div></div>' +
    '</div>';

  const filters =
    '<div class="filters">' +
    selectFilter('status', 'Status', uniq(done.map((x) => x.status))) +
    selectFilter('owner', 'Owner', uniq(done.map((x) => x.owner))) +
    selectFilter('session', 'Session', uniq(done.map((x) => x.session))) +
    '<input data-filter="text" placeholder="Filter completed work…">' +
    '<span class="count" data-count></span></div>';

  const items = done
    .map((w) => {
      const ev = d.evidence[w.path];
      const extra = ev
        ? '<div class="tiny" style="margin-top:6px;padding:7px 9px;background:var(--panel-2);border:1px solid var(--line-2);border-radius:7px">' +
          '<b>Evidence</b> — ' + e(ev.slice(0, 340)) + (ev.length > 340 ? '…' : '') + '</div>'
        : '<div class="tiny muted" style="margin-top:6px">No Evidence section in this record.</div>';
      return docDisclosure(w, extra);
    })
    .join('');

  return (
    '<section class="panel" id="workdone">' +
    '<h2>Work done</h2>' +
    '<p class="lede">The completion record, with the evidence attached — so “we shipped X” is always one click from the proof. Partial and abandoned work sits here in full view.</p>' +
    strip +
    filters +
    (done.length ? items : emptyState('Nothing has been logged as done.', 'No completion records were found under docs/work-done/.')) +
    '</section>'
  );
}

function orgNode(agent, activity) {
  const act = activity[agent.name] || { produced: 0, completed: 0 };
  return (
    '<button class="org-node' + (agent.department === 'Executive' ? ' exec' : '') + '" ' +
    'onclick="location.hash=\'agent-' + e(agent.name) + '\'">' +
    '<div class="role">' + e(agent.role) + '</div>' +
    '<div class="who">' + e(agent.name) + '</div>' +
    '<div class="dept">' + e(agent.department) + '</div>' +
    '<div class="tiny muted" style="margin-top:5px">' + act.completed + ' completed · ' + act.produced + ' produced</div>' +
    (agent.canBlockPublication ? '<div class="flag"><span class="pill block">can block publication</span></div>' : '') +
    '</button>'
  );
}

function sectionPeople(d) {
  if (d.orgError) {
    return (
      '<section class="panel" id="people"><h2>People &amp; org chart</h2>' +
      failState('The org chart could not be read.', d.orgError) + '</section>'
    );
  }

  const byName = new Map(d.agents.map((a) => [a.name, a]));
  const tree = d.tree;

  // Recursive so each person's reports sit under that person, not merely on the
  // next row down — the lines have to mean what they appear to mean.
  const seen = new Set();
  const subtree = (name, depth) => {
    const agent = byName.get(name);
    if (!agent || seen.has(name) || depth > 6) return '';
    seen.add(name);
    const kids = (tree.children[name] || []).filter((k) => !seen.has(k));
    return (
      '<div class="org-sub">' +
      orgNode(agent, d.activity.byAgent) +
      (kids.length
        ? '<div class="org-stem"></div><div class="org-kids">' +
          kids.map((k) => subtree(k, depth + 1)).join('') +
          '</div>'
        : '') +
      '</div>'
    );
  };
  const chart = tree.roots.map((r) => subtree(r, 0)).join('');
  const orphans = d.agents.filter((a) => !seen.has(a.name));
  const orphanBlock = orphans.length
    ? '<div class="org-kids" style="margin-top:14px">' +
      orphans.map((a) => '<div class="org-sub">' + orgNode(a, d.activity.byAgent) + '</div>').join('') +
      '</div><p class="tiny muted" style="text-align:center">Above: personas whose reporting line could not be read from their file.</p>'
    : '';

  const filters =
    '<div class="filters">' +
    selectFilter('dept', 'Department', uniq(d.agents.map((a) => a.department))) +
    selectFilter('manager', 'Reports to', uniq(d.agents.map((a) => a.reportsTo))) +
    '<input data-filter="text" placeholder="Filter people…">' +
    '<span class="count" data-count></span></div>';

  const people = d.agents
    .map((a) => {
      const act = d.activity.byAgent[a.name] || { produced: 0, completed: 0, decisions: 0, items: [] };
      const items = act.items.length
        ? '<ul style="margin:6px 0 0;padding-left:18px">' +
          act.items
            .map(
              (it) =>
                '<li class="tiny"><a href="#doc-' + e(it.docId) + '">' + e(it.title) + '</a> ' +
                '<span class="muted">' + e(it.type) + ' · ' + e(it.date) + (it.status ? ' · ' + e(it.status) : '') + '</span></li>'
            )
            .join('') +
          '</ul>'
        : '<div class="tiny muted" style="margin-top:6px">Nothing attributed to this seat yet in docs/plans or docs/work-done.</div>';

      return (
        '<details class="person" id="agent-' + e(a.name) + '" data-row data-dept="' + e(a.department) +
        '" data-manager="' + e(a.reportsTo || '') + '" data-text="' + e(a.name + ' ' + a.role + ' ' + a.description) + '">' +
        '<summary><span class="caret">▶</span><span style="flex:1;min-width:220px">' +
        '<span style="font-weight:640;font-size:15px">' + e(a.role) + '</span>' +
        '<div class="tl-meta"><span class="mono">' + e(a.name) + '</span><span>' + e(a.department) + '</span>' +
        (a.hiredOn ? '<span>hired ' + e(a.hiredOn) + '</span>' : '<span class="muted">hire date not stated</span>') +
        '<span>' + fmt(a.words) + '-word persona</span></div></span>' +
        (a.canBlockPublication ? '<span class="pill block">can block publication</span>' : '') +
        '</summary>' +
        '<div class="person-facts">' +
        '<div class="fact"><div class="k">Reports to</div><div class="v">' +
        (a.reportsTo ? '<a href="#agent-' + e(a.reportsTo) + '">' + e(a.reportsTo) + '</a>' : '<span class="muted">the owner (board)</span>') + '</div></div>' +
        '<div class="fact"><div class="k">Owns</div><div class="v">' +
        (a.owns ? renderInline(a.owns) : '<span class="muted">not listed in the workflow table</span>') + '</div></div>' +
        '<div class="fact"><div class="k">Cannot do</div><div class="v">' +
        (a.cannot ? renderInline(a.cannot) : '<span class="muted">not listed in the workflow table</span>') + '</div></div>' +
        '<div class="fact"><div class="k">Output so far</div><div class="v">' + act.completed + ' completed · ' +
        act.produced + ' produced · ' + act.decisions + ' decisions</div></div>' +
        '</div>' +
        '<div class="pad"><div class="tiny muted" style="text-transform:uppercase;letter-spacing:.05em;font-weight:650">What this seat has produced</div>' +
        items + '</div>' +
        '<div class="pad" style="border-top:1px solid var(--line-2)">' +
        '<div class="tiny muted" style="text-transform:uppercase;letter-spacing:.05em;font-weight:650;margin-bottom:6px">' +
        'The full persona file — <span class="mono">' + e(a.file) + '</span></div>' +
        '<div class="doc-body md" id="persona-' + e(a.name) + '">' + a.html + '</div>' +
        '<div class="expand-note" style="padding-left:0"><a href="#" data-expand="persona-' + e(a.name) + '">Expand the whole document</a></div>' +
        '</div></details>'
      );
    })
    .join('');

  const blockers = d.agents.filter((a) => a.canBlockPublication);
  const blockNote = blockers.length
    ? '<div class="card pad tiny" style="margin-bottom:14px"><strong>Blocking authority.</strong> ' +
      blockers.map((b) => '<span class="mono">' + e(b.name) + '</span>').join(', ') +
      ' can stop a publication, and the chair backs the block. That is a structural fact of the org, taken from the ownership table in <span class="mono">' +
      e(d.workflowSource || 'the content-production workflow') + '</span>, not from anyone’s job description.</div>'
    : '';

  const changelog = d.orgChangelog.length
    ? '<div class="dt-wrap"><table class="dt"><thead><tr><th>Date</th><th>Change</th><th>Hires</th></tr></thead><tbody>' +
      d.orgChangelog
        .map(
          (c) =>
            '<tr><td class="mono">' + e(c.date || '—') + '</td><td>' + e(c.label) + '</td><td class="mono">' +
            (c.hires.length ? e(c.hires.join(', ')) : '<span class="muted">—</span>') + '</td></tr>'
        )
        .join('') +
      '</tbody></table></div>'
    : emptyState('No org-chart history.', 'The org chart CHANGELOG.md holds no dated entries.');

  return (
    '<section class="panel" id="people">' +
    '<h2>People &amp; org chart</h2>' +
    '<p class="lede">Who reports to whom, what each seat owns, what it cannot do — and every persona file, readable here in full.</p>' +
    '<div class="card pad" style="margin-bottom:14px"><div class="org">' + chart + '</div>' + orphanBlock +
    '<div class="org-legend"><span>Click a box to open that person</span>' +
    '<span><span class="pill block">can block publication</span> structural veto over publishing</span></div></div>' +
    blockNote +
    filters +
    people +
    '<h3 style="font-size:14px;margin:22px 0 8px">Org-chart history</h3>' +
    changelog +
    '</section>'
  );
}

function sectionMetrics(d) {
  const g = d.gsc;
  const cp = d.checkpoints;

  if (!g.ok) {
    return (
      '<section class="panel" id="metrics"><h2>Metrics</h2>' +
      '<p class="lede">Live Search Console performance against the plan’s checkpoints.</p>' +
      failState(
        'Search Console could not be reached, so no traffic figure is shown.',
        g.error + ' — The page will not display an estimated or remembered number in its place.'
      ) +
      '<p class="tiny muted" style="margin-top:8px">Attempted ' + e(g.pulledAt) + ' for property <span class="mono">' + e(g.site) + '</span>.</p>' +
      '</section>'
    );
  }

  const daily = g.daily;
  const markerInRange = daily.some((p) => p.date === MIGRATION_DATE);
  const marker = markerInRange ? [{ date: MIGRATION_DATE, label: '21 Aug URL migration' }] : [];
  const migrationNote = markerInRange
    ? 'The gold dashed line marks the ' + MIGRATION_DATE +
      ' URL migration — everything to the left of it is a different set of URLs, so do not read the step as performance.'
    : 'The ' + MIGRATION_DATE +
      ' URL migration is not marked on these charts because Search Console has no data for it yet — its figures run only to ' +
      (g.dataThrough || (daily.length ? daily[daily.length - 1].date : 'an earlier date')) +
      '. It will appear as a gold dashed line as soon as that day lands.';

  const traffic = lineChart({
    series: [
      { name: 'Clicks', color: 'var(--accent)', points: daily.map((p) => ({ date: p.date, value: p.clicks })) },
    ],
    markers: marker,
    yLabel: 'clicks per day',
  });
  const imps = lineChart({
    series: [
      { name: 'Impressions', color: 'var(--info)', points: daily.map((p) => ({ date: p.date, value: p.impressions })) },
    ],
    markers: marker,
    yLabel: 'impressions per day',
  });
  const pos = lineChart({
    series: [
      { name: 'Average position', color: 'var(--gold)', points: daily.map((p) => ({ date: p.date, value: p.position })) },
    ],
    markers: marker,
    invertY: true,
    yLabel: 'average position',
  });

  const cpTable = cp.error
    ? emptyState('The checkpoint table could not be read.', e(cp.error))
    : '<div class="dt-wrap"><table class="dt"><thead><tr><th>Metric</th>' +
      cp.horizons.map((h) => '<th>' + e(h) + '</th>').join('') +
      '<th>Measured now</th><th>Source</th></tr></thead><tbody>' +
      cp.rows
        .map((r) => {
          let now = '<span class="muted">not measured here</span>';
          let src = '';
          if (/clicks/.test(r.key)) {
            now = fmt(g.current.clicks);
            src = 'GSC ' + g.current.range;
          } else if (/impressions/.test(r.key)) {
            now = fmt(g.current.impressions);
            src = 'GSC ' + g.current.range;
          } else if (/position/.test(r.key)) {
            now = pos1(g.current.position);
            src = 'GSC ' + g.current.range;
          } else if (/articles/.test(r.key)) {
            now = fmt(d.coverage.articles);
            src = d.register.registerExists ? d.register.registerPath : 'no article register exists yet';
          }
          return (
            '<tr><td><b>' + e(r.metric) + '</b></td>' +
            r.values.map((v) => '<td>' + e(v) + '</td>').join('') +
            '<td><b>' + now + '</b></td><td class="tiny muted">' + e(src) + '</td></tr>'
          );
        })
        .join('') +
      '</tbody></table></div>' +
      '<p class="tiny muted">Targets read from <span class="mono">' + e(cp.source) + '</span>. Measured column pulled live at generation time.</p>';

  const weekly = d.weekly;
  const weeklyBlock = weekly.empty
    ? emptyState(
        'The weekly article count is zero, and that is the real number.',
        'No article has been logged into <span class="mono">' + e(d.register.registerPath) + '</span> or into any work-done record with a cluster attached. ' +
          'This is the company’s leading indicator: when it slips, traffic slips about 30 days later. It has not started yet because the content-ingest path (stage 7 of the workflow) does not exist.'
      )
    : '<div class="chart-wrap">' + barChart(weekly.buckets, {}) +
      '<div class="chart-legend"><span><span class="swatch" style="background:var(--accent)"></span>Articles published per week</span></div></div>';

  const queries = g.topQueries.length
    ? '<div class="dt-wrap"><table class="dt"><thead><tr><th>Query</th><th class="right">Clicks</th><th class="right">Impressions</th><th class="right">CTR</th><th class="right">Position</th></tr></thead><tbody>' +
      g.topQueries
        .slice()
        .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
        .map(
          (q) =>
            '<tr><td>' + e(q.query) + '</td><td class="right">' + fmt(q.clicks) + '</td><td class="right">' +
            fmt(q.impressions) + '</td><td class="right">' + pct(q.ctr, 2) + '</td><td class="right">' + pos1(q.position) + '</td></tr>'
        )
        .join('') +
      '</tbody></table></div>'
    : emptyState('No queries returned.', 'Search Console returned no query rows for this window.');

  const pages = g.topPages.length
    ? '<div class="dt-wrap"><table class="dt"><thead><tr><th>Page</th><th class="right">Clicks</th><th class="right">Impressions</th><th class="right">CTR</th><th class="right">Position</th></tr></thead><tbody>' +
      g.topPages
        .slice()
        .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
        .map(
          (p) =>
            '<tr><td class="mono tiny">' + e(p.page) + '</td><td class="right">' + fmt(p.clicks) + '</td><td class="right">' +
            fmt(p.impressions) + '</td><td class="right">' + pct(p.ctr, 2) + '</td><td class="right">' + pos1(p.position) + '</td></tr>'
        )
        .join('') +
      '</tbody></table></div>'
    : emptyState('No pages returned.', 'Search Console returned no page rows for this window.');

  return (
    '<section class="panel" id="metrics">' +
    '<h2>Metrics</h2>' +
    '<p class="lede">Live from Google Search Console for <span class="mono">' + e(g.site) + '</span>, pulled ' +
    e(g.pulledAt) + '. ' + e(migrationNote) + '</p>' +
    '<div class="kpis" style="margin-bottom:14px">' +
    '<div class="kpi"><div class="label">Clicks</div><div class="value">' + fmt(g.current.clicks) + '</div><div class="note">' + e(g.current.range) + '</div></div>' +
    '<div class="kpi"><div class="label">Impressions</div><div class="value">' + fmt(g.current.impressions) + '</div><div class="note">' + e(g.current.range) + '</div></div>' +
    '<div class="kpi"><div class="label">CTR</div><div class="value">' + pct(g.current.ctr, 2) + '</div><div class="note">clicks ÷ impressions</div></div>' +
    '<div class="kpi"><div class="label">Average position</div><div class="value">' + fmt(g.current.position) + '</div><div class="note">impression-weighted</div></div>' +
    '</div>' +
    '<div class="grid2">' +
    '<div class="chart-wrap"><div class="chart-legend"><span><span class="swatch" style="background:var(--accent)"></span>Clicks per day</span></div>' + traffic + '</div>' +
    '<div class="chart-wrap"><div class="chart-legend"><span><span class="swatch" style="background:var(--info)"></span>Impressions per day</span></div>' + imps + '</div>' +
    '</div>' +
    '<div class="chart-wrap" style="margin-top:12px"><div class="chart-legend"><span><span class="swatch" style="background:var(--gold)"></span>Average position (lower is better — axis is inverted)</span></div>' + pos + '</div>' +
    '<h3 style="font-size:14px;margin:22px 0 8px">Against the plan’s checkpoints</h3>' + cpTable +
    '<h3 style="font-size:14px;margin:22px 0 8px">Weekly article count — the leading indicator</h3>' + weeklyBlock +
    '<h3 style="font-size:14px;margin:22px 0 8px">Top queries · last 28 days</h3>' + queries +
    '<h3 style="font-size:14px;margin:22px 0 8px">Top pages · last 28 days</h3>' + pages +
    '</section>'
  );
}

function sectionClusters(d) {
  const plan = d.clusterPlan;
  if (plan.error) {
    return '<section class="panel" id="clusters"><h2>Cluster progress</h2>' + failState('The cluster plan could not be read.', plan.error) + '</section>';
  }

  const pillars = plan.pillars
    .map((p) => {
      const cov = p.coverage || 0;
      return (
        '<div class="card pad" id="pillar-' + e(p.code) + '">' +
        '<div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline;flex-wrap:wrap">' +
        '<b>' + e(p.code) + '. ' + e(p.name) + '</b>' +
        '<span class="tiny muted mono">' + e(p.page || 'no pillar page named') + '</span></div>' +
        '<div class="tiny muted" style="margin-top:3px">' + fmt(p.articles) + ' of ' + fmt(p.mappedTopics) +
        ' topics live' + (p.drafted ? ', ' + fmt(p.drafted) + ' drafted' : '') + ' · ' + fmt(p.volume) + ' searches/mo</div>' +
        '<div class="bar"><span style="width:' + (cov * 100).toFixed(1) + '%"></span></div>' +
        '<div class="tiny muted" style="margin-top:4px">' + pct(cov, 1) + ' covered</div>' +
        '</div>'
      );
    })
    .join('');

  const chips =
    '<div class="filters" data-chipgroup="cluster-tier">' +
    [1, 2, 3, 4]
      .map((t) => '<button class="chip" data-value="' + t + '">Tier ' + t + ' (' + plan.clusters.filter((c) => c.tier === t).length + ')</button>')
      .join('') +
    '<select data-filter="tier" id="cluster-tier" style="display:none"><option value=""></option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option></select>' +
    selectFilter('pillar', 'Pillar', uniq(plan.clusters.map((c) => c.pillar))) +
    '<input data-filter="text" placeholder="Filter clusters…">' +
    '<span class="count" data-count></span></div>';

  const rows = plan.clusters
    .slice()
    .sort((a, b) => (a.tier || 9) - (b.tier || 9) || (b.volume || 0) - (a.volume || 0))
    .map(
      (c) =>
        '<tr data-row data-tier="' + e(String(c.tier || '')) + '" data-pillar="' + e(c.pillar || '') +
        '" data-text="' + e(c.code + ' ' + c.name + ' ' + (c.headKeyword || '')) + '" id="cluster-' + e(c.code) + '">' +
        '<td><span class="pill tier' + e(String(c.tier || 4)) + '">T' + e(String(c.tier || '?')) + '</span></td>' +
        '<td class="mono">' + e(c.code) + '</td>' +
        '<td><b>' + e(c.name) + '</b><div class="tiny muted">' + e(c.pillarName || '') + '</div></td>' +
        '<td class="tiny mono">' + e(c.headKeyword || '—') + '</td>' +
        '<td class="right">' + fmt(c.headVolume) + '</td>' +
        '<td class="right">' + (c.headKd === null || c.headKd === undefined ? '–' : c.headKd) + '</td>' +
        '<td class="right">' + fmt(c.volume) + '</td>' +
        '<td class="right">' + fmt(c.topicCount) + '</td>' +
        '<td class="right">' + fmt(c.articles) + '</td>' +
        '<td class="right">' + (c.drafted ? fmt(c.drafted) : '<span class="muted">–</span>') + '</td>' +
        '<td style="min-width:96px">' + pct(c.coverage, 0) +
        '<div class="bar"><span style="width:' + ((c.coverage || 0) * 100).toFixed(1) + '%"></span></div></td>' +
        '</tr>'
    )
    .join('');

  const covWarning = d.register.empty
    ? emptyState(
        'Coverage is 0% everywhere, and that is accurate.',
        'Coverage counts articles that actually exist. None do: no article draft and no completion record ' +
          'carries a cluster reference. The strategy is fully mapped — ' + fmt(plan.totals.clusters) + ' clusters, ' +
          fmt(plan.totals.topics) + ' topics — and none of it is built yet.'
      )
    : d.coverage.articles === 0 && d.coverage.drafted
      ? emptyState(
          'Coverage reads 0%, and that is the honest figure.',
          fmt(d.coverage.drafted) + ' article' + (d.coverage.drafted === 1 ? ' is' : 's are') +
            ' written and finished, but coverage counts what is <em>live</em>, and nothing is published yet. ' +
            'The drafted work shows in the “Drafted” column below and on the pipeline board; it becomes coverage the day it publishes.'
        )
      : '';

  return (
    '<section class="panel" id="clusters">' +
    '<h2>Cluster progress</h2>' +
    '<p class="lede">All ' + fmt(plan.totals.clusters) + ' approved clusters across ' + fmt(plan.totals.pillars) +
    ' pillars, ' + fmt(plan.totals.topics) + ' mapped topics, roughly ' + fmt(plan.totals.volume) +
    ' Malay searches a month. Coverage is articles live against topics mapped — the clearest answer to “how far through the strategy are we?”</p>' +
    covWarning +
    '<div class="grid3" style="margin:14px 0">' + pillars + '</div>' +
    chips +
    '<div class="dt-wrap"><table class="dt"><thead><tr><th>Tier</th><th>Code</th><th>Cluster</th><th>Head keyword</th>' +
    '<th class="right">Vol/mo</th><th class="right">KD</th><th class="right">Cluster vol</th><th class="right">Topics</th>' +
    '<th class="right">Live</th><th class="right">Drafted</th><th>Coverage</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '<p class="tiny muted">Read from <span class="mono">' + e(plan.source) + '</span>. Keyword figures are Ahrefs, country <span class="mono">my</span>, as quoted in that document.</p>' +
    '</section>'
  );
}

function sectionPipeline(d) {
  const wf = d.workflow;
  if (wf.error) {
    return '<section class="panel" id="pipeline"><h2>Content pipeline</h2>' + failState('The workflow could not be read.', wf.error) + '</section>';
  }

  const cols = d.board.columns
    .map(
      (c) =>
        '<div class="col"><h4><span>' + e(c.name) + '</span><span class="stage-n">' + c.n + '/' + d.board.columns.length + '</span></h4>' +
        '<div class="body">' +
        (c.cards.length
          ? c.cards.map((a) =>
              '<div class="card pad tiny" style="margin-bottom:6px' + (a.held ? ';border-color:var(--warn)' : '') + '">' +
              (a.code ? '<span class="mono muted">' + e(a.code) + '</span> ' : '') +
              '<b>' + e(clip(a.title, 70)) + '</b>' +
              '<div class="muted">' + e(a.owner || '') + (a.cluster ? ' · ' + e(a.cluster) : '') + '</div>' +
              (a.held ? '<div style="color:var(--warn);margin-top:4px"><b>held</b> — ' + e(clip(a.heldReason || 'reason not stated', 90)) + '</div>' : '') +
              '</div>'
            ).join('')
          : '<span class="muted">no articles here</span>') +
        '</div>' +
        '<div class="owner">' + e(c.owner || 'owner not named') + '</div>' +
        (c.gate ? '<div class="gate"><b>Gate:</b> ' + renderInline(c.gate.slice(0, 190)) + '</div>' : '') +
        '</div>'
    )
    .join('');

  const readiness = d.pillarReadiness
    .map(
      (p) =>
        '<tr><td class="mono">' + e(p.code) + '</td><td>' + e(p.name) + '</td>' +
        '<td class="mono tiny">' + e(p.page || '—') + '</td>' +
        '<td>' + (p.state === 'live'
          ? '<span class="pill completed">live</span>'
          : p.state === 'built-not-deployed'
            ? '<span class="pill partial">built, not deployed</span>'
            : '<span class="pill draft">not built</span>') + '</td>' +
        '<td class="tiny muted">' + (p.evidence ? e(p.evidence) : 'no completion record names this page') + '</td>' +
        '<td class="right">' + fmt(p.articles) + ' / ' + fmt(p.mappedTopics) +
        (p.drafted ? ' <span class="muted">(+' + fmt(p.drafted) + ' drafted)</span>' : '') + '</td></tr>'
    )
    .join('');

  const steps = wf.pillarSteps
    .map(
      (s) =>
        '<tr><td class="mono">' + e(s.code) + '</td><td>' + renderInline(s.step) + '</td><td class="mono tiny">' +
        e(s.owner) + '</td><td class="tiny">' + renderInline(s.gate) + '</td></tr>'
    )
    .join('');

  const stuckNote = d.board.stuck.length
    ? '<div class="empty" style="border-color:var(--warn);border-style:solid"><strong>' + fmt(d.board.stuck.length) +
      ' article' + (d.board.stuck.length === 1 ? ' is' : 's are') + ' finished but stuck.</strong>' +
      'They have cleared the review board, the humanizer and SEO QC, and are held short of publication. ' +
      'Reason given: ' + e(clip(d.board.stuck[0].heldReason || 'not stated', 200)) + '</div>'
    : '';
  const boardEmpty = d.board.empty
    ? emptyState(
        'No article is anywhere on this board.',
        'The eight stages below are the real assembly line from the approved workflow, but nothing is moving through them yet. ' +
          'Articles appear here once they are listed in <span class="mono">' + e(d.register.registerPath) +
          '</span> with a stage, or a work-done record carries a <span class="mono">**Stage:**</span> line.'
      )
    : '';

  return (
    '<section class="panel" id="pipeline">' +
    '<h2>Content pipeline</h2>' +
    '<p class="lede">The assembly line every article passes through, with each stage’s owner and the gate it must clear before it moves on.</p>' +
    stuckNote +
    boardEmpty +
    '<div class="kanban" style="margin-top:12px">' + cols + '</div>' +
    '<h3 style="font-size:14px;margin:22px 0 8px">Pillar readiness — no article publishes without its pillar page</h3>' +
    '<div class="dt-wrap"><table class="dt"><thead><tr><th>Pillar</th><th>Name</th><th>Page</th><th>Status</th><th>Evidence</th><th class="right">Live / mapped</th></tr></thead><tbody>' +
    readiness + '</tbody></table></div>' +
    '<h3 style="font-size:14px;margin:22px 0 8px">Opening a pillar — the six steps before any article is written</h3>' +
    '<div class="dt-wrap"><table class="dt"><thead><tr><th>#</th><th>Step</th><th>Owner</th><th>Gate</th></tr></thead><tbody>' +
    steps + '</tbody></table></div>' +
    '<p class="tiny muted">Read from <span class="mono">' + e(wf.source) + '</span>.</p>' +
    '</section>'
  );
}

function blockedList(items, emptyTitle, emptyWhy) {
  if (!items.length) return emptyState(emptyTitle, emptyWhy);
  return items
    .map(
      (b) =>
        '<div class="card pad" data-row data-severity="' + e(b.severity) + '" data-owner="' + e(b.owner || '') +
        '" data-text="' + e(b.title + ' ' + b.reason) + '" style="margin-bottom:8px" id="' + e(b.id) + '">' +
        '<div style="display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap">' +
        '<span class="pill ' + (b.severity === 'approval' ? 'draft' : b.severity === 'action' ? 'decision' : 'other') + '">' + e(b.severity) + '</span>' +
        '<div style="flex:1;min-width:220px"><div style="font-weight:560">' + (b.titleHtml || e(b.title)) + '</div>' +
        '<div class="tl-meta"><span>' + e(b.reason) + '</span>' +
        (b.owner ? '<span>owner: ' + e(b.owner) + '</span>' : '') +
        (b.waitingDays !== null && b.waitingDays !== undefined ? '<span>' + b.waitingDays + ' day' + (b.waitingDays === 1 ? '' : 's') + ' open</span>' : '') +
        '<span><a href="#doc-' + e(b.docId) + '" class="mono">' + e(b.docPath) + '</a></span></div></div>' +
        '</div></div>'
    )
    .join('');
}

function sectionBlocked(d) {
  const filters =
    '<div class="filters">' +
    selectFilter('severity', 'Kind', uniq(d.blocked.map((b) => b.severity))) +
    selectFilter('owner', 'Owner', uniq(d.blocked.map((b) => b.owner))) +
    '<input data-filter="text" placeholder="Filter…">' +
    '<span class="count" data-count></span></div>';
  return (
    '<section class="panel" id="blocked">' +
    '<h2>Blocked and open</h2>' +
    '<p class="lede">Anything a missing approval, an open follow-up or an unfinished action is holding up. Short list, high value.</p>' +
    filters +
    blockedList(d.blocked, 'Nothing is blocked.', 'No DRAFT status, open follow-up, meeting action or “what I need from…” request was found in any document.') +
    '</section>'
  );
}

function sectionApprovals(d) {
  return (
    '<section class="panel" id="approvals">' +
    '<h2>Approvals queue</h2>' +
    '<p class="lede">What is sitting with the board right now, and how long it has been waiting.</p>' +
    blockedList(d.approvals, 'Nothing is waiting on the board.', 'No plan reads DRAFT and no document asks the board or the owner for a decision.') +
    '</section>'
  );
}

// --------------------------------------------------------------------------
// Page
// --------------------------------------------------------------------------

const TABS = [
  ['overview', 'Overview'],
  ['timeline', 'Timeline'],
  ['decisions', 'Decisions'],
  ['plans', 'Plans'],
  ['workdone', 'Work done'],
  ['people', 'People'],
  ['metrics', 'Metrics'],
  ['clusters', 'Clusters'],
  ['pipeline', 'Pipeline'],
  ['blocked', 'Blocked'],
  ['approvals', 'Approvals'],
];

export function renderPage(d) {
  const nav =
    '<nav class="tabs"><div class="inner">' +
    TABS.map(([id, label]) => '<a href="#' + id + '">' + e(label) + '</a>').join('') +
    '<span class="spacer"></span>' +
    '<div id="searchbox"><input id="q" placeholder="Search everything  ( / )" autocomplete="off"><div id="results"></div></div>' +
    '<button class="theme-btn" id="theme" title="Light or dark">◐</button>' +
    '</div></nav>';

  const header =
    '<header class="top"><div class="wrap">' +
    '<div class="brand"><h1>The HelloKahwin Command Centre</h1>' +
    '<span class="sub">internal · regenerate on demand · not for publication</span></div>' +
    '<div class="stamp">' +
    '<span>Generated <b>' + e(d.generatedAt) + '</b></span>' +
    '<span>Regenerate: <code>node scripts/dashboard/generate.mjs</code></span>' +
    '<span>' + fmt(d.docs.length) + ' documents · ' + fmt(d.agents.length) + ' people · ' + fmt(d.decisions.length) + ' decisions</span>' +
    '</div></div></header>';

  const payload = {
    search: d.searchIndex,
    changes: d.changes.slice(0, 60),
  };

  return (
    '<!doctype html>\n<html lang="en">\n<head>\n' +
    '<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
    '<meta name="robots" content="noindex,nofollow">\n' +
    '<title>HelloKahwin Command Centre</title>\n' +
    '<style>' + CSS + '</style>\n</head>\n<body>\n' +
    header +
    nav +
    '<div class="wrap">' +
    sectionOverview(d) +
    sectionTimeline(d) +
    sectionDecisions(d) +
    sectionPlans(d) +
    sectionWorkDone(d) +
    sectionPeople(d) +
    sectionMetrics(d) +
    sectionClusters(d) +
    sectionPipeline(d) +
    sectionBlocked(d) +
    sectionApprovals(d) +
    '<footer class="foot"><p>Internal document. It reads <b>' + fmt(d.docs.length) +
    '</b> markdown files and the live Search Console API every time it is generated, so it cannot drift from the source. ' +
    'It does not deploy to the public site without board approval.</p>' +
    '<p class="tiny">Built by <span class="mono">full-stack-engineer</span> · generated ' + e(d.generatedAt) + '</p></footer>' +
    '</div>\n' +
    '<script>window.__HK__=' + JSON.stringify(payload).replace(/</g, '\\u003c') + ';</script>\n' +
    '<script>' + JS + '</script>\n</body>\n</html>\n'
  );
}
