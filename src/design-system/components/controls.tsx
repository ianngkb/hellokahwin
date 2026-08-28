/**
 * Button and Chip — DES-05, spec §8 (.s-btn / .s-chip) and §10.2 (target
 * size: every interactive element ≥44px in its smaller dimension). Both
 * render a real `<button>`, not a styled `<div>` or `<a>`, so they carry
 * native keyboard and screen-reader semantics for free.
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function Button({
  children,
  variant = 'outline',
  className = '',
  ...rest
}: {
  children: ReactNode;
  variant?: 'outline' | 'solid';
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`s-btn ${variant === 'solid' ? 'solid' : ''} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}

/** `aria-pressed` drives BOTH the state and the inverted-fill style (spec
 * §8) — no separate visual-only class, so the control and its appearance
 * cannot fall out of sync. */
export function Chip({
  children,
  pressed = false,
  count,
  className = '',
  ...rest
}: {
  children: ReactNode;
  pressed?: boolean;
  count?: number;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-pressed'>) {
  return (
    <button type="button" className={`s-chip ${className}`.trim()} aria-pressed={pressed} {...rest}>
      {children}
      {count !== undefined && <span className="c">{count}</span>}
    </button>
  );
}
