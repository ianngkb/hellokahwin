/**
 * Typography primitives — DES-05, spec §2 (the scale) and §9 (heading
 * hierarchy). Every element here consumes a semantic font-size token
 * (`--fs-*`) from tokens.css; none sets a raw px value.
 *
 * Heading LEVEL is a caller decision, never hardcoded in the component —
 * §9.1 assigns a different h-level to the same visual style depending on
 * the page: a list-row title is `<h2>` inside a catalogue (whose own h1 is
 * the category) but MUST be `<h3>` on the homepage, whose h1 is the hero
 * article, or the page carries two h2 levels with no h1 between them. See
 * `Heading` below and its use in content.tsx.
 */
import type { ElementType, ReactNode } from 'react';

/** The masthead wordmark. opsz 6 — see components.css `.s-wm`. Never opsz 11. */
export function Wordmark({ children = 'HelloKahwin' }: { children?: ReactNode }) {
  return <span className="s-wm">{children}</span>;
}

/** Category eyebrow / section label / Rekod field name. NEVER a heading
 * element per spec §9.1 — metadata about the page, not its structure. */
export function Label({
  children,
  accent = false,
  muted = false,
  className = '',
}: {
  children: ReactNode;
  accent?: boolean;
  muted?: boolean;
  className?: string;
}) {
  const color = accent ? 'var(--accent)' : muted ? 'var(--fg-muted)' : undefined;
  return (
    <span className={`s-label ${className}`} style={color ? { color } : undefined}>
      {children}
    </span>
  );
}

/** Article / Category / 404 h1. opsz 11 PINNED — never the wordmark's opsz 6. */
export function H1({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <h1 className="s-h1" style={style}>
      {children}
    </h1>
  );
}

type HeadingLevel = 'h2' | 'h3';

/** A named article section, or (per §9.1) a list-row/card title whose level
 * depends on the page it sits inside. `as` picks the real element; the
 * visual style tracks the SIZE role (`.s-h2` big / `.t` list-row) not the
 * element, exactly as §9.1 asks. */
export function Heading({
  as: Tag,
  variant = 'section',
  children,
  className = '',
}: {
  as: HeadingLevel;
  /** 'section' sizes to the h-level (h2→.s-h2, h3→.s-h3): named article
   * sections. 'row' is the `.t` list-row style. 'card' is the fixed `.s-h3`
   * card-title size regardless of h-level — spec §5.2 draws a catalogue
   * card as `<h2 class="s-h3">`: semantic level and visual size are
   * independent variables here on purpose. */
  variant?: 'section' | 'row' | 'card';
  children: ReactNode;
  className?: string;
}) {
  const cls =
    variant === 'row' ? 't' : variant === 'card' ? 's-h3' : Tag === 'h2' ? 's-h2' : 's-h3';
  return <Tag className={`${cls} ${className}`.trim()}>{children}</Tag>;
}

/** Sub-point inside a section. Never a styling shortcut for a bold lead. */
export function H3({ children }: { children: ReactNode }) {
  return <h3 className="s-h3">{children}</h3>;
}

export function Deck({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <p className="s-deck" style={style}>
      {children}
    </p>
  );
}

export function Body({ children, as: Tag = 'p' }: { children: ReactNode; as?: ElementType }) {
  return <Tag className="s-body">{children}</Tag>;
}

export function Meta({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <span className="s-meta" style={style}>
      {children}
    </span>
  );
}

export function Dim({ children }: { children: ReactNode }) {
  return <span className="s-dim">{children}</span>;
}

/** Photo credit — the only place `--accent` colours a caption, per spec §1.2. */
export function Credit({ children }: { children: ReactNode }) {
  return <span className="s-cred">{children}</span>;
}
