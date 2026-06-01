import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGithubAndEmailToChannel1719300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "channel" ADD COLUMN IF NOT EXISTS "customFieldsGithublink" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "channel" ADD COLUMN IF NOT EXISTS "customFieldsOwneremail" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "channel" DROP COLUMN IF EXISTS "customFieldsGithublink"`,
    );
    await queryRunner.query(
      `ALTER TABLE "channel" DROP COLUMN IF EXISTS "customFieldsOwneremail"`,
    );
  }
}
