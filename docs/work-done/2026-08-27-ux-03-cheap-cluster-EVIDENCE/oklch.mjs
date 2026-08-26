// oklch -> linear sRGB -> WCAG relative luminance -> contrast ratio
function oklchToLinearSrgb(L, C, Hdeg) {
  const h = (Hdeg * Math.PI) / 180;
  const a = C * Math.cos(h), b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}
const enc = (u) => (u <= 0.0031308 ? 12.92 * u : 1.055 * Math.pow(u, 1 / 2.4) - 0.055);
function lum([r, g, b]) {
  const cl = (v) => Math.min(1, Math.max(0, v));
  return 0.2126 * cl(r) + 0.7152 * cl(g) + 0.0722 * cl(b);
}
function srgb255(lin) { return lin.map((v) => Math.round(Math.min(1, Math.max(0, enc(v))) * 255)); }
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const T = {
  'background (paper)': [0.988, 0.002, 85],
  '--border':           [0.885, 0.003, 85],
  '--border-strong':    [0.66,  0.004, 85],
  '--hairline':         [0.9,   0.003, 85],
  '--foreground (ink)': [0.19,  0.004, 85],
  '--muted-foreground': [0.46,  0.004, 85],
};
const lin = Object.fromEntries(Object.entries(T).map(([k, v]) => [k, oklchToLinearSrgb(...v)]));
console.log('token                  oklch                       rgb           vs paper');
for (const [k, v] of Object.entries(T)) {
  const r = ratio(lin[k], lin['background (paper)']);
  console.log(
    k.padEnd(22),
    `oklch(${v.join(' ')})`.padEnd(27),
    `rgb(${srgb255(lin[k]).join(',')})`.padEnd(14),
    r.toFixed(3) + ':1',
    k === '--border' || k === '--border-strong' ? (r >= 3 ? '  PASS 1.4.11' : '  FAIL 1.4.11 (needs 3:1)') : ''
  );
}
