import * as crypto from 'crypto';

/**
 * Verifies a Tripay webhook signature using HMAC SHA256 with constant-time comparison.
 *
 * @param payload - The raw JSON-encoded request body string
 * @param signature - The hex-encoded signature from the webhook header
 * @param privateKey - The Tripay merchant private key
 * @returns true if the signature is valid, false otherwise
 *
 * @see Requirements 11.1 - Compute HMAC SHA256 of JSON-encoded request body using private key, hex-encoded
 * @see Requirements 11.2 - Use constant-time comparison to prevent timing attacks
 */
export function verifyTripaySignature(
  payload: string,
  signature: string,
  privateKey: string,
): boolean {
  const computedSignature = crypto
    .createHmac('sha256', privateKey)
    .update(payload)
    .digest('hex');

  // Both must be the same length for timingSafeEqual
  const computedBuffer = Buffer.from(computedSignature, 'hex');
  const signatureBuffer = Buffer.from(signature, 'hex');

  // If lengths differ, the signature is invalid
  if (computedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(computedBuffer, signatureBuffer);
}
