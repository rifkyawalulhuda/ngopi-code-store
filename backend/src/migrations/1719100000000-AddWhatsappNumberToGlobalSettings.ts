import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWhatsappNumberToGlobalSettings1719100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "channel" ADD COLUMN IF NOT EXISTS "customFieldsWhatsappnumber" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "channel" DROP COLUMN IF EXISTS "customFieldsWhatsappnumber"`,
    );
  }
}
