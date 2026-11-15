/**
 * Pure cluster rules, shared by the article editor (client), the editor's save
 * action and the Clusters admin page (server). No database import on purpose:
 * this file is bundled into the `'use client'` editor.
 *
 * A CLUSTER is a category that is not a pillar, carries a pillar code, and sits
 * directly under a pillar. That is the exact definition `getPillarUpLink` uses
 * (`!isPillar && parentIsPillar`, filtered to `pillar_code IS NOT NULL`), so a
 * category this file calls a cluster is one the public article page will treat
 * as one. Keep the two in step.
 */

export interface ClusterCategoryLike {
  id: string;
  name: string;
  parentId: string | null;
  isPillar?: boolean | null;
  pillarCode?: string | null;
  displayOrder?: number | null;
}

export interface ClusterOption {
  id: string;
  name: string;
  pillarId: string;
  pillarName: string;
  pillarCode: string | null;
  code: string;
}

/** Whether `cat` is a cluster, given every category (to look its parent up). */
export function isClusterCategory(
  cat: ClusterCategoryLike | undefined,
  byId: ReadonlyMap<string, ClusterCategoryLike>,
): boolean {
  if (!cat || cat.isPillar || !cat.pillarCode || !cat.parentId) return false;
  return byId.get(cat.parentId)?.isPillar === true;
}

function indexById<T extends ClusterCategoryLike>(categories: readonly T[]): Map<string, T> {
  return new Map(categories.map((c) => [c.id, c]));
}

/** The set of category ids that are clusters. */
export function clusterIdSet(categories: readonly ClusterCategoryLike[]): Set<string> {
  const byId = indexById(categories);
  return new Set(categories.filter((c) => isClusterCategory(c, byId)).map((c) => c.id));
}

/**
 * Compare two pillar/cluster codes numerically: `C1.10` sorts after `C1.9`,
 * `P10` after `P2`. Missing codes sort last.
 */
export function compareCodes(a: string | null | undefined, b: string | null | undefined): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  const na = a
    .replace(/^[A-Z]+/i, '')
    .split('.')
    .map(Number);
  const nb = b
    .replace(/^[A-Z]+/i, '')
    .split('.')
    .map(Number);
  for (let i = 0; i < Math.max(na.length, nb.length); i++) {
    const d = (na[i] ?? -1) - (nb[i] ?? -1);
    if (d !== 0 && !Number.isNaN(d)) return d;
  }
  return a.localeCompare(b);
}

/** Every cluster as a picker option, grouped by pillar in code order. */
export function listClusterOptions(categories: readonly ClusterCategoryLike[]): ClusterOption[] {
  const byId = indexById(categories);
  const options: ClusterOption[] = [];
  for (const c of categories) {
    if (!isClusterCategory(c, byId)) continue;
    const pillar = byId.get(c.parentId!)!;
    options.push({
      id: c.id,
      name: c.name,
      pillarId: pillar.id,
      pillarName: pillar.name,
      pillarCode: pillar.pillarCode ?? null,
      code: c.pillarCode!,
    });
  }
  return options.sort(
    (a, b) =>
      compareCodes(a.pillarCode, b.pillarCode) ||
      compareCodes(a.code, b.code) ||
      a.name.localeCompare(b.name),
  );
}

/**
 * The cluster an article starts in when the editor opens. When the primary
 * category is itself a cluster that wins (it cannot be changed from the picker
 * without moving the article's URL); otherwise the first linked cluster.
 * `''` means "no cluster".
 */
export function initialClusterId(
  primaryCategoryId: string | null,
  linkedCategoryIds: readonly string[],
  categories: readonly ClusterCategoryLike[],
): string {
  const clusters = clusterIdSet(categories);
  if (primaryCategoryId && clusters.has(primaryCategoryId)) return primaryCategoryId;
  return linkedCategoryIds.find((id) => clusters.has(id)) ?? '';
}

/**
 * Apply the one-cluster rule to a category sync payload: drop every cluster id
 * except the chosen one, then make sure the chosen one is present.
 *
 * The primary category is never removed — it decides the article's URL, and
 * the editor locks the picker to it when it is a cluster, so in practice
 * `clusterId === primaryCategoryId` in that case.
 */
export function applyClusterChoice(
  ids: readonly string[],
  clusterId: string,
  categories: readonly ClusterCategoryLike[],
  primaryCategoryId: string,
): string[] {
  const clusters = clusterIdSet(categories);
  const kept = ids.filter(
    (id) => !clusters.has(id) || id === clusterId || id === primaryCategoryId,
  );
  if (clusterId && clusters.has(clusterId) && !kept.includes(clusterId)) kept.push(clusterId);
  return [...new Set(kept)];
}

/** How many of `ids` are clusters. */
export function countClusters(
  ids: readonly string[],
  categories: readonly ClusterCategoryLike[],
): number {
  const clusters = clusterIdSet(categories);
  return new Set(ids.filter((id) => clusters.has(id))).size;
}

/**
 * The next free cluster code under a pillar: `P3` with `C3.1`…`C3.4` taken
 * gives `C3.5`. `null` when the pillar has no usable `P<n>` code, in which case
 * a cluster cannot be created under it (the article page ignores categories
 * without a pillar code, so the cluster would silently not work).
 */
export function nextClusterCode(
  pillarCode: string | null | undefined,
  existingCodes: readonly (string | null | undefined)[],
): string | null {
  const m = /^P(\d+)$/.exec(pillarCode?.trim() ?? '');
  if (!m) return null;
  const n = m[1];
  let max = 0;
  for (const code of existingCodes) {
    const cm = new RegExp(`^C${n}\\.(\\d+)$`).exec(code ?? '');
    if (cm) max = Math.max(max, Number(cm[1]));
  }
  return `C${n}.${max + 1}`;
}

/** A cluster is "thin" below this many live articles. */
export const THIN_CLUSTER_LIVE_MIN = 3;
