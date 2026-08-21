import { useSyncExternalStore } from 'react';

// ── State ──────────────────────────────────────────────────────────────

interface UploadProgressState {
  total: number;
  completed: number;
  failed: number;
}

let state: UploadProgressState = { total: 0, completed: 0, failed: 0 };
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

// ── Actions ────────────────────────────────────────────────────────────

export function trackFiles(count: number) {
  // Reset if not actively uploading (handles done state AND ghost state
  // from in-flight uploads that completed after a navigation/unmount)
  if (!isActive(state)) {
    state = { total: 0, completed: 0, failed: 0 };
  }
  state = { ...state, total: state.total + count };
  emit();
}

export function markCompleted() {
  state = { ...state, completed: state.completed + 1 };
  emit();
}

export function markFailed() {
  state = { ...state, failed: state.failed + 1 };
  emit();
}

export function reset() {
  state = { total: 0, completed: 0, failed: 0 };
  emit();
}

// ── Derived ────────────────────────────────────────────────────────────

export function isActive(s: UploadProgressState) {
  return s.total > 0 && s.completed + s.failed < s.total;
}

export function isDone(s: UploadProgressState) {
  return s.total > 0 && s.completed + s.failed === s.total;
}

export function progressPercent(s: UploadProgressState) {
  return s.total > 0 ? Math.round(((s.completed + s.failed) / s.total) * 100) : 0;
}

// ── Hook ───────────────────────────────────────────────────────────────

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot() {
  return state;
}

export function useUploadProgress() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
