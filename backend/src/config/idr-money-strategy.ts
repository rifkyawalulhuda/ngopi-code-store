import { DefaultMoneyStrategy } from '@vendure/core';

/**
 * Money strategy for Indonesian Rupiah (IDR).
 *
 * IDR is a zero-decimal currency: there are no "cents". A price of Rp 150.000
 * is stored as the integer 150000 (not 15000000).
 *
 * By setting `precision = 0`, the Admin UI and APIs treat the stored integer
 * as the actual Rupiah amount, so admins enter "150000" for Rp 150.000 instead
 * of multiplying by 100.
 *
 * @see https://docs.vendure.io/guides/how-to/custom-money-strategy/
 */
export class IdrMoneyStrategy extends DefaultMoneyStrategy {
  readonly precision = 0;
}
