/**
 * Lightweight accessor for smart crop URLs — no heavy dependencies (sharp, AWS SDK).
 * Import this instead of smart-crop.ts when you only need to read crop URLs.
 */

export type SmartCrops = Record<string, { url: string; width: number; height: number }>;

/** Safely extract a smart crop URL from unknown JSONB data */
export function getSmartCropUrl(crops: unknown, targetName: string): string | null {
  if (!crops || typeof crops !== 'object') return null;
  const record = crops as Record<string, unknown>;
  const entry = record[targetName];
  if (!entry || typeof entry !== 'object') return null;
  const { url } = entry as { url?: unknown };
  return typeof url === 'string' ? url : null;
}
