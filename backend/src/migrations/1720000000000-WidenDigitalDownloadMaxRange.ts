import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Widens the `maxDownloads` CHECK constraint on `digital_download`.
 *
 * Why: `CreateDigitalDownload` originally declared
 * `CHECK (maxDownloads >= 1 AND maxDownloads <= 10)`. But the Admin uploader
 * (`uploadDigitalProduct`) intentionally stores **999** on `digital_product` as
 * an "unlimited" sentinel, and `OrderFulfillmentRunner` copies that value into
 * every `digital_download` row it creates.
 *
 * Result on any database created via migrations: fulfillment hit
 *
 *     new row for relation "digital_download" violates check constraint
 *     "CHK_digital_download_max_range"
 *
 * so a paid order ended up `Fulfilled` with **zero** download records and the
 * customer's magic link opened an empty download page.
 *
 * This went unnoticed locally because development uses `synchronize`, which
 * derives constraints from entity decorators and therefore never created the
 * CHECK constraint at all.
 *
 * This migration is idempotent: it drops the constraint if present and re-adds
 * it with the corrected bound.
 */
export class WidenDigitalDownloadMaxRange1720000000000 implements MigrationInterface {
  name = 'WidenDigitalDownloadMaxRange1720000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "digital_download" DROP CONSTRAINT IF EXISTS "CHK_digital_download_max_range"`,
    );

    // Only add when the table exists and the corrected constraint is absent.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'digital_download'
        ) AND NOT EXISTS (
          SELECT 1 FROM pg_constraint c
          JOIN pg_class t ON t.oid = c.conrelid
          WHERE t.relname = 'digital_download'
            AND c.conname = 'CHK_digital_download_max_range'
        ) THEN
          ALTER TABLE "digital_download"
            ADD CONSTRAINT "CHK_digital_download_max_range"
            CHECK ("maxDownloads" >= 1 AND "maxDownloads" <= 1000);
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "digital_download" DROP CONSTRAINT IF EXISTS "CHK_digital_download_max_range"`,
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'digital_download'
        ) AND NOT EXISTS (
          SELECT 1 FROM pg_constraint c
          JOIN pg_class t ON t.oid = c.conrelid
          WHERE t.relname = 'digital_download'
            AND c.conname = 'CHK_digital_download_max_range'
        ) THEN
          ALTER TABLE "digital_download"
            ADD CONSTRAINT "CHK_digital_download_max_range"
            CHECK ("maxDownloads" >= 1 AND "maxDownloads" <= 10);
        END IF;
      END $$;
    `);
  }
}
