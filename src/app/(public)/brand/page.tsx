import type { Metadata } from 'next';
import {
  MASTER_LOGOS,
  SHORT_LOGOS,
  BRAND_COLOURS,
  BRAND_DONTS,
  type BrandLogo,
} from '@/components/brand/brand-assets';
import './brand.css';

// Static: nothing here reads the database or the request.
export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Brand',
  description:
    'HelloKahwin brand assets — wordmark, monogram, colour and usage. Download the marks and use them correctly.',
  alternates: { canonical: '/brand' },
  openGraph: {
    title: 'Brand assets · HelloKahwin',
    description:
      'Wordmark, monogram, colour and usage rules for HelloKahwin.',
    url: '/brand',
    type: 'website',
  },
};

function LogoCard({ logo }: { logo: BrandLogo }) {
  return (
    <figure className="bp-card">
      <div className="bp-stage">
        {/* eslint-disable-next-line @next/next/no-img-element -- outlined SVG,
            under 3KB, and currentColor must inherit; next/image would rasterise
            the sizing decision this page exists to demonstrate. */}
        <img src={logo.src} alt={`HelloKahwin ${logo.name}`} className="bp-mark" />
      </div>
      <figcaption className="bp-meta">
        <div className="bp-meta-head">
          <h3>{logo.name}</h3>
          <span className="bp-ratio">{logo.ratio}</span>
        </div>
        <p>{logo.description}</p>
        <div className="bp-actions">
          <a className="bp-btn" href={logo.src} download>
            Download SVG
          </a>
          <span className="bp-min">Min height {logo.minHeight}px</span>
        </div>
      </figcaption>
    </figure>
  );
}

export default function BrandPage() {
  return (
    <div className="bp">
      <header className="bp-hero">
        <p className="bp-eyebrow">HelloKahwin · Brand</p>
        <h1>Brand assets</h1>
        <p className="bp-lede">
          The wordmark, the monogram, the palette, and the six ways to get them wrong.
          Every mark below is an outlined SVG under 3&nbsp;KB — one file per lockup,
          in any brand colour.
        </p>
      </header>

      <section className="bp-sec" id="logos">
        <div className="bp-sec-head">
          <h2>Master logo</h2>
          <p>
            The primary lockup runs at <strong>10.0 : 1</strong>. That proportion is the
            mark — regenerate rather than rescale if the tracking ever changes.
          </p>
        </div>
        <div className="bp-grid">
          {MASTER_LOGOS.map((l) => (
            <LogoCard key={l.id} logo={l} />
          ))}
        </div>
      </section>

      <section className="bp-sec" id="short">
        <div className="bp-sec-head">
          <h2>Shortmark &amp; monogram</h2>
          <p>
            For surfaces the full wordmark cannot survive. The monogram is the only mark
            that works as a favicon, an app icon or an avatar.
          </p>
        </div>
        <div className="bp-grid">
          {SHORT_LOGOS.map((l) => (
            <LogoCard key={l.id} logo={l} />
          ))}
        </div>
      </section>

      <section className="bp-sec" id="reverse">
        <div className="bp-sec-head">
          <h2>On dark</h2>
          <p>
            There is no separate reversed file. Every mark inherits{' '}
            <code>currentColor</code>, so the same SVG serves ink, parchment and gold.
          </p>
        </div>
        <div className="bp-reverse">
          {/* eslint-disable-next-line @next/next/no-img-element -- see LogoCard */}
          <img
            src="/brand/logos/hellokahwin-horizontal.svg"
            alt="HelloKahwin wordmark reversed on the dark ground"
            className="bp-mark"
          />
        </div>
      </section>

      <section className="bp-sec" id="colour">
        <div className="bp-sec-head">
          <h2>Colour</h2>
          <p>
            Every text pairing was computed, not eyeballed. Where a value is stated it is
            the measured ratio against the ground it sits on; WCAG AA (4.5&nbsp;:&nbsp;1)
            is the floor for body text.
          </p>
        </div>
        <div className="bp-colours">
          {BRAND_COLOURS.map((c) => (
            <div className="bp-colour" key={c.token}>
              <span className="bp-chip" style={{ background: c.hex }} aria-hidden="true" />
              <span className="bp-colour-info">
                <b>{c.name}</b>
                <code>{c.hex}</code>
                <code className="bp-token">{c.token}</code>
                <span className="bp-use">{c.use}</span>
                {c.contrast ? <span className="bp-contrast">{c.contrast}</span> : null}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="bp-sec" id="donts">
        <div className="bp-sec-head">
          <h2>Don&rsquo;t</h2>
          <p>Each of these produces something that reads as a near-miss of the real mark.</p>
        </div>
        <ul className="bp-donts">
          {BRAND_DONTS.map((d) => (
            <li key={d.title}>
              <b>{d.title}</b>
              <span>{d.detail}</span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="bp-foot">
        <p>
          Questions about usage, or need a format that is not here? Reply to whoever sent
          you this page.
        </p>
      </footer>
    </div>
  );
}
