import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the `whatsappReminderSentAt` custom field to the order table.
 *
 * Records when the "unpaid order" WhatsApp reminder was last sent so the
 * scheduled reminder task never messages the same order twice.
 *
 * Column name follows TypeORM's embedded naming: `customFields` + titleCase('whatsappReminderSentAt').
 */
export class AddWhatsappReminderToOrder1719700000000 implements MigrationInterface {
  name = 'AddWhatsappReminderToOrder1719700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "customFieldsWhatsappremindersentat" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order" DROP COLUMN IF EXISTS "customFieldsWhatsappremindersentat"`,
    );
  }
}
