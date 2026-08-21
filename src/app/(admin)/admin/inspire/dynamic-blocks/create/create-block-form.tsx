'use client';

import { useActionState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/ui/section-card';
import { FormField } from '@/components/ui/form-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createDynamicBlockAction } from '../actions';

export function CreateBlockForm() {
  const [state, formAction, isPending] = useActionState(createDynamicBlockAction, null);

  return (
    <SectionCard title="Block details">
      <form action={formAction} className="space-y-6">
        <FormField
          label="Name"
          htmlFor="name"
          hint="Internal name — shown in the admin and the article editor, never publicly."
        >
          <Input
            id="name"
            name="name"
            placeholder="e.g. Vendor directory CTA"
            required
            maxLength={200}
          />
        </FormField>

        <FormField
          label="Placement"
          htmlFor="placement"
          hint="Where the block is auto-injected on matching articles. Manual embeds from the article editor override this per-article."
        >
          <Select name="placement" defaultValue="end">
            <SelectTrigger id="placement">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="start">Start — before the article content</SelectItem>
              <SelectItem value="end">End — after the article content</SelectItem>
            </SelectContent>
          </Select>
        </FormField>

        {state?.error && <p className="text-destructive text-sm">{state.error}</p>}

        <Button type="submit" disabled={isPending}>
          {isPending ? 'Creating…' : 'Create Block'}
        </Button>
      </form>
    </SectionCard>
  );
}
