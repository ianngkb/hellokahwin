#!/usr/bin/env node
// The HelloKahwin Command Centre — generator.
//
//   node scripts/dashboard/generate.mjs             regenerate, pulling live Search Console
//   node scripts/dashboard/generate.mjs --offline   regenerate from the last saved snapshot
//   node scripts/dashboard/generate.mjs --open      regenerate and open it
//   node scripts/dashboard/generate.mjs --out FILE  write somewhere else
//
// It reads the real files every run, so the page cannot drift from the truth.
// It never writes a metric it did not measure: an unreachable source is
// reported on the page, not filled in.

import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';

import { PATHS, GSC, SOURCES, REPO_ROOT } from './lib/config.mjs';
import { loadDocuments, parseRevisions, findSupersedes, sectionByTitle } from './lib/docs.mjs';
import { loadOrgChart, buildTree, parseOwnershipTable, parseOrgChangelog, applyOwnership } from './lib/org.mjs';
import { parseDecisionLog, loadOutcomes, scorePredictions } from './lib/decisions.mjs';
import { parseClusterPlan, loadArticleRegister, computeCoverage } from './lib/clusters.mjs';
import { parseWorkflow, buildBoard, pillarReadiness } from './lib/pipeline.mjs';
import {
  buildTimeline,
  buildBlocked,
  buildApprovals,
  buildActivity,
  weeklyArticleCount,
  recentChanges,
  buildSearchIndex,
  parseCheckpoints,
} from './lib/derive.mjs';
import { fetchSearchConsole, writeSnapshot, readSnapshot } from './lib/gsc.mjs';
import { renderPage } from './lib/render.mjs';
import { toPlainText } from './lib/md.mjs';

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const valueOf = (f) => {
  const i = args.indexOf(f);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
};

const quiet = has('--quiet');
const offline = has('--offline');
const say = (...m) => {
  if (!quiet) console.log(...m);
};

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const outFile = valueOf('--out') || path.join(PATHS.outDir, 'index.html');
  const dataDir = path.join(path.dirname(outFile), 'data');

  // ---- documents -------------------------------------------------------
  if (!fs.existsSync(PATHS.docs)) {
    console.error('No docs/ folder at ' + PATHS.docs + '. Set HELLOKAHWIN_DOCS and try again.');
    process.exit(1);
  }
  const docs = loadDocuments(PATHS.docs);
  say('read ' + docs.length + ' documents from ' + path.relative(REPO_ROOT, PATHS.docs));

  const byFile = (name) => docs.find((d) => d.fileName === name) || null;
  const decisionLogDoc = byFile(SOURCES.decisionLog);
  const workflowDoc = byFile(SOURCES.workflow);
  const clusterDoc = byFile(SOURCES.clusterPlan);
  const growthPlanDoc = byFile(SOURCES.growthPlan);

  const revisions = {};
  const supersedes = {};
  const evidence = {};
  for (const d of docs) {
    const revs = parseRevisions(d);
    if (revs.length) revisions[d.path] = revs;
    const sup = findSupersedes(d, docs);
    if (sup.length) supersedes[d.path] = sup;
    if (d.type === 'work-done') {
      const sec = sectionByTitle(d.sections, 'evidence');
      if (sec) evidence[d.path] = toPlainText(sec.body);
    }
  }

  // ---- org chart -------------------------------------------------------
  const org = loadOrgChart(PATHS.orgChart);
  const orgChangelog = parseOrgChangelog(PATHS.orgChart);
  applyOwnership(org.agents, parseOwnershipTable(workflowDoc), orgChangelog);
  const tree = buildTree(org.agents);
  say(
    org.error
      ? 'org chart UNREACHABLE: ' + org.error
      : 'read ' + org.agents.length + ' personas from ' + PATHS.orgChart
  );

  // ---- decisions -------------------------------------------------------
  const decisions = parseDecisionLog(decisionLogDoc);
  const outcomes = loadOutcomes(PATHS.boardroom);
  say('parsed ' + decisions.length + ' decisions; outcome register ' + (outcomes.exists ? 'found' : 'NOT created yet'));

  // ---- live metrics ----------------------------------------------------
  let gsc;
  if (offline) {
    gsc = readSnapshot(dataDir);
    if (!gsc) {
      gsc = {
        ok: false,
        error: 'Run with --offline but no saved snapshot exists at ' + path.join(dataDir, 'gsc-snapshot.json') + '.',
        site: GSC.siteUrl,
        pulledAt: new Date().toISOString(),
        current: null,
        previous: null,
        daily: [],
        topQueries: [],
        topPages: [],
      };
    } else {
      say('using saved Search Console snapshot from ' + gsc.pulledAt);
    }
  } else {
    say('pulling Search Console for ' + GSC.siteUrl + ' …');
    gsc = await fetchSearchConsole({ ...GSC, today });
    if (gsc.ok) {
      writeSnapshot(dataDir, gsc);
      say(
        '  ' + gsc.current.clicks + ' clicks, ' + gsc.current.impressions + ' impressions, position ' +
          gsc.current.position.toFixed(1) + '  (' + gsc.current.range + ')'
      );
    } else {
      say('  Search Console UNREACHABLE: ' + gsc.error);
      const cached = readSnapshot(dataDir);
      if (cached) say('  a saved snapshot exists; run with --offline to use it');
    }
  }

  // ---- strategy & pipeline --------------------------------------------
  const clusterPlan = parseClusterPlan(clusterDoc);
  const workDoneDocs = docs.filter((d) => d.type === 'work-done');
  const draftDocs = docs.filter((d) => d.type === 'draft');
  const register = loadArticleRegister(PATHS.boardroom, workDoneDocs, draftDocs);
  const coverage = computeCoverage(clusterPlan, register);
  const workflow = parseWorkflow(workflowDoc);
  const board = buildBoard(workflow, register);
  const readiness = pillarReadiness(clusterPlan, workDoneDocs);
  const checkpoints = parseCheckpoints(growthPlanDoc);
  say(
    clusterPlan.error
      ? 'cluster plan UNREADABLE: ' + clusterPlan.error
      : 'cluster plan: ' + clusterPlan.totals.clusters + ' clusters, ' + clusterPlan.totals.topics + ' topics, ' +
          register.live.length + ' live, ' + register.articles.filter((a) => !a.published && !a.isSummary).length + ' drafted'
  );

  // ---- scoring & derived views ----------------------------------------
  scorePredictions(decisions, outcomes, gsc, today);
  const openPredictionRows = [];
  for (const dec of decisions) {
    for (const p of dec.predictions) {
      if (p.state === 'open' || p.state === 'overdue') {
        openPredictionRows.push({ ...p, decisionId: dec.id, number: dec.number });
      }
    }
  }
  openPredictionRows.sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));

  // Exactly the documents render.mjs gives an expandable disclosure to. They own
  // the "doc-<id>" anchor; everything else is anchored by its timeline row.
  const planDocs = docs.filter(
    (d) => d.path.startsWith('plans/') && d.type !== 'index' && d.type !== 'draft'
  );
  const withDisclosure = new Set([...planDocs, ...workDoneDocs].map((d) => d.path));

  const timeline = buildTimeline({ docs, decisions, orgChangelog, withDisclosure });
  const blocked = buildBlocked(docs, today, withDisclosure);
  const approvals = buildApprovals(blocked);
  const activity = buildActivity(org.agents, docs, decisions);
  const weekly = weeklyArticleCount(register, today);
  const changes = recentChanges(docs, org.agents, withDisclosure);
  const searchIndex = buildSearchIndex(docs, org.agents, decisions, clusterPlan.clusters, withDisclosure);

  const sourceStatus = [
    { name: 'Boardroom', ok: fs.existsSync(PATHS.boardroom), detail: docs.filter((d) => d.path.startsWith('boardroom/')).length + ' files', path: 'docs/boardroom/' },
    { name: 'Plans', ok: fs.existsSync(PATHS.plans), detail: docs.filter((d) => d.path.startsWith('plans/')).length + ' files', path: 'docs/plans/' },
    { name: 'Work done', ok: fs.existsSync(PATHS.workDone), detail: workDoneDocs.length + ' records', path: 'docs/work-done/' },
    { name: 'Org chart', ok: !org.error, detail: org.error ? 'unreachable' : org.agents.length + ' personas', path: PATHS.orgChart || 'not found' },
    { name: 'Search Console', ok: gsc.ok, detail: gsc.ok ? (gsc.fromSnapshot ? 'from snapshot ' + gsc.pulledAt.slice(0, 10) : 'live ' + gsc.current.range) : 'unreachable', path: gsc.site },
    { name: 'Articles', ok: register.articles.length > 0, detail: register.articles.length + ' articles found (' + register.live.length + ' live)', path: register.registerExists ? register.registerPath : 'read from article drafts and completion records' },
    { name: 'Prediction outcomes', ok: outcomes.exists, detail: outcomes.exists ? outcomes.rows.length + ' scored' : 'not created yet', path: outcomes.file },
  ];

  const model = {
    generatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC',
    today,
    docs,
    planDocs,
    draftDocs,
    workDoneDocs,
    revisions,
    supersedes,
    evidence,
    agents: org.agents,
    departments: org.departments,
    orgError: org.error,
    orgChangelog,
    tree,
    activity,
    decisions,
    outcomes,
    openPredictions: openPredictionRows.length,
    openPredictionRows,
    gsc,
    checkpoints,
    clusterPlan,
    register,
    coverage,
    workflow,
    workflowSource: workflow.source,
    board,
    pillarReadiness: readiness,
    timeline,
    blocked,
    approvals,
    weekly,
    changes,
    searchIndex,
    sourceStatus,
  };

  const html = renderPage(model);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, html, 'utf8');

  const kb = Math.round(Buffer.byteLength(html) / 1024);
  say('');
  say('wrote ' + path.relative(REPO_ROOT, outFile) + '  (' + kb + ' KB)');
  const failed = sourceStatus.filter((s) => !s.ok);
  if (failed.length) {
    say('sources not available (stated plainly on the page): ' + failed.map((s) => s.name).join(', '));
  }

  if (has('--open')) {
    const cmd = process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    const cmdArgs = process.platform === 'win32' ? ['/c', 'start', '', outFile] : [outFile];
    execFile(cmd, cmdArgs, () => {});
  }

  return model;
}

main().catch((err) => {
  console.error('Dashboard generation failed:', err && err.stack ? err.stack : err);
  process.exit(1);
});
