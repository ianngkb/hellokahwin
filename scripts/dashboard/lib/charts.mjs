// Small inline SVG charts. No libraries, no network, readable in both themes.

import { escapeHtml } from './md.mjs';

const fmt = (n) =>
  n === null || n === undefined || Number.isNaN(n)
    ? '–'
    : Math.abs(n) >= 1000
      ? Number(n).toLocaleString('en-GB', { maximumFractionDigits: 0 })
      : Number(n).toLocaleString('en-GB', { maximumFractionDigits: Math.abs(n) < 10 ? 1 : 0 });

export const formatNumber = fmt;

/** Average position needs its decimal — 20.6 and 21 are different arguments. */
export const formatPosition = (n) =>
  n === null || n === undefined || Number.isNaN(n) ? '–' : Number(n).toFixed(1);

/** Axis ticks that read as counts, not as fractions of a count. */
function tickValues(min, max, count) {
  const span = max - min;
  if (span <= 0) return [min];
  const rough = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= rough) || 10 * mag;
  const out = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step / 2; v += step) out.push(Number(v.toFixed(6)));
  if (!out.length) out.push(min, max);
  return out;
}

/**
 * A multi-series line chart over dated points.
 * @param {{series: Array<{name:string,color:string,points:Array<{date:string,value:number}>}>,
 *          height?:number, width?:number, invertY?:boolean, markers?:Array<{date:string,label:string}>,
 *          yLabel?:string}} opts
 */
export function lineChart(opts) {
  const width = opts.width || 900;
  const height = opts.height || 220;
  const pad = { t: 14, r: 14, b: 26, l: 46 };
  const series = (opts.series || []).filter((s) => s.points && s.points.length);
  if (!series.length) return '<div class="empty">No data points to draw.</div>';

  const dates = [...new Set(series.flatMap((s) => s.points.map((p) => p.date)))].sort();
  const xOf = (d) => {
    const i = dates.indexOf(d);
    const span = Math.max(1, dates.length - 1);
    return pad.l + ((width - pad.l - pad.r) * i) / span;
  };

  // Number.isFinite, not typeof: one NaN would make min/max NaN and every
  // coordinate in the chart would render as "MNaN NaN".
  const values = series.flatMap((s) => s.points.map((p) => p.value)).filter((v) => Number.isFinite(v));
  if (!values.length) return '<div class="empty">No numeric data points to draw.</div>';
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (opts.invertY) {
    min = Math.max(0, Math.floor(min - 1));
    max = Math.ceil(max + 1);
  } else {
    min = 0;
    max = max === 0 ? 1 : max * 1.1;
  }
  const yOf = (v) => {
    const t = (v - min) / (max - min || 1);
    const usable = height - pad.t - pad.b;
    return opts.invertY ? pad.t + t * usable : height - pad.b - t * usable;
  };

  let grid = '';
  for (const v of tickValues(min, max, 4)) {
    const y = yOf(v);
    grid +=
      '<line x1="' + pad.l + '" x2="' + (width - pad.r) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) +
      '" stroke="currentColor" stroke-opacity=".12"/>' +
      '<text x="' + (pad.l - 7) + '" y="' + (y + 3.5).toFixed(1) + '" text-anchor="end" font-size="10" fill="currentColor" fill-opacity=".55">' +
      fmt(v) + '</text>';
  }

  let markerSvg = '';
  for (const m of opts.markers || []) {
    if (!dates.includes(m.date)) continue;
    const x = xOf(m.date);
    // A marker near the right edge — which is exactly where a recent event sits —
    // would have its label clipped, so flip the label to the left of the line.
    const flip = x > width - 150;
    markerSvg +=
      '<line x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + pad.t + '" y2="' + (height - pad.b) +
      '" stroke="var(--gold)" stroke-width="1.5" stroke-dasharray="4 3"/>' +
      '<text x="' + (flip ? x - 5 : x + 4).toFixed(1) + '" y="' + (pad.t + 10) +
      '" font-size="10" fill="var(--gold)" text-anchor="' + (flip ? 'end' : 'start') + '">' +
      escapeHtml(m.label) + '</text>';
  }

  let paths = '';
  for (const s of series) {
    const pts = s.points.filter((p) => Number.isFinite(p.value));
    if (!pts.length) continue;
    const d = pts
      .map((p, i) => (i ? 'L' : 'M') + xOf(p.date).toFixed(1) + ' ' + yOf(p.value).toFixed(1))
      .join(' ');
    paths += '<path d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="1.9" stroke-linejoin="round"/>';
    const last = pts[pts.length - 1];
    paths += '<circle cx="' + xOf(last.date).toFixed(1) + '" cy="' + yOf(last.value).toFixed(1) + '" r="2.8" fill="' + s.color + '"/>';
  }

  const xLabels = [dates[0], dates[Math.floor(dates.length / 2)], dates[dates.length - 1]]
    .filter(Boolean)
    .map(
      (d, i) =>
        '<text x="' + xOf(d).toFixed(1) + '" y="' + (height - 8) + '" font-size="10" fill="currentColor" fill-opacity=".55" text-anchor="' +
        (i === 0 ? 'start' : i === 1 ? 'middle' : 'end') + '">' + d + '</text>'
    )
    .join('');

  return (
    '<svg class="chart" viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="none" role="img" aria-label="' +
    escapeHtml(opts.yLabel || 'chart') + '" style="color:var(--ink)">' +
    grid + markerSvg + paths + xLabels + '</svg>'
  );
}

/** Simple vertical bars, used for the weekly article count. */
export function barChart(buckets, opts) {
  const width = (opts && opts.width) || 900;
  const height = (opts && opts.height) || 150;
  const pad = { t: 12, r: 12, b: 30, l: 34 };
  if (!buckets.length) return '<div class="empty">No weeks to draw.</div>';
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const bw = (width - pad.l - pad.r) / buckets.length;
  let bars = '';
  buckets.forEach((b, i) => {
    const h = ((height - pad.t - pad.b) * b.count) / max;
    const x = pad.l + i * bw + bw * 0.16;
    const y = height - pad.b - h;
    bars +=
      '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + (bw * 0.68).toFixed(1) +
      '" height="' + Math.max(h, b.count ? 2 : 0).toFixed(1) + '" rx="2" fill="var(--accent)"/>';
    if (i % 2 === 0) {
      bars +=
        '<text x="' + (x + bw * 0.34).toFixed(1) + '" y="' + (height - 10) +
        '" font-size="9" text-anchor="middle" fill="currentColor" fill-opacity=".55">' + b.to.slice(5) + '</text>';
    }
  });
  const zero =
    '<line x1="' + pad.l + '" x2="' + (width - pad.r) + '" y1="' + (height - pad.b) + '" y2="' + (height - pad.b) +
    '" stroke="currentColor" stroke-opacity=".2"/>';
  const yMax =
    '<text x="' + (pad.l - 6) + '" y="' + (pad.t + 8) + '" font-size="10" text-anchor="end" fill="currentColor" fill-opacity=".55">' +
    max + '</text>';
  return (
    '<svg class="chart" viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="none" role="img" ' +
    'aria-label="weekly article count" style="color:var(--ink)">' + zero + yMax + bars + '</svg>'
  );
}
