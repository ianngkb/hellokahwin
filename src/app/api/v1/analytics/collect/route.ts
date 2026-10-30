import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db/drizzle';
import { analyticsEvents } from '@/lib/db/schema/analytics-events';
import { apiSuccess, apiError } from '@/lib/api/response';
import { ipRateLimit } from '@/lib/api/rate-limit';
import { withDeadline, DeadlineExceededError } from '@/lib/api/timeout';
import { generateVisitorHash } from '@/lib/analytics/hash';
import { resolveGeo } from '@/lib/analytics/geo';
import { classifyBot } from '@/lib/analytics/bot-list';
import { parseDevice } from '@/lib/analytics/device';
import { VISITOR_COOKIE_NAME, parseVisitorIdCookie } from '@/lib/analytics/visitor-id';

// Cap function runtime well below the default. Combined with the 8s deadline
// on the DB write below, a stalled invocation wastes at most 15s.
export const maxDuration = 15;

// Ported from The Wedding Notebook's collector. Public and unauthenticated by
// design (the tracker beacons from anonymous pages), so it stays OUTSIDE the
// Clerk matcher in src/middleware.ts and is guarded by a per-IP rate limit.

// The collector reads at most this many characters of body — the same 64 KB a
// `sendBeacon` payload is capped at — before parsing any of it.
const MAX_BODY_CHARS = 65_536;

/**
 * Make a string safe for a Postgres `text` / `jsonb` value. A NUL character or
 * a lone UTF-16 surrogate makes Postgres reject the INSERT, and with it every
 * event in the batch, so NULs are stripped and lone surrogates become U+FFFD.
 * Run AFTER clipping: `slice` can split a surrogate pair.
 */
function cleanText(s: string): string {
  const noNul = s.replaceAll('\u0000', '');
  return typeof noNul.toWellFormed === 'function'
    ? noNul.toWellFormed()
    : noNul.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '�');
}

// Pathname, referrer and UTM values come verbatim from whatever URL a visitor
// landed on, so an over-long one is CLIPPED rather than rejected — a rejection
// would 400 the whole batch and lose every pageview sent with it.
const clippedText = (max: number) => z.string().transform((s) => cleanText(s.slice(0, max)));
const clipped = (max: number) => clippedText(max).optional();

// `props` lands in a JSONB column from an anonymous endpoint, so it is bounded:
// at most 50 keys, keys ≤100 chars, primitives only; string values are clipped
// to 1000 chars.
const propsSchema = z
  .record(
    z.string().max(100).transform(cleanText),
    z.union([clippedText(1000), z.number(), z.boolean(), z.null()]),
  )
  .refine((p) => Object.keys(p).length <= 50, { message: 'Too many props' })
  .optional();

const analyticsEventSchema = z.object({
  event_name: z.string().min(1).max(100).transform(cleanText),
  pathname: z
    .string()
    .refine((s) => s.startsWith('/'), { message: 'pathname must start with /' })
    .transform((s) => cleanText(s.slice(0, 2000))),
  referrer: clipped(2000),
  // Empty / whitespace-only → absent, so it is stored NULL rather than ''.
  session_id: z
    .string()
    .max(100)
    .transform((s) => (s.trim() ? cleanText(s) : undefined))
    .optional(),
  // `visitor_id` IS DELIBERATELY ABSENT. This endpoint is unauthenticated and
  // `_hk_vid` is not httpOnly, so any script on the page could read a real id
  // and post fabricated events under it. The id comes from the request cookie
  // only. Zod strips unknown keys, so a payload carrying it parses and the
  // field is simply ignored.
  //
  // Browser / OS / device type are not accepted either: they are parsed from
  // the request UA on this side (see `parseDevice`).
  utm_source: clipped(200),
  utm_medium: clipped(200),
  utm_campaign: clipped(200),
  utm_term: clipped(200),
  utm_content: clipped(200),
  screen_width: z.number().int().positive().max(10000).optional(),
  props: propsSchema,
});

const collectBodySchema = z.object({
  events: z.array(analyticsEventSchema).min(1).max(50),
});

export async function POST(request: NextRequest) {
  const rateLimitResponse = ipRateLimit(request, { limit: 120, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Bot traffic is RECORDED, flagged — not dropped — so the dashboard can
    // show Humans / Bots / All. See src/lib/analytics/bot-list.ts.
    const ua = request.headers.get('user-agent') ?? '';
    const botCheck = classifyBot(ua);

    // Refuse a declared-oversized body without reading it, then size-check the
    // raw text (Content-Length can be absent or wrong) BEFORE parsing it.
    const declared = Number(request.headers.get('content-length'));
    if (declared > MAX_BODY_CHARS) return apiError('Payload too large', 413);
    const raw = await request.text();
    if (raw.length > MAX_BODY_CHARS) return apiError('Payload too large', 413);

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return apiError('Invalid JSON body', 400);
    }

    const parsed = collectBodySchema.safeParse(body);
    if (!parsed.success) {
      const issues = parsed.error.issues;
      return apiError(issues[0]?.message ?? 'Invalid request body', 400);
    }

    const { events } = parsed.data;

    // Extract IP — prefer x-real-ip (set reliably by Vercel), fall back to the
    // LAST entry in x-forwarded-for (the first is client-spoofable). The IP is
    // only ever an input to the salted hash; it is never stored.
    const ip =
      request.headers.get('x-real-ip') ??
      request.headers.get('x-forwarded-for')?.split(',').pop()?.trim() ??
      'unknown';

    // Daily-rotating (KL day) salted visitor hash. Throws without
    // ANALYTICS_SALT — answered as a 503 below, never an unsalted hash.
    let visitorHash: string;
    try {
      visitorHash = generateVisitorHash(ip, ua);
    } catch (error) {
      console.error('[analytics] cannot hash visitor (is ANALYTICS_SALT set?):', error);
      return apiError('analytics_unavailable', 503);
    }

    // The stable 2-year `_hk_vid` id, read ONLY from the cookie on this
    // request. Absent or malformed → NULL, and the rows are still written.
    const visitorId = parseVisitorIdCookie(request.cookies.get(VISITOR_COOKIE_NAME)?.value);

    const geo = resolveGeo(request);
    const device = parseDevice(ua);

    // `user_agent` is stored so a later sweep can re-classify rows without
    // needing to re-derive the UA from headers.
    const rows = events.map((event) => ({
      visitorHash,
      visitorId,
      sessionId: event.session_id ?? null,
      eventName: event.event_name,
      pathname: event.pathname,
      referrer: event.referrer ?? null,
      utmSource: event.utm_source ?? null,
      utmMedium: event.utm_medium ?? null,
      utmCampaign: event.utm_campaign ?? null,
      utmTerm: event.utm_term ?? null,
      utmContent: event.utm_content ?? null,
      browser: device.browser,
      os: device.os,
      deviceType: device.device_type,
      screenWidth: event.screen_width ?? null,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      latitude: geo.latitude,
      longitude: geo.longitude,
      userAgent: ua || null,
      isBot: botCheck.isBot,
      botReason: botCheck.reason,
      props: event.props ?? null,
    }));

    // Hard 8s deadline: drizzle's own connect_timeout/statement_timeout
    // empirically don't fire on TCP-blackholed borrowed connections, leaving
    // requests hung until the function timeout.
    await withDeadline(db.insert(analyticsEvents).values(rows), 8_000, 'analytics_collect_db');

    return apiSuccess({ accepted: rows.length });
  } catch (error) {
    if (error instanceof DeadlineExceededError) {
      console.error('[analytics] db deadline exceeded');
      return apiError('analytics_unavailable', 503);
    }
    console.error('POST /api/v1/analytics/collect error:', error);
    return apiError('Internal server error', 500);
  }
}
