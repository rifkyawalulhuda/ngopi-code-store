import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the tripay_transaction table for storing payment transaction records.
 *
 * Indexes:
 * - orderId: for looking up transactions by order
 * - merchantRef (unique): for webhook lookups by Vendure order code
 * - tripayReference: for lookups by Tripay-assigned reference
 *
 * Idempotent: table uses IF NOT EXISTS and each index is created only when the
 * column is not already indexed, so running after a `synchronize`-created schema
 * (with differently-named indexes) does not create duplicates.
 *
 * @see Requirements 1.2
 */
export class CreateTripayTransaction1719000000000 implements MigrationInterface {
  name = 'CreateTripayTransaction1719000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tripay_transaction" (
        "id" SERIAL NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "orderId" integer NOT NULL,
        "merchantRef" character varying NOT NULL,
        "tripayReference" character varying,
        "paymentMethod" character varying NOT NULL,
        "amount" integer NOT NULL,
        "feeMerchant" integer NOT NULL DEFAULT 0,
        "feeCustomer" integer NOT NULL DEFAULT 0,
        "status" character varying NOT NULL DEFAULT 'UNPAID',
        "paymentUrl" character varying,
        "expiredAt" TIMESTAMP,
        "paidAt" TIMESTAMP,
        CONSTRAINT "PK_tripay_transaction_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tripay_transaction_merchantRef" UNIQUE ("merchantRef")
      )
    `);

    await this.ensureIndex(queryRunner, 'IDX_tripay_transaction_orderId', 'orderId', false);
    await this.ensureIndex(
      queryRunner,
      'IDX_tripay_transaction_merchantRef',
      'merchantRef',
      true,
    );
    await this.ensureIndex(
      queryRunner,
      'IDX_tripay_transaction_tripayReference',
      'tripayReference',
      false,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tripay_transaction_tripayReference"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tripay_transaction_merchantRef"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tripay_transaction_orderId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tripay_transaction"`);
  }

  /** Creates the index only if no index already covers the given column. */
  private async ensureIndex(
    queryRunner: QueryRunner,
    indexName: string,
    column: string,
    unique: boolean,
  ): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE tablename = 'tripay_transaction'
            AND indexdef LIKE '%("${column}")%'
        ) THEN
          CREATE ${unique ? 'UNIQUE ' : ''}INDEX "${indexName}"
            ON "tripay_transaction" ("${column}");
        END IF;
      END $$;
    `);
  }
}
