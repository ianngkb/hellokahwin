/**
 * Radix primitives (dropdown, select, popover, dialog, sheet, tooltip) portal
 * their content to `document.body` by default — which sits OUTSIDE the console's
 * `.font-ui-sans[data-theme]` wrapper, so portalled popovers escape the console
 * font + monochrome tokens + dark mode and fall back to the public Plum/serif
 * theme.
 *
 * The console shells stamp `id="console-root"` on that wrapper. Passing this as
 * the Radix Portal `container` makes portalled content render INSIDE the scope,
 * inheriting everything automatically. On public pages the element doesn't exist
 * → returns null → Radix falls back to `body` (identical to default behaviour).
 *
 * Positioning is unaffected: Radix popovers/overlays position themselves with
 * `strategy: 'fixed'` (@radix-ui/react-popper), and the console wrapper sets no
 * `transform`/`filter`/`contain`, so it never becomes a containing block for
 * them or a competing stacking context.
 *
 * ⚠️ The VENDOR shell does set `overflow-hidden` on `#console-root` — it is a
 * bounded app shell whose `<main>` is the scroll container (see
 * `(vendor)/layout.tsx`). Fixed-positioned Radix content is unaffected, but
 * anything portalled here that relies on `position: absolute` WILL be clipped.
 */
export function getConsolePortalContainer(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.getElementById('console-root');
}
