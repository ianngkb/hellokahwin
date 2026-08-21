'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronsUpDown, X, Loader2 } from 'lucide-react';
import { searchArticlesAction } from '@/app/(admin)/admin/inspire/media/actions';
import { cn } from '@/lib/utils';

interface ArticleComboboxProps {
  value: { id: string; title: string } | null;
  onChange: (article: { id: string; title: string } | null) => void;
}

export function ArticleCombobox({ value, onChange }: ArticleComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ id: string; title: string }[]>([]);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Load articles when popover opens or query changes
  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(
      () => {
        startTransition(async () => {
          const res = await searchArticlesAction(query);
          if (res.data) setResults(res.data);
        });
      },
      query ? 300 : 0,
    );

    return () => clearTimeout(timer);
  }, [open, query]);

  // Focus input when popover opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery('');
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative">
        <PopoverTrigger asChild>
          <Button
            variant="quiet"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'w-[200px] justify-between text-sm font-normal',
              !value && 'text-muted-foreground',
            )}
          >
            <span className="truncate">{value ? value.title : 'Filter by article...'}</span>
            {!value && <ChevronsUpDown className="ml-1 size-3.5 shrink-0 opacity-50" />}
          </Button>
        </PopoverTrigger>
        {value && (
          <button
            type="button"
            aria-label="Clear article filter"
            className="hover:bg-accent absolute top-1/2 right-1.5 -translate-y-1/2 rounded-sm p-0.5"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
          >
            <X className="text-muted-foreground size-3.5" />
          </button>
        )}
      </div>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-2"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search articles..."
          className="mb-2 h-8 text-sm"
        />
        <div className="max-h-[200px] overflow-y-auto">
          {isPending ? (
            <div className="text-muted-foreground flex items-center justify-center py-4 text-sm">
              <Loader2 className="mr-2 size-3.5 animate-spin" />
              Searching...
            </div>
          ) : results.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">No articles found</p>
          ) : (
            results.map((article) => (
              <button
                key={article.id}
                type="button"
                className={cn(
                  'hover:bg-accent w-full truncate rounded-sm px-2 py-1.5 text-left text-sm transition-colors',
                  value?.id === article.id && 'bg-accent font-medium',
                )}
                onClick={() => {
                  onChange(article);
                  setOpen(false);
                }}
              >
                {article.title}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
