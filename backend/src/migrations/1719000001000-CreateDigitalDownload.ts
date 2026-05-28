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
 * - maxDownloads between 1 and 10
 *
 * @see Requirements 4.2 - Generate unique UUID v4 download token, initial count 0, active true
 * @see Requirements 4.3 - Set expiry to current time + downloadExpiryHours (default 72, range 1-168)
 * @see Requirements 4.4 - Set maxDownloads from DigitalProduct config (default 5, range 1-10)
 */
export class CreateDigitalDownload1719000001000 implements MigrationInterface {
  name = 'CreateDigitalDownload1719000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "digital_download" (
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
        CONSTRAINT "CHK_digital_download_max_range" CHECK ("maxDownloads" >= 1 AND "maxDownloads" <= 10)
      )
    `);

    // Index on orderId for querying downloads by order
    await queryRunner.query(`
      CREATE INDEX "IDX_digital_download_orderId"
        ON "digital_download" ("orderId")
    `);

    // Unique index on downloadToken for fast token lookups
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_digital_download_downloadToken"
        ON "digital_download" ("downloadToken")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_digital_download_downloadToken"`);
    await queryRunner.query(`DROP INDEX "IDX_digital_download_orderId"`);
    await queryRunner.query(`DROP TABLE "digital_download"`);
  }
}
