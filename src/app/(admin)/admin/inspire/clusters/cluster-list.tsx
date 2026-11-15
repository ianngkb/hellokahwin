'use client';

import { useId, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { BarChart3Icon, PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Chip } from '@/components/ui/chip';
import { formatDate } from '@/lib/utils/format-date';
import { SERIES_BOX_ON_SITE } from '@/lib/validations/article-cluster';
import { createClusterAction } from './actions';
import { Panel } from './cluster-ui';

export interface ClusterListItem {
  id: string;
  name: string;
  memberCount: number;
  /** The Series box switch. */
  seriesEnabled: boolean;
  /** ISO timestamp. */
  createdAt: string;
}

function articlesLabel(n: number): string {
  return n === 1 ? '1 article' : `${n} articles`;
}

/** The clusters list: name, member count, created date, analytics link. */
export function ClusterList({ clusters }: { clusters: ClusterListItem[] }) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          {clusters.length === 1 ? '1 cluster' : `${clusters.length} clusters`}
        </p>
        <Button size="sm" onClick={() => setCreating(true)}>
          <PlusIcon className="mr-1 size-4" />
          New cluster
        </Button>
      </div>

      <Panel>
        {clusters.length === 0 ? (
          <EmptyState
            title="No clusters yet"
            description="A cluster is a group of articles you pick, such as a guide and the articles it links to. Create one to group them as a series."
          />
        ) : (
          <ul className="divide-hairline divide-y" aria-label="Clusters">
            {clusters.map((c) => (
              <li
                key={c.id}
                className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/inspire/clusters/${c.id}`}
                      className="min-w-0 truncate text-sm font-semibold hover:underline"
                      title={c.name}
                    >
                      {c.name}
                    </Link>
                    {/* Which clusters have their series switched on, at a glance. */}
                    {c.seriesEnabled ? (
                      <Chip variant="info" size="sm">
                        {SERIES_BOX_ON_SITE ? 'Shown to readers' : 'Series on'}
                      </Chip>
                    ) : null}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {articlesLabel(c.memberCount)} · Created {formatDate(c.createdAt)}
                  </p>
                </div>
                <Button variant="quiet" size="sm" asChild>
                  <Link href={`/admin/inspire/clusters/${c.id}/analytics`}>
                    <BarChart3Icon className="mr-1 size-3.5" />
                    View analytics
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <NewClusterDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}

function NewClusterDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const inputId = useId();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close(next: boolean) {
    if (pending) return;
    if (!next) {
      setName('');
      setError(null);
    }
    onOpenChange(next);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    startTransition(async () => {
      const result = await createClusterAction({ name });
      if ('error' in result) {
        setError(result.error);
        return;
      }
      toast.success('Cluster created — now add its articles.');
      router.push(`/admin/inspire/clusters/${result.id}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New cluster</DialogTitle>
          <DialogDescription>
            Give the group a name you will recognise. You add its articles on the next screen.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <FormField label="Cluster name" htmlFor={inputId} error={error}>
            <Input
              id={inputId}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="For example: Pelamin ideas"
              aria-invalid={error ? true : undefined}
              autoComplete="off"
              autoFocus
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="quiet" onClick={() => close(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Creating…' : 'Create cluster'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
