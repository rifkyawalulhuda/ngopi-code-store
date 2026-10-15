import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Corrects the store currency to IDR.
 *
 * Background: this project is IDR-only by design —
 *  - `IdrMoneyStrategy` stores amounts with `precision = 0`, so "Rp 149.000" is
 *    persisted as the integer 149000 (no minor units);
 *  - the storefront's `formatPriceIDR()` prints the stored integer verbatim;
 *  - `scripts/seed-products.js` seeds Rupiah amounts (149000, 199000, …).
 *
 * However the default channel was left on the Vendure default `USD`, and the
 * seeded `product_variant_price` rows were therefore tagged `USD` while holding
 * Rupiah amounts. Consequences:
 *  - every price was mislabelled in the Admin UI / API;
 *  - the storefront showed "USD"-based formatting assumptions;
 *  - Tripay charges the raw integer, so amounts happened to look right, hiding
 *    the inconsistency.
 *
 * This migration relabels channel + variant prices to IDR. It changes only the
 * currency code, never the numeric amount, so no price is altered.
 *
 * `down` is intentionally a no-op: reverting would re-introduce the
 * mislabelling, and a USD→IDR→USD round trip could not distinguish rows that
 * were legitimately IDR from the outset.
 */
export class FixStoreCurrencyToIdr1719900000000 implements MigrationInterface {
  name = 'FixStoreCurrencyToIdr1719900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Default channel: make IDR the default and the only available currency.
    //    Idempotent — a channel already on IDR is left untouched.
    await queryRunner.query(`
      UPDATE "channel"
      SET "defaultCurrencyCode" = 'IDR',
          "availableCurrencyCodes" = 'IDR',
          "updatedAt" = NOW()
      WHERE "defaultCurrencyCode" IS DISTINCT FROM 'IDR'
         OR "availableCurrencyCodes" IS DISTINCT FROM 'IDR'
    `);

    // 2. Variant prices: relabel USD-tagged rows as IDR (amounts unchanged).
    await queryRunner.query(`
      UPDATE "product_variant_price"
      SET "currencyCode" = 'IDR',
          "updatedAt" = NOW()
      WHERE "currencyCode" = 'USD'
    `);
  }

  public async down(): Promise<void> {
    // Intentionally irreversible — see the class doc comment.
  }
}
