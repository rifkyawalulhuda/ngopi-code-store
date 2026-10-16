/**
 * Checkout invariants.
 *
 * The buy page displays a price derived from the selected variant, while the
 * amount actually charged comes from the Vendure order. These helpers keep the
 * two in agreement — the mismatch that let a customer be charged more than the
 * page showed.
 */

/**
 * True when the order total the server will charge matches the price the page
 * displayed.
 *
 * A mismatch means the customer would pay something other than what they were
 * shown, so checkout must abort rather than proceed.
 *
 * Returns true when either value is missing, so an absent field cannot block a
 * legitimate purchase — the guard only fires on a genuine, comparable mismatch.
 */
export function isOrderTotalConsistent(
  displayedPrice: number | null | undefined,
  orderTotal: number | null | undefined,
): boolean {
  if (displayedPrice == null || orderTotal == null) return true
  if (!Number.isFinite(Number(displayedPrice)) || !Number.isFinite(Number(orderTotal))) return true
  return Number(orderTotal) === Number(displayedPrice)
}
