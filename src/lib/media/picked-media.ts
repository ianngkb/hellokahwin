import type { Media } from '@/lib/db/schema/media';

/**
 * The subset of a media row that pick consumers actually read.
 *
 * Venue directory photos live in `listing_images` and have no `media` row, so
 * they cannot supply `r2Key`, `uploadedBy`, `source` or `createdAt` without
 * inventing values. Narrowing the picker contract to the fields consumers read
 * keeps `Media` assignable to it, so existing call sites are unaffected.
 */
export type PickedMedia = Pick<
  Media,
  | 'id'
  | 'url'
  | 'originalUrl'
  | 'filename'
  | 'mimeType'
  | 'fileSize'
  | 'width'
  | 'height'
  | 'alt'
  | 'caption'
  | 'captionUrl'
  | 'variants'
  | 'defaultQuality'
>;

/** Synthetic id prefix for venue photos, so they can never collide with a `media.id`. */
export const VENUE_MEDIA_ID_PREFIX = 'venue:';
