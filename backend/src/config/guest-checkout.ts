/**
 * Guest Checkout Configuration
 *
 * Single kill switch for the guest purchase flow. When enabled:
 * - Customers may place orders without registering an account.
 * - A hidden (verified, password-less) User is created lazily at fulfillment
 *   time so digital downloads can be owned and delivered.
 * - Magic order-access links may be issued and exchanged for a session.
 *
 * When disabled:
 * - New guest checkouts are rejected.
 * - New magic links are NOT issued.
 * - Existing orders remain retrievable (recovery is never cut off).
 */

const DEFAULT_LINK_TTL_HOURS = 72;

/**
 * Whether guest checkout is currently enabled.
 * Defaults to enabled unless explicitly turned off.
 *
 * Values are trimmed and lower-cased so stray whitespace (shells, Docker `-e`,
 * hand-edited files) cannot silently flip the flag.
 */
export function isGuestCheckoutEnabled(): boolean {
  const raw = process.env.GUEST_CHECKOUT_ENABLED;
  if (raw === undefined) {
    return true;
  }
  const value = raw.trim().toLowerCase();
  if (value === '') {
    return true;
  }
  return !(value === 'false' || value === '0' || value === 'no' || value === 'off');
}

/**
 * Lifetime of a magic order-access link, in hours.
 *
 * Defaults to 72h to match the digital download window
 * (DigitalProduct.downloadExpiryHours), so a guest never loses access to a
 * purchase they are still entitled to. Links are re-requestable at any time.
 */
export function getOrderAccessLinkTtlHours(): number {
  const raw = process.env.GUEST_LINK_TTL_HOURS;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_LINK_TTL_HOURS;
  }
  return parsed;
}
