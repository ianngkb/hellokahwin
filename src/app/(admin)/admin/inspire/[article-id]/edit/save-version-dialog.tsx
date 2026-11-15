'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VERSION_LABEL_MAX } from '@/lib/articles/version-snapshot';

/**
 * "Save named version" (ported from The Wedding Notebook's save-version
 * dialog, reduced to the one choice HelloKahwin needs).
 *
 * Ordinary saves — the Save/Update buttons and the 60-second autosave — keep
 * working exactly as before and are versioned automatically: one version per
 * editing session. This dialog is for the moments an editor wants a
 * checkpoint they can find again ("Before the 2026 price refresh"). It saves
 * through the normal save, with a name attached.
 *
 * Dismissing (Esc, backdrop, Cancel) saves nothing.
 */
export function SaveVersionDialog({
  open,
  onOpenChange,
  isPending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  /** Called only on an explicit confirm, with a non-empty, trimmed name. */
  onConfirm: (label: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Rendered only while open, so every open starts with an empty name. */}
      {open && (
        <SaveVersionForm
          isPending={isPending}
          onCancel={() => onOpenChange(false)}
          onConfirm={onConfirm}
        />
      )}
    </Dialog>
  );
}

function SaveVersionForm({
  isPending,
  onCancel,
  onConfirm,
}: {
  isPending: boolean;
  onCancel: () => void;
  onConfirm: (label: string) => void;
}) {
  const [label, setLabel] = useState('');
  const trimmed = label.trim();
  const canSave = trimmed.length > 0 && !isPending;

  function submit() {
    if (canSave) onConfirm(trimmed);
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Save named version</DialogTitle>
        <DialogDescription>
          Saves the article now and keeps this exact state in its version history under the name you
          give it, so you can find it and restore it later.
        </DialogDescription>
      </DialogHeader>

      <form
        className="space-y-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Label htmlFor="version-name">Version name</Label>
        <Input
          id="version-name"
          autoFocus
          value={label}
          maxLength={VERSION_LABEL_MAX}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Before the 2026 price refresh"
        />
        <p className="text-muted-foreground text-xs">
          {trimmed.length}/{VERSION_LABEL_MAX}
        </p>
      </form>

      <DialogFooter>
        <Button variant="quiet" size="sm" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button size="sm" onClick={submit} disabled={!canSave}>
          {isPending ? 'Saving...' : 'Save version'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
