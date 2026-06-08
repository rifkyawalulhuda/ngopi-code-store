import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShortDescriptionToProduct1719400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "customFieldsShortdescription" text`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product" DROP COLUMN IF EXISTS "customFieldsShortdescription"`
    );
  }
}
