/**
 * Indonesian phone-number helpers for the checkout form.
 *
 * Mirrors the backend rules in `backend/src/plugins/whatsapp/utils/phone.ts` so
 * anything the storefront accepts is also deliverable over WhatsApp. A number
 * accepted here but rejected there would silently lose the customer's
 * WhatsApp confirmation.
 */

/** Indonesian country calling code. */
export const ID_COUNTRY_CODE = '62'

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
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null

  // Drop everything that is not a digit (spaces, dashes, parentheses, "+").
  const digits = String(input).replace(/\D/g, '')
  if (!digits) return null

  let national: string

  if (digits.startsWith(ID_COUNTRY_CODE)) {
    national = digits
  } else if (digits.startsWith('0')) {
    national = ID_COUNTRY_CODE + digits.slice(1)
  } else if (digits.startsWith('8')) {
    national = ID_COUNTRY_CODE + digits
  } else {
    // e.g. a landline, a short code, or a foreign number.
    return null
  }

  // Indonesian mobile numbers: 62 + 8 + 7..12 more digits.
  if (!/^628\d{7,12}$/.test(national)) return null

  return national
}

/** True when the input is a plausible Indonesian mobile number. */
export function isValidPhone(input: string | null | undefined): boolean {
  return normalizePhone(input) !== null
}

/**
 * Validation message for a checkout phone field.
 *
 * @param required - When true, an empty value is an error (guest checkout
 *   requires a number for delivery). When false an empty value is allowed, so a
 *   logged-in customer can leave the field blank until a method needs it.
 */
export function phoneFieldError(
  input: string | null | undefined,
  options: { required?: boolean } = {},
): string | null {
  const value = (input ?? '').trim()

  if (!value) {
    return options.required ? 'Nomor WhatsApp wajib diisi' : null
  }

  return isValidPhone(value) ? null : 'Nomor WhatsApp tidak valid (contoh: 081234567890)'
}
