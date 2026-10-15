import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the order_access_token table backing guest magic links.
 *
 * Stores only the SHA-256 hash of each token; the raw token exists solely in
 * the emailed link. Single-use (`consumedAt`) and time-boxed (`expiresAt`).
 *
 * Idempotent: table uses IF NOT EXISTS and each index is created only when the
 * column is not already indexed, so running after a `synchronize`-created schema
 * does not create duplicates.
 */
export class CreateOrderAccessToken1719600000000 implements MigrationInterface {
  name = 'CreateOrderAccessToken1719600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "order_access_token" (
        "id" SERIAL NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "tokenHash" character varying(64) NOT NULL,
        "orderId" integer NOT NULL,
        "customerId" integer NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "consumedAt" TIMESTAMP,
        CONSTRAINT "PK_order_access_token_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_order_access_token_tokenHash" UNIQUE ("tokenHash")
      )
    `);

    await this.ensureIndex(queryRunner, 'IDX_order_access_token_orderId', 'orderId');
    await this.ensureIndex(queryRunner, 'IDX_order_access_token_customerId', 'customerId');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_order_access_token_customerId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_order_access_token_orderId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "order_access_token"`);
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
          WHERE tablename = 'order_access_token'
            AND indexdef LIKE '%("${column}")%'
        ) THEN
          CREATE INDEX "${indexName}" ON "order_access_token" ("${column}");
        END IF;
      END $$;
    `);
  }
}
