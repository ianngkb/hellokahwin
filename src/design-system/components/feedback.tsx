/**
 * Empty and error blocks — DES-05, spec §8 and §7.4 (the five states of
 * "the surface no page type owns"). Two components, not one, because DES-07
 * rule 3.5 requires them to read as different states at a glance: `.s-empty`
 * carries no colour signal ("nothing is wrong, there is simply nothing here
 * yet"); `.s-err` opens with a 3px `--alert` rule and sets its heading in
 * `--alert`.
 *
 * The five states (E1–E5, K3/K6/A4) all resolve to one of these two blocks
 * with different copy — never a sixth bespoke visual language, which is
 * what shipped the 40px pill button DES-07 flagged on the live error
 * boundary. The copy constants below are carried VERBATIM from
 * des-03-spesifikasi.html §7.4, itself carried from DES-07 §9.3 — real
 * Malay, not placeholder, per the standing company rule.
 */
import type { ReactNode } from 'react';
import { Button } from './controls';

export function EmptyState({
  heading,
  body,
  action,
  size = 'h3',
}: {
  heading: ReactNode;
  body: ReactNode;
  action?: { label: string; onClick?: () => void };
  /** §5.1 shows this block at both the row-scale (h3, 18–19px) and the
   * category-page scale (h2) — the DoD names it once, drawn at two sizes. */
  size?: 'h2' | 'h3';
}) {
  return (
    <div className="s-empty">
      <span className={size === 'h2' ? 's-h2' : 's-h3'}>{heading}</span>
      <p className="s-body" style={{ color: 'var(--fg-muted)', maxWidth: 'none' }}>
        {body}
      </p>
      {action && (
        <Button style={{ marginTop: 4, width: 'fit-content' }} onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

export function ErrorState({
  heading,
  body,
  actions,
}: {
  heading: ReactNode;
  body: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="s-err">
      <span className="s-h3" style={{ color: 'var(--alert)' }}>
        {heading}
      </span>
      <p className="s-meta">{body}</p>
      {actions && <div style={{ display: 'flex', gap: 10, paddingTop: 2 }}>{actions}</div>}
    </div>
  );
}

/** E2 — 404, server-rendered, with search. Copy verbatim, spec §7.4. */
export function NotFoundState({ onSearch }: { onSearch?: () => void }) {
  return (
    <EmptyState
      size="h2"
      heading="Halaman tidak dijumpai."
      body="Pautan ini sudah tiada. Cari apa yang anda perlukan, atau pilih kategori di bawah."
      action={{ label: 'Cari mas kahwin, hantaran, dewan…', onClick: onSearch }}
    />
  );
}

/** K3/K-e — a FULLY empty category: nothing published under it at all. Copy
 * verbatim, spec §7.2 C.
 *
 * CORRECTED 02 Sept 2026 (COPY-01). This comment used to say the copy was
 * "replacing production's undatable 'akan datang tidak lama lagi'", carrying
 * DES-03 §7.2 C's claim that the replacement had already happened. It had not:
 * the line was still live on four empty clusters when COPY-01 measured
 * production on 02 Sept 2026, after DES-08. DES-03 §7.2 C has been corrected
 * at source.
 *
 * ⚠ NOT the empty-cluster state. An empty SECTION inside a POPULATED pillar is
 * DES-07 K4, and it lives in `src/components/inspire/pillar-body.tsx`. Do not
 * substitute this component there: it says the category is empty and points the
 * reader at a different category, which is false and unhelpful on a pillar that
 * holds published articles. */
export function EmptyCategoryState({ onSearch }: { onSearch?: () => void }) {
  return (
    <EmptyState
      size="h3"
      heading="Kategori ini masih kosong."
      body="Cari apa yang anda perlukan, atau pilih kategori lain di bawah."
      action={{ label: 'Cari mas kahwin, hantaran, dewan…', onClick: onSearch }}
    />
  );
}

/** E4 — page-level fetch failure. Copy verbatim, spec §7.4. */
export function PageErrorState({ onRetry, onHome }: { onRetry?: () => void; onHome?: () => void }) {
  return (
    <ErrorState
      heading="Ada masalah teknikal."
      body="Kami tidak dapat memaparkan halaman ini."
      actions={
        <>
          <Button variant="solid" onClick={onRetry}>
            Cuba semula
          </Button>
          <Button onClick={onHome}>Laman utama</Button>
        </>
      }
    />
  );
}

/** E5 — reader goes offline. Copy verbatim, spec §7.4. No cached-reading
 * claim — the site ships no service worker. */
export function OfflineState() {
  return (
    <ErrorState
      heading="Anda di luar talian."
      body="Sambung semula internet untuk teruskan membaca."
    />
  );
}
