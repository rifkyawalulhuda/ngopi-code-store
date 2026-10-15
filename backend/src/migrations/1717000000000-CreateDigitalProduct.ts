import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the digital_product table for storing digital product file metadata.
 * This entity links product variants to their downloadable files stored in MinIO.
 *
 * Idempotent: safe to run on a database where the schema was already created by
 * TypeORM `synchronize` (which generates differently-named constraints/indexes).
 * Guards check for the object's purpose (table / FK on column / index on column)
 * rather than by name, so no duplicates are created.
 *
 * @see Requirements 3.2 - DigitalProduct record with file metadata and download configuration
 */
export class CreateDigitalProduct1717000000000 implements MigrationInterface {
  name = 'CreateDigitalProduct1717000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "digital_product" (
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

    // Foreign key to product_variant — only if no FK on this column exists yet.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint c
          JOIN pg_class t ON t.oid = c.conrelid
          WHERE t.relname = 'digital_product'
            AND c.contype = 'f'
            AND pg_get_constraintdef(c.oid) LIKE '%"productVariantId"%'
        ) THEN
          ALTER TABLE "digital_product"
            ADD CONSTRAINT "FK_digital_product_productVariantId"
            FOREIGN KEY ("productVariantId")
            REFERENCES "product_variant"("id")
            ON DELETE NO ACTION ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    // Index on productVariantId — only if the column is not already indexed.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE tablename = 'digital_product'
            AND indexdef LIKE '%("productVariantId")%'
        ) THEN
          CREATE INDEX "IDX_digital_product_productVariantId"
            ON "digital_product" ("productVariantId");
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_digital_product_productVariantId"`);
    await queryRunner.query(
      `ALTER TABLE "digital_product" DROP CONSTRAINT IF EXISTS "FK_digital_product_productVariantId"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "digital_product"`);
  }
}
