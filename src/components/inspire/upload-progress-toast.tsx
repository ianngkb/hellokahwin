'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Loader2, Check, AlertCircle, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  useUploadProgress,
  isActive,
  isDone,
  progressPercent,
  reset,
} from '@/lib/storage/upload-progress';

const TOAST_ID = 'upload-progress';
const AUTO_DISMISS_MS = 4000;

// ── Toast component (rendered inside sonner) ───────────────────────────

function UploadProgressToast() {
  const state = useUploadProgress();
  const active = isActive(state);
  const done = isDone(state);
  const percent = progressPercent(state);
  const { total, completed, failed } = state;

  const allSuccess = done && failed === 0;
  const allFailed = done && completed === 0;
  const partial = done && failed > 0 && completed > 0;

  return (
    <div className="border-border/30 bg-popover rounded-card flex w-[320px] items-start gap-3 border p-4 shadow-sm">
      {/* Icon */}
      <div className="mt-0.5 shrink-0">
        {active && <Loader2 className="text-primary size-4 animate-spin" />}
        {allSuccess && <Check className="text-success size-4" />}
        {partial && <AlertCircle className="text-warning size-4" />}
        {allFailed && <AlertCircle className="text-destructive size-4" />}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 space-y-1.5">
        {active && (
          <>
            <p className="text-popover-foreground text-sm font-medium">
              Uploading {completed}/{total}...
              {failed > 0 && <span className="text-warning"> ({failed} failed)</span>}
            </p>
            <Progress value={percent} className="h-1.5" />
          </>
        )}

        {allSuccess && (
          <p className="text-success text-sm font-medium">
            {total} image{total === 1 ? '' : 's'} uploaded
          </p>
        )}

        {partial && (
          <p className="text-warning text-sm font-medium">
            {completed} of {total} uploaded, {failed} failed
          </p>
        )}

        {allFailed && (
          <p className="text-destructive text-sm font-medium">
            Upload failed — {total} image{total === 1 ? '' : 's'}
          </p>
        )}
      </div>

      {/* Dismiss button */}
      <button
        type="button"
        onClick={() => {
          toast.dismiss(TOAST_ID);
          reset();
        }}
        className="text-muted-foreground hover:text-foreground mt-0.5 shrink-0 transition-colors"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

// ── Hook to manage toast lifecycle ─────────────────────────────────────

export function useUploadProgressToast() {
  const state = useUploadProgress();
  const active = isActive(state);
  const done = isDone(state);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // F1/F3 fix: Re-call toast.custom() on every state change so sonner
  // always has the latest render function, regardless of its internal
  // memoization strategy. Using the same `id` replaces in-place.
  useEffect(() => {
    if (state.total > 0) {
      toast.custom(() => <UploadProgressToast />, {
        id: TOAST_ID,
        duration: Infinity,
      });
    }
  }, [state]);

  // Auto-dismiss after completion
  useEffect(() => {
    if (done) {
      timerRef.current = setTimeout(() => {
        // F2/F7 fix: Only dismiss the toast — don't reset() shared state.
        // State cleanup happens lazily inside trackFiles() on next batch.
        toast.dismiss(TOAST_ID);
      }, AUTO_DISMISS_MS);
    }

    // Cancel auto-dismiss if new uploads arrive before timer fires
    if (active && timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [done, active]);

  // F7 fix: On unmount, only dismiss the toast. Don't reset() shared
  // state — in-flight uploads from other components may still be running.
  useEffect(() => {
    return () => {
      toast.dismiss(TOAST_ID);
    };
  }, []);
}
