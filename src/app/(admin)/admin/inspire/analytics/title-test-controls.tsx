'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { endTitleTestAction, startTitleTestAction } from './title-test-actions';

// = MAX_TITLE_CHARS (title-test-title.ts), which the action enforces. Not
// imported: that module pulls the server-side metadata helpers into this
// client bundle.
const MAX = 60;

export function StartTitleTestForm({
  articleId,
  currentTitle,
}: {
  articleId: string;
  currentTitle: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const length = title.trim().length;

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await startTitleTestAction(articleId, title);
          if ('error' in r) {
            setError(r.error);
            return;
          }
          toast.success('New title is live. The test has started.');
          router.replace('/admin/inspire/analytics?view=title-tests');
        });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title-test-new">New Google title</Label>
        <Input
          id="title-test-new"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={currentTitle}
          maxLength={120}
          autoComplete="off"
          aria-describedby="title-test-count"
        />
        <p
          id="title-test-count"
          className={cn('text-xs', length > MAX ? 'text-destructive' : 'text-muted-foreground')}
        >
          {length} / {MAX} characters. Google cuts off anything longer.
        </p>
      </div>
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
      <div>
        <Button type="submit" disabled={pending || length === 0 || length > MAX}>
          {pending ? 'Starting…' : 'Put it live and start the test'}
        </Button>
      </div>
    </form>
  );
}

export function EndTitleTestButton({ testId }: { testId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await endTitleTestAction(testId);
          if ('error' in r) toast.error(r.error);
          else {
            toast.success('Test ended. The current title stays live.');
            router.refresh();
          }
        })
      }
    >
      {pending ? 'Ending…' : 'End test'}
    </Button>
  );
}
