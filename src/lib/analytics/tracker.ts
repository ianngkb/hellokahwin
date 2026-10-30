'use client';

// First-party analytics tracker, ported from The Wedding Notebook. Events are
// queued in memory and flushed to the collector every 5s, and with
// `sendBeacon` when the page is hidden.
//
// Deliberately NO user-agent parsing here — the collector parses the request
// UA server-side (src/lib/analytics/device.ts), so the public bundle gains no
// dependency. Only pathname, referrer, UTM params and `screen_width` leave the
// browser.

// Cookie-only helper — called for its SIDE EFFECT of making sure `_hk_vid`
// exists so the collector can read it from the cookie on the beacon request.
// The value is deliberately NOT put in the payload.
import { getOrCreateVisitorIdClient } from '@/lib/analytics/visitor-id';
import { randomUuid } from '@/lib/analytics/uuid';

const COLLECT_ENDPOINT = '/api/v1/analytics/collect';
const FLUSH_INTERVAL_MS = 5_000;
const SESSION_KEY = '_hk_sid';
const SESSION_TS_KEY = '_hk_sid_ts';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30-minute inactivity timeout (industry standard)
// Collector limits (src/app/api/v1/analytics/collect/route.ts). Anything past
// them would 400 the whole batch, so the tracker stays inside them.
const MAX_BATCH = 50;
const MAX_EVENT_NAME = 100;
const MAX_PROP_KEYS = 50;
const MAX_PROP_KEY_LENGTH = 100;
const MAX_PROP_STRING = 1000;

export interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

export interface AnalyticsEventPayload extends UtmParams {
  event_name: string;
  pathname?: string;
  referrer?: string;
  session_id?: string;
  screen_width?: number;
  props?: Record<string, unknown>;
}

let queue: AnalyticsEventPayload[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let initialized = false;

// ── Session ID ────────────────────────────────────────────────────────────────

export function getOrCreateSessionId(): string {
  try {
    const now = Date.now();
    const existing = sessionStorage.getItem(SESSION_KEY);
    const lastTs = Number(sessionStorage.getItem(SESSION_TS_KEY) || '0');

    // Rotate session if inactive for longer than the timeout
    // `elapsed < 0` means the clock went backwards; rotate rather than keep a
    // session that could then never time out.
    const elapsed = now - lastTs;
    if (existing && elapsed >= 0 && elapsed <= SESSION_TIMEOUT_MS) {
      sessionStorage.setItem(SESSION_TS_KEY, String(now));
      return existing;
    }

    const id = randomUuid();
    sessionStorage.setItem(SESSION_KEY, id);
    sessionStorage.setItem(SESSION_TS_KEY, String(now));
    return id;
  } catch {
    // sessionStorage may be unavailable (e.g. private browsing in some browsers)
    return randomUuid();
  }
}

// ── Framed-context guard ──────────────────────────────────────────────────────

/**
 * Framed renders are never real visits (an admin preview, an embed), so no
 * event may be recorded from one — guarded here, in the ONE enqueue layer,
 * rather than per call site, so both pageviews and `track()` calls honour it.
 */
function isFramedContext(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    // Accessing window.top throws for a cross-origin parent — which can only
    // happen when framed, so treat it as framed.
    return true;
  }
}

// ── Flush ─────────────────────────────────────────────────────────────────────

export function flush(): void {
  if (queue.length === 0) return;

  const pending = queue;
  queue = [];

  // Chunked: the collector rejects a batch over MAX_BATCH outright, which
  // would lose every event in it.
  for (let i = 0; i < pending.length; i += MAX_BATCH) {
    send(JSON.stringify({ events: pending.slice(i, i + MAX_BATCH) }));
  }
}

function send(body: string): void {
  // Use sendBeacon when the page is being hidden to prevent data loss on close
  // `sendBeacon` returns false when the browser refuses to queue the payload
  // (quota, size); fall through to a keepalive fetch rather than lose it.
  if (document.visibilityState === 'hidden' && navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    if (navigator.sendBeacon(COLLECT_ENDPOINT, blob)) return;
  }
  fetch(COLLECT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // Non-blocking — analytics failures should never affect the user experience
  });
}

// ── Visibility change handler ─────────────────────────────────────────────────

function handleVisibilityChange(): void {
  if (document.visibilityState === 'hidden') {
    flush();
  }
}

// ── Enqueue ───────────────────────────────────────────────────────────────────

function enqueue(event: AnalyticsEventPayload): void {
  // `/draft/<token>` is an editor's preview of unpublished work, not a visit.
  // Guarded here so `track()` calls from components on that page (e.g. the
  // photo gallery) are dropped too, not just the pageview.
  if (window.location.pathname.startsWith('/draft/')) return;
  queue.push({
    ...event,
    session_id: getOrCreateSessionId(),
    screen_width: window.screen?.width || undefined,
  });
  // Side effect only — see the import note.
  getOrCreateVisitorIdClient();
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Initialize the tracker.
 * Starts the periodic flush timer and registers the visibilitychange listener.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export function init(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);
  document.addEventListener('visibilitychange', handleVisibilityChange);
}

/** Track a pageview event. */
export function trackPageview(pathname: string, referrer?: string, utmParams?: UtmParams): void {
  if (typeof window === 'undefined') return;
  if (isFramedContext()) return;

  enqueue({
    event_name: 'pageview',
    pathname,
    referrer: referrer ?? (document.referrer || undefined),
    ...utmParams,
  });
}

/**
 * Track a custom event with optional properties (stored as JSONB).
 *
 * The signature is the seam every call site already uses (it was a no-op
 * before this pipeline existed) — keep it exactly `(event, props?) => void`.
 */
export function track(eventName: string, props?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  if (isFramedContext()) return;
  // The collector 400s a batch with an empty event name, losing every event in
  // it, so a blank name is dropped here.
  const name = eventName.trim();
  if (!name) return;

  enqueue({
    event_name: name.slice(0, MAX_EVENT_NAME),
    pathname: window.location.pathname,
    props: props && collectableProps(props),
  });
}

/**
 * Shape props to what the collector accepts, so one odd value can't 400 the
 * WHOLE batch: string / number / boolean / null values only (objects, arrays,
 * undefined, functions are dropped), keys over 100 chars dropped, string
 * values clipped to 1000 chars, at most the first 50 keys.
 */
function collectableProps(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  let kept = 0;
  for (const [key, value] of Object.entries(props)) {
    if (kept >= MAX_PROP_KEYS) break;
    if (key.length > MAX_PROP_KEY_LENGTH) continue;
    if (typeof value === 'string') out[key] = value.slice(0, MAX_PROP_STRING);
    else if (value === null || typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value;
    } else continue;
    kept++;
  }
  return out;
}

/** Exposed for testing */
export function _getQueue(): AnalyticsEventPayload[] {
  return queue;
}

export function _resetForTest(): void {
  queue = [];
  if (flushTimer !== null) {
    clearInterval(flushTimer);
  }
  flushTimer = null;
  initialized = false;
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  }
}
