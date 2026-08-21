import { RekognitionClient } from '@aws-sdk/client-rekognition';

let _client: RekognitionClient | null = null;

/**
 * Feature switch for live AWS Rekognition calls. Defaults to ENABLED; set the
 * env var `REKOGNITION_ENABLED=false` to turn off all detection. When off, the
 * detect* helpers short-circuit to empty results and every consumer degrades
 * gracefully — smart crops fall back to the (AWS-free) saliency focal point,
 * and moodboard / feature-extraction jobs complete with no labels instead of
 * erroring. Used to disable the feature in prod while the Rekognition IAM key
 * is invalid (2026-07-14) without needing a key rotation; flip back to enabled
 * once a valid `AWS_REKOGNITION_*` key is in place.
 */
export function isRekognitionEnabled(): boolean {
  const v = process.env.REKOGNITION_ENABLED?.trim().toLowerCase();
  return v !== 'false' && v !== '0' && v !== 'off' && v !== 'no';
}

export function getRekognitionClient(): RekognitionClient {
  if (!_client) {
    const region = process.env.AWS_REKOGNITION_REGION;
    const accessKeyId = process.env.AWS_REKOGNITION_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_REKOGNITION_SECRET_ACCESS_KEY;

    if (!region) throw new Error('AWS_REKOGNITION_REGION env var is not set');
    if (!accessKeyId) throw new Error('AWS_REKOGNITION_ACCESS_KEY_ID env var is not set');
    if (!secretAccessKey) throw new Error('AWS_REKOGNITION_SECRET_ACCESS_KEY env var is not set');

    _client = new RekognitionClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return _client;
}
