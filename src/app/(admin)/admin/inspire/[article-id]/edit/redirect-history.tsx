'use client';

import { useTransition } from 'react';
import { ExternalLink, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils/format-date';
import { deleteRedirectAction } from './actions';

export interface RedirectEntry {
  id: string;
  fromCategorySlug: string;
  toCategorySlug: string;
  changedByName: string;
  createdAt: string;
}

interface RedirectHistoryProps {
  articleId: string;
  articleSlug: string;
  entries: RedirectEntry[];
}

export function RedirectHistory({ articleId, articleSlug, entries }: RedirectHistoryProps) {
  const [isPending, startTransition] = useTransition();

  function handleDelete(redirectId: string) {
    startTransition(async () => {
      const result = await deleteRedirectAction(redirectId, articleId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Redirect entry removed');
      }
    });
  }

  if (entries.length === 0) {
    return (
      <div className="mt-8 rounded-lg border p-4">
        <h3 className="mb-2 text-sm font-semibold">Category Redirect History</h3>
        <p className="text-muted-foreground text-sm">No category redirects recorded.</p>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-lg border p-4">
      <h3 className="mb-3 text-sm font-semibold">Category Redirect History</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground border-b text-left">
            <th className="pb-2 font-medium">Date</th>
            <th className="pb-2 font-medium">From</th>
            <th className="pb-2 font-medium">To</th>
            <th className="pb-2 font-medium">Changed By</th>
            <th className="w-10 pb-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-b last:border-0">
              <td className="py-2 pr-4">{formatDate(entry.createdAt)}</td>
              <td className="py-2 pr-4 font-mono text-xs">
                <a
                  href={`/artikel/${entry.fromCategorySlug}/${articleSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary inline-flex items-center gap-1 hover:underline"
                >
                  {entry.fromCategorySlug}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </td>
              <td className="py-2 pr-4 font-mono text-xs">{entry.toCategorySlug}</td>
              <td className="py-2 pr-4">{entry.changedByName}</td>
              <td className="py-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive h-7 w-7"
                  onClick={() => handleDelete(entry.id)}
                  disabled={isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
