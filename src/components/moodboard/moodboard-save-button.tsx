/**
 * No-op stub. twn-new's moodboard (save-to-board) feature is not part of
 * HelloKahwin — no accounts, no saved photos (spec: no save icons that go
 * nowhere). The article renderer's call sites are kept intact so the renderer
 * stays close to the twn-new original; this component simply renders nothing.
 */
export function MoodboardSaveButton(_props: Record<string, unknown>) {
  return null;
}
