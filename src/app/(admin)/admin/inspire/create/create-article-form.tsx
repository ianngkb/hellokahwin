'use client';

import { useState } from 'react';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    <form action={formAction} className="max-w-lg space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Article Title</Label>
        <Input id="title" name="title" placeholder="Enter article title" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="primaryCategoryId">Primary Category</Label>
        <CategorySelect
          categories={categories}
          name="primaryCategoryId"
          value={primaryCategoryId}
          onValueChange={handlePrimaryCategoryChange}
          placeholder="Select a category"
          required
        />
      </div>

      {primaryCategoryId && (
        <div className="space-y-2">
          <Label>Secondary Categories</Label>
          <p className="text-muted-foreground text-xs">
            Article will also appear on these category pages
          </p>
          <CategoryMultiSelect
            categories={categories}
            primaryCategoryId={primaryCategoryId}
            selectedIds={secondaryCategoryIds}
            onChange={handleSecondaryCategoryChange}
          />
        </div>
      )}

      {secondaryCategoryIds.length > 0 && (
        <div className="space-y-2">
          <Label>Tertiary Categories</Label>
          <p className="text-muted-foreground text-xs">
            Specific sub-categories for finer cross-listing
          </p>
          <CategoryTertiarySelect
            categories={categories}
            secondaryCategoryIds={secondaryCategoryIds}
            selectedIds={tertiaryCategoryIds}
            onChange={setTertiaryCategoryIds}
          />
        </div>
      )}

      {/* Hidden inputs for all additional category IDs */}
      {[...secondaryCategoryIds, ...tertiaryCategoryIds].map((id) => (
        <input key={id} type="hidden" name="additionalCategoryIds" value={id} />
      ))}

      {state && 'error' in state && state.error && (
        <p className="text-destructive text-sm">{state.error}</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? 'Creating...' : 'Create Article'}
      </Button>
    </form>
  );
}
