'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Category {
  id: string;
  name: string;
  parentId: string | null;
}

interface TreeNode {
  id: string;
  name: string;
  depth: number;
  children: TreeNode[];
}

function buildTree(categories: Category[]): TreeNode[] {
  const roots: TreeNode[] = [];
  const childMap = new Map<string | null, Category[]>();

  for (const cat of categories) {
    const key = cat.parentId;
    if (!childMap.has(key)) childMap.set(key, []);
    childMap.get(key)!.push(cat);
  }

  function build(parentId: string | null, depth: number): TreeNode[] {
    return (childMap.get(parentId) ?? []).map((cat) => ({
      id: cat.id,
      name: cat.name,
      depth,
      children: build(cat.id, depth + 1),
    }));
  }

  return build(null, 1);
}

function flattenTree(nodes: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = [];
  for (const node of nodes) {
    result.push(node);
    result.push(...flattenTree(node.children));
  }
  return result;
}

/** Check if a category has any children in the full list */
function hasChildren(categoryId: string, categories: Category[]): boolean {
  return categories.some((c) => c.parentId === categoryId);
}

interface CategoryMultiSelectProps {
  categories: Category[];
  primaryCategoryId: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** When true, options without children (tertiaries) are greyed out and unselectable */
  disableWithoutChildren?: boolean;
}

/**
 * Multi-select checkboxes for secondary categories.
 * Always shows children of the primary category.
 * - Level 1 primary: shows Level 2 children
 * - Level 2 primary: shows Level 3 children (not siblings)
 * Hidden when no children exist.
 */
export function CategoryMultiSelect({
  categories,
  primaryCategoryId,
  selectedIds,
  onChange,
  disableWithoutChildren = false,
}: CategoryMultiSelectProps) {
  const primary = categories.find((c) => c.id === primaryCategoryId);
  if (!primary) return null;

  // Always show children of the primary — never siblings
  const options = categories.filter((c) => c.parentId === primary.id);

  if (options.length === 0) return null;

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((s) => s !== id) : [...selectedIds, id]);
  }

  return (
    <div className="space-y-2">
      <div className="bg-popover max-h-48 overflow-y-auto rounded-md border">
        {options.map((cat) => {
          const disabled = disableWithoutChildren && !hasChildren(cat.id, categories);
          return (
            <label
              key={cat.id}
              className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                disabled ? 'cursor-not-allowed opacity-40' : 'hover:bg-muted cursor-pointer'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(cat.id)}
                onChange={() => !disabled && toggle(cat.id)}
                disabled={disabled}
                className="border-input size-4 rounded"
              />
              {cat.name}
            </label>
          );
        })}
      </div>
    </div>
  );
}

interface CategoryTertiarySelectProps {
  categories: Category[];
  secondaryCategoryIds: string[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

/**
 * Multi-select checkboxes for tertiary categories.
 * Shows children of all selected secondary categories, grouped by parent.
 * Hidden when no tertiaries exist for the selected secondaries.
 */
export function CategoryTertiarySelect({
  categories,
  secondaryCategoryIds,
  selectedIds,
  onChange,
}: CategoryTertiarySelectProps) {
  if (secondaryCategoryIds.length === 0) return null;

  // Group tertiary options by their secondary parent
  const groups = secondaryCategoryIds
    .map((secId) => {
      const parent = categories.find((c) => c.id === secId);
      const children = categories.filter((c) => c.parentId === secId);
      return parent && children.length > 0 ? { parent, children } : null;
    })
    .filter(Boolean) as { parent: Category; children: Category[] }[];

  if (groups.length === 0) return null;

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((s) => s !== id) : [...selectedIds, id]);
  }

  return (
    <div className="space-y-2">
      <div className="bg-popover max-h-56 overflow-y-auto rounded-md border">
        {groups.map((group) => (
          <div key={group.parent.id}>
            <div className="text-muted-foreground bg-muted/50 sticky top-0 px-3 py-1.5 text-xs font-semibold">
              {group.parent.name}
            </div>
            {group.children.map((cat) => (
              <label
                key={cat.id}
                className="hover:bg-muted flex cursor-pointer items-center gap-2 px-3 py-2 pl-6 text-sm transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(cat.id)}
                  onChange={() => toggle(cat.id)}
                  className="border-input size-4 rounded"
                />
                {cat.name}
              </label>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

interface CategorySelectProps {
  categories: Category[];
  name?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

export function CategorySelect({
  categories,
  name,
  value,
  onValueChange,
  placeholder = 'Select a category',
  required,
}: CategorySelectProps) {
  const tree = buildTree(categories);
  const flat = flattenTree(tree);

  const indentClass = (depth: number) =>
    depth === 1 ? 'font-medium' : depth === 2 ? 'pl-6' : 'pl-10';

  return (
    <Select name={name} value={value} onValueChange={onValueChange} required={required}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {flat.map((node) => (
          <SelectItem key={node.id} value={node.id} className={indentClass(node.depth)}>
            {node.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
