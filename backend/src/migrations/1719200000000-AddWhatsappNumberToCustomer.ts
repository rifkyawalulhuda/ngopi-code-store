import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWhatsappNumberToCustomer1719200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "customer" ADD COLUMN IF NOT EXISTS "customFieldsWhatsappnumber" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "customer" DROP COLUMN IF EXISTS "customFieldsWhatsappnumber"`,
    );
  }
}
