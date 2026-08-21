'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { renewLockAction } from './actions';
import { saveLocalAutosave, type LocalAutosaveData } from '@/lib/inspire/local-autosave';

interface UseAutosaveOptions {
  articleId: string;
  userId: string;
  isDirty: boolean;
  onSave: (options?: { silent?: boolean }) => void;
  getFormData: () => LocalAutosaveData;
  enabled: boolean;
}

interface UseAutosaveReturn {
  lastAutosaveAt: string | null;
  lockLost: boolean;
}

export function useAutosave({
  articleId,
  userId,
  isDirty,
  onSave,
  getFormData,
  enabled,
}: UseAutosaveOptions): UseAutosaveReturn {
  const [lastAutosaveAt, setLastAutosaveAt] = useState<string | null>(null);
  const [lockLost, setLockLost] = useState(false);

  // Use refs to avoid stale closures in the interval callback
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const getFormDataRef = useRef(getFormData);
  getFormDataRef.current = getFormData;

  const tick = useCallback(async () => {
    // Renew lock
    const lockResult = await renewLockAction(articleId);
    if (lockResult.error === 'lock_lost') {
      setLockLost(true);
      return false; // signal to stop interval
    }

    // Always save locally (cheap)
    saveLocalAutosave(articleId, userId, getFormDataRef.current());

    // Remote save only when dirty
    if (isDirtyRef.current) {
      onSaveRef.current({ silent: true });
      setLastAutosaveAt(new Date().toISOString());
    }

    return true; // continue interval
  }, [articleId, userId]);

  useEffect(() => {
    if (!enabled || lockLost) return;

    let stopped = false;

    // Run initial tick immediately (don't wait 60s)
    tick().then((shouldContinue) => {
      if (!shouldContinue) stopped = true;
    });

    const intervalId = setInterval(() => {
      if (stopped) return;
      tick().then((shouldContinue) => {
        if (!shouldContinue) {
          stopped = true;
          clearInterval(intervalId);
        }
      });
    }, 60_000);

    return () => {
      stopped = true;
      clearInterval(intervalId);
      // Use fetch+keepalive for reliable lock release during navigation
      // (server actions may be cancelled during route transitions)
      fetch('/api/v1/inspire/release-lock', {
        method: 'POST',
        body: new Blob([JSON.stringify({ articleId })], { type: 'application/json' }),
        keepalive: true,
      }).catch(() => {});
    };
  }, [articleId, enabled, lockLost, tick]);

  return { lastAutosaveAt, lockLost };
}
