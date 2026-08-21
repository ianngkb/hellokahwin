'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  PencilIcon,
  Trash2Icon,
  LinkIcon,
  FolderIcon,
  EyeIcon,
  EyeOffIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface NavItemData {
  id: string;
  type: string;
  label: string;
  categoryId: string | null;
  categorySlug: string | null;
  url: string | null;
  parentId: string | null;
  position: number;
  isActive: boolean;
  articleCount: number;
}

interface SortableNavItemProps {
  item: NavItemData;
  isChild?: boolean;
  onToggleActive: (id: string) => void;
  onEdit: (item: NavItemData) => void;
  onDelete: (item: NavItemData) => void;
}

export function SortableNavItem({
  item,
  isChild,
  onToggleActive,
  onEdit,
  onDelete,
}: SortableNavItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border-hairline rounded-card flex items-center gap-2 border px-3 py-2 ${
        isDragging ? 'shadow-lg' : ''
      } ${!item.isActive ? 'opacity-50' : ''} ${isChild ? 'border-l-muted-foreground/25 bg-muted ml-10 border-l-2' : 'bg-card'}`}
    >
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground flex size-7 shrink-0 cursor-grab items-center justify-center rounded active:cursor-grabbing"
        aria-label={`Reorder ${item.label}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      <span className="text-muted-foreground flex size-6 shrink-0 items-center justify-center">
        {item.type === 'custom_link' ? (
          <LinkIcon className="size-3.5" />
        ) : (
          <FolderIcon className="size-3.5" />
        )}
      </span>

      <span className={`min-w-0 flex-1 truncate font-medium ${isChild ? 'text-xs' : 'text-sm'}`}>
        {item.label}
      </span>

      {item.type === 'category' && (
        <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
          {item.articleCount}
        </span>
      )}

      {item.type === 'custom_link' && item.url && (
        <span className="text-muted-foreground hidden max-w-[200px] truncate text-xs sm:block">
          {item.url}
        </span>
      )}

      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wider uppercase ${
          item.type === 'custom_link' ? 'bg-chart-1/15 text-chart-1' : 'bg-chart-2/15 text-chart-2'
        }`}
      >
        {item.type === 'custom_link' ? 'Link' : 'Category'}
      </span>

      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        onClick={() => onToggleActive(item.id)}
        aria-label={item.isActive ? 'Hide' : 'Show'}
      >
        {item.isActive ? <EyeIcon className="size-3.5" /> : <EyeOffIcon className="size-3.5" />}
      </Button>

      <Button variant="ghost" size="icon" className="size-7" onClick={() => onEdit(item)}>
        <PencilIcon className="size-3.5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="text-destructive hover:text-destructive size-7"
        onClick={() => onDelete(item)}
      >
        <Trash2Icon className="size-3.5" />
      </Button>
    </div>
  );
}
