'use client';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { listClusterOptions, type ClusterCategoryLike } from '@/lib/inspire/clusters';

/** Radix Select cannot hold an empty-string value, so "no cluster" has a sentinel. */
export const NO_CLUSTER = '__none__';

/**
 * The article editor's Cluster picker. One dropdown, grouped by pillar, so an
 * editor can see which pillar a cluster sits under before choosing it. The
 * one-cluster rule is enforced by the save payload (`applyClusterChoice`) and
 * again on the server; this control only ever holds a single value.
 */
export function ClusterSelect({
  categories,
  value,
  onValueChange,
  disabled,
  id,
}: {
  categories: readonly ClusterCategoryLike[];
  /** `''` for no cluster. */
  value: string;
  onValueChange: (clusterId: string) => void;
  disabled?: boolean;
  id?: string;
}) {
  const options = listClusterOptions(categories);
  const groups = new Map<string, typeof options>();
  for (const o of options) {
    const list = groups.get(o.pillarId) ?? [];
    list.push(o);
    groups.set(o.pillarId, list);
  }
  const selected = options.find((o) => o.id === value);

  return (
    <div className="space-y-1.5">
      <Select
        value={value || NO_CLUSTER}
        onValueChange={(v) => onValueChange(v === NO_CLUSTER ? '' : v)}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="w-full" aria-label="Cluster">
          <SelectValue placeholder="Not in a cluster" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_CLUSTER}>Not in a cluster</SelectItem>
          {[...groups.values()].map((list) => (
            <SelectGroup key={list[0].pillarId}>
              <SelectLabel>
                {list[0].pillarCode ? `${list[0].pillarCode} · ` : ''}
                {list[0].pillarName}
              </SelectLabel>
              {list.map((o) => (
                <SelectItem key={o.id} value={o.id} className="pl-6">
                  {o.name}
                  <span className="text-muted-foreground ml-1.5 font-mono text-xs">{o.code}</span>
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
      {selected && (
        <p className="text-muted-foreground text-xs" data-testid="cluster-pillar">
          Under pillar: {selected.pillarName}
        </p>
      )}
    </div>
  );
}
