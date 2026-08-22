'use client';

import { useRef, useState } from 'react';
import { MoonIcon, SunIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';

const COOKIE = 'console-theme';

/**
 * Light/dark toggle for the admin console.
 *
 * Flips `data-theme` on the nearest `.font-ui-sans` shell wrapper — the scoped
 * Monochrome Precision token root — and persists the choice to a cookie so the
 * SERVER can set the correct attribute on the next render. That is what stops
 * the flash: `initialTheme` is the SSR-resolved value from the same cookie, so
 * both the attribute and this icon are already correct on first paint, with no
 * client-side correction after hydration.
 *
 * Scoped to the console. It never touches `<html>`, so the public site cannot
 * inherit a dark theme from an admin's preference.
 */
export function ConsoleThemeToggle({
  initialTheme = 'light',
  className,
}: {
  initialTheme?: 'light' | 'dark';
  className?: string;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(initialTheme);

  // `initialTheme` is a prop, but it is not immutable: it is the cookie value
  // resolved on the server, and the cookie is shared by every tab. Flip the
  // theme in one tab and the next server render this tab does — a navigation, a
  // `router.refresh()` — arrives with the new value while this component keeps
  // its mount, leaving the icon and the aria-label describing the opposite of
  // what the shell is actually showing.
  //
  // Adopted DURING RENDER rather than in an effect — the pattern React
  // documents for deriving state from a changed prop, and the one
  // `articles-table.tsx` already uses for its search box. An effect would paint
  // the stale icon first and correct it a frame later; this re-renders before
  // anything reaches the screen. The inequality guard is what terminates it.
  const [syncedTheme, setSyncedTheme] = useState<'light' | 'dark'>(initialTheme);
  if (initialTheme !== syncedTheme) {
    setSyncedTheme(initialTheme);
    setTheme(initialTheme);
  }

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    const root = btnRef.current?.closest('.font-ui-sans');
    root?.setAttribute('data-theme', next);
    document.cookie = `${COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    setTheme(next);
  }

  return (
    <Button
      ref={btnRef}
      type="button"
      variant="ghost"
      size="icon-sm"
      className={className}
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
    </Button>
  );
}
