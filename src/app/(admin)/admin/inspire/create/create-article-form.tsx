'use client';

import { useState } from 'react';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { SectionCard } from '@/components/ui/section-card';
import {
  CategorySelect,
  CategoryMultiSelect,
  CategoryTertiarySelect,
} from '@/components/inspire/category-select';
import { createArticleAction } from './actions';

interface Category {
  id: string;
  name: string;
  parentId: string | null;
}

export function CreateArticleForm({ categories }: { categories: Category[] }) {
  const [state, formAction, pending] = useActionState(createArticleAction, null);
  const [primaryCategoryId, setPrimaryCategoryId] = useState('');
  const [secondaryCategoryIds, setSecondaryCategoryIds] = useState<string[]>([]);
  const [tertiaryCategoryIds, setTertiaryCategoryIds] = useState<string[]>([]);

  function handlePrimaryCategoryChange(newPrimaryId: string) {
    setPrimaryCategoryId(newPrimaryId);
    // Secondaries are children of primary, so changing primary invalidates all
    setSecondaryCategoryIds([]);
    setTertiaryCategoryIds([]);
  }

  function handleSecondaryCategoryChange(newSecondaryIds: string[]) {
    setSecondaryCategoryIds(newSecondaryIds);
    const secSet = new Set(newSecondaryIds);
    setTertiaryCategoryIds((prev) =>
      prev.filter((id) => {
        const cat = categories.find((c) => c.id === id);
        return cat?.parentId ? secSet.has(cat.parentId) : false;
      }),
    );
  }

  return (
    <form action={formAction} className="max-w-2xl">
      <SectionCard title="Article details" bodyClassName="flex flex-col gap-5">
        <FormField label="Article title" htmlFor="title" required>
          <Input id="title" name="title" placeholder="Enter article title" required />
        </FormField>

        <FormField label="Primary category" htmlFor="primaryCategoryId" required>
          <CategorySelect
            categories={categories}
            name="primaryCategoryId"
            value={primaryCategoryId}
            onValueChange={handlePrimaryCategoryChange}
            placeholder="Select a category"
            required
          />
        </FormField>

        {primaryCategoryId && (
          <FormField
            label="Secondary categories"
            hint="Article will also appear on these category pages."
          >
            <CategoryMultiSelect
              categories={categories}
              primaryCategoryId={primaryCategoryId}
              selectedIds={secondaryCategoryIds}
              onChange={handleSecondaryCategoryChange}
            />
          </FormField>
        )}

        {secondaryCategoryIds.length > 0 && (
          <FormField
            label="Tertiary categories"
            hint="Specific sub-categories for finer cross-listing."
          >
            <CategoryTertiarySelect
              categories={categories}
              secondaryCategoryIds={secondaryCategoryIds}
              selectedIds={tertiaryCategoryIds}
              onChange={setTertiaryCategoryIds}
            />
          </FormField>
        )}

        {/* Hidden inputs for all additional category IDs */}
        {[...secondaryCategoryIds, ...tertiaryCategoryIds].map((id) => (
          <input key={id} type="hidden" name="additionalCategoryIds" value={id} />
        ))}

        {state && 'error' in state && state.error && (
          <p className="text-error text-[13px]">{state.error}</p>
        )}

        <div className="border-hairline -mx-5 -mb-5 mt-1 flex justify-end border-t px-5 py-4">
          <Button type="submit" disabled={pending}>
            {pending ? 'Creating…' : 'Create article'}
          </Button>
        </div>
      </SectionCard>
    </form>
  );
}
