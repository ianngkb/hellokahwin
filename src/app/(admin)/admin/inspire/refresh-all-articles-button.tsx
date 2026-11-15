'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { refreshAllArticlesAction } from './refresh-all-actions';

/** Ported from The Wedding Notebook's Articles header. */
export function RefreshAllArticlesButton() {
  const [isPending, startTransition] = useTransition();

  const refresh = () => {
    startTransition(async () => {
      try {
        const result = await refreshAllArticlesAction();
        if ('error' in result) {
          toast.error(result.error);
          return;
        }
        toast.success('All articles will refresh on their next visit.');
      } catch {
        toast.error('Could not refresh articles. Please try again.');
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={isPending}>
          {isPending ? 'Refreshing…' : 'Refresh all articles'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Refresh every published article?</AlertDialogTitle>
          <AlertDialogDescription>
            This rebuilds every published article on its next visit. Use after changing categories,
            tags, authors, dynamic blocks or redirects. Takes effect gradually.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={refresh} disabled={isPending}>
            Refresh all articles
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
