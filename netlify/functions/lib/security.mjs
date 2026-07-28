import { createHash, timingSafeEqual } from 'node:crypto';

export function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

export function secureEqualHash(value, expectedHash) {
  if (!value || !expectedHash) return false;
  const actual = Buffer.from(sha256(value), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function rejectCrossSite(request) {
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite === 'cross-site') return true;

  const origin = request.headers.get('origin');
  if (!origin) return false;
  const configured = process.env.PUBLIC_SITE_URL || process.env.URL;
  if (!configured) return false;
  try {
    return new URL(origin).origin !== new URL(configured).origin;
  } catch (_) {
    return true;
  }
}
