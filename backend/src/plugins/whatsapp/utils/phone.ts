/**
 * Indonesian phone-number helpers for WhatsApp delivery.
 *
 * Customers enter numbers in many shapes ("0812-3456-7890", "+62 812...",
 * "62812...", "812..."). WAHA requires a WhatsApp chat ID of the form
 * `<countrycode><number>@c.us`, so everything must be normalised to
 * `62xxxxxxxxxx@c.us` before sending.
 */

/** WhatsApp individual-chat suffix. */
export const WA_CHAT_SUFFIX = '@c.us';

/** Indonesian country calling code. */
export const ID_COUNTRY_CODE = '62';

/**
 * Normalises an Indonesian phone number to its canonical national form
 * (country code + subscriber number, digits only, no `+`).
 *
 * Accepted inputs (all resolve to `6281234567890`):
 *   `081234567890`, `+6281234567890`, `6281234567890`, `81234567890`,
 *   `0812-3456-7890`, ` 0812 3456 7890 `
 *
 * @returns the normalised digits, or `null` when the input is not a plausible
 *   Indonesian mobile number.
 */
export function normalizeIndonesianPhone(input: string | null | undefined): string | null {
  if (!input) {
    return null;
  }

  // Drop everything that is not a digit (spaces, dashes, parentheses, "+").
  const digits = String(input).replace(/\D/g, '');
  if (!digits) {
    return null;
  }

  let national: string;

  if (digits.startsWith(ID_COUNTRY_CODE)) {
    national = digits;
  } else if (digits.startsWith('0')) {
    national = ID_COUNTRY_CODE + digits.slice(1);
  } else if (digits.startsWith('8')) {
    national = ID_COUNTRY_CODE + digits;
  } else {
    // e.g. a landline, a short code, or a foreign number.
    return null;
  }

  // Indonesian mobile numbers: 62 + 8 + 7..12 more digits.
  if (!/^628\d{7,12}$/.test(national)) {
    return null;
  }

  return national;
}

/**
 * Converts an Indonesian phone number into a WAHA chat ID.
 * @returns `628xxxxxxxxx@c.us`, or `null` when the number is not valid.
 */
export function toWhatsappChatId(input: string | null | undefined): string | null {
  const national = normalizeIndonesianPhone(input);
  return national ? `${national}${WA_CHAT_SUFFIX}` : null;
}

/** True when the input is a plausible Indonesian mobile number. */
export function isValidIndonesianPhone(input: string | null | undefined): boolean {
  return normalizeIndonesianPhone(input) !== null;
}

/**
 * Formats a normalised number for display, e.g. `6281234567890` → `+62 812-3456-7890`.
 * Best-effort: returns the input unchanged when it cannot be normalised.
 */
export function formatIndonesianPhone(input: string | null | undefined): string {
  const national = normalizeIndonesianPhone(input);
  if (!national) {
    return String(input ?? '');
  }
  const subscriber = national.slice(2); // drop "62"
  const grouped = subscriber.replace(/^(\d{3})(\d{4})(\d+)$/, '$1-$2-$3');
  return `+62 ${grouped}`;
}
