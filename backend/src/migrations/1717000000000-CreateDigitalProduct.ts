import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the digital_product table for storing digital product file metadata.
 * This entity links product variants to their downloadable files stored in MinIO.
 *
 * @see Requirements 3.2 - DigitalProduct record with file metadata and download configuration
 */
export class CreateDigitalProduct1717000000000 implements MigrationInterface {
  name = 'CreateDigitalProduct1717000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "digital_product" (
        "id" SERIAL NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "productVariantId" integer NOT NULL,
        "fileName" character varying NOT NULL,
        "originalFileName" character varying NOT NULL,
        "fileSize" bigint NOT NULL,
        "mimeType" character varying NOT NULL,
        "bucket" character varying NOT NULL,
        "objectKey" character varying NOT NULL,
        "maxDownloadsPerOrder" integer NOT NULL DEFAULT 5,
        "downloadExpiryHours" integer NOT NULL DEFAULT 72,
        CONSTRAINT "PK_digital_product_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_digital_product_fileName_bucket" UNIQUE ("fileName", "bucket")
      )
    `);

    // Add foreign key to product_variant
    await queryRunner.query(`
      ALTER TABLE "digital_product"
        ADD CONSTRAINT "FK_digital_product_productVariantId"
        FOREIGN KEY ("productVariantId")
        REFERENCES "product_variant"("id")
        ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // Add index on productVariantId for efficient lookups
    await queryRunner.query(`
      CREATE INDEX "IDX_digital_product_productVariantId"
        ON "digital_product" ("productVariantId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_digital_product_productVariantId"`);
    await queryRunner.query(`ALTER TABLE "digital_product" DROP CONSTRAINT "FK_digital_product_productVariantId"`);
    await queryRunner.query(`DROP TABLE "digital_product"`);
  }
}
