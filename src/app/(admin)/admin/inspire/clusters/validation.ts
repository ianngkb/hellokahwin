import { z } from 'zod/v4';

/** Series-box description cap (spec: plain text, at most 600 characters). */
export const SERIES_DESCRIPTION_MAX = 600;
export const ENTITY_PHRASE_MAX = 120;
export const PILLAR_INTRO_MAX = 5_000;

/**
 * Optional plain-text field: trimmed, and an empty value stored as NULL so the
 * public page's "is there a description?" check is a simple null test.
 * Line breaks are folded to spaces for single-line fields.
 */
function optionalText(max: number, label: string, singleLine: boolean) {
  return z
    .string()
    .transform((v) => (singleLine ? v.replace(/\s+/g, ' ') : v.replace(/\r\n/g, '\n')).trim())
    .pipe(z.string().max(max, `${label} must be ${max} characters or fewer`))
    .transform((v) => (v.length > 0 ? v : null));
}

export const clusterSettingsSchema = z.object({
  id: z.string().uuid('Unknown pillar or cluster'),
  entityPhrase: optionalText(ENTITY_PHRASE_MAX, 'Linking phrase', true),
  intro: optionalText(PILLAR_INTRO_MAX, 'Pillar intro', false),
  seriesDescription: optionalText(SERIES_DESCRIPTION_MAX, 'Series description', true),
  seriesEnabled: z.boolean(),
});

export const clusterCreateSchema = z.object({
  pillarId: z.string().uuid('Choose a pillar to add the cluster under.'),
  name: z
    .string()
    .trim()
    .min(1, 'Cluster name is required')
    .max(ENTITY_PHRASE_MAX, `Cluster name must be ${ENTITY_PHRASE_MAX} characters or fewer`),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(120, 'Web address is too long')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Web address can use only letters, numbers and dashes')
    .optional(),
  entityPhrase: optionalText(ENTITY_PHRASE_MAX, 'Linking phrase', true),
});
