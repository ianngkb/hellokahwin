/**
 * No-op analytics seam. twn-new tracked gallery/article interactions into its
 * analytics pipeline; HelloKahwin has no analytics backend yet. Call sites are
 * kept so wiring a provider (e.g. Plausible/GA) later is a one-file change.
 */
export function track(_event: string, _props?: Record<string, unknown>): void {
  // intentionally empty
}
