import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the `originalPrice` custom field to product variants.
 *
 * Used as a compare-at price: when it is higher than the variant's actual
 * price, the storefront renders a strikethrough price plus a discount badge.
 * Stored as a whole Rupiah integer because IDR is a zero-decimal currency
 * (see IdrMoneyStrategy, precision = 0).
 */
export class AddOriginalPriceToProductVariant1720100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product_variant" ADD COLUMN IF NOT EXISTS "customFieldsOriginalprice" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product_variant" DROP COLUMN IF EXISTS "customFieldsOriginalprice"`,
    );
  }
}
