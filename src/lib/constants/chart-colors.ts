/**
 * Chart palettes — literal because they either exceed the 5-slot `--chart-*`
 * token scale (7-way category/spectrum maps) or have no token equivalent (the
 * indigo accent is not one of --chart-1..5). Exempt from the no-raw-hex rule.
 *
 * NOTE: neutral chart chrome (grid lines, axis ticks) should NOT come from
 * here — use design tokens directly in the chart: stroke `var(--border)`,
 * tick fill `var(--muted-foreground)`. Recharts accepts CSS var strings.
 */

/** Primary line/area/bar accent (indigo). Not in the --chart-* scale. */
export const CHART_ACCENT = '#6366f1';

/** Recharts hover cursor fill — faint black wash. */
export const CHART_CURSOR_FILL = 'rgba(0,0,0,0.04)';

/** Visual-sitemap node colours by content category (7-way). */
export const SITEMAP_CATEGORY_COLORS: Record<string, string> = {
  'Real Weddings': '#ef4444',
  Planning: '#3b82f6',
  'Style & Decor': '#8b5cf6',
  'Pre-Wedding': '#ec4899',
  Engagement: '#f59e0b',
  Honeymoon: '#10b981',
  Uncategorized: '#6b7280',
};
export const SITEMAP_CATEGORY_FALLBACK = '#6b7280';

/** Peak-hours heat spectrum (light → dark green), 7 stops. */
export const PEAK_HOURS_SPECTRUM = [
  '#d1fae5',
  '#a7f3d0',
  '#6ee7b7',
  '#34d399',
  '#10b981',
  '#059669',
  '#047857',
];

/**
 * Lead-source series colours for the lead report's trend chart — the
 * validated 8-slot categorical palette (`dataviz` skill, `references/palette.md`),
 * light and dark steps. Both orderings pass every adjacent-pair CVD and
 * normal-vision gate in both modes (validated 2026-09-14 with
 * `scripts/validate_palette.js`). The dark column is the same hues re-stepped
 * for the console's dark surface, not a separate palette.
 *
 * WHICH SOURCE GETS WHICH SLOT lives in
 * `src/app/(admin)/admin/leads/leads-trend-math.ts` (`TREND_SERIES`) — colour
 * follows the ENTITY, never its rank, so a filter that hides series must not
 * repaint the survivors. Anything past the eighth entity folds into `OTHER`
 * (a neutral) rather than taking a ninth hue.
 */
export const CATEGORICAL_SERIES_COLORS = [
  { light: '#2a78d6', dark: '#3987e5' }, // 1 blue
  { light: '#eb6834', dark: '#d95926' }, // 2 orange
  { light: '#1baf7a', dark: '#199e70' }, // 3 aqua
  { light: '#eda100', dark: '#c98500' }, // 4 yellow
  { light: '#e87ba4', dark: '#d55181' }, // 5 magenta
  { light: '#008300', dark: '#008300' }, // 6 green
  { light: '#4a3aa7', dark: '#9085e9' }, // 7 violet
  { light: '#e34948', dark: '#e66767' }, // 8 red
] as const;

/** The fold bucket ("Other sources") and the single-series "Total" line. */
export const SERIES_NEUTRAL_COLOR = { light: '#898781', dark: '#898781' } as const;

/**
 * Lead-report series → colour, BY NAME. Colour follows the entity: WhatsApp is
 * aqua whether or not Social Media has any leads this quarter, and hiding a
 * series never repaints the survivors. The keys are the series in
 * `leads-trend-math.ts` (`TREND_SERIES`); the values are the eight validated
 * slots above, in that order, and the fold bucket is the neutral.
 */
export const LEAD_SOURCE_COLORS = {
  direct: CATEGORICAL_SERIES_COLORS[0],
  direct_popup: CATEGORICAL_SERIES_COLORS[1],
  whatsapp: CATEGORICAL_SERIES_COLORS[2],
  wedding_concierge: CATEGORICAL_SERIES_COLORS[3],
  social_media: CATEGORICAL_SERIES_COLORS[4],
  article: CATEGORICAL_SERIES_COLORS[5],
  directory: CATEGORICAL_SERIES_COLORS[6],
  real_wedding: CATEGORICAL_SERIES_COLORS[7],
  other: SERIES_NEUTRAL_COLOR,
  total: SERIES_NEUTRAL_COLOR,
} as const;
