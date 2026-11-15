'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Loader2, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SectionCard } from '@/components/ui/section-card';
import {
  DEFAULT_INSPIRE_HOMEPAGE_CONFIG,
  type InspireHomepageConfig,
  type InspireHomepageZoneConfig,
} from '@/lib/inspire/homepage-curation';
import type {
  InspireHomepageCategory,
  InspireHomepagePickerArticle,
} from '@/lib/inspire/homepage-queries';
import {
  resetInspireHomepageAction,
  saveInspireHomepageAction,
  searchInspireHomepageArticlesAction,
} from './actions';

type ZoneKey = 'featured' | 'latest';

function ArticleSearch({
  zone,
  selected,
  blockedIds,
  capacity,
  onAdd,
}: {
  zone: ZoneKey;
  selected: InspireHomepagePickerArticle[];
  blockedIds: Set<string>;
  capacity: number;
  onAdd: (article: InspireHomepagePickerArticle) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<InspireHomepagePickerArticle[]>([]);
  const [searching, startSearch] = useTransition();

  function search() {
    startSearch(async () => {
      const result = await searchInspireHomepageArticlesAction(query);
      if ('error' in result) {
        toast.error(result.error);
        return;
      }
      setResults(result.articles);
    });
  }

  const selectedIds = new Set(selected.map((article) => article.id));
  return (
    <div className="space-y-2">
      <Label htmlFor={`${zone}-article-search`}>Pin articles</Label>
      <p className="text-muted-foreground text-xs">
        Pinned articles appear first. The automatic source fills any spaces left over.
      </p>
      <div className="flex gap-2">
        <Input
          id={`${zone}-article-search`}
          value={query}
          onChange={(event) => setQuery(event.target.value.slice(0, 120))}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              search();
            }
          }}
          placeholder="Search published articles…"
        />
        <Button
          type="button"
          variant="quiet"
          size="sm"
          onClick={search}
          disabled={searching || query.trim().length < 2}
        >
          {searching ? <Loader2 className="animate-spin" /> : <Search />}
          Search
        </Button>
      </div>
      {results.length > 0 && (
        <ul className="border-hairline rounded-control max-h-56 overflow-y-auto border">
          {results.map((article) => {
            const chosen = selectedIds.has(article.id);
            const blocked = blockedIds.has(article.id);
            const full = selected.length >= capacity;
            return (
              <li
                key={article.id}
                className="border-hairline flex items-center gap-3 border-b px-3 py-2 last:border-b-0"
              >
                <span className="min-w-0 flex-1 truncate text-sm" title={article.title}>
                  {article.title}
                </span>
                <Button
                  type="button"
                  size="xs"
                  variant="quiet"
                  disabled={chosen || blocked || full}
                  onClick={() => onAdd(article)}
                >
                  {chosen ? 'Pinned' : blocked ? 'Used in other section' : 'Pin'}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ZoneEditor({
  zoneKey,
  title,
  capacity,
  zone,
  categories,
  pins,
  blockedIds,
  onZoneChange,
  onPinsChange,
}: {
  zoneKey: ZoneKey;
  title: string;
  capacity: number;
  zone: InspireHomepageZoneConfig;
  categories: InspireHomepageCategory[];
  pins: InspireHomepagePickerArticle[];
  blockedIds: Set<string>;
  onZoneChange: (next: InspireHomepageZoneConfig) => void;
  onPinsChange: (next: InspireHomepagePickerArticle[]) => void;
}) {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const categoryLabel = (category: InspireHomepageCategory) => {
    const parent = category.parentId ? categoryById.get(category.parentId) : null;
    return parent ? `${parent.name} — ${category.name}` : category.name;
  };
  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= pins.length) return;
    const next = [...pins];
    [next[index], next[target]] = [next[target], next[index]];
    onPinsChange(next);
  }

  return (
    <SectionCard title={`${title} · ${capacity} spaces`} bodyClassName="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Automatic source</Label>
          <Select
            value={zone.source}
            onValueChange={(source: 'latest' | 'category') =>
              onZoneChange({
                ...zone,
                source,
                categoryId: source === 'latest' ? null : zone.categoryId,
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Newest published articles</SelectItem>
              <SelectItem value="category">One category</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={zone.categoryId ?? undefined}
            disabled={zone.source !== 'category'}
            onValueChange={(categoryId) => onZoneChange({ ...zone, categoryId })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {categoryLabel(category)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {pins.length > 0 && (
        <ol className="space-y-2" aria-label={`${title} pinned articles`}>
          {pins.map((article, index) => (
            <li
              key={article.id}
              className="border-hairline rounded-control flex items-center gap-2 border px-3 py-2"
            >
              <span className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm" title={article.title}>
                {article.title}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                disabled={index === 0}
                onClick={() => move(index, -1)}
                aria-label={`Move ${article.title} up`}
              >
                <ArrowUp />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                disabled={index === pins.length - 1}
                onClick={() => move(index, 1)}
                aria-label={`Move ${article.title} down`}
              >
                <ArrowDown />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => onPinsChange(pins.filter((item) => item.id !== article.id))}
                aria-label={`Remove ${article.title}`}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ol>
      )}

      <ArticleSearch
        zone={zoneKey}
        selected={pins}
        blockedIds={blockedIds}
        capacity={capacity}
        onAdd={(article) => onPinsChange([...pins, article])}
      />
      <p className="text-muted-foreground text-xs">
        {pins.length} of {capacity} spaces pinned.
      </p>
    </SectionCard>
  );
}

export function InspireHomepageManager({
  initialConfig,
  categories,
  initialPins,
}: {
  initialConfig: InspireHomepageConfig;
  categories: InspireHomepageCategory[];
  initialPins: {
    featured: InspireHomepagePickerArticle[];
    latest: InspireHomepagePickerArticle[];
  };
}) {
  const router = useRouter();
  // The resolver deliberately ignores stale pins (unpublished, deleted, or
  // coverless). Keep them out of the editable state too, so the admin can save
  // another change without an invisible invalid pin blocking the whole form.
  const [config, setConfig] = useState<InspireHomepageConfig>(() => ({
    ...initialConfig,
    featured: {
      ...initialConfig.featured,
      pinnedArticleIds: initialPins.featured.map((article) => article.id),
    },
    latest: {
      ...initialConfig.latest,
      pinnedArticleIds: initialPins.latest.map((article) => article.id),
    },
  }));
  const [pins, setPins] = useState(initialPins);
  const [saving, startSaving] = useTransition();

  function setZone(key: ZoneKey, zone: InspireHomepageZoneConfig) {
    setConfig((current) => ({ ...current, [key]: zone }));
  }
  function setZonePins(key: ZoneKey, next: InspireHomepagePickerArticle[]) {
    setPins((current) => ({ ...current, [key]: next }));
    setConfig((current) => ({
      ...current,
      [key]: { ...current[key], pinnedArticleIds: next.map((article) => article.id) },
    }));
  }

  function save() {
    startSaving(async () => {
      const result = await saveInspireHomepageAction(config);
      if ('error' in result) {
        toast.error(result.error);
        return;
      }
      toast.success('Articles homepage updated');
      router.refresh();
    });
  }
  function reset() {
    if (!window.confirm('Reset both sections to the newest published articles?')) return;
    startSaving(async () => {
      const result = await resetInspireHomepageAction();
      if ('error' in result) {
        toast.error(result.error);
        return;
      }
      setConfig(DEFAULT_INSPIRE_HOMEPAGE_CONFIG);
      setPins({ featured: [], latest: [] });
      toast.success('Articles homepage reset to automatic');
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <ZoneEditor
        zoneKey="featured"
        title="Featured"
        capacity={3}
        zone={config.featured}
        categories={categories}
        pins={pins.featured}
        blockedIds={new Set(pins.latest.map((article) => article.id))}
        onZoneChange={(zone) => setZone('featured', zone)}
        onPinsChange={(next) => setZonePins('featured', next)}
      />
      <ZoneEditor
        zoneKey="latest"
        title="Latest grid"
        capacity={9}
        zone={config.latest}
        categories={categories}
        pins={pins.latest}
        blockedIds={new Set(pins.featured.map((article) => article.id))}
        onZoneChange={(zone) => setZone('latest', zone)}
        onPinsChange={(next) => setZonePins('latest', next)}
      />
      <div className="border-hairline flex flex-wrap justify-end gap-3 border-t pt-4">
        <Button type="button" variant="quiet" onClick={reset} disabled={saving}>
          Reset to automatic
        </Button>
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : null}
          Save articles homepage
        </Button>
      </div>
    </div>
  );
}
