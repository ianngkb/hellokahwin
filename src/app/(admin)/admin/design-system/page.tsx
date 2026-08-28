import { requireAdminSection } from '@/lib/auth/admin';
import { ConsoleBreadcrumb } from '@/components/console/console-breadcrumb';
import { PageHeader } from '@/components/layout/page-header';
import './tokens.css';

export const metadata = { title: 'Design system | HelloKahwin' };

// ── The design system reference ──────────────────────────────────────
// DES-05. This page reads its values from `tokens.css` in this folder,
// which is the same file any adopting component will import — so the
// page cannot show a token the system does not have. That is the whole
// point of it: it is the regression test for taste, not documentation.
//
// SCOPE, deliberate: tokens are namespaced under `.hk-ds` and applied
// nowhere else. DES-04 has not decided the front-end stack and DES-05
// has not adopted the system site-wide, so nothing here may leak onto
// the public site or the rest of the console yet.
//
// MAINTENANCE CONTRACT: any token or shared component that changes
// updates this page in the SAME change. A reference that has drifted
// from the real UI is worse than none, because people trust it.

/** Contrast ratios are COMPUTED, never asserted. Re-run on any colour change. */
const CONTRAST: { pair: string; light: string; dark: string; grade: string }[] = [
  { pair: 'fg on page', light: '15.39', dark: '15.40', grade: 'AAA' },
  { pair: 'fg-soft on page', light: '8.01', dark: '9.95', grade: 'AAA' },
  { pair: 'fg-mute on raised', light: '4.55', dark: '4.53', grade: 'AA' },
  { pair: 'accent on raised', light: '4.56', dark: '6.97', grade: 'AA' },
  { pair: 'critical on raised', light: '7.59', dark: '4.54', grade: 'AA' },
  { pair: 'quiet on raised', light: '4.52', dark: '5.40', grade: 'AA' },
];

const PRIMITIVES: { token: string; hex: string; use: string }[] = [
  { token: '--hk-ink-900', hex: '#16130F', use: 'Dyed ground. Warm bias, never pure black.' },
  { token: '--hk-sand-050', hex: '#EDEAE1', use: 'Parchment, olive bias — not the default cream.' },
  { token: '--hk-sand-200', hex: '#DAD5C6', use: 'Raised surface. Worst case for contrast.' },
  { token: '--hk-gold-700', hex: '#725825', use: 'Songket thread, light. Corrected for AA.' },
  { token: '--hk-gold-500', hex: '#A8823C', use: 'Structural hairline. Rules only, never text.' },
  { token: '--hk-gold-300', hex: '#C9A45C', use: 'Songket thread, dark.' },
  { token: '--hk-blood-700', hex: '#6B2130', use: 'Oxblood. Warnings and gates, light.' },
  { token: '--hk-blood-400', hex: '#C26E7F', use: 'Oxblood, dark. Corrected for AA.' },
  { token: '--hk-tenun-700', hex: '#55604C', use: 'Tenun sage. Quiet metadata only.' },
  { token: '--hk-night-800', hex: '#14110D', use: 'Dark-theme page ground.' },
];

export default async function DesignSystemPage() {
  await requireAdminSection('inspire');

  return (
    <>
      <ConsoleBreadcrumb items={[{ label: 'Design system' }]} />
      <PageHeader
        title="Design system"
        description="The proposed premium register — tokens, measured contrast and components. Scoped to this page until DES-04 decides the stack."
      />

      <div className="hk-ds">
        <p className="ds-eyebrow">DES-05 · reference · proposal, not yet adopted</p>
        <h2 className="ds-h" style={{ fontSize: '2rem', margin: 'var(--s-3) 0 var(--s-5)' }}>
          Abundance under control
        </h2>

        {/* ── primitives ─────────────────────────────────────────── */}
        <section className="ds-sec">
          <div className="ds-sec-head">
            <span className="ds-eyebrow">01 · Primitive palette</span>
            <span className="ds-meta">Materials — never consumed directly by a component</span>
          </div>
          <div className="ds-sw-grid">
            {PRIMITIVES.map((p) => (
              <div className="ds-sw" key={p.token}>
                <i style={{ background: `var(${p.token})` }} />
                <span>
                  <b>{p.token}</b>
                  <em>{p.hex}</em>
                  <span
                    style={{
                      padding: 0,
                      fontSize: '0.72rem',
                      color: 'var(--fg-soft)',
                      marginTop: 'var(--s-2)',
                      lineHeight: 1.35,
                    }}
                  >
                    {p.use}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── contrast ───────────────────────────────────────────── */}
        <section className="ds-sec">
          <div className="ds-sec-head">
            <span className="ds-eyebrow">02 · Contrast, measured</span>
            <span className="ds-meta">WCAG AA (4.5:1) is the floor for body text</span>
          </div>
          <div style={{ overflowX: 'auto', border: '1px solid var(--rule)' }}>
            <table className="ds-table">
              <thead>
                <tr>
                  <th scope="col">Pairing</th>
                  <th scope="col">Light</th>
                  <th scope="col">Dark</th>
                  <th scope="col">Grade</th>
                </tr>
              </thead>
              <tbody>
                {CONTRAST.map((c) => (
                  <tr key={c.pair}>
                    <td>{c.pair}</td>
                    <td className="num">{c.light}</td>
                    <td className="num">{c.dark}</td>
                    <td className="num" style={{ color: 'var(--accent)' }}>
                      {c.grade}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="ds-meta" style={{ marginTop: 'var(--s-3)', lineHeight: 1.6, maxWidth: '74ch' }}>
            The first palette failed in four places and was corrected — gold measured 3.93 on the
            light ground while carrying every label on the page. Hairlines are exempt as decorative
            dividers rather than boundaries needed for comprehension; that is the one call here made
            on judgement rather than a number.
          </p>
        </section>

        {/* ── buttons ────────────────────────────────────────────── */}
        <section className="ds-sec">
          <div className="ds-sec-head">
            <span className="ds-eyebrow">03 · Buttons</span>
          </div>
          <div className="ds-row">
            <div className="ds-demo">
              <button type="button" className="ds-btn">
                Cari dewan
              </button>
              <button type="button" className="ds-btn is-secondary">
                Muat lagi
              </button>
              <button type="button" className="ds-btn is-ghost">
                Tapis
              </button>
              <button type="button" className="ds-btn" disabled>
                Tiada
              </button>
            </div>
            <p className="ds-note">
              <b>Variants</b>
              Primary is solid ink, reserved for the single action on a page. Hover moves to gold
              rather than darkening — colour change, not depth. No radius and no shadow: those are
              tokens holding <code>0</code> and <code>none</code>, so the flat register is a decision
              to argue with rather than a gap.
            </p>
          </div>
        </section>

        {/* ── data table ─────────────────────────────────────────── */}
        <section className="ds-sec">
          <div className="ds-sec-head">
            <span className="ds-eyebrow">04 · Data table</span>
            <span className="ds-meta">The money format — what the site actually sells</span>
          </div>
          <div style={{ overflowX: 'auto', border: '1px solid var(--rule)' }}>
            <table className="ds-table">
              <thead>
                <tr>
                  <th scope="col">Negeri</th>
                  <th scope="col">Kadar minimum</th>
                  <th scope="col">Pihak berkuasa</th>
                  <th scope="col">Disemak</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Selangor</td>
                  <td className="num">RM300</td>
                  <td>JAIS</td>
                  <td className="num">Ogos 2026</td>
                </tr>
                <tr>
                  <td>Kedah</td>
                  <td className="num">RM22.50</td>
                  <td>JAIK</td>
                  <td className="num">Ogos 2026</td>
                </tr>
                <tr>
                  <td>Perak</td>
                  <td className="none">Tiada kadar ditetapkan</td>
                  <td>JAIPk</td>
                  <td className="num">Ogos 2026</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="ds-meta" style={{ marginTop: 'var(--s-3)', lineHeight: 1.6, maxWidth: '74ch' }}>
            Every table carries an authority column and a checked date, or it does not ship. An
            absent figure reads <strong>&ldquo;tiada kadar ditetapkan&rdquo;</strong>, never blank —
            six of fourteen states genuinely set no minimum, and an empty cell reads as missing
            research rather than as the finding it is.
          </p>
        </section>

        {/* ── provenance ─────────────────────────────────────────── */}
        <section className="ds-sec">
          <div className="ds-sec-head">
            <span className="ds-eyebrow">05 · Provenance</span>
            <span className="ds-meta">The most important component in this system</span>
          </div>
          <div className="ds-row">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)', maxWidth: 520 }}>
              <div className="ds-prov">
                <b>Sumber</b>
                Jabatan Agama Islam Kedah — pekeliling kadar mas kahwin
                <br />
                Disemak 26 Ogos 2026
              </div>
              <div className="ds-prov is-missing">
                <b>Tiada sumber rasmi</b>
                Tiada pihak berkuasa menerbitkan kadar bagi negeri ini.
                <br />
                Disemak 26 Ogos 2026 — direkodkan sebagai tiada, bukan dianggarkan
              </div>
            </div>
            <p className="ds-note">
              <b>Why this is first</b>
              The site&rsquo;s whole competitive claim is that its numbers carry their sources, so
              provenance is a component rather than a convention — a figure without one is a bug.
              The <strong>missing</strong> variant matters as much as the present one: it renders
              &ldquo;no authority publishes this&rdquo; as a dated finding, which is what stops a
              future writer quietly filling the gap with a plausible number.
            </p>
          </div>
        </section>

        <p className="ds-meta" style={{ lineHeight: 1.6 }}>
          Not yet here: components gated on DES-04 (cards, search, pagination, FAQ, empty states),
          the nav component (blocked on the taxonomy question — nine categories do not fit a bar),
          and confirmed typefaces. All three faces above are stand-ins until licence and Malay
          diacritic coverage are checked.
        </p>
      </div>
    </>
  );
}
