import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the `isGuest` custom field to the customer table.
 *
 * Marks a Customer created via guest checkout that has not yet been claimed
 * (i.e. still has no password). Used by NgopiGuestCheckoutStrategy to tell a
 * real registered account apart from a hidden guest account.
 *
 * Column name follows TypeORM's embedded naming: `customFields` + titleCase('isGuest').
 */
export class AddIsGuestToCustomer1719500000000 implements MigrationInterface {
  name = 'AddIsGuestToCustomer1719500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "customer" ADD COLUMN IF NOT EXISTS "customFieldsIsguest" boolean DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "customer" DROP COLUMN IF EXISTS "customFieldsIsguest"`);
  }
}
