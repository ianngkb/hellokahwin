// Where everything lives. Every path is overridable by environment variable so
// the generator is not tied to one machine, and no secret is ever inlined here.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(here, '..', '..', '..');

function firstExisting(candidates) {
  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }
  return null;
}

/**
 * The machine-wide org chart. Agents for this project live under
 * <skillcentral>/agents/projects/hellokahwin/<Department>/<agent>.md
 */
function resolveOrgChartRoot() {
  if (process.env.HELLOKAHWIN_ORG_CHART) return process.env.HELLOKAHWIN_ORG_CHART;
  const home = os.homedir();
  const roots = [
    process.env.CLAUDE_SKILLS_REPO_ROOT,
    path.join(home, 'Documents', 'Code'),
    path.join(home, 'code'),
    path.join(home, 'Code'),
  ].filter(Boolean);
  const candidates = [];
  for (const r of roots) {
    candidates.push(path.join(r, 'buddy', 'skillcentral', 'agents', 'projects', 'hellokahwin'));
    candidates.push(path.join(r, 'skillcentral', 'agents', 'projects', 'hellokahwin'));
  }
  return firstExisting(candidates);
}

export const PATHS = {
  docs: process.env.HELLOKAHWIN_DOCS || path.join(REPO_ROOT, 'docs'),
  get boardroom() {
    return path.join(this.docs, 'boardroom');
  },
  get meetings() {
    return path.join(this.docs, 'boardroom', 'meetings');
  },
  get plans() {
    return path.join(this.docs, 'plans');
  },
  get workDone() {
    return path.join(this.docs, 'work-done');
  },
  get outDir() {
    return process.env.HELLOKAHWIN_DASHBOARD_OUT || path.join(this.docs, 'dashboard');
  },
  orgChart: resolveOrgChartRoot(),
};

// Search Console. The credential is read from a file path (env-overridable);
// it is never printed, logged, or embedded in the generated page.
export const GSC = {
  siteUrl: process.env.HELLOKAHWIN_GSC_SITE || 'https://hellokahwin.com/',
  credentialPath:
    process.env.GSC_SERVICE_ACCOUNT_PATH ||
    process.env.GSC_SERVICE_ACCOUNT_JSON_PATH ||
    path.join(os.homedir(), '.claude', 'secrets', 'gsc-service-account.json'),
  // Search Console finalises data ~2-3 days late; asking for today returns zeros.
  lagDays: 3,
  historyDays: 180,
};

// Facts the dashboard needs that are DERIVED FROM APPROVED DOCUMENTS, not invented.
// Each carries the file it came from so the page can cite it.
export const SOURCES = {
  growthPlan: 'aug-23-2026-plan-malay-topical-authority.md',
  clusterPlan: 'aug-23-2026-clusters-launch-plan.md',
  workflow: 'aug-23-2026-workflow-content-production.md',
  orgDesign: 'aug-23-2026-org-design-and-review-process.md',
  decisionLog: 'decision-log.md',
  ceoMemory: 'ceo-memory.md',
};

// The 21 Aug 2026 URL migration changed every URL on the site. Any time axis
// must mark it so migration noise is never read as performance.
export const MIGRATION_DATE = '2026-08-21';

export const AGENT_NAMES = [
  'ceo-hellokahwin',
  'head-of-seo-content',
  'managing-editor',
  'editorial-verification-lead',
  'writer-adat-agama-prosedur',
  'writer-inspirasi-vendor-venue',
  'full-stack-engineer',
];
