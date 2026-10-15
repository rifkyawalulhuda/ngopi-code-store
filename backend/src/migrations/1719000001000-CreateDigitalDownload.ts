import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the digital_download table for tracking customer download access
 * to purchased digital products.
 *
 * Indexes:
 * - orderId: For querying all downloads for a specific order
 * - downloadToken (unique): For fast token-based lookups during download requests
 *
 * Constraints:
 * - currentDownloads <= maxDownloads (database-level enforcement)
 * - maxDownloads >= 1 (see the note below on the upper bound)
 *
 * NOTE on the maxDownloads upper bound: the original 1..10 range assumed every
 * product capped downloads at 10. The Admin uploader (`uploadDigitalProduct`)
 * deliberately stores 999 as an "unlimited" sentinel, and `OrderFulfillmentRunner`
 * copies that value into each download record. A `<= 10` CHECK therefore made
 * fulfillment fail with a constraint violation on every dashboard-uploaded
 * product. The bound is now 1000 to permit that sentinel while still catching
 * nonsense values.
 *
 * Idempotent: table uses IF NOT EXISTS and each index is created only when the
 * column is not already indexed, so running after a `synchronize`-created schema
 * does not create duplicates.
 *
 * @see Requirements 4.2 - Generate unique UUID v4 download token, initial count 0, active true
 * @see Requirements 4.3 - Set expiry to current time + downloadExpiryHours (default 72, range 1-168)
 * @see Requirements 4.4 - Set maxDownloads from DigitalProduct config (default 5, range 1-10)
 */
export class CreateDigitalDownload1719000001000 implements MigrationInterface {
  name = 'CreateDigitalDownload1719000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "digital_download" (
        "id" SERIAL NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "orderId" integer NOT NULL,
        "customerId" integer NOT NULL,
        "productVariantId" integer NOT NULL,
        "downloadToken" character varying(36) NOT NULL,
        "maxDownloads" integer NOT NULL DEFAULT 5,
        "currentDownloads" integer NOT NULL DEFAULT 0,
        "expiresAt" TIMESTAMP NOT NULL,
        "lastDownloadedAt" TIMESTAMP,
        "isActive" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_digital_download_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_digital_download_downloadToken" UNIQUE ("downloadToken"),
        CONSTRAINT "CHK_digital_download_count" CHECK ("currentDownloads" <= "maxDownloads"),
        CONSTRAINT "CHK_digital_download_max_range" CHECK ("maxDownloads" >= 1 AND "maxDownloads" <= 1000)
      )
    `);

    // Index on orderId for querying downloads by order
    await this.ensureIndex(queryRunner, 'IDX_digital_download_orderId', 'orderId');

    // Index on downloadToken for fast token lookups
    await this.ensureIndex(queryRunner, 'IDX_digital_download_downloadToken', 'downloadToken');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_digital_download_downloadToken"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_digital_download_orderId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "digital_download"`);
  }

  /** Creates the index only if no index already covers the given column. */
  private async ensureIndex(
    queryRunner: QueryRunner,
    indexName: string,
    column: string,
  ): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE tablename = 'digital_download'
            AND indexdef LIKE '%("${column}")%'
        ) THEN
          CREATE INDEX "${indexName}" ON "digital_download" ("${column}");
        END IF;
      END $$;
    `);
  }
}
