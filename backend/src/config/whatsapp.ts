/**
 * WhatsApp (WAHA) Configuration
 *
 * WAHA = WhatsApp HTTP API (https://waha.devlike.pro). This project talks to a
 * self-hosted WAHA instance which owns a linked WhatsApp session.
 *
 * WhatsApp is a COMPLEMENTARY channel to email: email remains the primary
 * delivery path, WhatsApp is an additional notification. If WhatsApp is
 * disabled, misconfigured, or fails, email delivery is unaffected.
 */

/** Default WAHA session name used when WAHA_SESSION is not set. */
const DEFAULT_SESSION = 'default';

/** Default base URL of the self-hosted WAHA instance. */
const DEFAULT_BASE_URL = 'https://waha.ngopicode.com';

/** Default lead time (minutes) before payment expiry to send a reminder. */
const DEFAULT_REMINDER_LEAD_MINUTES = 60;

/**
 * Reads a boolean-ish env var, tolerating surrounding whitespace and the
 * common truthy spellings. Env values can arrive with stray whitespace from
 * shells, Docker `-e` flags, or hand-edited files.
 */
function readBooleanFlag(raw: string | undefined): boolean | undefined {
  if (raw === undefined) {
    return undefined;
  }
  const value = raw.trim().toLowerCase();
  if (value === '') {
    return undefined;
  }
  return value === 'true' || value === '1' || value === 'yes' || value === 'on';
}

/**
 * Whether WhatsApp notifications are enabled.
 * Requires WAHA_API_KEY to be present — without credentials nothing is sent.
 */
export function isWhatsappEnabled(): boolean {
  return readBooleanFlag(process.env.WHATSAPP_ENABLED) === true && getWahaApiKey().length > 0;
}

/** Base URL of the WAHA instance, without a trailing slash. */
export function getWahaBaseUrl(): string {
  const raw = (process.env.WAHA_BASE_URL || DEFAULT_BASE_URL).trim();
  return raw.replace(/\/+$/, '');
}

/** WAHA API key (sent as the `X-Api-Key` header). Empty string when unset. */
export function getWahaApiKey(): string {
  return (process.env.WAHA_API_KEY || '').trim();
}

/** WAHA session name that owns the linked WhatsApp number. */
export function getWahaSession(): string {
  const raw = process.env.WAHA_SESSION;
  return raw && raw.trim() ? raw.trim() : DEFAULT_SESSION;
}

/**
 * How long before a Tripay payment expires to send the "unpaid" reminder.
 * Defaults to 60 minutes.
 */
export function getPaymentReminderLeadMinutes(): number {
  const raw = process.env.WHATSAPP_REMINDER_LEAD_MINUTES;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_REMINDER_LEAD_MINUTES;
  }
  return parsed;
}

/**
 * Whether the periodic unpaid-order reminder loop runs.
 *
 * Separate from WHATSAPP_ENABLED so an operator running multiple processes can
 * keep notifications on everywhere while running the reminder scan in only one.
 */
export function isWhatsappReminderEnabled(): boolean {
  return readBooleanFlag(process.env.WHATSAPP_REMINDER_ENABLED) !== false;
}

/**
 * How often the reminder scanner runs, in minutes. Defaults to 15.
 *
 * A plain interval is used instead of Vendure's `DefaultSchedulerPlugin`
 * because that plugin registers cron jobs in a process-global registry, which
 * collides when the server and worker are bootstrapped in the same process
 * (the deployment model this project uses).
 */
export function getPaymentReminderIntervalMinutes(): number {
  const raw = process.env.WHATSAPP_REMINDER_INTERVAL_MINUTES;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 15;
  }
  return parsed;
}

/** Storefront base URL used to build customer-facing links. */
export function getStorefrontUrl(): string {
  return (process.env.STOREFRONT_URL || 'http://localhost:3001').replace(/\/+$/, '');
}
