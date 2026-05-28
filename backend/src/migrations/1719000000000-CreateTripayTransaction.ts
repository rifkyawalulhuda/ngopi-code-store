import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Creates the tripay_transaction table for storing payment transaction records.
 *
 * Indexes:
 * - orderId: for looking up transactions by order
 * - merchantRef (unique): for webhook lookups by Vendure order code
 * - tripayReference: for lookups by Tripay-assigned reference
 *
 * @see Requirements 1.2
 */
export class CreateTripayTransaction1719000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'tripay_transaction',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'orderId',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'merchantRef',
            type: 'varchar',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'tripayReference',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'paymentMethod',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'amount',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'feeMerchant',
            type: 'int',
            default: 0,
          },
          {
            name: 'feeCustomer',
            type: 'int',
            default: 0,
          },
          {
            name: 'status',
            type: 'varchar',
            default: "'UNPAID'",
          },
          {
            name: 'paymentUrl',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'expiredAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'paidAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Index on orderId for order-based lookups
    await queryRunner.createIndex(
      'tripay_transaction',
      new TableIndex({
        name: 'IDX_TRIPAY_TRANSACTION_ORDER_ID',
        columnNames: ['orderId'],
      }),
    );

    // Index on merchantRef (already unique, but explicit index for clarity)
    await queryRunner.createIndex(
      'tripay_transaction',
      new TableIndex({
        name: 'IDX_TRIPAY_TRANSACTION_MERCHANT_REF',
        columnNames: ['merchantRef'],
        isUnique: true,
      }),
    );

    // Index on tripayReference for Tripay-side lookups
    await queryRunner.createIndex(
      'tripay_transaction',
      new TableIndex({
        name: 'IDX_TRIPAY_TRANSACTION_TRIPAY_REFERENCE',
        columnNames: ['tripayReference'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'tripay_transaction',
      'IDX_TRIPAY_TRANSACTION_TRIPAY_REFERENCE',
    );
    await queryRunner.dropIndex(
      'tripay_transaction',
      'IDX_TRIPAY_TRANSACTION_MERCHANT_REF',
    );
    await queryRunner.dropIndex(
      'tripay_transaction',
      'IDX_TRIPAY_TRANSACTION_ORDER_ID',
    );
    await queryRunner.dropTable('tripay_transaction');
  }
}
