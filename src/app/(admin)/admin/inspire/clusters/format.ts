const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Kuala_Lumpur',
});

/** "6 Nov 2026", or an em dash when there is no date. */
export function formatAdminDate(d: Date | null | undefined): string {
  return d ? DATE_FORMAT.format(d) : '—';
}

/** Views with thousands separators, or an em dash when analytics were unavailable. */
export function formatViews(n: number | null | undefined): string {
  return n == null ? '—' : n.toLocaleString('en-GB');
}
